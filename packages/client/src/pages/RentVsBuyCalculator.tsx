import {
  parseMoney,
  parsePercent,
  rentVsBuy,
  type AmortizationSystem,
  type RentVsBuyPoint,
} from '@zapbots/finance';
import { HouseIcon, KeyRoundIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

import { CalcField } from '@zapbots/ui/blocks/calc-field';
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

import { formatCents } from '../lib/format';

/** Typical figures for a R$ 500 mil home in 2026; every field can be changed. */
const START = {
  appreciation: '5',
  costs: '20.000,00',
  down: '100.000,00',
  financing: '11,5',
  investment: '10',
  property: '500.000,00',
  rent: '2.500,00',
  rentAdjustment: '4',
  term: '360',
};

type Fields = typeof START;

const years = (months: number) => {
  const whole = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [];
  if (whole) parts.push(`${whole} ${whole === 1 ? 'ano' : 'anos'}`);
  if (rest) parts.push(`${rest} ${rest === 1 ? 'mês' : 'meses'}`);
  return parts.join(' e ');
};

/** One row a year (and the last month, when the term is not whole years). */
function yearly(points: RentVsBuyPoint[]): RentVsBuyPoint[] {
  return points.filter(point => point.month % 12 === 0 || point.month === points.length);
}

/**
 * Renting against financing a home, as in the AUVP's calculator: both spend the same each month,
 * whoever pays less sets the difference aside, and the page shows who ends up with more (the
 * home's price less what is owed, against what was invested). Math in `rentVsBuy`.
 */
export function RentVsBuyCalculator() {
  const [fields, setFields] = useState<Fields>(START);
  const [system, setSystem] = useState<AmortizationSystem>('PRICE');
  const [all, setAll] = useState(false);
  const set = (key: keyof Fields) => (value: string) => setFields({ ...fields, [key]: value });

  const property = parseMoney(fields.property) ?? 0;
  const down = parseMoney(fields.down) ?? 0;
  const term = Number.parseInt(fields.term, 10) || 0;
  const rates = {
    appreciationRate: parsePercent(fields.appreciation),
    financingRate: parsePercent(fields.financing),
    investmentRate: parsePercent(fields.investment),
    rentAdjustmentRate: parsePercent(fields.rentAdjustment),
  };
  const missing = Object.values(rates).some(rate => rate === null);

  const result = useMemo(
    () =>
      missing
        ? null
        : rentVsBuy({
            appreciationRate: rates.appreciationRate!.toString(),
            closingCostsCents: parseMoney(fields.costs) ?? 0,
            downPaymentCents: down,
            financingRate: rates.financingRate!.toString(),
            investmentRate: rates.investmentRate!.toString(),
            propertyCents: property,
            rentAdjustmentRate: rates.rentAdjustmentRate!.toString(),
            rentCents: parseMoney(fields.rent) ?? 0,
            system,
            termMonths: term,
          }),
    // The rates are read from `fields`, already a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, system]
  );

  const last = result?.points.at(-1);
  const buying = last ? last.buyerWealthCents >= last.renterWealthCents : false;
  const gap = last ? Math.abs(last.buyerWealthCents - last.renterWealthCents) : 0;
  const rows = result ? yearly(result.points) : [];
  const shown = all
    ? rows
    : rows.filter((row, index) => (index + 1) % 5 === 0 || index === rows.length - 1);
  const top = Math.max(
    1,
    ...rows.map(row => Math.max(row.buyerWealthCents, row.renterWealthCents))
  );

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <Card className="gap-8 md:p-8 lg:sticky lg:top-6">
        <Group title="O imóvel">
          <CalcField
            id="rvb-property"
            label="Valor do imóvel"
            onChange={set('property')}
            suffix="R$"
            value={fields.property}
          />
          <CalcField
            hint="Costuma ser de 0,3% a 0,6% do valor por mês."
            id="rvb-rent"
            label="Aluguel de um igual"
            onChange={set('rent')}
            suffix="R$/mês"
            value={fields.rent}
          />
          <CalcField
            id="rvb-appreciation"
            label="Valorização"
            onChange={set('appreciation')}
            suffix="% a.a."
            value={fields.appreciation}
          />
          <CalcField
            hint="IGP-M ou IPCA, a cada 12 meses."
            id="rvb-rent-adjustment"
            label="Reajuste do aluguel"
            onChange={set('rentAdjustment')}
            suffix="% a.a."
            value={fields.rentAdjustment}
          />
        </Group>
        <Group title="O financiamento">
          <CalcField
            hint={`Financiado: ${formatCents(Math.max(0, property - down))}`}
            id="rvb-down"
            label="Entrada"
            onChange={set('down')}
            suffix="R$"
            value={fields.down}
          />
          <CalcField
            hint="ITBI, escritura, registro e taxas."
            id="rvb-costs"
            label="Custos da compra"
            onChange={set('costs')}
            suffix="R$"
            value={fields.costs}
          />
          <CalcField
            hint="O CET do banco é o mais fiel."
            id="rvb-financing"
            label="Juros"
            onChange={set('financing')}
            suffix="% a.a."
            value={fields.financing}
          />
          <CalcField
            hint={term ? years(term) : undefined}
            id="rvb-term"
            label="Prazo"
            onChange={set('term')}
            suffix="meses"
            value={fields.term}
          />
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-sm font-medium" id="rvb-system">
              Sistema de amortização
            </span>
            <div
              aria-labelledby="rvb-system"
              className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
              role="radiogroup"
            >
              {(['PRICE', 'SAC'] as const).map(option => (
                <Button
                  aria-checked={option === system}
                  className={cn(
                    'h-9 rounded-lg',
                    option === system
                      ? 'bg-card text-foreground shadow-xs hover:bg-card'
                      : 'text-muted-foreground'
                  )}
                  key={option}
                  onClick={() => setSystem(option)}
                  role="radio"
                  variant="ghost"
                >
                  {option === 'PRICE' ? 'Price · parcela fixa' : 'SAC · parcela cai'}
                </Button>
              ))}
            </div>
          </div>
        </Group>
        <Group title="O investimento">
          <CalcField
            hint="Já sem o imposto."
            id="rvb-investment"
            label="Rendimento"
            onChange={set('investment')}
            suffix="% a.a."
            value={fields.investment}
          />
          <p className="text-sm text-muted-foreground sm:pt-7">
            Os dois gastam o mesmo por mês: quem aluga investe a entrada, os custos e o que a
            parcela custaria a mais que o aluguel.
          </p>
        </Group>
      </Card>

      <div className="flex min-w-0 flex-col gap-5">
        {!result || !last ? (
          <Card>
            <p className="text-muted-foreground">
              Confira os valores, o prazo (até 600 meses) e as taxas para calcular.
            </p>
          </Card>
        ) : (
          <>
            <Card className="gap-6 md:p-8">
              <div className="flex flex-col gap-1">
                <p className="text-muted-foreground">
                  Em {years(term)}, {buying ? 'financiar' : 'alugar e investir'} deixa você com
                </p>
                <p className="text-4xl font-semibold tracking-tight text-primary tabular-nums">
                  {formatCents(gap)} a mais
                </p>
                <p className="text-muted-foreground">
                  {result.buyerAheadFrom === null
                    ? 'Com esses números, comprar não passa alugar em nenhum momento do prazo.'
                    : result.buyerAheadFrom === 1
                      ? 'Comprar fica à frente desde o primeiro mês.'
                      : `Comprar passa alugar depois de ${years(result.buyerAheadFrom - 1)} e fica à frente até o fim.`}
                </p>
              </div>
              <dl className="flex flex-col gap-4">
                {[
                  {
                    ahead: buying,
                    icon: HouseIcon,
                    label: 'Financiar',
                    value: last.buyerWealthCents,
                  },
                  {
                    ahead: !buying,
                    icon: KeyRoundIcon,
                    label: 'Alugar e investir',
                    value: last.renterWealthCents,
                  },
                ].map(path => (
                  <div className="flex flex-col gap-1.5" key={path.label}>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="flex items-center gap-2 font-medium">
                        <path.icon className="size-4 text-ink" />
                        {path.label}
                        <span className="text-sm font-normal text-muted-foreground">
                          · patrimônio no fim
                        </span>
                      </dt>
                      <dd
                        className={cn(
                          'text-lg tabular-nums',
                          path.ahead ? 'font-semibold' : 'text-muted-foreground'
                        )}
                      >
                        {formatCents(path.value)}
                      </dd>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          path.ahead ? 'bg-primary' : 'bg-primary/35'
                        )}
                        style={{ width: `${(Math.max(0, path.value) / top) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </dl>
            </Card>

            <Card className="md:p-8">
              <h2 className="text-lg font-semibold tracking-tight">O que cada caminho custa</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <Costs
                  rows={[
                    ['Primeira parcela', formatCents(result.points[0]!.installmentCents)],
                    ['Total em parcelas', formatCents(result.totalInstallmentsCents)],
                    ['Só de juros', formatCents(result.totalInterestCents)],
                  ]}
                  title="Financiar"
                />
                <Costs
                  rows={[
                    ['Primeiro aluguel', formatCents(result.points[0]!.rentCents)],
                    ['Último aluguel', formatCents(last.rentCents)],
                    ['Total em aluguel', formatCents(result.totalRentCents)],
                  ]}
                  title="Alugar"
                />
              </div>
            </Card>

            <Card className="gap-4 md:p-8">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold tracking-tight">Ano a ano</h2>
                <p className="text-muted-foreground">
                  Financiar: o imóvel valorizado menos o que ainda deve, mais o que sobrou
                  investido. Alugar: tudo o que foi investido.
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ano</TableHead>
                    <TableHead className="hidden w-[36%] sm:table-cell" />
                    <TableHead className="text-right">
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden className="size-2 rounded-full bg-primary" />
                        Financiar
                      </span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden className="size-2 rounded-full bg-primary/35" />
                        Alugar
                      </span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map(row => (
                    <TableRow key={row.month}>
                      <TableCell className="tabular-nums">
                        {row.month % 12 === 0 ? row.month / 12 : years(row.month)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex flex-col gap-1">
                          <div
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${(Math.max(0, row.buyerWealthCents) / top) * 100}%` }}
                          />
                          <div
                            className="h-1.5 rounded-full bg-primary/35"
                            style={{
                              width: `${(Math.max(0, row.renterWealthCents) / top) * 100}%`,
                            }}
                          />
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums',
                          row.buyerWealthCents >= row.renterWealthCents
                            ? 'font-semibold'
                            : 'text-muted-foreground'
                        )}
                      >
                        {formatCents(row.buyerWealthCents)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums',
                          row.renterWealthCents > row.buyerWealthCents
                            ? 'font-semibold'
                            : 'text-muted-foreground'
                        )}
                      >
                        {formatCents(row.renterWealthCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rows.length > shown.length || all ? (
                <Button
                  className="self-start rounded-full"
                  onClick={() => setAll(!all)}
                  variant="secondary"
                >
                  {all ? 'Mostrar de 5 em 5 anos' : 'Mostrar todos os anos'}
                </Button>
              ) : null}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

/** A part of the calculator's form: its title, then its fields two by two. */
function Group({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-semibold">{title}</h2>
      <div className="grid items-start gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** What one path costs, line by line. */
function Costs({ rows, title }: { rows: [string, string][]; title: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-secondary/60 p-4">
      <h3 className="font-medium">{title}</h3>
      <dl className="flex flex-col gap-2">
        {rows.map(([label, value]) => (
          <div className="flex justify-between gap-3" key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
