import {
  parseMoney,
  parsePercent,
  rentVsBuy,
  type AmortizationSystem,
  type RentVsBuyPoint,
} from '@zapbots/finance';
import { HouseIcon, KeyRoundIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

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
    <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex flex-col gap-5">
        <Card>
          <h2 className="font-semibold">O imóvel</h2>
          <CalcField
            id="rvb-property"
            label="Valor do imóvel"
            onChange={set('property')}
            suffix="R$"
            value={fields.property}
          />
          <CalcField
            hint="Costuma ficar entre 0,3% e 0,6% do valor do imóvel por mês."
            id="rvb-rent"
            label="Aluguel de um imóvel igual"
            onChange={set('rent')}
            suffix="R$ por mês"
            value={fields.rent}
          />
          <CalcField
            id="rvb-appreciation"
            label="Valorização do imóvel"
            onChange={set('appreciation')}
            suffix="% ao ano"
            value={fields.appreciation}
          />
          <CalcField
            hint="IGP-M ou IPCA, aplicado a cada 12 meses."
            id="rvb-rent-adjustment"
            label="Reajuste do aluguel"
            onChange={set('rentAdjustment')}
            suffix="% ao ano"
            value={fields.rentAdjustment}
          />
        </Card>
        <Card>
          <h2 className="font-semibold">O financiamento</h2>
          <CalcField
            hint={`Financiado: ${formatCents(Math.max(0, property - down))}`}
            id="rvb-down"
            label="Entrada"
            onChange={set('down')}
            suffix="R$"
            value={fields.down}
          />
          <CalcField
            hint="ITBI, escritura, registro e taxas do banco, pagos à vista."
            id="rvb-costs"
            label="Custos da compra"
            onChange={set('costs')}
            suffix="R$"
            value={fields.costs}
          />
          <CalcField
            id="rvb-term"
            label="Prazo"
            onChange={set('term')}
            suffix="meses"
            value={fields.term}
          />
          <CalcField
            hint="O custo efetivo total (CET) do banco é o mais fiel."
            id="rvb-financing"
            label="Juros do financiamento"
            onChange={set('financing')}
            suffix="% ao ano"
            value={fields.financing}
          />
          <div className="flex gap-1">
            {(['PRICE', 'SAC'] as const).map(option => (
              <Button
                className={cn(
                  'h-7 rounded-full px-3 text-xs',
                  option === system && 'bg-accent text-primary'
                )}
                key={option}
                onClick={() => setSystem(option)}
                size="sm"
                variant="ghost"
              >
                {option === 'PRICE' ? 'Price' : 'SAC'}
              </Button>
            ))}
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold">O dinheiro investido</h2>
          <CalcField
            hint="Já descontado o imposto. Quem aluga investe a entrada, os custos e o que a parcela custaria a mais que o aluguel."
            id="rvb-investment"
            label="Rendimento"
            onChange={set('investment')}
            suffix="% ao ano"
            value={fields.investment}
          />
        </Card>
      </div>

      <div className="flex flex-col gap-5">
        {!result || !last ? (
          <Card>
            <p className="text-sm text-muted-foreground">
              Confira os valores, o prazo (até 600 meses) e as taxas para calcular.
            </p>
          </Card>
        ) : (
          <>
            <Card className="gap-2 bg-accent shadow-none">
              <p className="text-sm font-medium text-accent-foreground">
                Em {years(term)}, {buying ? 'financiar' : 'alugar e investir'} deixa você com
              </p>
              <p className="text-3xl font-semibold tracking-tight text-primary tabular-nums">
                {formatCents(gap)} a mais
              </p>
              <p className="text-sm text-accent-foreground">
                {result.buyerAheadFrom === null
                  ? 'Com esses números, comprar não passa alugar em nenhum momento do prazo.'
                  : result.buyerAheadFrom === 1
                    ? 'Comprar fica à frente desde o primeiro mês.'
                    : `Comprar passa alugar depois de ${years(result.buyerAheadFrom - 1)} e fica à frente até o fim.`}
              </p>
            </Card>

            <div className="grid gap-5 sm:grid-cols-2">
              <Card className={cn('gap-3', buying && 'ring-2 ring-primary')}>
                <div className="flex items-center gap-2">
                  <HouseIcon className="size-5 text-primary" />
                  <h2 className="text-lg font-semibold">Financiar</h2>
                </div>
                <dl className="grid gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Patrimônio no fim</dt>
                    <dd className="text-2xl font-semibold tabular-nums">
                      {formatCents(last.buyerWealthCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Primeira parcela</dt>
                    <dd className="tabular-nums">
                      {formatCents(result.points[0]!.installmentCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Total em parcelas</dt>
                    <dd className="tabular-nums">{formatCents(result.totalInstallmentsCents)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Só de juros</dt>
                    <dd className="font-medium text-destructive tabular-nums">
                      {formatCents(result.totalInterestCents)}
                    </dd>
                  </div>
                </dl>
              </Card>
              <Card className={cn('gap-3', !buying && 'ring-2 ring-primary')}>
                <div className="flex items-center gap-2">
                  <KeyRoundIcon className="size-5 text-primary" />
                  <h2 className="text-lg font-semibold">Alugar e investir</h2>
                </div>
                <dl className="grid gap-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Patrimônio no fim</dt>
                    <dd className="text-2xl font-semibold tabular-nums">
                      {formatCents(last.renterWealthCents)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Primeiro aluguel</dt>
                    <dd className="tabular-nums">{formatCents(result.points[0]!.rentCents)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Último aluguel</dt>
                    <dd className="tabular-nums">{formatCents(last.rentCents)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Total em aluguel</dt>
                    <dd className="tabular-nums">{formatCents(result.totalRentCents)}</dd>
                  </div>
                </dl>
              </Card>
            </div>

            <Card className="gap-4">
              <div>
                <h2 className="font-semibold">Ano a ano</h2>
                <p className="text-sm text-muted-foreground">
                  Financiar: o imóvel valorizado menos o que ainda deve, mais o que sobrou
                  investido. Alugar: tudo o que foi investido.
                </p>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ano</TableHead>
                    <TableHead className="w-[38%]" />
                    <TableHead className="text-right">Financiar</TableHead>
                    <TableHead className="text-right">Alugar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map(row => (
                    <TableRow key={row.month}>
                      <TableCell className="tabular-nums">
                        {row.month % 12 === 0 ? row.month / 12 : years(row.month)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${(row.buyerWealthCents / top) * 100}%` }}
                          />
                          <div
                            className="h-1.5 rounded-full bg-primary/35"
                            style={{ width: `${(row.renterWealthCents / top) * 100}%` }}
                          />
                        </div>
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums',
                          row.buyerWealthCents >= row.renterWealthCents && 'font-semibold'
                        )}
                      >
                        {formatCents(row.buyerWealthCents)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right tabular-nums',
                          row.renterWealthCents > row.buyerWealthCents && 'font-semibold'
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
