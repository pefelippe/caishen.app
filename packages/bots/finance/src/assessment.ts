import type { IsoDate } from './dates';
import {
  daysLate,
  overdueCents,
  settledInLastYear,
  stageFor,
  stageOf,
  type LatePaymentFact,
  type Stage,
} from './lateness';
import { Decimal, toCents, type Cents } from './money';

/** Bump when scoring rules change; stored on every Assessment. */
export const ASSESSMENT_MODEL_VERSION = '2026-09-v3';

export type RiskBand = 'HIGH' | 'MEDIUM' | 'LOW';

/** SPC bands: 0–300 high risk, 301–700 medium, 701–1000 low (docs/adr/0005). */
export function riskBand(score: number): RiskBand {
  if (score <= 300) return 'HIGH';
  if (score <= 700) return 'MEDIUM';
  return 'LOW';
}

const SUGGESTED_LIMIT_SHARE = new Decimal('0.3');
const STAGE_3_CAP = 300;
const OVERCOMMITTED_CAP = 700;

/** Totals of the latest SCR Snapshot, reported by the institutions to Bacen (docs/adr/0006). */
export interface ScrSummary {
  dueCents: Cents;
  lossCents: Cents;
  /** Upper bound of the worst overdue bucket; `null` when the report does not say. */
  overdueMaxDays: number | null;
  overdueCents: Cents;
  referenceMonth: string;
}

export interface ScrLine {
  dueCents: Cents;
  lossCents: Cents;
  overdueCents: Cents;
  overdueMaxDays: number | null;
}

export function summarizeScr(referenceMonth: string, lines: ScrLine[]): ScrSummary {
  const sum = (pick: (line: ScrLine) => Cents) =>
    lines.reduce((total, line) => total + pick(line), 0);
  const days = lines.filter(line => line.overdueCents > 0).map(line => line.overdueMaxDays);
  return {
    dueCents: sum(line => line.dueCents),
    lossCents: sum(line => line.lossCents),
    overdueCents: sum(line => line.overdueCents),
    overdueMaxDays:
      days.length === 0 || days.includes(null) ? null : Math.max(...(days as number[])),
    referenceMonth,
  };
}

/** Stage the SCR implies: any Loss is Stage 3; overdue without a day range counts as 31+ days. */
export function scrStage(scr: ScrSummary): Stage {
  if (scr.lossCents > 0) return 3;
  if (scr.overdueCents > 0) return stageFor(scr.overdueMaxDays ?? 31);
  return 1;
}

export interface AssessmentInput {
  asOf: IsoDate;
  /** Credit Operation installments plus Statements due in the next 30 days. */
  dueNext30DaysCents: Cents;
  /** Every Late Payment of the Holder, across all Credit Operations. */
  latePayments: LatePaymentFact[];
  monthlyIncomeCents: Cents;
  /** Statements not yet due. */
  openStatementsCents: Cents;
  /** Outstanding Balance summed over every Credit Operation. */
  outstandingDebtCents: Cents;
  /** Latest SCR Snapshot, if one was imported; it prevails over declared data. */
  scr?: ScrSummary | null;
  totalCardLimitCents: Cents;
}

export interface Indicators {
  creditUtilization: number | null;
  debtToIncome: number;
  dueNext30DaysCents: Cents;
  /** (due in 30 days + overdue) / income. */
  incomeCommitment: number;
  lateLast12Months: number;
  monthlyIncomeCents: Cents;
  outstandingDebtCents: Cents;
  overdueCents: Cents;
  paymentCapacityCents: Cents;
  /** Total debt in the SCR Snapshot (due + overdue + loss); `null` without one. */
  scrDebtCents: Cents | null;
  scrReferenceMonth: string | null;
  suggestedLimitCents: Cents;
  worstStage: Stage;
}

export interface ScoreBreakdown {
  capacity: number;
  punctuality: number;
  utilization: number;
}

export interface AssessmentResult {
  band: RiskBand;
  breakdown: ScoreBreakdown;
  indicators: Indicators;
  modelVersion: string;
  score: number;
}

export class AssessmentError extends Error {}

type Band = [upTo: number, points: number];

function points(value: number, bands: Band[], above: number): number {
  for (const [upTo, earned] of bands) if (value <= upTo) return earned;
  return above;
}

/** Up to 500: payment history weighs most, as bureaus state. */
function punctualityPoints(
  latePayments: LatePaymentFact[],
  asOf: IsoDate,
  stage: Stage,
  scrOverdue: boolean
) {
  const openLate =
    scrOverdue || latePayments.some(fact => fact.paidOn === null && fact.dueDate <= asOf);
  const base = stage === 3 ? 0 : stage === 2 ? 200 : openLate ? 400 : 500;
  const history = settledInLastYear(latePayments, asOf).reduce(
    (penalty, fact) => penalty + (daysLate(fact, asOf) > 30 ? 100 : 50),
    0
  );
  return Math.max(0, base - history);
}

export function assess(input: AssessmentInput): AssessmentResult {
  const income = new Decimal(input.monthlyIncomeCents);
  if (income.lessThanOrEqualTo(0)) {
    throw new AssessmentError('Cadastre ao menos uma Fonte de Renda para gerar a Avaliação');
  }

  const { asOf, latePayments, scr } = input;
  // What institutions reported to Bacen prevails over what was declared (docs/adr/0006).
  const worstStage = Math.max(stageOf(latePayments, asOf), scr ? scrStage(scr) : 1) as Stage;
  const overdue = Math.max(overdueCents(latePayments, asOf), scr?.overdueCents ?? 0);
  const scrDebtCents = scr ? scr.dueCents + scr.overdueCents + scr.lossCents : null;

  const incomeCommitment = new Decimal(input.dueNext30DaysCents)
    .plus(overdue)
    .div(income)
    .toNumber();
  // The schedule presumes every past installment was paid, so open Late Payments are added back.
  const declaredDebt = input.outstandingDebtCents + input.openStatementsCents + overdue;
  const debtToIncome = new Decimal(Math.max(declaredDebt, scrDebtCents ?? 0))
    .div(income)
    .toNumber();
  const creditUtilization =
    input.totalCardLimitCents > 0
      ? new Decimal(input.openStatementsCents).div(input.totalCardLimitCents).toNumber()
      : null;

  const breakdown: ScoreBreakdown = {
    capacity:
      points(
        incomeCommitment,
        [
          [0.3, 150],
          [0.5, 110],
          [0.7, 70],
          [1, 30],
        ],
        0
      ) +
      points(
        debtToIncome,
        [
          [3, 150],
          [6, 110],
          [12, 70],
          [24, 30],
        ],
        0
      ),
    punctuality: punctualityPoints(latePayments, asOf, worstStage, (scr?.overdueCents ?? 0) > 0),
    // No cards is not a risk signal, so it earns the full share.
    utilization:
      creditUtilization === null
        ? 200
        : points(
            creditUtilization,
            [
              [0.3, 200],
              [0.5, 150],
              [0.8, 80],
            ],
            0
          ),
  };

  let score = breakdown.punctuality + breakdown.capacity + breakdown.utilization;
  if (worstStage === 3) score = Math.min(score, STAGE_3_CAP);
  // Owing more this month than the income earns can never read as low risk.
  if (incomeCommitment > 1) score = Math.min(score, OVERCOMMITTED_CAP);

  return {
    band: riskBand(score),
    breakdown,
    indicators: {
      creditUtilization,
      debtToIncome,
      dueNext30DaysCents: input.dueNext30DaysCents,
      incomeCommitment,
      lateLast12Months: settledInLastYear(latePayments, asOf).length,
      monthlyIncomeCents: input.monthlyIncomeCents,
      outstandingDebtCents: input.outstandingDebtCents,
      overdueCents: overdue,
      paymentCapacityCents: Math.max(
        0,
        input.monthlyIncomeCents - input.dueNext30DaysCents - overdue
      ),
      scrDebtCents,
      scrReferenceMonth: scr?.referenceMonth ?? null,
      suggestedLimitCents: toCents(income.times(SUGGESTED_LIMIT_SHARE)),
      worstStage,
    },
    modelVersion: ASSESSMENT_MODEL_VERSION,
    score,
  };
}
