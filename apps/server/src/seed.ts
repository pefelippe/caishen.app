/**
 * `pnpm db:seed`: fills the demo User's Organization with realistic data in all four Areas.
 * Every date is relative to today, so the data never goes stale. Safe to run again: it replaces
 * only the demo Organization's rows and leaves every other Organization alone.
 */
import { ensureDemoUser } from '@mny/auth';
import { db, schema } from '@mny/database';
import { addDays, addMonths, dateInMonth, today } from '@mny/finance';
import { eq } from 'drizzle-orm';

import { ensureBuddies } from './services/buddies/defaults';
import { weekRange } from './services/fitness';
import { textToNoteContent } from './services/noteContent';
import { computeAssessment } from './services/obligations';
import { viewerHolder } from './services/viewerHolder';

const now = today();
const thisMonth = now.slice(0, 7);
const monthOf = (offset: number) => addMonths(`${thisMonth}-01`, offset).slice(0, 7);
/** Day `day` of the month `offset` months from now. */
const dayOf = (offset: number, day: number) => dateInMonth(monthOf(offset), day);

const userId = await ensureDemoUser();
const [member] = await db.select().from(schema.member).where(eq(schema.member.userId, userId));
if (!member) throw new Error('The demo User has no Organization');
const { organizationId } = member;
const viewer = { organizationId, role: member.role, userId };

// Deleting the Holder cascades to its Obligations, Income Sources and Assessments.
for (const table of [
  schema.attachment,
  schema.conversation,
  schema.note,
  schema.task,
  schema.project,
  schema.workout,
  schema.holder,
] as const) {
  await db.delete(table).where(eq(table.organizationId, organizationId));
}
await db.delete(schema.weeklyGoal).where(eq(schema.weeklyGoal.organizationId, organizationId));

// --- Finanças -----------------------------------------------------------------------------------
const holder = await viewerHolder(viewer);
const holderId = holder.id;

await db.insert(schema.incomeSource).values([
  { description: 'Salário', holderId, monthlyNetCents: 850_000, startsOn: dayOf(-26, 1) },
  { description: 'Aluguel da kitnet', holderId, monthlyNetCents: 120_000, startsOn: dayOf(-8, 1) },
]);

const [car, loan] = await db
  .insert(schema.creditOperation)
  .values([
    {
      collateralDescription: 'Onix 2023',
      collateralValueCents: 7_800_000,
      firstDueDate: dayOf(-14, 10),
      holderId,
      lender: 'Banco Itaú',
      modality: 'VEHICLE_FINANCING',
      monthlyRate: '0.0159',
      name: 'Financiamento do carro',
      organizationId,
      principalCents: 6_200_000,
      rateSource: 'INFORMED',
      system: 'PRICE',
      termMonths: 48,
    },
    {
      firstDueDate: dayOf(-6, 5),
      holderId,
      lender: 'Nubank',
      modality: 'PERSONAL_LOAN',
      monthlyRate: '0.032',
      name: 'Empréstimo pessoal',
      organizationId,
      principalCents: 1_200_000,
      rateSource: 'INFORMED',
      system: 'PRICE',
      termMonths: 24,
    },
    {
      collateralDescription: 'Apartamento na Vila Mariana',
      collateralValueCents: 42_000_000,
      firstDueDate: dayOf(-26, 15),
      holderId,
      lender: 'Caixa',
      modality: 'REAL_ESTATE_FINANCING',
      monthlyRate: '0.0082',
      name: 'Financiamento do apartamento',
      organizationId,
      principalCents: 28_000_000,
      rateSource: 'INFORMED',
      system: 'SAC',
      termMonths: 360,
    },
  ])
  .returning();

// The loan has one Late Payment settled months ago and its latest installment still open.
const loanDue = (installment: number) => addMonths(loan!.firstDueDate, installment - 1);
const latestDue = loanDue(7) < now ? 7 : 6;
await db.insert(schema.latePayment).values([
  { creditOperationId: loan!.id, installmentNumber: 3, paidOn: addDays(loanDue(3), 12) },
  { creditOperationId: loan!.id, installmentNumber: latestDue, paidOn: null },
]);
await db
  .insert(schema.extraAmortization)
  .values({ amountCents: 300_000, creditOperationId: car!.id, date: dayOf(-5, 20) });

const [nubank, itau] = await db
  .insert(schema.creditCard)
  .values([
    {
      closingDay: 3,
      dueDay: 10,
      holderId,
      issuer: 'Nubank',
      limitCents: 1_200_000,
      name: 'Nubank Ultravioleta',
      organizationId,
    },
    {
      closingDay: 20,
      dueDay: 27,
      holderId,
      issuer: 'Itaú',
      limitCents: 800_000,
      name: 'Itaú Platinum',
      organizationId,
    },
  ])
  .returning();
await db.insert(schema.statement).values([
  { amountCents: 284_512, creditCardId: nubank!.id, referenceMonth: monthOf(-1) },
  { amountCents: 317_840, creditCardId: nubank!.id, referenceMonth: monthOf(0) },
  { amountCents: 196_300, creditCardId: nubank!.id, referenceMonth: monthOf(1) },
  { amountCents: 142_990, creditCardId: itau!.id, referenceMonth: monthOf(0) },
]);

await db.insert(schema.reportedScore).values({
  bureau: 'SERASA',
  consultedOn: addDays(now, -20),
  createdById: userId,
  holderId,
  score: 712,
});

const assessment = await computeAssessment(holderId);
await db.insert(schema.assessment).values({
  band: assessment.band,
  breakdown: assessment.breakdown,
  createdById: userId,
  holderId,
  indicators: assessment.indicators,
  modelVersion: assessment.modelVersion,
  score: assessment.score,
});

// --- Trabalho -----------------------------------------------------------------------------------
const [site, home] = await db
  .insert(schema.project)
  .values([
    { name: 'Lançamento do site', organizationId },
    { name: 'Casa', organizationId },
  ])
  .returning();

const tasks: Omit<typeof schema.task.$inferInsert, 'organizationId'>[] = [
  { dueOn: addDays(now, -2), projectId: site!.id, title: 'Revisar textos da página inicial' },
  { dueOn: now, projectId: site!.id, status: 'DOING', title: 'Configurar o domínio e o SSL' },
  { dueOn: now, title: 'Enviar a nota fiscal de setembro' },
  { dueOn: addDays(now, 1), projectId: home!.id, title: 'Agendar a revisão do carro' },
  { dueOn: addDays(now, 3), projectId: site!.id, title: 'Testar o formulário de contato' },
  { dueOn: addDays(now, 6), title: 'Preparar a reunião trimestral' },
  { projectId: home!.id, title: 'Comparar planos de internet' },
  { dueOn: addDays(now, -4), projectId: site!.id, status: 'DONE', title: 'Escolher a paleta' },
  { dueOn: addDays(now, -7), status: 'DONE', title: 'Renovar o seguro do apartamento' },
];
await db.insert(schema.task).values(tasks.map(task => ({ ...task, organizationId })));

// --- Fitness ------------------------------------------------------------------------------------
await db.insert(schema.weeklyGoal).values({ organizationId, workoutsPerWeek: 4 });

const { weekStart } = weekRange(now);
/** `[weeks ago, weekday (0 = Monday), kind, minutes, note]`; future days of this week are skipped. */
const sessions: [number, number, string, number, string?][] = [
  [0, 0, 'Musculação', 55, 'Pernas'],
  [0, 2, 'Corrida', 32, '5 km no parque'],
  [0, 4, 'Musculação', 50],
  [1, 0, 'Musculação', 60],
  [1, 1, 'Corrida', 28],
  [1, 3, 'Natação', 40],
  [1, 5, 'Bicicleta', 75, 'Ciclovia até a represa'],
  [2, 1, 'Musculação', 50],
  [2, 3, 'Corrida', 35],
  [3, 0, 'Musculação', 55],
  [3, 2, 'Natação', 45],
  [3, 4, 'Corrida', 30],
  [3, 6, 'Bicicleta', 90],
  [4, 2, 'Musculação', 45],
  [5, 0, 'Corrida', 25],
  [5, 3, 'Musculação', 50],
  [5, 5, 'Natação', 40],
];
await db.insert(schema.workout).values(
  sessions
    .map(([weeksAgo, weekday, kind, durationMinutes, notes]) => ({
      date: addDays(weekStart, weekday - 7 * weeksAgo),
      durationMinutes,
      kind,
      notes: notes ?? null,
      organizationId,
    }))
    .filter(workout => workout.date <= now)
);

// --- Anotações ----------------------------------------------------------------------------------
const note = (title: string, text: string, daysAgo: number) => ({
  content: textToNoteContent(text),
  createdById: userId,
  organizationId,
  title,
  updatedAt: new Date(Date.now() - daysAgo * 86_400_000),
});
await db
  .insert(schema.note)
  .values([
    note(
      'Plano para quitar o empréstimo',
      [
        'O empréstimo pessoal tem a taxa mais alta, então é o primeiro a sair.',
        '',
        'Usar o aluguel da kitnet para amortizar todo mês.',
        'Pôr a parcela em débito automático para não atrasar de novo.',
        'Depois dele, atacar o financiamento do carro.',
      ].join('\n'),
      1
    ),
    note(
      'Ideias para o site',
      [
        'Página inicial com um exemplo real em vez de texto institucional.',
        'Depoimentos curtos, com nome e empresa.',
        'Formulário de contato com três campos, não oito.',
      ].join('\n'),
      3
    ),
    note(
      'Treino de pernas',
      ['Agachamento 4x8', 'Leg press 3x12', 'Stiff 3x10', 'Panturrilha 4x15'].join('\n'),
      6
    ),
  ]);

await ensureBuddies(organizationId);

console.log(`Demo data seeded for ${holder.name}: Score ${assessment.score} (${assessment.band}).`);
process.exit(0);
