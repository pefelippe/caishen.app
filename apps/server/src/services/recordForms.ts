import {
  annualToMonthlyRate,
  Decimal,
  MODALITIES,
  MODALITY_KEYS,
  parseMoney,
  parsePercent,
  type Modality,
} from '@zapbots/finance';

import { badInput } from '../resolvers/guards';
import {
  creditOperationValues,
  expenseValues,
  incomeSourceValues,
  type CreditOperationInput,
  type DatedAmountInput,
  RATE_PERCENT_PLACES,
  type IncomeSourceInput,
  type PaymentMethod,
  type RecordInput,
  type RecordKind,
  type RecurringExpenseInput,
  PAYMENT_METHODS,
  recurringExpenseValues,
} from './records';

/**
 * The records a person or a Bot can write, as fields and values typed in pt-BR ("1234,56",
 * "1,99"): the same reading and checks serve the Model's tool calls, a Proposal corrected in its
 * card and a record edited on its page (docs/adr/0013).
 */

export type { RecordKind };
export type { RecordInput };

export type Args = Record<string, unknown>;

const text = (args: Args, key: string) => {
  const value = args[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
};

function money(args: Args, key: string, label: string): number {
  const value = args[key];
  const cents = typeof value === 'number' || typeof value === 'string' ? parseMoney(value) : null;
  if (cents == null) badInput(`Não entendi o valor de ${label}`);
  return cents;
}

function optionalMoney(args: Args, key: string, label: string): number | null {
  return args[key] == null || args[key] === '' ? null : money(args, key, label);
}

function percent(args: Args, key: string) {
  const value = args[key];
  if (value == null || value === '') return null;
  const rate = typeof value === 'number' || typeof value === 'string' ? parsePercent(value) : null;
  if (!rate) badInput('Não entendi a taxa');
  return rate;
}

function integer(args: Args, key: string, label: string): number {
  const value = Number(args[key]);
  if (!Number.isInteger(value)) badInput(`Não entendi ${label}`);
  return value;
}

/** Typed values as the mutation's input, in cents, for the Holder; throws a pt-BR error if unfit. */
export function inputFor(kind: RecordKind, args: Args, holderId: string, organizationId: string) {
  switch (kind) {
    case 'CREDIT_OPERATION': {
      const modality = text(args, 'modality') ?? 'PERSONAL_LOAN';
      if (!MODALITY_KEYS.includes(modality as Modality)) badInput('Modalidade desconhecida');
      const monthly = percent(args, 'monthlyRatePercent');
      const annual = percent(args, 'annualRatePercent');
      const input: CreditOperationInput = {
        collateralDescription: text(args, 'collateralDescription'),
        collateralValueCents: optionalMoney(args, 'collateralValue', 'valor do bem'),
        firstDueDate: text(args, 'firstDueDate') ?? '',
        holderId,
        installmentCents: optionalMoney(args, 'installment', 'parcela'),
        lender: text(args, 'lender'),
        modality: modality as Modality,
        monthlyRate:
          monthly != null
            ? monthly.toNumber()
            : annual != null
              ? Number(annualToMonthlyRate(annual).toFixed(12))
              : null,
        name: text(args, 'name') ?? '',
        principalCents: money(args, 'principal', 'valor emprestado'),
        system: text(args, 'system') === 'SAC' ? 'SAC' : 'PRICE',
        termMonths: integer(args, 'termMonths', 'o prazo'),
      };
      creditOperationValues(organizationId, input);
      return input;
    }
    case 'INCOME_SOURCE': {
      // An array from the Model; "5, 20" from a person.
      const paydays = Array.isArray(args.paydays)
        ? args.paydays.map(Number)
        : typeof args.paydays === 'string'
          ? args.paydays
              .split(/[,\s]+/)
              .filter(Boolean)
              .map(Number)
          : [];
      const currency = text(args, 'currency') === 'USD' ? 'USD' : 'BRL';
      const iof = percent(args, 'iofPercent');
      const spread = percent(args, 'spreadPercent');
      const input: IncomeSourceInput = {
        currency,
        description: text(args, 'description') ?? '',
        endsOn: text(args, 'endsOn'),
        holderId,
        iofRate: iof == null ? null : iof.toNumber(),
        monthlyNetCents: money(args, 'monthlyAmount', 'renda mensal'),
        paydays,
        spreadRate: spread == null ? null : spread.toNumber(),
        startsOn: text(args, 'startsOn') ?? '',
      };
      incomeSourceValues(input);
      return input;
    }
    case 'RECURRING_EXPENSE': {
      const cycle = text(args, 'cycle') === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
      const method = text(args, 'paymentMethod');
      const input: RecurringExpenseInput = {
        amountCents: money(args, 'amount', 'valor'),
        category: text(args, 'category'),
        creditCardId: text(args, 'creditCardId'),
        cycle,
        description: text(args, 'description') ?? '',
        dueDay: integer(args, 'dueDay', 'o dia da cobrança'),
        dueMonth:
          cycle === 'YEARLY' && args.dueMonth != null && args.dueMonth !== ''
            ? integer(args, 'dueMonth', 'o mês da cobrança')
            : null,
        endsOn: text(args, 'endsOn'),
        holderId,
        paymentMethod:
          method && PAYMENT_METHODS.includes(method as PaymentMethod)
            ? (method as PaymentMethod)
            : null,
        startsOn: text(args, 'startsOn'),
      };
      recurringExpenseValues(input);
      return input;
    }
    case 'ONE_OFF_INCOME':
    case 'EXPENSE': {
      const input: DatedAmountInput = {
        amountCents: money(args, 'amount', 'valor'),
        category: kind === 'EXPENSE' ? text(args, 'category') : null,
        date: text(args, 'date') ?? '',
        description: text(args, 'description') ?? '',
        holderId,
      };
      expenseValues(input);
      return input;
    }
  }
}

export interface RecordField {
  key: string;
  kind: 'DATE' | 'INTEGER' | 'MONEY' | 'PERCENT' | 'SELECT' | 'TEXT';
  label: string;
  options?: { label: string; value: string }[];
  /** As the User types it ("1234,56", "1,99"); what the tool's arguments carry. */
  value: string;
}

const decimalText = (value: Decimal.Value) => new Decimal(value).toString().replace('.', ',');
const reaisText = (cents: number) => new Decimal(cents).div(100).toFixed(2).replace('.', ',');

/** A record's values as fields to correct, keyed like the tool's arguments. */
export function fieldsFor(kind: RecordKind, input: RecordInput): RecordField[] {
  switch (kind) {
    case 'CREDIT_OPERATION': {
      const record = input as CreditOperationInput;
      return [
        { key: 'name', kind: 'TEXT', label: 'Nome', value: record.name },
        {
          key: 'modality',
          kind: 'SELECT',
          label: 'Modalidade',
          options: MODALITY_KEYS.map(key => ({ label: MODALITIES[key].label, value: key })),
          value: record.modality,
        },
        { key: 'lender', kind: 'TEXT', label: 'Credor', value: record.lender ?? '' },
        {
          key: 'principal',
          kind: 'MONEY',
          label: 'Valor',
          value: reaisText(record.principalCents),
        },
        {
          key: 'termMonths',
          kind: 'INTEGER',
          label: 'Prazo (meses)',
          value: String(record.termMonths),
        },
        {
          key: 'firstDueDate',
          kind: 'DATE',
          label: 'Vencimento da 1ª parcela',
          value: record.firstDueDate,
        },
        record.monthlyRate != null
          ? {
              key: 'monthlyRatePercent',
              kind: 'PERCENT',
              label: 'Taxa ao mês (%)',
              // Shown to RATE_PERCENT_PLACES; `updateRecord` keeps the stored rate when it is unchanged.
              value: decimalText(
                new Decimal(record.monthlyRate).times(100).toDecimalPlaces(RATE_PERCENT_PLACES)
              ),
            }
          : {
              key: 'installment',
              kind: 'MONEY',
              label: 'Parcela',
              value: reaisText(record.installmentCents ?? 0),
            },
        {
          key: 'system',
          kind: 'SELECT',
          label: 'Sistema',
          options: [
            { label: 'Price (parcelas iguais)', value: 'PRICE' },
            { label: 'SAC', value: 'SAC' },
          ],
          value: record.system,
        },
        // Financiamentos only; kept on every edit, never dropped by a form that omits them.
        {
          key: 'collateralDescription',
          kind: 'TEXT',
          label: 'Bem financiado',
          value: record.collateralDescription ?? '',
        },
        {
          key: 'collateralValue',
          kind: 'MONEY',
          label: 'Valor do bem',
          value: record.collateralValueCents == null ? '' : reaisText(record.collateralValueCents),
        },
      ];
    }
    case 'INCOME_SOURCE': {
      const record = input as IncomeSourceInput;
      return [
        { key: 'description', kind: 'TEXT', label: 'Descrição', value: record.description },
        {
          key: 'currency',
          kind: 'SELECT',
          label: 'Moeda',
          options: [
            { label: 'Real (R$)', value: 'BRL' },
            { label: 'Dólar (US$)', value: 'USD' },
          ],
          value: record.currency ?? 'BRL',
        },
        {
          key: 'monthlyAmount',
          kind: 'MONEY',
          label: 'Por mês, na moeda (soma dos pagamentos)',
          value: reaisText(record.monthlyNetCents),
        },
        {
          key: 'iofPercent',
          kind: 'PERCENT',
          label: 'IOF (%), se em dólar',
          value: record.iofRate == null ? '' : decimalText(new Decimal(record.iofRate).times(100)),
        },
        {
          key: 'spreadPercent',
          kind: 'PERCENT',
          label: 'Spread do banco (%), se em dólar',
          value:
            record.spreadRate == null ? '' : decimalText(new Decimal(record.spreadRate).times(100)),
        },
        { key: 'startsOn', kind: 'DATE', label: 'Recebe desde', value: record.startsOn },
        { key: 'endsOn', kind: 'DATE', label: 'Até', value: record.endsOn ?? '' },
        {
          key: 'paydays',
          kind: 'TEXT',
          label: 'Dias de pagamento',
          value: (record.paydays ?? []).join(', '),
        },
      ];
    }
    case 'RECURRING_EXPENSE': {
      const record = input as RecurringExpenseInput;
      return [
        { key: 'description', kind: 'TEXT', label: 'Descrição', value: record.description },
        { key: 'amount', kind: 'MONEY', label: 'Valor', value: reaisText(record.amountCents) },
        { key: 'dueDay', kind: 'INTEGER', label: 'Dia da cobrança', value: String(record.dueDay) },
        {
          key: 'cycle',
          kind: 'SELECT',
          label: 'Repete',
          options: [
            { label: 'Todo mês', value: 'MONTHLY' },
            { label: 'Todo ano', value: 'YEARLY' },
          ],
          value: record.cycle ?? 'MONTHLY',
        },
        {
          key: 'dueMonth',
          kind: 'INTEGER',
          label: 'Mês da cobrança (se anual, 1 a 12)',
          value: record.dueMonth == null ? '' : String(record.dueMonth),
        },
        {
          key: 'paymentMethod',
          kind: 'SELECT',
          label: 'Forma de pagamento',
          options: [
            { label: 'Não informada', value: '' },
            { label: 'Cartão de crédito', value: 'CARD' },
            { label: 'Pix', value: 'PIX' },
            { label: 'Débito em conta', value: 'DEBIT' },
            { label: 'Boleto', value: 'BOLETO' },
            { label: 'Outra', value: 'OTHER' },
          ],
          value: record.paymentMethod ?? '',
        },
        { key: 'category', kind: 'TEXT', label: 'Categoria', value: record.category ?? '' },
        { key: 'startsOn', kind: 'DATE', label: 'Desde', value: record.startsOn ?? '' },
        { key: 'endsOn', kind: 'DATE', label: 'Cancelada em', value: record.endsOn ?? '' },
      ];
    }
    case 'ONE_OFF_INCOME':
    case 'EXPENSE': {
      const record = input as DatedAmountInput;
      return [
        { key: 'description', kind: 'TEXT', label: 'Descrição', value: record.description },
        ...(kind === 'EXPENSE'
          ? [
              {
                key: 'category',
                kind: 'TEXT' as const,
                label: 'Categoria',
                value: record.category ?? '',
              },
            ]
          : []),
        { key: 'amount', kind: 'MONEY', label: 'Valor', value: reaisText(record.amountCents) },
        { key: 'date', kind: 'DATE', label: 'Data', value: record.date },
      ];
    }
  }
}
