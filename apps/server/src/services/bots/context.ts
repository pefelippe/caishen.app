import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { dateOf, MODALITIES, outstandingBalance, today } from '@zapbots/finance';
import { desc, eq } from 'drizzle-orm';

import { monthlyIncome, scheduleFor, upcomingDues } from '../obligations';
import { viewerHolder } from '../viewerHolder';
import type { BotKey } from './catalog';

// Values reach the Model already computed and formatted; it never does the math (ADR 0009).
const brl = new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' });
const money = (cents: number) => brl.format(cents / 100);
const day = (iso: string) => iso.split('-').reverse().join('/');
const list = (lines: string[], empty: string) =>
  lines.length ? lines.map(line => `- ${line}`).join('\n') : empty;

const BAND = { HIGH: 'risco alto', LOW: 'risco baixo', MEDIUM: 'risco médio' } as const;

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
      ? `Última Avaliação: Score ${assessment.score} de 1000 (${BAND[assessment.band]}), em ${day(dateOf(assessment.createdAt))}`
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

/** What a Bot knows about the Viewer: the data of its own field, already formatted. */
export async function botContext(viewer: Viewer, key: BotKey): Promise<string> {
  switch (key) {
    case 'FINANCE':
      return finance(viewer);
  }
}
