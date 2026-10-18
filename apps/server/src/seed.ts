/**
 * `pnpm db:seed`: fills the demo User's Organization with realistic data for Caishen.
 * Every date is relative to today, so the data never goes stale. Safe to run again: it replaces
 * only the demo Organization's rows and leaves every other Organization alone.
 */
import { ensureDemoUser } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { addDays, addMonths, dateInMonth, today } from '@zapbots/finance';
import { eq } from 'drizzle-orm';

import { ensureBots } from './services/bots/catalog';
import { nextRunAfter } from './services/bots/routines';
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
// Deleting the Bots cascades to their Conversations, Jobs and Attachments.
for (const table of [schema.bot, schema.holder] as const) {
  await db.delete(table).where(eq(table.organizationId, organizationId));
}

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

// --- Caishen -----------------------------------------------------------------------------------
const [caishen] = await ensureBots(organizationId);
const finishedAt = new Date(Date.now() - 2 * 86_400_000);
await db.insert(schema.job).values({
  botId: caishen!.id,
  createdById: userId,
  deliverable: [
    'Ordem para quitar as dívidas',
    '',
    '1. Empréstimo pessoal: é a taxa mais alta das suas Operações de Crédito, então cada real amortizado nele rende mais.',
    '2. Financiamento do carro: a taxa é menor e há garantia; siga com as Parcelas normais.',
    '3. Cartão: pague a Fatura inteira todo mês para não entrar no rotativo.',
    '',
    'Próximo passo',
    'Use o aluguel da kitnet para uma Amortização Extraordinária mensal no empréstimo pessoal e ponha a Parcela em débito automático para não atrasar de novo.',
  ].join('\n'),
  finishedAt,
  createdAt: new Date(finishedAt.getTime() - 40_000),
  instructions: 'Monte um plano para eu quitar minhas dívidas, começando pela mais cara.',
  organizationId,
  startedAt: new Date(finishedAt.getTime() - 40_000),
  status: 'DONE',
});

// A monthly Routine that already delivered once, nine days ago.
const ranAt = new Date(Date.now() - 9 * 86_400_000);
const [routine] = await db
  .insert(schema.routine)
  .values({
    botId: caishen!.id,
    cadence: 'MONTHLY',
    createdById: userId,
    instructions: 'Resuma meu mês: o que venceu, o que vem por aí e como está meu Score.',
    nextRunAt: nextRunAfter('MONTHLY', ranAt),
    organizationId,
  })
  .returning();
await db.insert(schema.job).values({
  botId: caishen!.id,
  createdById: userId,
  deliverable: [
    'Resumo do mês',
    '',
    'Venceram as Parcelas do carro e do empréstimo pessoal e a Fatura do Itaú; nenhuma em atraso.',
    'Nos próximos 30 dias vêm a Fatura do Itaú e as próximas Parcelas.',
    'O Score ficou na faixa de risco médio. O que mais pesa é a Utilização de Limite dos Cartões.',
  ].join('\n'),
  createdAt: ranAt,
  finishedAt: new Date(ranAt.getTime() + 30_000),
  instructions: routine!.instructions,
  organizationId,
  routineId: routine!.id,
  startedAt: ranAt,
  status: 'DONE',
});

console.log(`Demo data seeded for ${holder.name}: Score ${assessment.score} (${assessment.band}).`);
process.exit(0);
