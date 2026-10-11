import type { Viewer } from '@mny/auth';
import { db, schema, type AttachmentRow } from '@mny/database';
import { MODALITIES, outstandingBalance, today } from '@mny/finance';
import { desc, eq, sql } from 'drizzle-orm';

import { attachmentText, driveConnected } from '../drive';
import { fitnessWeek } from '../fitness';
import { noteContentToText } from '../noteContent';
import { monthlyIncome, scheduleFor, upcomingDues } from '../obligations';
import { viewerHolder } from '../viewerHolder';
import type { BuddyArea } from './defaults';

const MAX_ATTACHMENTS = 3;
const NOTE_CHARS = 1200;

// Values reach the Model already computed and formatted; it never does the math (ADR 0008).
const brl = new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' });
const money = (cents: number) => brl.format(cents / 100);
const day = (iso: string) => iso.split('-').reverse().join('/');
const list = (lines: string[], empty: string) =>
  lines.length ? lines.map(line => `- ${line}`).join('\n') : empty;

const BAND = { HIGH: 'risco alto', LOW: 'risco baixo', MEDIUM: 'risco médio' } as const;
const STATUS = { DOING: 'fazendo', DONE: 'feita', TODO: 'a fazer' } as const;

async function finance(viewer: Viewer): Promise<string> {
  const holder = await viewerHolder(viewer);
  const asOf = today();
  const operations = await db
    .select()
    .from(schema.creditOperation)
    .where(eq(schema.creditOperation.holderId, holder.id));
  const operationLines: string[] = [];
  for (const operation of operations) {
    const schedule = await scheduleFor(operation);
    const balance = outstandingBalance(schedule, operation.principalCents, asOf);
    const rate = (Number(operation.monthlyRate) * 100).toFixed(2).replace('.', ',');
    operationLines.push(
      `${operation.name} (${MODALITIES[operation.modality].label}${operation.lender ? `, ${operation.lender}` : ''}): ` +
        `principal ${money(operation.principalCents)}, ${operation.termMonths} Parcelas de ${money(schedule[0]?.installmentCents ?? 0)}, ` +
        `taxa ${rate}% a.m., Saldo Devedor ${money(balance)}`
    );
  }

  const cards = await db
    .select()
    .from(schema.creditCard)
    .where(eq(schema.creditCard.holderId, holder.id));
  const [assessment] = await db
    .select()
    .from(schema.assessment)
    .where(eq(schema.assessment.holderId, holder.id))
    .orderBy(desc(schema.assessment.createdAt))
    .limit(1);
  const dues = await upcomingDues(holder.id, asOf);

  return [
    '## Finanças',
    `Renda mensal líquida: ${money(await monthlyIncome(holder.id, asOf))}`,
    assessment
      ? `Última Avaliação: Score ${assessment.score} de 1000 (${BAND[assessment.band]}), em ${day(assessment.createdAt.toISOString().slice(0, 10))}`
      : 'Ainda não há Avaliação gerada.',
    'Operações de Crédito:',
    list(operationLines, 'Nenhuma cadastrada.'),
    'Cartões:',
    list(
      cards.map(
        card =>
          `${card.name}: limite ${money(card.limitCents)}, fecha dia ${card.closingDay}, vence dia ${card.dueDay}`
      ),
      'Nenhum cadastrado.'
    ),
    'A vencer nos próximos 30 dias:',
    list(
      dues.map(due => `${day(due.dueDate)}: ${due.label}, ${money(due.amountCents)}`),
      'Nada a vencer.'
    ),
  ].join('\n');
}

/** Text of up to a few Attachments, read from the Drive when the User connected it. */
async function attachments(
  viewer: Viewer,
  rows: AttachmentRow[],
  owner: string
): Promise<string[]> {
  if (!rows.length) return [];
  const connected = await driveConnected(viewer.userId);
  const lines: string[] = [];
  for (const row of rows.slice(0, MAX_ATTACHMENTS)) {
    const text = connected ? await attachmentText(viewer.userId, row) : null;
    lines.push(
      text
        ? `Anexo "${row.name}" de ${owner}:\n${text}`
        : `Anexo "${row.name}" de ${owner} (conteúdo não legível daqui).`
    );
  }
  return lines;
}

async function notes(viewer: Viewer, withText: boolean): Promise<string> {
  const rows = await db
    .select()
    .from(schema.note)
    .where(eq(schema.note.organizationId, viewer.organizationId))
    .orderBy(desc(schema.note.updatedAt))
    .limit(withText ? 15 : 8);
  if (!rows.length) return '## Anotações\nNenhuma Anotação ainda.';

  const blocks: string[] = [];
  for (const row of rows) {
    if (!withText) {
      blocks.push(`- ${row.title}`);
      continue;
    }
    const text = noteContentToText(row.content);
    const body = text.length > NOTE_CHARS ? `${text.slice(0, NOTE_CHARS)}… (cortado)` : text;
    const files = await db
      .select()
      .from(schema.attachment)
      .where(eq(schema.attachment.noteId, row.id));
    blocks.push(
      [
        `### ${row.title}`,
        body || '(vazia)',
        ...(await attachments(viewer, files, `"${row.title}"`)),
      ].join('\n')
    );
  }
  return ['## Anotações (mais recentes primeiro)', ...blocks].join('\n');
}

async function work(viewer: Viewer, withAttachments: boolean): Promise<string> {
  const rows = await db
    .select({ project: schema.project.name, task: schema.task })
    .from(schema.task)
    .leftJoin(schema.project, eq(schema.project.id, schema.task.projectId))
    .where(eq(schema.task.organizationId, viewer.organizationId))
    .orderBy(sql`${schema.task.status} = 'DONE'`, sql`${schema.task.dueOn} asc nulls last`)
    .limit(60);
  const asOf = today();
  const lines = rows.map(({ project, task }) => {
    const late = task.status !== 'DONE' && task.dueOn && task.dueOn < asOf ? ', ATRASADA' : '';
    return (
      `${task.title} [${STATUS[task.status]}${late}]` +
      (task.dueOn ? `, prazo ${day(task.dueOn)}` : ', sem prazo') +
      (project ? `, Projeto ${project}` : '')
    );
  });

  const extra: string[] = [];
  if (withAttachments) {
    for (const { task } of rows.filter(row => row.task.status !== 'DONE')) {
      const files = await db
        .select()
        .from(schema.attachment)
        .where(eq(schema.attachment.taskId, task.id));
      extra.push(...(await attachments(viewer, files, `"${task.title}"`)));
    }
  }
  return ['## Trabalho', list(lines, 'Nenhuma Tarefa ainda.'), ...extra].join('\n');
}

async function fitness(viewer: Viewer): Promise<string> {
  const week = await fitnessWeek(viewer.organizationId);
  const workouts = await db
    .select()
    .from(schema.workout)
    .where(eq(schema.workout.organizationId, viewer.organizationId))
    .orderBy(desc(schema.workout.date))
    .limit(20);
  return [
    '## Fitness',
    `Semana de ${day(week.weekStart)} a ${day(week.weekEnd)}: ${week.done} Treino(s), ${week.minutes} minutos. ` +
      (week.goal ? `Meta Semanal: ${week.goal} Treinos.` : 'Sem Meta Semanal definida.'),
    'Treinos recentes:',
    list(
      workouts.map(
        workout =>
          `${day(workout.date)}: ${workout.kind}, ${workout.durationMinutes} min${workout.notes ? ` (${workout.notes})` : ''}`
      ),
      'Nenhum Treino registrado.'
    ),
  ].join('\n');
}

/** What a Buddy knows: its own Area in full, or a summary of all four for the general one. */
export async function buddyContext(viewer: Viewer, area: BuddyArea): Promise<string> {
  switch (area) {
    case 'FINANCE':
      return finance(viewer);
    case 'FITNESS':
      return fitness(viewer);
    case 'NOTES':
      return notes(viewer, true);
    case 'WORK':
      return work(viewer, true);
    case 'GENERAL':
      return (
        await Promise.all([
          finance(viewer),
          work(viewer, false),
          fitness(viewer),
          notes(viewer, false),
        ])
      ).join('\n\n');
  }
}
