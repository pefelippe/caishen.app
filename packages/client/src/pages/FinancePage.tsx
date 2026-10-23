import { useMutation, useQuery } from '@apollo/client/react';
import {
  AddIncomeSourceDocument,
  AddExpenseDocument,
  AddOneOffIncomeDocument,
  AddRecurringExpenseDocument,
  AddTaxDocument,
  CreateCreditCardDocument,
  CreateCreditOperationDocument,
  DeleteTaxDocument,
  HolderDocument,
  MonthDocument,
  SetIncomeRateDocument,
  type MonthQuery,
  UpsertStatementDocument,
  ViewerHolderDocument,
  type HolderQuery,
  type Modality,
  type PaymentMethod,
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
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PencilIcon,
  PlusIcon,
  XIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { BotPage } from '../components/BotPage';
import { AssessmentPanel } from '../components/AssessmentPanel';
import { ConsentBanner } from '../components/ConsentBanner';
import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import { ConfirmDelete } from '../components/ConfirmDelete';
import { QueryError } from '../components/QueryError';
import { EditRecordDialog } from '../components/EditRecordDialog';
import { Sheet, SheetRow } from '../components/Sheet';
import { EntriesTabs } from '../components/EntriesTabs';
import { ScrPanel } from '../components/ScrPanel';
import { localToday } from '../lib/bots';
import {
  formatCents,
  formatDate,
  formatDollars,
  formatPercent,
  parseCents,
  parsePercent,
} from '../lib/format';

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
/** The Holder with how its load went: still loading, failed (and how to try again), or there. */
function useHolderQuery() {
  const viewer = useQuery(ViewerHolderDocument);
  const id = viewer.data?.viewerHolder.id;
  const holder = useQuery(HolderDocument, {
    errorPolicy: 'all',
    skip: !id,
    variables: { id: id! },
  });
  const error = viewer.error ?? (holder.data?.holder ? undefined : holder.error);
  return {
    error,
    holder: holder.data?.holder ?? null,
    retry: () => (viewer.error ? viewer.refetch() : holder.refetch()),
  };
}

/** The Holder, or `null` while it loads or when it failed (the page shows why). */
function useHolder(): Holder | null {
  return useHolderQuery().holder;
}

/** A section of the Caishen's page once the Holder is there. */
function HolderSection({
  actions,
  children,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  eyebrow?: ReactNode;
  children: (holder: Holder) => ReactNode;
  description?: (holder: Holder) => ReactNode;
  title: string;
}) {
  const { error, holder, retry } = useHolderQuery();
  if (!holder && error) {
    return (
      <QueryError error={error} onRetry={retry} title="Não foi possível carregar suas finanças" />
    );
  }
  if (!holder) return <PageSkeleton />;
  return (
    <BotPage
      actions={actions}
      bot="FINANCE"
      description={description?.(holder)}
      eyebrow={eyebrow}
      title={title}
    >
      {children(holder)}
    </BotPage>
  );
}

/**
 * Entradas: the money coming in, the Fontes de Renda that repeat and this month's Receitas
 * avulsas, with "Adicionar entrada".
 */
export function IncomePage() {
  const [params, setParams] = useSearchParams();
  const month = /^\d{4}-\d{2}$/.test(params.get('m') ?? '')
    ? params.get('m')!
    : localToday().slice(0, 7);
  const go = (delta: number) => setParams({ m: shiftMonth(month, delta) });
  return (
    <HolderSection
      actions={<AddEntryButton direction="IN" month={month} />}
      description={() => 'Tudo o que entra: a renda de todo mês e o que entra de vez em quando.'}
      eyebrow={<EntriesTabs />}
      title="Entradas"
    >
      {holder => (
        <>
          <Figures
            figures={[{ label: 'Renda fixa por mês (hoje)', value: holder.monthlyIncomeCents }]}
          />
          <IncomeSection holder={holder} />
          <MonthIncomes go={go} holderId={holder.id} month={month} />
        </>
      )}
    </HolderSection>
  );
}

/** "Outubro de 2026". */
function monthTitle(month: string) {
  const name = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(`${month}-01T00:00:00Z`));
  return name[0]!.toUpperCase() + name.slice(1);
}

/** `YYYY-MM` moved by `delta` months. */
function shiftMonth(month: string, delta: number) {
  const [year, number] = month.split('-').map(Number) as [number, number];
  const zeroBased = year * 12 + number - 1 + delta;
  return `${Math.floor(zeroBased / 12)}-${String((zeroBased % 12) + 1).padStart(2, '0')}`;
}

type IncomeLine = NonNullable<MonthQuery['holder']>['month']['incomes'][number];

/**
 * A month's money coming in, payment by payment: the Fontes de Renda on their paydays (a dollar one
 * with its rate, which can be corrected) and the Receitas avulsas, which can be deleted.
 */
function MonthIncomes({
  go,
  holderId,
  month,
}: {
  go: (delta: number) => void;
  holderId: string;
  month: string;
}) {
  const { data } = useQuery(MonthDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { holderId, month },
  });
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);
  const [rating, setRating] = useState<IncomeLine | null>(null);
  const incomes = data?.holder?.month.incomes ?? [];

  return (
    <Sheet
      id="month-incomes"
      intro="Cada recebimento do mês, em reais. Em dólar: o valor, a cotação e o que sobrou depois de IOF e spread."
      title={
        <span className="flex items-center gap-1">
          <Button aria-label="Mês anterior" onClick={() => go(-1)} size="icon-sm" variant="ghost">
            <ChevronLeftIcon />
          </Button>
          {monthTitle(month)}
          <Button aria-label="Próximo mês" onClick={() => go(1)} size="icon-sm" variant="ghost">
            <ChevronRightIcon />
          </Button>
        </span>
      }
      total={formatCents(data?.holder?.month.incomeCents ?? 0)}
    >
      {incomes.length ? (
        <ul className="flex flex-col gap-2">
          {incomes.map((line, index) => (
            <SheetRow
              action={
                line.foreign ? (
                  <Button
                    aria-label={`Corrigir a cotação de ${line.label}`}
                    onClick={() => setRating(line)}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <PencilIcon />
                  </Button>
                ) : line.kind === 'ONE_OFF' && line.id ? (
                  <Button
                    aria-label={`Apagar ${line.label}`}
                    onClick={() => setDeleting({ id: line.id!, name: line.label })}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <XIcon />
                  </Button>
                ) : undefined
              }
              amount={formatCents(line.amountCents)}
              detail={
                line.foreign
                  ? `${formatDate(line.date)} · ${formatDollars(line.foreign.amountCents)} × ${
                      line.foreign.rate == null
                        ? 'sem cotação ainda'
                        : `R$ ${line.foreign.rate.toLocaleString('pt-BR', { maximumFractionDigits: 4, minimumFractionDigits: 4 })} ${
                            line.foreign.rateSource === 'INFORMED'
                              ? '(sua cotação)'
                              : `(PTAX de ${formatDate(line.foreign.rateDate)})`
                          }`
                    }`
                  : `${formatDate(line.date)} · ${line.kind === 'ONE_OFF' ? 'avulsa' : 'renda fixa'}`
              }
              key={`${line.id}-${line.date}-${index}`}
              name={line.label}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Nada entrou neste mês.</p>
      )}
      {deleting && (
        <ConfirmDelete
          id={deleting.id}
          kind="ONE_OFF_INCOME"
          name={deleting.name}
          onClose={() => setDeleting(null)}
        />
      )}
      {rating && <RateDialog line={rating} onClose={() => setRating(null)} />}
    </Sheet>
  );
}

/** The rate a dollar payment really got, typed over the PTAX; empty goes back to the PTAX. */
function RateDialog({ line, onClose }: { line: IncomeLine; onClose: () => void }) {
  const [setRate, { error, loading }] = useMutation(SetIncomeRateDocument, {
    refetchQueries: 'active',
  });
  const [value, setValue] = useState(
    line.foreign?.rateSource === 'INFORMED' && line.foreign.rate != null
      ? String(line.foreign.rate).replace('.', ',')
      : ''
  );

  const save = async (rate: number | null) => {
    const result = await setRate({
      variables: { date: line.date, incomeSourceId: line.id!, rate },
    }).catch(() => null);
    if (result?.data) onClose();
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const rate = Number(value.replace(/\./g, '').replace(',', '.'));
    if (Number.isFinite(rate) && rate > 0) void save(rate);
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cotação de {formatDate(line.date)}</DialogTitle>
          <DialogDescription>
            A cotação que o seu banco ou app realmente usou nesse pagamento. O IOF e o spread
            continuam sendo descontados.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" id="rate-form" onSubmit={submit}>
          <Field id="rate-value" label="Reais por dólar">
            <Input
              id="rate-value"
              inputMode="decimal"
              onChange={event => setValue(event.target.value)}
              placeholder={line.foreign?.rate?.toLocaleString('pt-BR') ?? '5,40'}
              required
              value={value}
            />
          </Field>
        </form>
        {error && <FormError message={error.message} />}
        <DialogFooter>
          {line.foreign?.rateSource === 'INFORMED' && (
            <Button className="mr-auto" onClick={() => void save(null)} variant="ghost">
              Voltar para a PTAX
            </Button>
          )}
          <Button disabled={loading} form="rate-form" type="submit">
            {loading ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Score de crédito: the Caishen's Assessment, the scores the User looked up at the bureaus, and the
 * SCR of the Banco Central.
 */
export function CreditPage() {
  return (
    <HolderSection
      description={() =>
        'Sua Avaliação de crédito, os scores que você consultou e o que os bancos informaram ao Banco Central.'
      }
      title="Score de crédito"
    >
      {holder => (
        <>
          <ConsentBanner holder={holder} />
          <AssessmentPanel holder={holder} />
          <ScrPanel holder={holder} />
        </>
      )}
    </HolderSection>
  );
}

/** Brings the part in the URL's hash into view once the page has it. */
function useHashScroll(ready: boolean) {
  const { hash } = useLocation();
  useEffect(() => {
    if (ready && hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, ready]);
}

/**
 * Fixos, the second tab of Lançamentos: what repeats and so shows up in every month by itself,
 * the Fontes de Renda (Salário) and the Impostos.
 */
export function FixedPage() {
  const holder = useHolder();
  useHashScroll(Boolean(holder));
  return (
    <HolderSection
      description={() =>
        'O que sai todo mês (gastos recorrentes, empréstimos, cartões e impostos): entra sozinho em cada mês.'
      }
      actions={<AddEntryButton direction="OUT" />}
      eyebrow={<EntriesTabs />}
      title="Saídas fixas"
    >
      {holder => (
        <>
          <Figures
            figures={[
              { label: 'Recorrentes por mês', value: recurringPerMonth(holder) },
              { label: 'Saldo devedor', value: outstandingOf(holder) },
              { label: 'Impostos no ano', value: taxesPerYear(holder) },
            ]}
          />
          <RecurringSection holder={holder} />
          <ObligationsSection holder={holder} />
          <TaxesSection holder={holder} />
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

/** A page's totals, large, side by side. */
function Figures({ figures }: { figures: { label: string; value: number }[] }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl bg-border sm:grid-flow-col sm:auto-cols-fr">
      {figures.map((figure, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-1 bg-card p-6"
          initial={{ opacity: 0, y: 12 }}
          key={figure.label}
          transition={{ delay: index * 0.06, duration: 0.5, ease: EASE }}
        >
          <span className="text-sm text-muted-foreground">{figure.label}</span>
          <strong className="text-3xl font-semibold tracking-[-0.03em] tabular-nums">
            {formatCents(figure.value)}
          </strong>
        </motion.div>
      ))}
    </div>
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
  /** Without a form, adding happens elsewhere (a button at the top of the page). */
  addLabel?: string;
  children: ReactNode;
  count: number;
  empty: string;
  form?: ReactNode;
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

      {form && (
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
      )}
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

/** A Fonte de Renda: what comes in every month, net, on one or more paydays. */
export function IncomeForm({ holder, onDone }: { holder: Holder; onDone?: () => void }) {
  // 'active': the month on screen (Entradas, Lançamentos) shows the new payments too.
  const [addIncome, { error }] = useMutation(AddIncomeSourceDocument, { refetchQueries: 'active' });
  const [times, setTimes] = useState(1);
  const [currency, setCurrency] = useState<'BRL' | 'USD'>('BRL');
  const dollars = currency === 'USD';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const amountCents = parseCents(String(values.get('amount')));
    if (amountCents == null) return;
    const paydays = Array.from({ length: times }, (_, index) =>
      Number(values.get(`payday-${index}`))
    );
    try {
      await addIncome({
        variables: {
          input: {
            currency,
            description: text(values, 'description')!,
            holderId: holder.id,
            iofRate: dollars ? parsePercent(String(values.get('iof') ?? '')) : null,
            // In dollars it is typed per payment; the month is every payment together.
            monthlyNetCents: dollars ? amountCents * paydays.length : amountCents,
            paydays,
            spreadRate: dollars ? parsePercent(String(values.get('spread') ?? '')) : null,
            startsOn: text(values, 'startsOn') ?? today(),
          },
        },
      });
      form.reset();
      onDone?.();
      setTimes(1);
    } catch {
      // Shown by `error` under the form; the typed values stay.
    }
  };

  return (
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
        <Field id="income-currency" label="Moeda">
          <Select onValueChange={value => setCurrency(value as 'BRL' | 'USD')} value={currency}>
            <SelectTrigger className="w-full" id="income-currency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="BRL">Real (R$)</SelectItem>
              <SelectItem value="USD">Dólar (US$)</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field
          hint={
            dollars
              ? 'Quanto chega em cada dia de pagamento, em dólar. Vira real pela PTAX do dia.'
              : 'O total do mês, já com os descontos.'
          }
          id="income-amount"
          label={dollars ? 'Valor por pagamento (US$)' : 'Valor líquido mensal (R$)'}
        >
          <Input
            id="income-amount"
            inputMode="decimal"
            name="amount"
            placeholder={dollars ? '2.500,00' : '5.000,00'}
            required
          />
        </Field>
        {dollars && (
          <>
            <Field hint="O IOF de câmbio de entrada." id="income-iof" label="IOF (%)">
              <Input defaultValue="0,38" id="income-iof" inputMode="decimal" name="iof" />
            </Field>
            <Field
              hint="Opcional: quanto o banco ou app tira da cotação."
              id="income-spread"
              label="Spread (%)"
            >
              <Input id="income-spread" inputMode="decimal" name="spread" placeholder="1,00" />
            </Field>
          </>
        )}
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
        <Field
          hint="Se já recebe há um tempo, ponha quando começou: os meses anteriores também aparecem. Vazio: hoje."
          id="income-starts"
          label="Recebe desde"
        >
          <Input id="income-starts" name="startsOn" type="date" />
        </Field>
      </div>
      <Button className="self-start" type="submit">
        Salvar salário
      </Button>
      {error && <FormError message={error.message} />}
    </form>
  );
}

function IncomeSection({ holder }: { holder: Holder }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  return (
    <Part
      count={holder.incomeSources.length}
      empty="Nenhuma renda cadastrada. Sem ela, o Caishen não sabe quanto sobra no mês."
      id="income"
      intro="O que entra todo mês, já com os descontos."
      title="Salário"
      total={formatCents(holder.monthlyIncomeCents)}
    >
      <ul className="flex flex-col gap-2">
        {holder.incomeSources.map(source => (
          <SheetRow
            action={
              <span className="flex">
                <Button
                  aria-label={`Editar ${source.description}`}
                  onClick={() => setEditing(source.id)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <PencilIcon />
                </Button>
                <Button
                  aria-label={`Apagar ${source.description}`}
                  onClick={() => setDeleting({ id: source.id, name: source.description })}
                  size="icon-sm"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </span>
            }
            amount={
              source.currency === 'USD' ? (
                <span className="text-right">
                  {formatDollars(source.monthlyNetCents)}
                  <span className="block text-xs font-normal text-muted-foreground">
                    ≈ {formatCents(source.monthlyNetBrlCents)} hoje
                  </span>
                </span>
              ) : (
                formatCents(source.monthlyNetCents)
              )
            }
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
      {editing && (
        <EditRecordDialog
          id={editing}
          kind="INCOME_SOURCE"
          onClose={() => setEditing(null)}
          title="Fonte de Renda"
        />
      )}
      {deleting && (
        <ConfirmDelete
          id={deleting.id}
          kind="INCOME_SOURCE"
          name={deleting.name}
          onClose={() => setDeleting(null)}
        />
      )}
    </Part>
  );
}

const FREQUENCIES: { label: string; value: TaxFrequency }[] = [
  { label: 'Todo mês', value: 'MONTHLY' },
  { label: 'Uma vez por ano', value: 'YEARLY' },
];

const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
  { label: 'Cartão de crédito', value: 'CARD' },
  { label: 'Pix', value: 'PIX' },
  { label: 'Débito em conta', value: 'DEBIT' },
  { label: 'Boleto', value: 'BOLETO' },
  { label: 'Outra', value: 'OTHER' },
];

type Recurring = Holder['recurringExpenses'][number];

/** Still charged today: not cancelled, or cancelled for a later day. */
const running = (item: Recurring) => !item.endsOn || item.endsOn > localToday();

/** What the running Gastos recorrentes cost a month, a yearly one spread over twelve. */
function recurringPerMonth(holder: Holder): number {
  return holder.recurringExpenses
    .filter(running)
    .reduce(
      (total, item) =>
        total + (item.cycle === 'YEARLY' ? Math.round(item.amountCents / 12) : item.amountCents),
      0
    );
}

function recurringDetail(item: Recurring): string {
  const when =
    item.cycle === 'YEARLY'
      ? `todo ano, dia ${item.dueDay} de ${MONTHS[(item.dueMonth ?? 1) - 1]!.toLowerCase()}`
      : `todo dia ${item.dueDay}`;
  const how =
    item.paymentMethod === 'CARD'
      ? ` · no ${item.creditCard?.name ?? 'cartão'} (já entra na Fatura)`
      : item.paymentMethod
        ? ` · ${PAYMENT_METHODS.find(method => method.value === item.paymentMethod)!.label}`
        : '';
  const ended = item.endsOn ? ` · cancelada em ${formatDate(item.endsOn)}` : '';
  return when + how + ended;
}

/**
 * Gastos recorrentes: what goes out by itself every month or year (gym, subscriptions, insurance).
 * The name, the amount and the day are enough; how it is paid and the rest are optional.
 */
/** A Gasto recorrente: name, amount and day, and optionally how and when it is charged. */
export function RecurringForm({ holder, onDone }: { holder: Holder; onDone?: () => void }) {
  const [add, { error }] = useMutation(AddRecurringExpenseDocument, {
    refetchQueries: [HolderDocument],
  });
  const [more, setMore] = useState(false);
  const [cycle, setCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [dueMonth, setDueMonth] = useState(1);
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [cardId, setCardId] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const amountCents = parseCents(String(values.get('amount')));
    if (amountCents == null) return;
    try {
      await add({
        variables: {
          input: {
            amountCents,
            category: text(values, 'category'),
            creditCardId: method === 'CARD' && cardId ? cardId : null,
            cycle,
            description: text(values, 'description')!,
            dueDay: Number(values.get('dueDay')),
            dueMonth: cycle === 'YEARLY' ? dueMonth : null,
            holderId: holder.id,
            paymentMethod: method || null,
            startsOn: text(values, 'startsOn'),
          },
        },
      });
      form.reset();
      onDone?.();
      setMore(false);
      setCycle('MONTHLY');
      setMethod('');
      setCardId('');
    } catch {
      // Shown by `error` under the form; the typed values stay.
    }
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      <div className={FORM_GRID}>
        <Field id="recurring-description" label="Nome">
          <Input
            id="recurring-description"
            name="description"
            placeholder="Academia, Netflix, seguro…"
            required
          />
        </Field>
        <Field id="recurring-amount" label="Valor (R$)">
          <Input
            id="recurring-amount"
            inputMode="decimal"
            name="amount"
            placeholder="99,90"
            required
          />
        </Field>
        <Field id="recurring-day" label="Dia da cobrança">
          <Input
            id="recurring-day"
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
      <Button
        className="self-start px-0"
        onClick={() => setMore(current => !current)}
        type="button"
        variant="link"
      >
        {more ? 'Menos opções' : 'Mais opções (anual, forma de pagamento, categoria…)'}
      </Button>
      {more && (
        <div className={FORM_GRID}>
          <Field id="recurring-cycle" label="Repete">
            <Select onValueChange={value => setCycle(value as 'MONTHLY' | 'YEARLY')} value={cycle}>
              <SelectTrigger className="w-full" id="recurring-cycle">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY">Todo mês</SelectItem>
                <SelectItem value="YEARLY">Todo ano</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {cycle === 'YEARLY' && (
            <Field id="recurring-month" label="Mês da cobrança">
              <Select onValueChange={value => setDueMonth(Number(value))} value={String(dueMonth)}>
                <SelectTrigger className="w-full" id="recurring-month">
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
          )}
          <Field
            hint={
              method === 'CARD'
                ? 'Já entra na Fatura: aparece no mês sem somar de novo.'
                : undefined
            }
            id="recurring-method"
            label="Forma de pagamento"
          >
            <Select onValueChange={value => setMethod(value as PaymentMethod)} value={method}>
              <SelectTrigger className="w-full" id="recurring-method">
                <SelectValue placeholder="Não informada" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(item => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {method === 'CARD' && holder.creditCards.length > 0 && (
            <Field id="recurring-card" label="Cartão">
              <Select onValueChange={setCardId} value={cardId}>
                <SelectTrigger className="w-full" id="recurring-card">
                  <SelectValue placeholder="Qual cartão" />
                </SelectTrigger>
                <SelectContent>
                  {holder.creditCards.map(card => (
                    <SelectItem key={card.id} value={card.id}>
                      {card.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field id="recurring-category" label="Categoria">
            <Input id="recurring-category" name="category" placeholder="Assinaturas" />
          </Field>
          <Field id="recurring-starts" label="Desde">
            <Input id="recurring-starts" name="startsOn" type="date" />
          </Field>
        </div>
      )}
      <Button className="self-start" type="submit">
        Adicionar gasto recorrente
      </Button>
      {error && <FormError message={error.message} />}
    </form>
  );
}

function RecurringSection({ holder }: { holder: Holder }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null);

  return (
    <Part
      count={holder.recurringExpenses.length}
      empty="Nenhum gasto recorrente. Academia, Netflix, seguro do carro: cadastre uma vez e ele entra em todo mês."
      id="recurring"
      intro="O que sai sozinho todo mês ou todo ano: academia, assinaturas, seguros."
      title="Gastos recorrentes"
      total={
        holder.recurringExpenses.length ? (
          <>
            {formatCents(recurringPerMonth(holder))}
            <span className="block text-sm font-normal text-muted-foreground">por mês</span>
          </>
        ) : undefined
      }
    >
      <ul className="flex flex-col gap-2">
        {holder.recurringExpenses.map(item => (
          <SheetRow
            action={
              <span className="flex">
                <Button
                  aria-label={`Editar ${item.description}`}
                  onClick={() => setEditing(item.id)}
                  size="icon-sm"
                  variant="ghost"
                >
                  <PencilIcon />
                </Button>
                <Button
                  aria-label={`Apagar ${item.description}`}
                  onClick={() => setDeleting({ id: item.id, name: item.description })}
                  size="icon-sm"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </span>
            }
            amount={`${formatCents(item.amountCents)}${item.cycle === 'YEARLY' ? '/ano' : ''}`}
            className={running(item) ? undefined : 'opacity-60'}
            detail={recurringDetail(item)}
            key={item.id}
            name={item.description}
          />
        ))}
      </ul>
      {editing && (
        <EditRecordDialog
          id={editing}
          kind="RECURRING_EXPENSE"
          onClose={() => setEditing(null)}
          title="Gasto recorrente"
        />
      )}
      {deleting && (
        <ConfirmDelete
          id={deleting.id}
          kind="RECURRING_EXPENSE"
          name={deleting.name}
          onClose={() => setDeleting(null)}
        />
      )}
    </Part>
  );
}

type EntryKind =
  | 'CARD'
  | 'EXPENSE'
  | 'FINANCING'
  | 'INCOME'
  | 'LOAN'
  | 'ONE_OFF_INCOME'
  | 'RECURRING'
  | 'TAX';

/** What can be added, as people say it, under Entrada or Saída. */
const ENTRY_KINDS: Record<'IN' | 'OUT', { hint: string; label: string; value: EntryKind }[]> = {
  IN: [
    {
      hint: 'Uma venda, um freela, um reembolso.',
      label: 'Receita avulsa',
      value: 'ONE_OFF_INCOME',
    },
    {
      hint: 'Salário, pró-labore, aluguel recebido: todo mês.',
      label: 'Renda fixa',
      value: 'INCOME',
    },
  ],
  OUT: [
    { hint: 'Mercado, Uber, uma compra: uma vez.', label: 'Gasto', value: 'EXPENSE' },
    {
      hint: 'Academia, Netflix, aluguel, seguro: todo mês ou todo ano.',
      label: 'Gasto recorrente',
      value: 'RECURRING',
    },
    { hint: 'Crédito pessoal, consignado.', label: 'Empréstimo', value: 'LOAN' },
    { hint: 'Carro, imóvel, outros bens.', label: 'Financiamento', value: 'FINANCING' },
    { hint: 'O limite, o fechamento e as Faturas.', label: 'Cartão de crédito', value: 'CARD' },
    { hint: 'IPVA, IPTU, DAS.', label: 'Imposto', value: 'TAX' },
  ],
};

/** A Receita avulsa or a Gasto: once, on a date of the month. */
function OneOffForm({
  direction,
  holder,
  month,
  onDone,
}: {
  direction: 'IN' | 'OUT';
  holder: Holder;
  month?: string;
  onDone?: () => void;
}) {
  const [addExpense, expense] = useMutation(AddExpenseDocument, { refetchQueries: 'active' });
  const [addIncome, income] = useMutation(AddOneOffIncomeDocument, { refetchQueries: 'active' });
  const error = expense.error ?? income.error;
  const today = localToday();
  const day = month && !today.startsWith(month) ? `${month}-01` : today;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const amountCents = parseCents(String(values.get('amount')));
    if (amountCents == null) return;
    const common = {
      amountCents,
      date: String(values.get('date')),
      description: text(values, 'description')!,
      holderId: holder.id,
    };
    try {
      if (direction === 'IN') await addIncome({ variables: { input: common } });
      else
        await addExpense({
          variables: { input: { ...common, category: text(values, 'category') } },
        });
      onDone?.();
    } catch {
      // Shown by `error` under the form; the typed values stay.
    }
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      <div className={FORM_GRID}>
        <Field id="one-off-description" label="Descrição">
          <Input
            id="one-off-description"
            name="description"
            placeholder={direction === 'IN' ? 'Freela, venda, reembolso…' : 'Mercado, Uber…'}
            required
          />
        </Field>
        {direction === 'OUT' && (
          <Field id="one-off-category" label="Categoria">
            <Input id="one-off-category" name="category" placeholder="Alimentação" />
          </Field>
        )}
        <Field id="one-off-amount" label="Valor (R$)">
          <Input
            id="one-off-amount"
            inputMode="decimal"
            name="amount"
            placeholder="0,00"
            required
          />
        </Field>
        <Field id="one-off-date" label="Data">
          <Input defaultValue={day} id="one-off-date" name="date" required type="date" />
        </Field>
      </div>
      <Button className="self-start" type="submit">
        {direction === 'IN' ? 'Adicionar receita' : 'Adicionar gasto'}
      </Button>
      {error && <FormError message={error.message} />}
    </form>
  );
}

/**
 * The one way to add money coming in or going out: what it is (once, recurring, a loan, a card…),
 * then its form. "Adicionar entrada" and "Adicionar saída" open it on their side.
 */
export function AddEntryDialog({
  direction,
  month,
  onClose,
}: {
  direction: 'IN' | 'OUT';
  month?: string;
  onClose: () => void;
}) {
  const holder = useHolder();
  const [kind, setKind] = useState<EntryKind>(ENTRY_KINDS[direction][0]!.value);

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent
        className="max-h-[90svh] overflow-y-auto sm:max-w-3xl"
        onOpenAutoFocus={event => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{direction === 'IN' ? 'Adicionar entrada' : 'Adicionar saída'}</DialogTitle>
          <DialogDescription>
            {direction === 'IN'
              ? 'O que entra: uma vez ou todo mês.'
              : 'O que sai: uma vez, todo mês, um empréstimo, um cartão.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ENTRY_KINDS[direction].map(option => (
            <Button
              className={cn(
                'h-auto flex-col items-start gap-0.5 rounded-xl px-4 py-3 text-left whitespace-normal',
                kind === option.value && 'border-primary bg-primary/5'
              )}
              key={option.value}
              onClick={() => setKind(option.value)}
              variant="outline"
            >
              <span className="font-semibold">{option.label}</span>
              <span className="text-xs font-normal text-muted-foreground">{option.hint}</span>
            </Button>
          ))}
        </div>
        {!holder ? (
          <PageSkeleton />
        ) : kind === 'EXPENSE' || kind === 'ONE_OFF_INCOME' ? (
          <OneOffForm
            direction={direction}
            holder={holder}
            key={kind}
            month={month}
            onDone={onClose}
          />
        ) : kind === 'INCOME' ? (
          <IncomeForm holder={holder} onDone={onClose} />
        ) : kind === 'RECURRING' ? (
          <RecurringForm holder={holder} onDone={onClose} />
        ) : kind === 'TAX' ? (
          <TaxForm holder={holder} onDone={onClose} />
        ) : kind === 'CARD' ? (
          <CardForm holder={holder} onDone={onClose} />
        ) : (
          <OperationForm holder={holder} key={kind} onDone={onClose} type={kind} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** "Adicionar entrada" or "Adicionar saída", at the top of Lançamentos, Entradas and Saídas fixas. */
export function AddEntryButton({ direction, month }: { direction: 'IN' | 'OUT'; month?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        className="print:hidden"
        onClick={() => setOpen(true)}
        variant={direction === 'IN' ? 'outline' : 'default'}
      >
        {direction === 'IN' ? <ArrowDownLeftIcon /> : <ArrowUpRightIcon />}
        {direction === 'IN' ? 'Adicionar entrada' : 'Adicionar saída'}
      </Button>
      {open && (
        <AddEntryDialog direction={direction} month={month} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function taxLabel(tax: Holder['taxes'][number]): string {
  if (tax.frequency === 'MONTHLY') return `todo mês, dia ${tax.dueDay}`;
  const month = MONTHS[(tax.dueMonth ?? 1) - 1]!.toLowerCase();
  const split = tax.installments === 1 ? 'à vista' : `em ${tax.installments}x`;
  return `por ano, ${split}, a partir de ${tax.dueDay} de ${month}`;
}

/** An Imposto: monthly, or yearly in one or more installments. */
export function TaxForm({ holder, onDone }: { holder: Holder; onDone?: () => void }) {
  const [addTax, { error }] = useMutation(AddTaxDocument, { refetchQueries: [HolderDocument] });
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
      onDone?.();
      setInstallments(1);
    } catch {
      // Shown by `error` under the form; the typed values stay.
    }
  };

  return (
    <form className="flex flex-col gap-5" onSubmit={submit}>
      <div className={FORM_GRID}>
        <Field id="tax-name" label="Imposto">
          <Input id="tax-name" name="name" placeholder="IPVA, IPTU, DAS…" required />
        </Field>
        <Field id="tax-frequency" label="Frequência">
          <Select onValueChange={value => setFrequency(value as TaxFrequency)} value={frequency}>
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
              <Select onValueChange={value => setDueMonth(Number(value))} value={String(dueMonth)}>
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
  );
}

function TaxesSection({ holder }: { holder: Holder }) {
  const [deleteTax] = useMutation(DeleteTaxDocument, { refetchQueries: [HolderDocument] });

  return (
    <Part
      count={holder.taxes.length}
      empty="Nenhum imposto cadastrado. IPVA, IPTU e DAS entram nos vencimentos do mês."
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

function ObligationsSection({ holder }: { holder: Holder }) {
  return (
    <Part
      count={holder.creditOperations.length + holder.creditCards.length}
      empty="Nenhum empréstimo, financiamento ou cartão. Adicione pelo botão Adicionar saída."
      id="obligations"
      intro="Empréstimos, financiamentos e cartões, com o que falta pagar."
      title="Empréstimos e cartões"
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

export function OperationForm({
  holder,
  onDone,
  type,
}: {
  holder: Holder;
  onDone?: () => void;
  type: OperationType;
}) {
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
      onDone?.();
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

export function CardForm({ holder, onDone }: { holder: Holder; onDone?: () => void }) {
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
      onDone?.();
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
