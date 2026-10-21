import { useMutation, useQuery } from '@apollo/client/react';
import {
  AddIncomeSourceDocument,
  AddTaxDocument,
  BotAlertsDocument,
  CreateCreditCardDocument,
  CreateCreditOperationDocument,
  DeleteTaxDocument,
  HolderDocument,
  MarketIndicatorsDocument,
  UpsertStatementDocument,
  ViewerHolderDocument,
  type HolderQuery,
  type Modality,
  type TaxFrequency,
} from '@zapbots/graphql/client';
import {
  addMonths,
  ImpliedRateError,
  impliedMonthlyRate,
  isFinancing,
  MODALITIES,
  MODALITY_KEYS,
  monthlyToAnnualRate,
  today,
} from '@zapbots/finance';
import { ArrowDownIcon, PlusIcon, XIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { BotPage } from '../components/BotPage';
import { AlertList } from '../components/AlertList';
import { AssessmentPanel } from '../components/AssessmentPanel';
import { ConsentBanner } from '../components/ConsentBanner';
import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import { Sheet, SheetRow } from '../components/Sheet';
import { PayoffPlanPanel } from '../components/PayoffPlanPanel';
import { ScrPanel } from '../components/ScrPanel';
import { formatCents, formatDate, formatPercent, parseCents, parsePercent } from '../lib/format';

type Holder = NonNullable<HolderQuery['holder']>;

/** Reads a FormData field as trimmed text, `null` when blank. */
const text = (values: FormData, key: string) => String(values.get(key) ?? '').trim() || null;

/** A labelled form field; `hint` says what to type when the label alone does not. */
function Field({
  children,
  hint,
  id,
  label,
}: {
  children: ReactNode;
  hint?: string;
  id: string;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const FORM_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] items-start gap-3';

/**
 * The signed-in User's Holder (docs/adr/0007), which every section of the Caishen's page reads.
 * `holder` is `null` while loading and `undefined` when it failed.
 */
function useHolder(): Holder | null | undefined {
  const { data: viewer } = useQuery(ViewerHolderDocument);
  const id = viewer?.viewerHolder.id;
  const { data, loading } = useQuery(HolderDocument, { skip: !id, variables: { id: id! } });
  if (data?.holder) return data.holder;
  return loading || !viewer ? null : undefined;
}

/** A section of the Caishen's page once the Holder is there. */
function HolderSection({
  children,
  description,
  title,
}: {
  children: (holder: Holder) => ReactNode;
  description?: (holder: Holder) => ReactNode;
  title: string;
}) {
  const holder = useHolder();
  if (holder === null) return <PageSkeleton />;
  if (!holder) return <p>Não foi possível carregar suas Finanças.</p>;
  return (
    <BotPage bot="FINANCE" description={description?.(holder)} title={title}>
      {children(holder)}
    </BotPage>
  );
}

/** Visão geral: the Alerts, the Assessment, the SCR and, with debts to compare, the payoff plan. */
export function FinanceOverviewPage() {
  const { data: market } = useQuery(MarketIndicatorsDocument);
  const { data: alerts } = useQuery(BotAlertsDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { key: 'FINANCE' },
  });
  const indicators = market?.marketIndicators;

  return (
    <HolderSection
      description={holder => (
        <>
          Renda mensal líquida{' '}
          <span className="text-foreground tabular-nums">
            {formatCents(holder.monthlyIncomeCents)}
          </span>
          {indicators && (
            <span title="Fonte: Bacen (SGS)">
              {' '}
              · Selic {indicators.selic ?? '—'}% · CDI {indicators.cdi ?? '—'}% · IPCA{' '}
              {indicators.ipca ?? '—'}%
            </span>
          )}
        </>
      )}
      title="Visão geral"
    >
      {holder => (
        <>
          {Boolean(alerts?.bot.alerts.length) && (
            <Card className="border-ink">
              <CardHeader>
                <CardTitle>Avisos</CardTitle>
                <CardDescription>
                  O que merece atenção agora, do mais urgente ao menos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AlertList alerts={alerts!.bot.alerts} />
              </CardContent>
            </Card>
          )}
          <ConsentBanner holder={holder} />
          <AssessmentPanel holder={holder} />
          <ScrPanel holder={holder} />
          {holder.creditOperations.length > 1 && <PayoffPlanPanel holderId={holder.id} />}
        </>
      )}
    </HolderSection>
  );
}

/**
 * Financeiro: what comes in (Salário), what goes to the government (Impostos) and every Credit
 * Operation and card (Obrigações), on one page. The figures on top lead to each part.
 */
export function FinancesPage() {
  const { hash } = useLocation();
  const holder = useHolder();
  // Opened on one part (from the Dashboard or an Alert): bring it into view once it is there.
  useEffect(() => {
    if (holder && hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, holder]);

  return (
    <HolderSection title="Financeiro">
      {holder => (
        <>
          <Summary holder={holder} />
          <IncomeSection holder={holder} />
          <TaxesSection holder={holder} />
          <ObligationsSection holder={holder} />
        </>
      )}
    </HolderSection>
  );
}

/** Whole cents a year: yearly Taxes as typed, monthly ones twelve times (docs/adr/0004). */
const taxesPerYear = (holder: Holder) =>
  holder.taxes.reduce(
    (total, tax) => total + (tax.frequency === 'MONTHLY' ? tax.amountCents * 12 : tax.amountCents),
    0
  );

const outstandingOf = (holder: Holder) =>
  holder.creditOperations.reduce((total, item) => total + item.outstandingBalanceCents, 0);

/** The three totals, large, each one the way to its part. */
function Summary({ holder }: { holder: Holder }) {
  const figures = [
    { id: 'income', label: 'Renda mensal', value: holder.monthlyIncomeCents },
    { id: 'taxes', label: 'Impostos no ano', value: taxesPerYear(holder) },
    { id: 'obligations', label: 'Saldo devedor', value: outstandingOf(holder) },
  ];
  return (
    <nav aria-label="Partes do Financeiro" className="grid gap-3 sm:grid-cols-3">
      {figures.map((figure, index) => (
        <motion.a
          animate={{ opacity: 1, y: 0 }}
          className="group flex flex-col gap-2 rounded-2xl bg-card p-6 transition-colors hover:bg-card/70"
          href={`#${figure.id}`}
          initial={{ opacity: 0, y: 16 }}
          key={figure.id}
          transition={{ delay: index * 0.06, duration: 0.5, ease: EASE }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="text-base">{figure.label}</span>
          <strong className="text-4xl font-semibold tracking-[-0.03em] tabular-nums">
            {formatCents(figure.value)}
          </strong>
          <span className="flex items-center gap-1 text-sm text-muted-foreground transition-colors group-hover:text-foreground">
            Ver detalhes
            <ArrowDownIcon className="size-3.5 transition-transform group-hover:translate-y-0.5" />
          </span>
        </motion.a>
      ))}
    </nav>
  );
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * One part of Financeiro: a white sheet with its title, a line on what it holds, its total, the
 * things registered and, behind a button, the form for a new one. The form closes by itself once
 * `count` changes, that is, once what it added is there.
 */
function Part({
  addLabel,
  children,
  count,
  empty,
  form,
  id,
  intro,
  title,
  total,
}: {
  addLabel: string;
  children: ReactNode;
  count: number;
  empty: string;
  form: ReactNode;
  id: string;
  intro: string;
  title: string;
  total?: ReactNode;
}) {
  const [adding, setAdding] = useState(false);
  useEffect(() => setAdding(false), [count]);

  return (
    <Sheet id={id} intro={intro} title={title} total={total}>
      {count > 0 ? children : <p className="text-muted-foreground">{empty}</p>}

      <AnimatePresence initial={false} mode="wait">
        {adding ? (
          <motion.div
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden"
            exit={{ height: 0, opacity: 0 }}
            initial={{ height: 0, opacity: 0 }}
            key="form"
            transition={{ duration: 0.35, ease: EASE }}
          >
            <div className="flex flex-col gap-4 rounded-xl bg-secondary p-5 md:p-6 [&_[data-slot=select-trigger]]:bg-card [&_input]:bg-card">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">{addLabel}</h3>
                <Button
                  aria-label="Fechar"
                  onClick={() => setAdding(false)}
                  size="icon-sm"
                  title="Fechar"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </div>
              {form}
            </div>
          </motion.div>
        ) : (
          <motion.div
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="button"
          >
            <Button onClick={() => setAdding(true)} variant="outline">
              <PlusIcon />
              {addLabel}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

/** "dias 15 e 30" */
function daysLabel(days: number[]): string {
  if (days.length === 1) return `dia ${days[0]}`;
  return `dias ${days.slice(0, -1).join(', ')} e ${days.at(-1)}`;
}

function IncomeSection({ holder }: { holder: Holder }) {
  const [addIncome, { error }] = useMutation(AddIncomeSourceDocument, {
    refetchQueries: [HolderDocument],
  });
  const [times, setTimes] = useState(1);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const monthlyNetCents = parseCents(String(values.get('amount')));
    if (monthlyNetCents == null) return;
    const paydays = Array.from({ length: times }, (_, index) =>
      Number(values.get(`payday-${index}`))
    );
    try {
      await addIncome({
        variables: {
          input: {
            description: text(values, 'description')!,
            holderId: holder.id,
            monthlyNetCents,
            paydays,
            startsOn: text(values, 'startsOn') ?? today(),
          },
        },
      });
      form.reset();
      setTimes(1);
    } catch {
      // Shown by `error` under the form; the typed values stay.
    }
  };

  return (
    <Part
      addLabel="Adicionar renda"
      count={holder.incomeSources.length}
      empty="Nenhuma renda cadastrada. Sem ela, o Caishen não sabe quanto sobra no mês."
      form={
        <form className="flex flex-col gap-5" onSubmit={submit}>
          <div className={FORM_GRID}>
            <Field id="income-description" label="Descrição">
              <Input
                id="income-description"
                name="description"
                placeholder="Salário, pró-labore…"
                required
              />
            </Field>
            <Field
              hint="O total do mês, já com os descontos."
              id="income-amount"
              label="Valor líquido mensal (R$)"
            >
              <Input
                id="income-amount"
                inputMode="decimal"
                name="amount"
                placeholder="5.000,00"
                required
              />
            </Field>
            <Field id="income-times" label="Quantas vezes recebe por mês">
              <Select onValueChange={value => setTimes(Number(value))} value={String(times)}>
                <SelectTrigger className="w-full" id="income-times">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map(count => (
                    <SelectItem key={count} value={String(count)}>
                      {count === 1 ? '1 vez' : `${count} vezes`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {Array.from({ length: times }, (_, index) => (
              <Field
                id={`income-payday-${index}`}
                key={index}
                label={times === 1 ? 'Dia do pagamento' : `Dia do ${index + 1}º pagamento`}
              >
                <Input
                  id={`income-payday-${index}`}
                  inputMode="numeric"
                  max={31}
                  min={1}
                  name={`payday-${index}`}
                  placeholder={times === 1 ? '5' : String(Math.min(30, 15 * (index + 1)))}
                  required
                  type="number"
                />
              </Field>
            ))}
            <Field hint="Vazio: hoje." id="income-starts" label="Desde">
              <Input id="income-starts" name="startsOn" type="date" />
            </Field>
          </div>
          <Button className="self-start" type="submit">
            Salvar salário
          </Button>
          {error && <FormError message={error.message} />}
        </form>
      }
      id="income"
      intro="O que entra todo mês, já com os descontos."
      title="Salário"
      total={formatCents(holder.monthlyIncomeCents)}
    >
      <ul className="flex flex-col gap-2">
        {holder.incomeSources.map(source => (
          <SheetRow
            amount={formatCents(source.monthlyNetCents)}
            detail={
              source.paydays.length
                ? `${source.paydays.length}x por mês, ${daysLabel(source.paydays)}`
                : `desde ${formatDate(source.startsOn)}`
            }
            key={source.id}
            name={source.description}
          />
        ))}
      </ul>
    </Part>
  );
}

const FREQUENCIES: { label: string; value: TaxFrequency }[] = [
  { label: 'Todo mês', value: 'MONTHLY' },
  { label: 'Uma vez por ano', value: 'YEARLY' },
];

function taxLabel(tax: Holder['taxes'][number]): string {
  if (tax.frequency === 'MONTHLY') return `todo mês, dia ${tax.dueDay}`;
  const month = MONTHS[(tax.dueMonth ?? 1) - 1]!.toLowerCase();
  const split = tax.installments === 1 ? 'à vista' : `em ${tax.installments}x`;
  return `por ano, ${split}, a partir de ${tax.dueDay} de ${month}`;
}

function TaxesSection({ holder }: { holder: Holder }) {
  const [addTax, { error }] = useMutation(AddTaxDocument, { refetchQueries: [HolderDocument] });
  const [deleteTax] = useMutation(DeleteTaxDocument, { refetchQueries: [HolderDocument] });
  const [frequency, setFrequency] = useState<TaxFrequency>('YEARLY');
  const [installments, setInstallments] = useState(1);
  const [dueMonth, setDueMonth] = useState(1);
  const yearly = frequency === 'YEARLY';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const amountCents = parseCents(String(values.get('amount')));
    if (amountCents == null) return;
    try {
      await addTax({
        variables: {
          input: {
            amountCents,
            dueDay: Number(values.get('dueDay')),
            dueMonth: yearly ? dueMonth : null,
            frequency,
            holderId: holder.id,
            installments: yearly ? installments : 1,
            name: text(values, 'name')!,
          },
        },
      });
      form.reset();
      setInstallments(1);
    } catch {
      // Shown by `error` under the form; the typed values stay.
    }
  };

  return (
    <Part
      addLabel="Adicionar imposto"
      count={holder.taxes.length}
      empty="Nenhum imposto cadastrado. IPVA, IPTU e DAS entram nos vencimentos do mês."
      form={
        <form className="flex flex-col gap-5" onSubmit={submit}>
          <div className={FORM_GRID}>
            <Field id="tax-name" label="Imposto">
              <Input id="tax-name" name="name" placeholder="IPVA, IPTU, DAS…" required />
            </Field>
            <Field id="tax-frequency" label="Frequência">
              <Select
                onValueChange={value => setFrequency(value as TaxFrequency)}
                value={frequency}
              >
                <SelectTrigger className="w-full" id="tax-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="tax-amount" label={yearly ? 'Valor total no ano (R$)' : 'Valor mensal (R$)'}>
              <Input
                id="tax-amount"
                inputMode="decimal"
                name="amount"
                placeholder={yearly ? '2.400,00' : '76,60'}
                required
              />
            </Field>
            {yearly && (
              <>
                <Field id="tax-installments" label="Parcelas">
                  <Select
                    onValueChange={value => setInstallments(Number(value))}
                    value={String(installments)}
                  >
                    <SelectTrigger className="w-full" id="tax-installments">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, index) => index + 1).map(count => (
                        <SelectItem key={count} value={String(count)}>
                          {count === 1 ? 'À vista' : `${count}x`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field
                  id="tax-month"
                  label={installments === 1 ? 'Mês do vencimento' : 'Mês da 1ª parcela'}
                >
                  <Select
                    onValueChange={value => setDueMonth(Number(value))}
                    value={String(dueMonth)}
                  >
                    <SelectTrigger className="w-full" id="tax-month">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, index) => (
                        <SelectItem key={month} value={String(index + 1)}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </>
            )}
            <Field id="tax-day" label="Dia do vencimento">
              <Input
                id="tax-day"
                inputMode="numeric"
                max={31}
                min={1}
                name="dueDay"
                placeholder="10"
                required
                type="number"
              />
            </Field>
          </div>
          <Button className="self-start" type="submit">
            Adicionar imposto
          </Button>
          {error && <FormError message={error.message} />}
        </form>
      }
      id="taxes"
      intro="O que vai para o governo, todo mês ou uma vez por ano."
      title="Impostos"
      total={
        holder.taxes.length ? (
          <>
            {formatCents(taxesPerYear(holder))}
            <span className="block text-sm font-normal text-muted-foreground">por ano</span>
          </>
        ) : undefined
      }
    >
      <ul className="flex flex-col gap-2">
        {holder.taxes.map(tax => (
          <SheetRow
            action={
              <Button
                aria-label={`Remover ${tax.name}`}
                onClick={() => void deleteTax({ variables: { id: tax.id } })}
                size="icon-sm"
                title="Remover"
                variant="ghost"
              >
                <XIcon />
              </Button>
            }
            amount={formatCents(tax.amountCents)}
            detail={taxLabel(tax)}
            key={tax.id}
            name={tax.name}
          />
        ))}
      </ul>
    </Part>
  );
}

/** What a new Credit Operation of each type asks for. */
const OPERATION_TYPES = {
  FINANCING: {
    collateral: true,
    defaultModality: 'VEHICLE_FINANCING',
    label: 'Financiamento',
    modalities: MODALITY_KEYS.filter(isFinancing),
    namePlaceholder: 'Financiamento do carro',
    principalLabel: 'Valor financiado (R$)',
    submit: 'Adicionar financiamento',
  },
  LOAN: {
    collateral: false,
    defaultModality: 'PERSONAL_LOAN',
    label: 'Empréstimo',
    modalities: MODALITY_KEYS.filter(key => !isFinancing(key)),
    namePlaceholder: 'Empréstimo pessoal',
    principalLabel: 'Valor emprestado (R$)',
    submit: 'Adicionar empréstimo',
  },
} satisfies Record<
  string,
  {
    collateral: boolean;
    defaultModality: Modality;
    label: string;
    modalities: Modality[];
    namePlaceholder: string;
    principalLabel: string;
    submit: string;
  }
>;

type OperationType = keyof typeof OPERATION_TYPES;
type ObligationType = OperationType | 'CARD';

const OBLIGATION_TYPES: { label: string; value: ObligationType }[] = [
  { label: OPERATION_TYPES.LOAN.label, value: 'LOAN' },
  { label: OPERATION_TYPES.FINANCING.label, value: 'FINANCING' },
  { label: 'Cartão de crédito', value: 'CARD' },
];

function ObligationsSection({ holder }: { holder: Holder }) {
  const [type, setType] = useState<ObligationType>('LOAN');

  return (
    <Part
      addLabel="Adicionar Obrigação"
      count={holder.creditOperations.length + holder.creditCards.length}
      empty="Nenhuma Obrigação cadastrada. Empréstimos, financiamentos e cartões entram aqui."
      form={
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Parcelas vencidas contam como pagas em dia; registre Atrasos na página da operação.
          </p>
          <div className={FORM_GRID}>
            <Field id="obligation-type" label="Tipo">
              <Select onValueChange={value => setType(value as ObligationType)} value={type}>
                <SelectTrigger className="w-full bg-card" id="obligation-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OBLIGATION_TYPES.map(item => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {type === 'CARD' ? (
            <CardForm holder={holder} />
          ) : (
            <OperationForm holder={holder} key={type} type={type} />
          )}
        </div>
      }
      id="obligations"
      intro="Empréstimos, financiamentos e cartões, com o que falta pagar."
      title="Obrigações"
      total={
        holder.creditOperations.length ? (
          <>
            {formatCents(outstandingOf(holder))}
            <span className="block text-sm font-normal text-muted-foreground">saldo devedor</span>
          </>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-8">
        {holder.creditOperations.length > 0 && <OperationsTable holder={holder} />}
        {holder.creditCards.length > 0 && <CardsList holder={holder} />}
      </div>
    </Part>
  );
}

function OperationsTable({ holder }: { holder: Holder }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">Operações de Crédito</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Operação</TableHead>
            <TableHead>Modalidade</TableHead>
            <TableHead className="text-right">Taxa a.m.</TableHead>
            <TableHead className="text-right">Parcela</TableHead>
            <TableHead className="text-right">Pagas</TableHead>
            <TableHead>Estágio</TableHead>
            <TableHead className="text-right">Saldo devedor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {holder.creditOperations.map(operation => (
            <TableRow key={operation.id}>
              <TableCell>
                <Link
                  className="font-medium text-ink underline-offset-4 hover:underline"
                  to={`/caishen/operations/${operation.id}`}
                >
                  {operation.name}
                </Link>
                {operation.lender && (
                  <span className="text-muted-foreground"> · {operation.lender}</span>
                )}
              </TableCell>
              <TableCell>{operation.modalityLabel}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatPercent(operation.monthlyRate)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCents(operation.installmentCents)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {operation.paidInstallments}/{operation.termMonths}
              </TableCell>
              <TableCell
                className={operation.stage > 1 ? 'text-destructive' : 'text-muted-foreground'}
              >
                {operation.stage}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCents(operation.outstandingBalanceCents)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * The rate the installment implies, worked out while the form is filled in, the same way the
 * server does when no rate is typed. `null` until principal, term and installment make sense.
 */
function impliedRatePreview(
  system: 'PRICE' | 'SAC',
  principal: string,
  term: string,
  installment: string
): { annual: number; monthly: number } | { error: string } | null {
  const principalCents = parseCents(principal);
  const installmentCents = parseCents(installment);
  const termMonths = Number(term);
  if (!principalCents || !installmentCents || !Number.isInteger(termMonths) || termMonths <= 0) {
    return null;
  }
  try {
    const monthly = impliedMonthlyRate(system, principalCents, installmentCents, termMonths);
    return { annual: monthlyToAnnualRate(monthly).toNumber(), monthly: monthly.toNumber() };
  } catch (error) {
    if (error instanceof ImpliedRateError) return { error: error.message };
    throw error;
  }
}

function OperationForm({ holder, type }: { holder: Holder; type: OperationType }) {
  const config = OPERATION_TYPES[type];
  const [createOperation, { error }] = useMutation(CreateCreditOperationDocument, {
    refetchQueries: [HolderDocument],
  });
  const [system, setSystem] = useState<'PRICE' | 'SAC'>('PRICE');
  const [typed, setTyped] = useState({ installment: '', principal: '', rate: '', term: '' });
  const preview = typed.rate.trim()
    ? null
    : impliedRatePreview(system, typed.principal, typed.term, typed.installment);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    // An Operation already under way: the first due date is the next one, minus what was paid.
    const paid = Number(values.get('paid') || 0);
    try {
      await createOperation({
        variables: {
          input: {
            collateralDescription: text(values, 'collateral'),
            firstDueDate: addMonths(text(values, 'nextDueDate')!, -paid),
            holderId: holder.id,
            installmentCents: parseCents(String(values.get('installment'))),
            lender: text(values, 'lender'),
            modality: values.get('modality') as Modality,
            monthlyRate: parsePercent(String(values.get('rate'))),
            name: text(values, 'name')!,
            principalCents: parseCents(String(values.get('principal')))!,
            system,
            termMonths: Number(values.get('term')),
          },
        },
      });
      form.reset();
      setTyped({ installment: '', principal: '', rate: '', term: '' });
    } catch {
      // Shown by `error` under the form; the typed values stay.
    }
  };

  return (
    <>
      <form
        className={FORM_GRID}
        onInput={event => {
          const values = new FormData(event.currentTarget);
          setTyped({
            installment: String(values.get('installment') ?? ''),
            principal: String(values.get('principal') ?? ''),
            rate: String(values.get('rate') ?? ''),
            term: String(values.get('term') ?? ''),
          });
        }}
        onSubmit={submit}
      >
        <Field id="op-name" label="Nome">
          <Input id="op-name" name="name" placeholder={config.namePlaceholder} required />
        </Field>
        <Field id="op-lender" label="Instituição">
          <Input id="op-lender" name="lender" placeholder="Banco, financeira…" />
        </Field>
        <Field id="op-modality" label="Modalidade">
          <Select defaultValue={config.defaultModality} name="modality">
            <SelectTrigger className="w-full" id="op-modality">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {config.modalities.map(key => (
                <SelectItem key={key} value={key}>
                  {MODALITIES[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="op-system" label="Sistema de amortização">
          <Select onValueChange={value => setSystem(value as 'PRICE' | 'SAC')} value={system}>
            <SelectTrigger className="w-full" id="op-system">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRICE">Price (parcela fixa)</SelectItem>
              <SelectItem value="SAC">SAC (amortização fixa)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field hint="O valor do contrato." id="op-principal" label={config.principalLabel}>
          <Input
            id="op-principal"
            inputMode="decimal"
            name="principal"
            placeholder="25.000,00"
            required
          />
        </Field>
        <Field id="op-term" label="Prazo (meses)">
          <Input id="op-term" min={1} name="term" placeholder="48" required type="number" />
        </Field>
        <Field hint="0 se ainda não pagou nenhuma." id="op-paid" label="Parcelas já pagas">
          <Input defaultValue={0} id="op-paid" min={0} name="paid" required type="number" />
        </Field>
        <Field id="op-next-due" label="Próximo vencimento">
          <Input id="op-next-due" name="nextDueDate" required type="date" />
        </Field>
        <Field
          hint={system === 'SAC' ? 'No SAC, a primeira parcela do contrato.' : undefined}
          id="op-installment"
          label="Parcela (R$)"
        >
          <Input id="op-installment" inputMode="decimal" name="installment" placeholder="850,00" />
        </Field>
        <Field hint="Só se souber a do contrato." id="op-rate" label="Taxa (% a.m.)">
          <Input
            id="op-rate"
            inputMode="decimal"
            name="rate"
            placeholder={preview && 'monthly' in preview ? formatPercent(preview.monthly) : '1,99'}
          />
        </Field>
        {config.collateral && (
          <Field id="op-collateral" label="Bem financiado">
            <Input id="op-collateral" name="collateral" placeholder="Opcional" />
          </Field>
        )}
        <Button className="mt-5.5" type="submit">
          {config.submit}
        </Button>
      </form>
      {preview && (
        <p className={'error' in preview ? 'text-destructive' : 'text-muted-foreground'}>
          {'error' in preview ? (
            preview.error
          ) : (
            <>
              Taxa calculada da parcela:{' '}
              <span className="font-medium text-foreground tabular-nums">
                {formatPercent(preview.monthly)} a.m.
              </span>{' '}
              ({formatPercent(preview.annual)} a.a.)
            </>
          )}
        </p>
      )}
      {error && <FormError message={error.message} />}
    </>
  );
}

function CardForm({ holder }: { holder: Holder }) {
  const [createCard, { error }] = useMutation(CreateCreditCardDocument, {
    refetchQueries: [HolderDocument],
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    try {
      await createCard({
        variables: {
          input: {
            closingDay: Number(values.get('closingDay')),
            dueDay: Number(values.get('dueDay')),
            holderId: holder.id,
            issuer: text(values, 'issuer'),
            limitCents: parseCents(String(values.get('limit')))!,
            name: text(values, 'name')!,
          },
        },
      });
      form.reset();
    } catch {
      // Shown by `error` under the form; the typed values stay.
    }
  };

  return (
    <>
      <form className={FORM_GRID} onSubmit={submit}>
        <Field id="card-name" label="Nome do cartão">
          <Input id="card-name" name="name" placeholder="Nubank" required />
        </Field>
        <Field id="card-issuer" label="Emissor">
          <Input id="card-issuer" name="issuer" placeholder="Opcional" />
        </Field>
        <Field id="card-limit" label="Limite (R$)">
          <Input id="card-limit" inputMode="decimal" name="limit" placeholder="8.000,00" required />
        </Field>
        <Field id="card-closing" label="Dia de fechamento">
          <Input id="card-closing" max={31} min={1} name="closingDay" required type="number" />
        </Field>
        <Field id="card-due" label="Dia de vencimento">
          <Input id="card-due" max={31} min={1} name="dueDay" required type="number" />
        </Field>
        <Button className="mt-5.5" type="submit">
          Adicionar cartão
        </Button>
      </form>
      {error && <FormError message={error.message} />}
    </>
  );
}

function CardsList({ holder }: { holder: Holder }) {
  const [upsertStatement, { error }] = useMutation(UpsertStatementDocument, {
    refetchQueries: [HolderDocument],
  });

  const submitStatement = (creditCardId: string) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const amountCents = parseCents(String(values.get('amount')));
    if (amountCents == null) return;
    try {
      await upsertStatement({
        variables: {
          input: { amountCents, creditCardId, referenceMonth: String(values.get('month')) },
        },
      });
      form.reset();
    } catch {
      // Shown by `error` under the Cards; the typed values stay.
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-lg font-semibold">Cartões</h3>
      {holder.creditCards.map(card => (
        <div className="flex flex-col gap-4 rounded-xl bg-secondary/60 p-5" key={card.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="font-medium">
              {card.name}
              {card.issuer && (
                <span className="font-normal text-muted-foreground"> · {card.issuer}</span>
              )}
            </span>
            <span className="text-sm text-muted-foreground">
              Limite {formatCents(card.limitCents)} · fecha dia {card.closingDay} · vence dia{' '}
              {card.dueDay}
            </span>
          </div>
          {card.statements.length > 0 && (
            <Table>
              <TableBody>
                {card.statements.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>Fatura {item.referenceMonth}</TableCell>
                    <TableCell className="text-muted-foreground">
                      vence {formatDate(item.dueDate)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCents(item.amountCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <form className={FORM_GRID} onSubmit={submitStatement(card.id)}>
            <Field id={`month-${card.id}`} label="Mês de vencimento">
              <Input
                className="bg-card"
                id={`month-${card.id}`}
                name="month"
                required
                type="month"
              />
            </Field>
            <Field id={`amount-${card.id}`} label="Valor da Fatura (R$)">
              <Input
                className="bg-card"
                id={`amount-${card.id}`}
                inputMode="decimal"
                name="amount"
                placeholder="1.250,00"
                required
              />
            </Field>
            <Button className="mt-5.5" type="submit" variant="outline">
              Salvar Fatura
            </Button>
          </form>
        </div>
      ))}
      {error && <FormError message={error.message} />}
    </div>
  );
}
