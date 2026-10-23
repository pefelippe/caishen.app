import type { Viewer } from '@zapbots/auth';
import { db, schema, type ProposalRow } from '@zapbots/database';
import {
  MODALITIES,
  MODALITY_KEYS,
  monthlyToAnnualRate,
  priceInstallment,
  sacFirstInstallment,
} from '@zapbots/finance';
import { and, desc, eq, gte, isNotNull, isNull } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

import { badInput, notFound, owned } from '../../resolvers/guards';
import type { ToolCall, ToolDefinition } from '../models';
import {
  addExpense,
  addIncomeSource,
  addOneOffIncome,
  addRecurringExpense,
  createCreditOperation,
  creditOperationValues,
  deleteRecord,
  readRecord,
  updateRecord,
  type CreditOperationInput,
  type DatedAmountInput,
  type IncomeSourceInput,
  type PaymentMethod,
  type RecurringExpenseInput,
} from '../records';
import {
  fieldsFor,
  inputFor,
  type Args,
  type RecordField,
  type RecordInput,
  type RecordKind,
} from '../recordForms';
import { viewerHolder } from '../viewerHolder';

/**
 * Proposals (docs/adr/0013): the Model asks for a record through a tool, the server checks it and
 * keeps it PENDING, and only the User's confirmation writes it, through the mutation's own service.
 * The Model hands amounts over as the User said them; the server turns them into cents.
 */

export type ProposalKind = RecordKind;

const DATE = { description: 'Data no formato AAAA-MM-DD.', type: 'string' } as const;
const AMOUNT = (what: string) =>
  ({
    description: `${what}, em reais, como a pessoa disse (ex.: "20000,00"). Não faça contas.`,
    type: 'string',
  }) as const;

const TOOLS: Record<ProposalKind, ToolDefinition> = {
  CREDIT_OPERATION: {
    function: {
      description:
        'Propõe cadastrar uma Operação de Crédito (empréstimo ou financiamento). Precisa do valor, do prazo, da data da primeira parcela e da taxa ou do valor da parcela.',
      name: 'propose_credit_operation',
      parameters: {
        properties: {
          annualRatePercent: {
            description: 'Taxa ao ano em %, se a pessoa disse a anual (ex.: "24,5").',
            type: 'string',
          },
          collateralDescription: {
            description: 'Em financiamentos, o bem financiado (ex.: "Onix 2022").',
            type: 'string',
          },
          collateralValue: AMOUNT('Em financiamentos, o valor do bem'),
          firstDueDate: { ...DATE, description: 'Vencimento da primeira parcela, AAAA-MM-DD.' },
          installment: AMOUNT('Valor da parcela, se a pessoa disse a parcela e não a taxa'),
          lender: { description: 'Banco ou credor.', type: 'string' },
          modality: {
            description: `Modalidade: ${MODALITY_KEYS.map(key => `${key} (${MODALITIES[key].label})`).join(', ')}.`,
            enum: MODALITY_KEYS,
            type: 'string',
          },
          monthlyRatePercent: { description: 'Taxa ao mês em % (ex.: "1,99").', type: 'string' },
          name: { description: 'Nome curto, ex.: "Empréstimo Itaú".', type: 'string' },
          principal: AMOUNT('Valor emprestado ou financiado'),
          system: {
            description: 'Sistema de amortização; PRICE (parcelas iguais) se a pessoa não disser.',
            enum: ['PRICE', 'SAC'],
            type: 'string',
          },
          termMonths: { description: 'Prazo em meses.', type: 'integer' },
        },
        required: ['name', 'modality', 'principal', 'termMonths', 'firstDueDate'],
        type: 'object',
      },
    },
    type: 'function',
  },
  EXPENSE: {
    function: {
      description: 'Propõe cadastrar um Gasto: uma saída de dinheiro numa data.',
      name: 'propose_expense',
      parameters: {
        properties: {
          amount: AMOUNT('Valor'),
          category: { description: 'Categoria, ex.: "Mercado".', type: 'string' },
          date: DATE,
          description: { description: 'O que foi, ex.: "Supermercado".', type: 'string' },
        },
        required: ['description', 'amount', 'date'],
        type: 'object',
      },
    },
    type: 'function',
  },
  INCOME_SOURCE: {
    function: {
      description:
        'Propõe cadastrar uma Fonte de Renda: salário, pró-labore ou faturamento que se repete todo mês.',
      name: 'propose_income_source',
      parameters: {
        properties: {
          description: { description: 'Ex.: "Faturamento da loja".', type: 'string' },
          endsOn: { ...DATE, description: 'Quando termina, AAAA-MM-DD, se termina.' },
          currency: {
            description: 'BRL (o padrão) ou USD, se a pessoa recebe em dólar.',
            enum: ['BRL', 'USD'],
            type: 'string',
          },
          monthlyAmount: AMOUNT('Valor líquido por mês, na moeda (a soma dos pagamentos do mês)'),
          spreadPercent: {
            description: 'Se em dólar e a pessoa disser: o spread do banco ou app, em %.',
            type: 'string',
          },
          paydays: {
            description: 'Dias do mês em que o dinheiro entra.',
            items: { type: 'integer' },
            type: 'array',
          },
          startsOn: { ...DATE, description: 'Desde quando, AAAA-MM-DD.' },
        },
        required: ['description', 'monthlyAmount', 'startsOn'],
        type: 'object',
      },
    },
    type: 'function',
  },
  RECURRING_EXPENSE: {
    function: {
      description:
        'Propõe cadastrar um Gasto recorrente: algo que sai todo mês ou todo ano (academia, Netflix, seguro do carro, aluguel). Precisa do nome, do valor e do dia da cobrança.',
      name: 'propose_recurring_expense',
      parameters: {
        properties: {
          amount: AMOUNT('Valor de cada cobrança'),
          category: { description: 'Categoria, ex.: "Assinaturas", "Seguros".', type: 'string' },
          cycle: {
            description: 'MONTHLY (todo mês, o padrão) ou YEARLY (todo ano).',
            enum: ['MONTHLY', 'YEARLY'],
            type: 'string',
          },
          description: { description: 'Nome, ex.: "Seguro do carro".', type: 'string' },
          dueDay: { description: 'Dia do mês da cobrança, de 1 a 31.', type: 'integer' },
          dueMonth: { description: 'Se anual, o mês da cobrança, de 1 a 12.', type: 'integer' },
          paymentMethod: {
            description:
              'Como é pago, se a pessoa disser: CARD (cartão de crédito), PIX, DEBIT (débito em conta), BOLETO ou OTHER.',
            enum: ['CARD', 'PIX', 'DEBIT', 'BOLETO', 'OTHER'],
            type: 'string',
          },
          startsOn: { ...DATE, description: 'Desde quando, AAAA-MM-DD, se a pessoa disser.' },
        },
        required: ['description', 'amount', 'dueDay'],
        type: 'object',
      },
    },
    type: 'function',
  },
  ONE_OFF_INCOME: {
    function: {
      description:
        'Propõe cadastrar uma Receita avulsa: dinheiro que entra uma vez só (um faturamento de um mês, uma venda, um bônus).',
      name: 'propose_one_off_income',
      parameters: {
        properties: {
          amount: AMOUNT('Valor'),
          date: DATE,
          description: { description: 'Ex.: "Faturamento de outubro".', type: 'string' },
        },
        required: ['description', 'amount', 'date'],
        type: 'object',
      },
    },
    type: 'function',
  },
};

/** Every argument a record can take, for a correction that sends only what changes. */
const UPDATE_PROPERTIES = Object.assign(
  {},
  ...Object.values(TOOLS).map(
    tool => (tool.function.parameters as { properties: Record<string, unknown> }).properties
  )
) as Record<string, unknown>;

const UPDATE_TOOL: ToolDefinition = {
  function: {
    description:
      'Propõe corrigir um registro já gravado (Operação de Crédito, Fonte de Renda, Receita avulsa, Gasto ou Gasto recorrente) da lista "Registros que você pode corrigir ou apagar". Mande só o que muda. Nunca apaga.',
    name: 'propose_update',
    parameters: {
      properties: {
        ...UPDATE_PROPERTIES,
        kind: {
          description: 'Tipo do registro, como aparece na lista.',
          enum: [
            'CREDIT_OPERATION',
            'INCOME_SOURCE',
            'ONE_OFF_INCOME',
            'EXPENSE',
            'RECURRING_EXPENSE',
          ],
          type: 'string',
        },
        recordId: { description: 'O id do registro, da lista.', type: 'string' },
        recordName: {
          description: 'O nome do registro como aparece na lista, se não tiver o id.',
          type: 'string',
        },
      },
      required: ['kind'],
      type: 'object',
    },
  },
  type: 'function',
};

const DELETE_TOOL: ToolDefinition = {
  function: {
    description:
      'Propõe apagar um registro já gravado (Operação de Crédito, Fonte de Renda, Receita avulsa, Gasto ou Gasto recorrente) da lista "Registros que você pode corrigir ou apagar". Só quando a pessoa pedir para apagar ou remover.',
    name: 'propose_delete',
    parameters: {
      properties: {
        kind: {
          description: 'Tipo do registro, como aparece na lista.',
          enum: [
            'CREDIT_OPERATION',
            'INCOME_SOURCE',
            'ONE_OFF_INCOME',
            'EXPENSE',
            'RECURRING_EXPENSE',
          ],
          type: 'string',
        },
        recordId: { description: 'O id do registro, da lista.', type: 'string' },
        recordName: {
          description: 'O nome do registro como aparece na lista, se não tiver o id.',
          type: 'string',
        },
      },
      required: ['kind'],
      type: 'object',
    },
  },
  type: 'function',
};

export const PROPOSAL_TOOLS = [...Object.values(TOOLS), UPDATE_TOOL, DELETE_TOOL];

type ProposalAction = ProposalRow['action'];

const ACTION_OF_TOOL: Record<string, ProposalAction> = {
  [DELETE_TOOL.function.name]: 'DELETE',
  [UPDATE_TOOL.function.name]: 'UPDATE',
};

/** How a Proposal's action reads, for the Model and the history. */
const VERBS: Record<ProposalAction, string> = {
  CREATE: 'adicionar',
  DELETE: 'apagar',
  UPDATE: 'corrigir',
};

const KIND_OF_TOOL = Object.fromEntries(
  Object.entries(TOOLS).map(([kind, tool]) => [tool.function.name, kind as ProposalKind])
);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The saved record a correction or deletion is about: by id when the Model sends a real one, else by
 * the name it saw in the list, among the Viewer's own records of that kind. Ids are long, and weak
 * Models drop or garble them.
 */
async function targetOf(viewer: Viewer, kind: ProposalKind, args: Args): Promise<string> {
  const id = typeof args.recordId === 'string' ? args.recordId.trim() : '';
  if (UUID.test(id)) return id;
  const name = (typeof args.recordName === 'string' ? args.recordName : '').trim().toLowerCase();
  if (!name) badInput('Diga qual registro: o id ou o nome da lista');
  const holder = await viewerHolder(viewer);
  const candidates: { id: string; name: string }[] =
    kind === 'CREDIT_OPERATION'
      ? await db
          .select({ id: schema.creditOperation.id, name: schema.creditOperation.name })
          .from(schema.creditOperation)
          .where(eq(schema.creditOperation.holderId, holder.id))
      : kind === 'INCOME_SOURCE'
        ? await db
            .select({ id: schema.incomeSource.id, name: schema.incomeSource.description })
            .from(schema.incomeSource)
            .where(eq(schema.incomeSource.holderId, holder.id))
        : kind === 'RECURRING_EXPENSE'
          ? await db
              .select({ id: schema.recurringExpense.id, name: schema.recurringExpense.description })
              .from(schema.recurringExpense)
              .where(eq(schema.recurringExpense.holderId, holder.id))
          : kind === 'EXPENSE'
            ? await db
                .select({ id: schema.expense.id, name: schema.expense.description })
                .from(schema.expense)
                .where(eq(schema.expense.holderId, holder.id))
                .orderBy(desc(schema.expense.date))
            : await db
                .select({ id: schema.oneOffIncome.id, name: schema.oneOffIncome.description })
                .from(schema.oneOffIncome)
                .where(eq(schema.oneOffIncome.holderId, holder.id))
                .orderBy(desc(schema.oneOffIncome.date));
  const exact = candidates.filter(row => row.name.toLowerCase() === name);
  const partial = candidates.filter(row => row.name.toLowerCase().includes(name));
  const found = exact.length ? exact : partial;
  if (!found.length) notFound('Registro com esse nome');
  if (found.length > 1 && !exact.length) {
    badInput(
      `Há mais de um registro com "${name}": ${found.map(row => row.name).join(', ')}. Pergunte qual`
    );
  }
  return found[0]!.id;
}

/**
 * A correction's arguments over the record's current values, so the Model sends only what changes.
 * A new installment or annual rate replaces the monthly rate it would otherwise lose to.
 */
function mergedArgs(kind: ProposalKind, current: RecordInput, changes: Args): Args {
  const merged: Args = Object.fromEntries(
    fieldsFor(kind, current).map(field => [field.key, field.value])
  );
  for (const [key, value] of Object.entries(changes)) {
    if (
      key === 'kind' ||
      key === 'recordId' ||
      key === 'recordName' ||
      value == null ||
      value === ''
    ) {
      continue;
    }
    merged[key] = value;
  }
  if (
    (changes.installment != null || changes.annualRatePercent != null) &&
    changes.monthlyRatePercent == null
  ) {
    delete merged.monthlyRatePercent;
  }
  return merged;
}

/**
 * Turns one tool call into a PENDING Proposal of the Conversation and answers the Model with what
 * happened, so it can tell the User to confirm, or ask for what was missing.
 */
export async function proposeFromToolCall(
  viewer: Viewer,
  conversationId: string,
  call: ToolCall
): Promise<{ proposal: ProposalRow | null; result: string }> {
  const action = ACTION_OF_TOOL[call.function.name] ?? 'CREATE';
  let args: Args;
  try {
    args = JSON.parse(call.function.arguments || '{}') as Args;
  } catch {
    return { proposal: null, result: 'Argumentos ilegíveis. Tente de novo.' };
  }
  const kind = action === 'CREATE' ? KIND_OF_TOOL[call.function.name] : (args.kind as ProposalKind);
  if (!kind || !(kind in TOOLS)) {
    return { proposal: null, result: `Ferramenta ou tipo desconhecido: ${call.function.name}.` };
  }

  let input: object;
  let previous: RecordInput | null = null;
  let targetId: string | null = null;
  try {
    if (action === 'DELETE') {
      targetId = await targetOf(viewer, kind, args);
      // Only records of the Viewer's Organization; anything else reads as not found.
      previous = await readRecord(viewer, kind, targetId);
      input = previous;
    } else if (action === 'UPDATE') {
      targetId = await targetOf(viewer, kind, args);
      previous = await readRecord(viewer, kind, targetId);
      input = inputFor(
        kind,
        mergedArgs(kind, previous, args),
        previous.holderId,
        viewer.organizationId
      );
    } else {
      const holder = await viewerHolder(viewer);
      input = inputFor(kind, args, holder.id, viewer.organizationId);
    }
  } catch (error) {
    if (error instanceof GraphQLError) {
      return {
        proposal: null,
        result: `Não deu para propor: ${error.message}. Pergunte à pessoa o que falta e não invente.`,
      };
    }
    throw error;
  }

  // A newer Proposal replaces what earlier replies left pending ("muda pra 36 vezes").
  await db
    .update(schema.proposal)
    .set({ decidedAt: new Date(), status: 'CANCELLED' })
    .where(
      and(
        eq(schema.proposal.conversationId, conversationId),
        eq(schema.proposal.status, 'PENDING'),
        isNotNull(schema.proposal.messageId)
      )
    );
  const [proposal] = await db
    .insert(schema.proposal)
    .values({
      action,
      conversationId,
      input,
      kind,
      organizationId: viewer.organizationId,
      previous,
      targetId,
    })
    .returning();
  const { lines, title } = describeProposal(proposal!);
  return {
    proposal: proposal!,
    // Instructions for the Model, not words for the User: it tends to echo whatever reads like copy.
    result: [
      `Proposta criada, ainda não gravada: ${VERBS[action]} ${title}.`,
      ...lines.map(line => `${line.label}: ${line.value}`),
      'O app já mostra esses dados num cartão com os botões Confirmar e Cancelar logo abaixo da sua resposta.',
      'Responda falando com a pessoa (você), em uma frase curta, sem repetir os dados e sem mencionar "proposta" nem "cartão". Ex.: "Pronto, confira abaixo e confirme."',
    ].join('\n'),
  };
}

/** Ties the Proposals made during a reply to the Bot's Message, once it is saved. */
export async function attachProposals(conversationId: string, messageId: string) {
  await db
    .update(schema.proposal)
    .set({ messageId })
    .where(
      and(eq(schema.proposal.conversationId, conversationId), isNull(schema.proposal.messageId))
    );
}

const brl = new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' });
const reais = (cents: number) => brl.format(cents / 100);
const usd = new Intl.NumberFormat('pt-BR', { currency: 'USD', style: 'currency' });
const dollars = (cents: number) => usd.format(cents / 100);
const day = (iso: string) => iso.split('-').reverse().join('/');
const rate = (fraction: number | string) =>
  `${(Number(fraction) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 2, minimumFractionDigits: 2 })}%`;

const TITLES: Record<ProposalKind, string> = {
  CREDIT_OPERATION: 'Operação de Crédito',
  EXPENSE: 'Gasto',
  INCOME_SOURCE: 'Fonte de Renda',
  ONE_OFF_INCOME: 'Receita avulsa',
  RECURRING_EXPENSE: 'Gasto recorrente',
};

type Line = { label: string; value: string };

const MONTH_NAMES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  BOLETO: 'Boleto',
  CARD: 'Cartão de crédito (já entra na Fatura)',
  DEBIT: 'Débito em conta',
  OTHER: 'Outra',
  PIX: 'Pix',
};

/** A record's input as lines to read, already formatted. */
function describeInput(kind: ProposalKind, record: unknown, organizationId: string): Line[] {
  const lines: Line[] = [];
  switch (kind) {
    case 'CREDIT_OPERATION': {
      const input = record as CreditOperationInput;
      const values = creditOperationValues(organizationId, input);
      const first =
        values.system === 'SAC'
          ? sacFirstInstallment(values.principalCents, values.monthlyRate, values.termMonths)
          : priceInstallment(values.principalCents, values.monthlyRate, values.termMonths);
      lines.push(
        { label: 'Nome', value: values.name },
        { label: 'Modalidade', value: MODALITIES[values.modality].label },
        ...(values.lender ? [{ label: 'Credor', value: values.lender }] : []),
        { label: 'Valor', value: reais(values.principalCents) },
        { label: 'Prazo', value: `${values.termMonths} meses` },
        { label: 'Vencimento da 1ª parcela', value: day(values.firstDueDate) },
        {
          label: 'Taxa',
          value: `${rate(values.monthlyRate)} a.m. (${rate(monthlyToAnnualRate(values.monthlyRate).toNumber())} a.a.)${values.rateSource === 'IMPLIED' ? ', calculada pela parcela' : ''}`,
        },
        {
          label: values.system === 'SAC' ? 'Primeira parcela (SAC)' : 'Parcela (Price)',
          value: reais(first),
        }
      );
      break;
    }
    case 'INCOME_SOURCE': {
      const input = record as IncomeSourceInput;
      lines.push(
        { label: 'Descrição', value: input.description },
        {
          label: 'Por mês',
          value:
            input.currency === 'USD'
              ? `${dollars(input.monthlyNetCents)} (convertido pela PTAX, menos IOF${input.spreadRate ? ' e spread' : ''})`
              : reais(input.monthlyNetCents),
        },
        { label: 'Desde', value: day(input.startsOn) },
        ...(input.endsOn ? [{ label: 'Até', value: day(input.endsOn) }] : []),
        ...(input.paydays?.length
          ? [{ label: 'Dias de pagamento', value: input.paydays.join(', ') }]
          : [])
      );
      break;
    }
    case 'RECURRING_EXPENSE': {
      const input = record as RecurringExpenseInput;
      const yearly = input.cycle === 'YEARLY';
      lines.push(
        { label: 'Descrição', value: input.description },
        { label: 'Valor', value: `${reais(input.amountCents)} ${yearly ? 'por ano' : 'por mês'}` },
        {
          label: 'Cobrança',
          value: yearly
            ? `dia ${input.dueDay} de ${MONTH_NAMES[(input.dueMonth ?? 1) - 1]}`
            : `todo dia ${input.dueDay}`,
        },
        ...(input.paymentMethod
          ? [{ label: 'Pagamento', value: PAYMENT_LABELS[input.paymentMethod] }]
          : []),
        ...(input.category ? [{ label: 'Categoria', value: input.category }] : []),
        ...(input.startsOn ? [{ label: 'Desde', value: day(input.startsOn) }] : []),
        ...(input.endsOn ? [{ label: 'Cancelada em', value: day(input.endsOn) }] : [])
      );
      break;
    }
    case 'ONE_OFF_INCOME':
    case 'EXPENSE': {
      const input = record as DatedAmountInput;
      lines.push(
        { label: 'Descrição', value: input.description },
        ...(input.category ? [{ label: 'Categoria', value: input.category }] : []),
        { label: 'Valor', value: reais(input.amountCents) },
        { label: 'Data', value: day(input.date) }
      );
      break;
    }
  }
  return lines;
}

/**
 * What the User reviews, already formatted, the same in the chat and, later, on WhatsApp. A
 * correction shows each changed value as "before → after".
 */
export function describeProposal(
  proposal: Pick<ProposalRow, 'action' | 'input' | 'kind' | 'organizationId' | 'previous'>
): { lines: Line[]; title: string } {
  const after = describeInput(proposal.kind, proposal.input, proposal.organizationId);
  if (proposal.action !== 'UPDATE' || !proposal.previous) {
    return { lines: after, title: TITLES[proposal.kind] };
  }
  const before = new Map(
    describeInput(proposal.kind, proposal.previous, proposal.organizationId).map(line => [
      line.label,
      line.value,
    ])
  );
  return {
    lines: after.map(line => {
      const old = before.get(line.label);
      return old !== undefined && old !== line.value
        ? { label: line.label, value: `${old} → ${line.value}` }
        : line;
    }),
    title: TITLES[proposal.kind],
  };
}

/** The Proposal's values as fields the User can correct in its card before confirming. */
export function proposalFields(proposal: Pick<ProposalRow, 'input' | 'kind'>): RecordField[] {
  return fieldsFor(proposal.kind, proposal.input as RecordInput);
}

/** The User's corrections to a PENDING Proposal, read and checked like the Model's tool call. */
export async function editProposal(
  viewer: Viewer,
  id: string,
  values: { key: string; value: string }[]
): Promise<ProposalRow> {
  const [row] = await db
    .select()
    .from(schema.proposal)
    .where(owned(schema.proposal, viewer, id));
  if (!row) notFound('Proposta');
  if (row.status !== 'PENDING') {
    badInput(
      row.status === 'CONFIRMED' ? 'Esta Proposta já foi confirmada' : 'Esta Proposta foi cancelada'
    );
  }
  if (row.action === 'DELETE') badInput('Não há o que editar: esta Proposta apaga um registro');
  const args: Args = Object.fromEntries(values.map(({ key, value }) => [key, value]));
  const { holderId } = row.input as { holderId: string };
  const input = inputFor(row.kind, args, holderId, viewer.organizationId);
  const [updated] = await db
    .update(schema.proposal)
    .set({ input })
    .where(and(eq(schema.proposal.id, row.id), eq(schema.proposal.status, 'PENDING')))
    .returning();
  return updated ?? decided(viewer, id);
}

const WRITERS: Record<
  ProposalKind,
  (
    viewer: Viewer,
    input: never,
    executor: Parameters<typeof addExpense>[2]
  ) => Promise<{ id: string }>
> = {
  CREDIT_OPERATION: createCreditOperation,
  EXPENSE: addExpense,
  INCOME_SOURCE: addIncomeSource,
  ONE_OFF_INCOME: addOneOffIncome,
  RECURRING_EXPENSE: addRecurringExpense,
};

async function decided(viewer: Viewer, id: string): Promise<never> {
  const [row] = await db
    .select()
    .from(schema.proposal)
    .where(owned(schema.proposal, viewer, id));
  if (!row) notFound('Proposta');
  badInput(
    row.status === 'CONFIRMED' ? 'Esta Proposta já foi confirmada' : 'Esta Proposta foi cancelada'
  );
}

/**
 * Writes a PENDING Proposal through the mutation's service. The status flips in the same
 * transaction, so a second click or a retried message cannot write the record twice.
 */
export async function confirmProposal(viewer: Viewer, id: string): Promise<ProposalRow> {
  const confirmed = await db.transaction(async tx => {
    const [row] = await tx
      .update(schema.proposal)
      .set({ decidedAt: new Date(), decidedById: viewer.userId, status: 'CONFIRMED' })
      .where(and(owned(schema.proposal, viewer, id), eq(schema.proposal.status, 'PENDING')))
      .returning();
    if (!row) return null;
    const record =
      row.action === 'DELETE'
        ? await deleteRecord(viewer, row.kind, row.targetId!, tx)
        : row.action === 'UPDATE'
          ? await updateRecord(viewer, row.kind, row.targetId!, row.input as RecordInput, tx)
          : await WRITERS[row.kind](viewer, row.input as never, tx);
    const [done] = await tx
      .update(schema.proposal)
      .set({ recordId: record.id })
      .where(eq(schema.proposal.id, row.id))
      .returning();
    return done!;
  });
  return confirmed ?? decided(viewer, id);
}

export async function cancelProposal(viewer: Viewer, id: string): Promise<ProposalRow> {
  const [row] = await db
    .update(schema.proposal)
    .set({ decidedAt: new Date(), decidedById: viewer.userId, status: 'CANCELLED' })
    .where(and(owned(schema.proposal, viewer, id), eq(schema.proposal.status, 'PENDING')))
    .returning();
  return row ?? decided(viewer, id);
}

const STATUS = {
  CANCELLED: 'cancelada',
  CONFIRMED: 'confirmada',
  PENDING: 'esperando a confirmação',
};

/** How a past Proposal reads in the history handed to the Model. */
export function proposalNote(proposal: ProposalRow): string {
  return `[Proposta de ${VERBS[proposal.action]} ${TITLES[proposal.kind]}: ${STATUS[proposal.status]}]`;
}

const EDITABLE_DAYS = 60;
const EDITABLE_ENTRIES = 40;

/**
 * The saved records a Bot may propose to correct, each with its kind and id for `propose_update`:
 * Gastos and Receitas avulsas of the last two months, every Fonte de Renda and Operação.
 */
export async function editableRecords(viewer: Viewer): Promise<string> {
  const holder = await viewerHolder(viewer);
  const since = new Date(Date.now() - EDITABLE_DAYS * 86_400_000).toISOString().slice(0, 10);
  const [expenses, incomes, sources, operations, recurring] = await Promise.all([
    db
      .select()
      .from(schema.expense)
      .where(and(eq(schema.expense.holderId, holder.id), gte(schema.expense.date, since)))
      .orderBy(desc(schema.expense.date))
      .limit(EDITABLE_ENTRIES),
    db
      .select()
      .from(schema.oneOffIncome)
      .where(and(eq(schema.oneOffIncome.holderId, holder.id), gte(schema.oneOffIncome.date, since)))
      .orderBy(desc(schema.oneOffIncome.date))
      .limit(EDITABLE_ENTRIES),
    db.select().from(schema.incomeSource).where(eq(schema.incomeSource.holderId, holder.id)),
    db.select().from(schema.creditOperation).where(eq(schema.creditOperation.holderId, holder.id)),
    db
      .select()
      .from(schema.recurringExpense)
      .where(eq(schema.recurringExpense.holderId, holder.id)),
  ]);
  const lines = [
    ...expenses.map(
      row =>
        `EXPENSE ${row.id}: ${row.description}, ${reais(row.amountCents)}, ${day(row.date)}` +
        (row.category ? `, ${row.category}` : '')
    ),
    ...incomes.map(
      row =>
        `ONE_OFF_INCOME ${row.id}: ${row.description}, ${reais(row.amountCents)}, ${day(row.date)}`
    ),
    ...sources.map(
      row =>
        `INCOME_SOURCE ${row.id}: ${row.description}, ${row.currency === 'USD' ? dollars(row.monthlyNetCents) : reais(row.monthlyNetCents)} por mês`
    ),
    ...recurring.map(
      row =>
        `RECURRING_EXPENSE ${row.id}: ${row.description}, ${reais(row.amountCents)} ${row.cycle === 'YEARLY' ? 'por ano' : 'por mês'}, dia ${row.dueDay}` +
        (row.endsOn ? `, cancelada em ${day(row.endsOn)}` : '')
    ),
    ...operations.map(
      row =>
        `CREDIT_OPERATION ${row.id}: ${row.name}, ${reais(row.principalCents)} em ${row.termMonths} meses`
    ),
  ];
  if (!lines.length) return '';
  return [
    '## Registros que você pode corrigir ou apagar (tipo e id)',
    ...lines.map(line => `- ${line}`),
  ].join('\n');
}
