import {
  addMonths,
  amortizationSchedule,
  annualToMonthlyRate,
  parseMoney,
  parsePercent,
  type AmortizationSystem,
  type Installment,
} from '@zapbots/finance';
import { CarIcon, HouseIcon, SlidersHorizontalIcon, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { CalcField as Field } from '@zapbots/ui/blocks/calc-field';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@zapbots/ui/components/table';
import { cn } from '@zapbots/ui/lib/utils';

import { BotPage } from '../components/BotPage';
import { localToday } from '../lib/bots';
import { formatCents, formatDate, formatPercent } from '../lib/format';
import { RentVsBuyCalculator } from './RentVsBuyCalculator';

interface Preset {
  down: string;
  icon: LucideIcon;
  key: string;
  label: string;
  rate: string;
  rateYearly: boolean;
  term: string;
  value: string;
}

/** Starting points with typical figures; every field can be changed. */
const PRESETS: Preset[] = [
  {
    down: '100.000,00',
    icon: HouseIcon,
    key: 'house',
    label: 'Imóvel',
    rate: '11,5',
    rateYearly: true,
    term: '360',
    value: '500.000,00',
  },
  {
    down: '20.000,00',
    icon: CarIcon,
    key: 'car',
    label: 'Carro',
    rate: '1,79',
    rateYearly: false,
    term: '48',
    value: '90.000,00',
  },
  {
    down: '0,00',
    icon: SlidersHorizontalIcon,
    key: 'free',
    label: 'Livre',
    rate: '2,5',
    rateYearly: false,
    term: '24',
    value: '20.000,00',
  },
];

const SYSTEMS: { key: AmortizationSystem; label: string; note: string }[] = [
  { key: 'PRICE', label: 'Price', note: 'Parcela igual do começo ao fim.' },
  { key: 'SAC', label: 'SAC', note: 'Começa mais alta e cai todo mês; paga menos juros.' },
];

interface Outcome {
  first: number;
  interest: number;
  last: number;
  rows: Installment[];
  total: number;
}

/** The schedule of one system, and its sums; `null` when a field cannot be read. */
function outcome(
  system: AmortizationSystem,
  principal: number,
  monthlyRate: string,
  term: number
): Outcome | null {
  if (principal <= 0 || term <= 0 || term > 600) return null;
  const rows = amortizationSchedule({
    firstDueDate: addMonths(localToday(), 1),
    monthlyRate,
    principalCents: principal,
    system,
    termMonths: term,
  });
  const interest = rows.reduce((sum, row) => sum + row.interestCents, 0);
  return {
    first: rows[0]!.installmentCents,
    interest,
    last: rows.at(-1)!.installmentCents,
    rows,
    total: principal + interest,
  };
}

/**
 * A financing (a home, a car, anything) worked out in Price and in SAC side by side, with the table
 * of installments.
 */
function FinancingCalculator() {
  const [preset, setPreset] = useState(PRESETS[0]!);
  const [value, setValue] = useState(preset.value);
  const [down, setDown] = useState(preset.down);
  const [term, setTerm] = useState(preset.term);
  const [rate, setRate] = useState(preset.rate);
  const [yearly, setYearly] = useState(preset.rateYearly);
  const [shown, setShown] = useState<AmortizationSystem>('PRICE');
  const [all, setAll] = useState(false);

  const pick = (next: Preset) => {
    setPreset(next);
    setValue(next.value);
    setDown(next.down);
    setTerm(next.term);
    setRate(next.rate);
    setYearly(next.rateYearly);
  };

  const principal = Math.max(0, (parseMoney(value) ?? 0) - (parseMoney(down) ?? 0));
  const months = Number.parseInt(term, 10) || 0;
  const typedRate = parsePercent(rate);
  const monthlyRate = typedRate
    ? (yearly ? annualToMonthlyRate(typedRate) : typedRate).toString()
    : null;

  const results = useMemo(
    () =>
      monthlyRate
        ? SYSTEMS.map(system => ({
            ...system,
            result: outcome(system.key, principal, monthlyRate, months),
          }))
        : [],
    [monthlyRate, months, principal]
  );
  const table = results.find(result => result.key === shown)?.result;
  const rows = table ? (all ? table.rows : table.rows.slice(0, 12)) : [];

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map(item => (
          <Button
            className={cn(
              'rounded-full',
              item.key === preset.key && 'bg-primary text-primary-foreground hover:bg-primary'
            )}
            key={item.key}
            onClick={() => pick(item)}
            variant="secondary"
          >
            <item.icon />
            {item.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card>
          <Field
            id="calc-value"
            label="Valor do bem"
            onChange={setValue}
            suffix="R$"
            value={value}
          />
          <Field
            hint={`Financiado: ${formatCents(principal)}`}
            id="calc-down"
            label="Entrada"
            onChange={setDown}
            suffix="R$"
            value={down}
          />
          <Field id="calc-term" label="Prazo" onChange={setTerm} suffix="meses" value={term} />
          <div className="flex flex-col gap-1.5">
            <Field
              hint={
                monthlyRate
                  ? yearly
                    ? `${formatPercent(Number(monthlyRate))} ao mês`
                    : undefined
                  : 'Escreva a taxa, por exemplo 1,79'
              }
              id="calc-rate"
              label="Taxa de juros"
              onChange={setRate}
              suffix={yearly ? '% ao ano' : '% ao mês'}
              value={rate}
            />
            <div className="flex gap-1">
              {[false, true].map(option => (
                <Button
                  className={cn(
                    'h-7 rounded-full px-3 text-xs',
                    option === yearly && 'bg-accent text-primary'
                  )}
                  key={String(option)}
                  onClick={() => setYearly(option)}
                  size="sm"
                  variant="ghost"
                >
                  {option ? 'Ao ano' : 'Ao mês'}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2">
          {results.map(({ key, label, note, result }) => (
            <Card className={cn('gap-4', key === shown && 'ring-2 ring-primary')} key={key}>
              <div>
                <h2 className="text-lg font-semibold">{label}</h2>
                <p className="text-sm text-muted-foreground">{note}</p>
              </div>
              {result ? (
                <dl className="grid gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Primeira parcela</dt>
                    <dd className="font-display text-3xl font-light tracking-[-0.022em] tabular-nums">
                      {formatCents(result.first)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Última parcela</dt>
                    <dd className="tabular-nums">{formatCents(result.last)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Total de juros</dt>
                    <dd className="font-medium text-destructive tabular-nums">
                      {formatCents(result.interest)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Total pago</dt>
                    <dd className="tabular-nums">{formatCents(result.total)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Confira o valor, a entrada e o prazo.
                </p>
              )}
              <Button
                className="mt-auto rounded-full"
                disabled={!result}
                onClick={() => setShown(key)}
                variant={key === shown ? 'default' : 'secondary'}
              >
                Ver as parcelas
              </Button>
            </Card>
          ))}
          {!monthlyRate && (
            <Card className="sm:col-span-2">
              <p className="text-sm text-muted-foreground">
                Escreva a taxa de juros para calcular.
              </p>
            </Card>
          )}
        </div>
      </div>

      {table && (
        <Card className="gap-4">
          <h2 className="font-semibold">
            Parcelas na {SYSTEMS.find(system => system.key === shown)!.label}
          </h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Parcela</TableHead>
                <TableHead className="text-right">Juros</TableHead>
                <TableHead className="text-right">Amortização</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow key={row.number}>
                  <TableCell className="tabular-nums">{row.number}</TableCell>
                  <TableCell className="tabular-nums">{formatDate(row.dueDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(row.installmentCents)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(row.interestCents)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(row.amortizationCents)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(row.balanceCents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {table.rows.length > 12 && (
            <Button
              className="self-start rounded-full"
              onClick={() => setAll(!all)}
              variant="secondary"
            >
              {all ? 'Mostrar só o primeiro ano' : `Mostrar as ${table.rows.length} parcelas`}
            </Button>
          )}
        </Card>
      )}
    </>
  );
}

const CALCULATORS = [
  {
    description: 'Simule um financiamento e compare a tabela Price com a SAC antes de assinar.',
    key: 'financing',
    label: 'Financiamento',
  },
  {
    description:
      'Compare comprar um imóvel financiado com alugar e investir a diferença: quem termina com mais.',
    key: 'rent',
    label: 'Alugar ou financiar',
  },
] as const;

/**
 * Calculadoras: the financing in Price and SAC, and renting against financing a home (`?c=rent`).
 * The math is `@zapbots/finance`'s, in cents (docs/adr/0004).
 */
export function CalculatorsPage() {
  const [params, setParams] = useSearchParams();
  const current = CALCULATORS.find(item => item.key === params.get('c')) ?? CALCULATORS[0];

  return (
    <BotPage bot="FINANCE" description={current.description} title="Calculadoras">
      <div className="flex w-fit gap-1 rounded-full bg-muted p-1">
        {CALCULATORS.map(item => (
          <Button
            className={cn(
              'h-8 rounded-full px-4',
              item.key === current.key
                ? 'bg-card text-foreground shadow-xs hover:bg-card'
                : 'text-muted-foreground'
            )}
            key={item.key}
            onClick={() => setParams(item.key === 'financing' ? {} : { c: item.key })}
            variant="ghost"
          >
            {item.label}
          </Button>
        ))}
      </div>
      {current.key === 'rent' ? <RentVsBuyCalculator /> : <FinancingCalculator />}
    </BotPage>
  );
}
