import { useMutation, useQuery } from '@apollo/client/react';
import {
  DeleteExpenseDocument,
  DeleteOneOffIncomeDocument,
  ExpenseImportsDocument,
  ImportExpensesDocument,
  PeriodDocument,
  ViewerHolderDocument,
  type ImportAccountKind,
  type MonthLineKind,
  type PeriodQuery,
} from '@zapbots/graphql/client';
import { addDays, addMonths } from '@zapbots/finance';
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  PrinterIcon,
  ReceiptIcon,
  SearchIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import { Checkbox } from '@zapbots/ui/components/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@zapbots/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@zapbots/ui/components/dropdown-menu';
import { Input } from '@zapbots/ui/components/input';
import { Label } from '@zapbots/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@zapbots/ui/components/select';
import { Skeleton } from '@zapbots/ui/components/skeleton';
import { Table, TableBody, TableCell, TableRow } from '@zapbots/ui/components/table';
import { cn } from '@zapbots/ui/lib/utils';

import { ConfirmDelete } from '../components/ConfirmDelete';
import { EditRecordDialog } from '../components/EditRecordDialog';
import { ACCOUNT_KINDS, ImportsCard } from '../components/ImportsCard';
import { QueryError } from '../components/QueryError';
import { useUndoableDelete } from '../components/Toaster';
import { AddEntryButton } from './FinancePage';
import { FormError } from '../components/FormError';
import { localToday } from '../lib/bots';
import { formatCents, formatDate } from '../lib/format';
import { ofxExpenses, parseOfx, readOfxText, type OfxStatement } from '../lib/ofx';
import { PdfError, readPdfTable } from '../lib/pdf';
import {
  guessColumns,
  readExpenses,
  readTable,
  type Columns,
  type Table as SpreadsheetTable,
} from '../lib/spreadsheet';

/** A picked file as read: a sheet still to map, or an OFX that already says what each line is. */
type ImportSource =
  | { kind: 'ofx'; statements: OfxStatement[] }
  | { kind: 'table'; table: SpreadsheetTable };

type Statement = NonNullable<PeriodQuery['holder']>['period'];

/** The spans the sheet can cover; `month` is one calendar month, walked with the arrows. */
type Preset = 'month' | '15d' | '30d' | '3m' | '6m' | '1y' | 'custom';

const PRESETS: { label: string; value: Preset }[] = [
  { label: 'Mês', value: 'month' },
  { label: 'Últimos 15 dias', value: '15d' },
  { label: 'Últimos 30 dias', value: '30d' },
  { label: 'Últimos 3 meses', value: '3m' },
  { label: 'Últimos 6 meses', value: '6m' },
  { label: 'Último ano', value: '1y' },
  { label: 'Personalizado', value: 'custom' },
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The last day of `YYYY-MM`. */
const lastDay = (month: string) => addDays(addMonths(`${month}-01`, 1), -1);

/**
 * The span the address asks for: `?p=6m`, `?p=custom&from=…&to=…`, or a month (`?m=YYYY-MM`, the
 * default). Days count back from today; months are whole, the current one included, so what is
 * still due this month shows too.
 */
function periodOf(params: URLSearchParams) {
  const today = localToday();
  const thisMonth = today.slice(0, 7);
  const preset = (PRESETS.find(item => item.value === params.get('p'))?.value ?? 'month') as Preset;
  const month = /^\d{4}-\d{2}$/.test(params.get('m') ?? '') ? params.get('m')! : thisMonth;
  const months = (count: number) => ({
    from: addMonths(`${thisMonth}-01`, 1 - count),
    to: lastDay(thisMonth),
  });
  const span =
    preset === '15d'
      ? { from: addDays(today, -14), to: today }
      : preset === '30d'
        ? { from: addDays(today, -29), to: today }
        : preset === '3m'
          ? months(3)
          : preset === '6m'
            ? months(6)
            : preset === '1y'
              ? months(12)
              : preset === 'custom'
                ? {
                    from: ISO_DATE.test(params.get('from') ?? '')
                      ? params.get('from')!
                      : `${thisMonth}-01`,
                    to: ISO_DATE.test(params.get('to') ?? '') ? params.get('to')! : today,
                  }
                : { from: `${month}-01`, to: lastDay(month) };
  return { ...span, month, preset };
}

/** "01/05/2026 a 31/10/2026". */
const spanName = (from: string, to: string) => `${formatDate(from)} a ${formatDate(to)}`;

const KIND_LABELS: Record<MonthLineKind, string> = {
  INSTALLMENT: 'Parcela',
  ONE_OFF: 'Avulsa',
  RECURRING: 'Recorrente',
  SALARY: 'Salário',
  STATEMENT: 'Fatura',
  TAX: 'Imposto',
};

/** `YYYY-MM` moved by `delta` months. */
function shift(month: string, delta: number) {
  const [year, number] = month.split('-').map(Number) as [number, number];
  const zeroBased = year * 12 + number - 1 + delta;
  return `${Math.floor(zeroBased / 12)}-${String((zeroBased % 12) + 1).padStart(2, '0')}`;
}

/** "Outubro de 2026". */
function monthName(month: string) {
  const name = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(`${month}-01T00:00:00Z`));
  return name[0]!.toUpperCase() + name.slice(1);
}

const SHORT_MONTHS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/** Where each kind of line is filed when it has no category of its own. */
const KIND_CATEGORIES: Record<MonthLineKind, string> = {
  INSTALLMENT: 'Empréstimos',
  ONE_OFF: 'Receita avulsa',
  RECURRING: 'Recorrentes',
  SALARY: 'Salário',
  STATEMENT: 'Cartão',
  TAX: 'Impostos',
};

/** One line of the month's spreadsheet, whatever it came from. */
interface Entry {
  amountCents: number;
  category: string;
  date: string;
  description: string;
  direction: 'IN' | 'OUT';
  /** Typed or imported here (Receita avulsa, Gasto), so it can be removed here. */
  removable: { id: string; kind: 'EXPENSE' | 'ONE_OFF' } | null;
  /** What it is: Salário, Avulsa, Parcela, Fatura, Imposto or Gasto. */
  source: string;
  /** Where it is managed, for the lines that come from Gastos. */
  to: string | null;
  /** The Fonte de Renda, Operação or Gasto recorrente a line comes from, deleted as a whole from here. */
  owner: {
    id: string;
    kind: 'CREDIT_OPERATION' | 'INCOME_SOURCE' | 'RECURRING_EXPENSE';
  } | null;
  /** A Gasto recorrente on a Cartão: shown, but its Fatura is what counts. */
  informative?: boolean;
}

function entriesOf(statement: Statement): Entry[] {
  return [
    ...statement.incomes.map(line => ({
      amountCents: line.amountCents,
      category: KIND_CATEGORIES[line.kind],
      date: line.date,
      description: line.label,
      direction: 'IN' as const,
      removable:
        line.kind === 'ONE_OFF' && line.id ? { id: line.id, kind: 'ONE_OFF' as const } : null,
      source: KIND_LABELS[line.kind],
      to: line.kind === 'SALARY' ? '/caishen/income' : null,
      owner:
        line.kind === 'SALARY' && line.id ? { id: line.id, kind: 'INCOME_SOURCE' as const } : null,
    })),
    ...statement.commitments.map(line => ({
      amountCents: line.amountCents,
      category: KIND_CATEGORIES[line.kind],
      date: line.date,
      description: line.label,
      direction: 'OUT' as const,
      removable: null,
      owner:
        line.kind === 'INSTALLMENT' && line.id
          ? { id: line.id, kind: 'CREDIT_OPERATION' as const }
          : line.kind === 'RECURRING' && line.id
            ? { id: line.id, kind: 'RECURRING_EXPENSE' as const }
            : null,
      source: KIND_LABELS[line.kind],
      to:
        line.kind === 'INSTALLMENT' && line.id
          ? `/caishen/operations/${line.id}`
          : line.kind === 'TAX'
            ? '/caishen/fixed#taxes'
            : line.kind === 'RECURRING'
              ? '/caishen/fixed#recurring'
              : line.kind === 'STATEMENT'
                ? '/caishen/fixed#cards'
                : '/caishen/fixed#loans',
    })),
    ...statement.onCard.map(line => ({
      amountCents: line.amountCents,
      category: KIND_CATEGORIES[line.kind],
      date: line.date,
      description: line.label,
      direction: 'OUT' as const,
      informative: true,
      owner: line.id ? { id: line.id, kind: 'RECURRING_EXPENSE' as const } : null,
      removable: null,
      source: 'No cartão',
      to: '/caishen/fixed#recurring',
    })),
    ...statement.expenses.map(item => ({
      amountCents: item.amountCents,
      category: item.category ?? 'Sem categoria',
      date: item.date,
      description: item.description,
      direction: 'OUT' as const,
      removable: { id: item.id, kind: 'EXPENSE' as const },
      source: item.imported ? 'Importado' : 'Gasto',
      to: null,
      owner: null,
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));
}

type Filter = 'ALL' | 'IN' | 'OUT';

/** "Sábado". */
function weekday(iso: string) {
  const name = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', weekday: 'long' }).format(
    new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  );
  return name[0]!.toUpperCase() + name.slice(1);
}

interface CategoryTotal {
  amountCents: number;
  name: string;
}

/** Spending by category, largest first: the first seven, then the rest together as Outras. */
function byCategory(entries: Entry[]): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    totals.set(entry.category, (totals.get(entry.category) ?? 0) + entry.amountCents);
  }
  const sorted = [...totals]
    .map(([name, amountCents]) => ({ amountCents, name }))
    .sort((a, b) => b.amountCents - a.amountCents);
  if (sorted.length <= 8) return sorted;
  const rest = sorted.slice(7).reduce((total, category) => total + category.amountCents, 0);
  return [...sorted.slice(0, 7), { amountCents: rest, name: 'Outras' }];
}

/**
 * One kind of spending of the period by category, after Meu Pluggy's: the total on top, then each
 * category with its amount and a bar as long as its share of the largest one. One color for every
 * bar: they measure how much, and the name beside each says which.
 */
function CategoryCard({
  empty,
  icon: Icon,
  note,
  title,
  total,
  rows,
}: {
  empty: string;
  icon: LucideIcon;
  note: string;
  rows: CategoryTotal[];
  title: string;
  total: number;
}) {
  const largest = rows[0]?.amountCents ?? 0;
  return (
    <Card className="gap-0 p-0">
      <div className="flex flex-col gap-1 px-6 pt-6 pb-5">
        <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="size-4 text-primary" />
          {title}
        </p>
        <p className="mt-1 font-display text-4xl font-light tracking-[-0.022em] tabular-nums">
          {formatCents(total)}
        </p>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
      <ul className="flex flex-col gap-4 border-t px-6 py-5">
        {rows.map(row => {
          const share = total ? Math.round((row.amountCents / total) * 100) : 0;
          return (
            <li key={row.name} title={`${row.name}: ${formatCents(row.amountCents)} (${share}%)`}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{row.name}</span>
                <span className="shrink-0 tabular-nums">{formatCents(row.amountCents)}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted">
                <div
                  className="h-full min-w-1 rounded-full bg-primary"
                  style={{ width: `${largest ? (row.amountCents / largest) * 100 : 0}%` }}
                />
              </div>
            </li>
          );
        })}
        {!rows.length && <li className="text-sm text-muted-foreground">{empty}</li>}
      </ul>
    </Card>
  );
}

/**
 * Fluxo de caixa, after Meu Pluggy's: what was spent and what is still to be spent in the period,
 * by category, then every line of the period by day. Salários, Parcelas, Faturas and Impostos show
 * up by themselves (from Gastos); Receitas avulsas and Gastos are typed in here, or imported from a
 * file. It filters, totals, and exports as CSV or PDF.
 */
export function EntriesPage() {
  const [params, setParams] = useSearchParams();
  const { from, month, preset, to } = periodOf(params);
  const isMonth = preset === 'month';
  const backwards = from > to;
  const viewer = useQuery(ViewerHolderDocument);
  const holderId = viewer.data?.viewerHolder.id;
  const { data, error, loading, refetch } = useQuery(PeriodDocument, {
    // A field that fails leaves the rest of the period on screen.
    errorPolicy: 'all',
    fetchPolicy: 'cache-and-network',
    skip: !holderId || backwards,
    variables: { from, holderId: holderId!, to },
  });
  const statement = backwards ? undefined : data?.holder?.period;
  const go = (delta: number) => setParams({ m: shift(month, delta) });
  const choose = (next: Preset) =>
    setParams(
      next === 'month' ? { m: month } : next === 'custom' ? { from, p: next, to } : { p: next }
    );
  const setSpan = (part: 'from' | 'to', value: string) => {
    if (ISO_DATE.test(value)) setParams({ from, p: 'custom', to, [part]: value });
  };
  const name = isMonth ? monthName(month) : PRESETS.find(item => item.value === preset)!.label;
  const [readError, setReadError] = useState<string | null>(null);
  const file = isMonth ? month : `${from}_${to}`;

  // The period, at the top of the list as in Meu Pluggy's: walked by month with the arrows, or
  // picked from the spans.
  const periodBar = (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      {isMonth && (
        <Button
          aria-label="Mês anterior"
          className="rounded-xl print:hidden"
          onClick={() => go(-1)}
          size="icon"
          variant="outline"
        >
          <ChevronLeftIcon />
        </Button>
      )}
      <motion.h2
        animate={{ opacity: 1, y: 0 }}
        className="min-w-0 px-2 text-lg font-medium"
        initial={{ opacity: 0, y: 6 }}
        key={`${from}..${to}`}
      >
        {name}
        {!isMonth && preset !== 'custom' && (
          <span className="ml-2 text-sm font-normal text-muted-foreground tabular-nums">
            {spanName(from, to)}
          </span>
        )}
      </motion.h2>
      {isMonth && (
        <Button
          aria-label="Próximo mês"
          className="rounded-xl print:hidden"
          onClick={() => go(1)}
          size="icon"
          variant="outline"
        >
          <ChevronRightIcon />
        </Button>
      )}
      <Select onValueChange={value => choose(value as Preset)} value={preset}>
        <SelectTrigger aria-label="Período" className="h-9 rounded-xl print:hidden">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map(item => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <Input
            aria-label="De"
            className="w-40 rounded-xl"
            max={to}
            onChange={event => setSpan('from', event.target.value)}
            type="date"
            value={from}
          />
          <span className="text-muted-foreground">até</span>
          <Input
            aria-label="Até"
            className="w-40 rounded-xl"
            min={from}
            onChange={event => setSpan('to', event.target.value)}
            type="date"
            value={to}
          />
        </div>
      )}
    </div>
  );

  // Only the period's part of the page waits or fails; the title and the period always show.
  const body = viewer.error ? (
    <QueryError
      error={viewer.error}
      onRetry={() => viewer.refetch()}
      title="Não foi possível carregar suas finanças"
    />
  ) : backwards ? (
    <>
      <Card>{periodBar}</Card>
      <FormError message="O início do período vem depois do fim. Troque as datas." />
    </>
  ) : !statement && (loading || !holderId) ? (
    <MonthSkeleton />
  ) : !statement ? (
    <>
      <Card>{periodBar}</Card>
      <QueryError
        error={error}
        onRetry={() => refetch()}
        title={`Não foi possível carregar ${isMonth ? name.toLowerCase() : 'o período'}`}
      />
    </>
  ) : (
    <>
      {error && (
        <QueryError
          error={error}
          onRetry={() => refetch()}
          title="Parte do período não carregou; o resto está abaixo"
        />
      )}
      <Spending statement={statement} />
      <Ledger head={periodBar} statement={statement} />
      {holderId && <ImportsCard holderId={holderId} />}
    </>
  );

  return (
    // Laid out by the panel's own width (`@container`), which the menu and the chat both narrow.
    <div className="@container flex flex-col gap-6" data-bot="FINANCE">
      <header className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1>Fluxo de caixa</h1>
          <p className="mt-1 text-muted-foreground">
            Despesas, receitas e movimentações das suas contas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 @3xl:ml-auto print:hidden">
          <ImportButton
            holderId={holderId}
            onError={setReadError}
            owner={viewer.data?.viewerHolder.name ?? ''}
          />
          <Export file={file} statement={statement} />
          <AddEntryButton direction="IN" month={isMonth ? month : undefined} />
          <AddEntryButton direction="OUT" month={isMonth ? month : undefined} />
        </div>
      </header>
      {readError && <FormError message={readError} />}

      {body}
    </div>
  );
}

/**
 * The period's spending by category, in two cards: what was already spent (up to today) and what
 * is still to come (Parcelas, Faturas and the rest due later). A Gasto recorrente charged on a
 * Cartão counts in its Fatura, so it is left out here.
 */
function Spending({ statement }: { statement: Statement }) {
  const today = localToday();
  const out = entriesOf(statement).filter(entry => entry.direction === 'OUT' && !entry.informative);
  const spent = out.filter(entry => entry.date.slice(0, 10) <= today);
  const coming = out.filter(entry => entry.date.slice(0, 10) > today);
  const sum = (entries: Entry[]) => entries.reduce((total, entry) => total + entry.amountCents, 0);
  return (
    <div className="grid gap-4 @3xl:grid-cols-2">
      <CategoryCard
        empty="Nada gasto neste período até hoje."
        icon={ReceiptIcon}
        note="Até hoje, por categoria"
        rows={byCategory(spent)}
        title="Despesas"
        total={sum(spent)}
      />
      <CategoryCard
        empty="Nada mais a pagar neste período."
        icon={ClockIcon}
        note="Ainda a pagar no período"
        rows={byCategory(coming)}
        title="Despesas futuras"
        total={sum(coming)}
      />
    </div>
  );
}

/** The period's place while it loads: the two cards and the list, as shapes. */
function MonthSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-6" role="status">
      <span className="sr-only">Carregando o período…</span>
      <div className="grid gap-4 @3xl:grid-cols-2">
        <Skeleton className="h-72 w-full rounded-[20px]" />
        <Skeleton className="h-72 w-full rounded-[20px]" />
      </div>
      <Skeleton className="h-96 w-full rounded-[20px]" />
    </div>
  );
}

/** Lower case and without accents, so "agua" finds "Água". */
const plain = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * A .csv, .xlsx, .ofx or .pdf of Gastos picked, read and handed to the dialog: a sheet (or a PDF
 * statement, read into one) to map its columns, an OFX straight to what comes in. A Cartão's OFX is its Fatura, imported in Cartões.
 */
function ImportButton({
  holderId,
  onError,
  owner,
}: {
  holderId: string | undefined;
  onError: (message: string | null) => void;
  /** The Titular's name, to tell money sent to their own accounts. */
  owner: string;
}) {
  const file = useRef<HTMLInputElement>(null);
  const [table, setTable] = useState<{
    name: string;
    source: ImportSource;
  } | null>(null);

  const read = async (picked: File): Promise<ImportSource | string> => {
    if (/\.pdf$/i.test(picked.name)) {
      return { kind: 'table', table: await readPdfTable(picked) };
    }
    if (!/\.ofx$/i.test(picked.name)) {
      return { kind: 'table', table: await readTable(picked) };
    }
    const statements = parseOfx(await readOfxText(picked));
    if (statements.some(item => item.kind === 'BANK')) return { kind: 'ofx', statements };
    return statements.length
      ? 'Esse OFX é a fatura de um cartão: importe em Gastos, no cartão dela.'
      : 'Esse OFX não tem extrato.';
  };

  const open = async (picked: File | undefined) => {
    onError(null);
    if (!picked) return;
    try {
      const source = await read(picked);
      if (typeof source === 'string') onError(source);
      else setTable({ name: picked.name, source });
    } catch (error) {
      onError(
        error instanceof PdfError
          ? error.message
          : 'Não foi possível ler esse arquivo. Use .csv, .xlsx, .ofx ou .pdf.'
      );
    }
    if (file.current) file.current.value = '';
  };

  return (
    <>
      <Button
        className="rounded-full"
        disabled={!holderId}
        onClick={() => file.current?.click()}
        variant="secondary"
      >
        <UploadIcon />
        Importar
      </Button>
      <input
        accept=".csv,.txt,.xlsx,.ofx,.pdf"
        className="hidden"
        onChange={event => void open(event.target.files?.[0])}
        ref={file}
        type="file"
      />
      {table && holderId && (
        <ImportDialog
          holderId={holderId}
          name={table.name}
          onClose={() => setTable(null)}
          owner={owner}
          source={table.source}
        />
      )}
    </>
  );
}

/** Banks whose name shows in their statements' files, as the User would write it. */
const BANKS: [RegExp, string][] = [
  [/\binter\b/, 'Inter'],
  [/\bnubank|nu pagamentos\b/, 'Nubank'],
  [/\bita[uú]\b/, 'Itaú'],
  [/\bbradesco\b/, 'Bradesco'],
  [/\bsantander\b/, 'Santander'],
  [/\bcaixa econ[oô]mica|\bcef\b/, 'Caixa'],
  [/\bbanco do brasil\b/, 'Banco do Brasil'],
  [/\bc6\b/, 'C6 Bank'],
  [/\bbtg\b/, 'BTG Pactual'],
  [/\bpicpay\b/, 'PicPay'],
  [/\bmercado pago\b/, 'Mercado Pago'],
  [/\bsicoob\b/, 'Sicoob'],
  [/\bsicredi\b/, 'Sicredi'],
];

/**
 * The bank a file is most likely from: named in the file's name, or most often in its first lines
 * ("Cdb Porq Obj Banco Inter"); empty when none is, for the User to fill in.
 */
function guessBank(fileName: string, source: ImportSource): string {
  const sample = (
    source.kind === 'table'
      ? [source.table.headers, ...source.table.rows.slice(0, 200)].flat().map(String).join(' ')
      : source.statements
          .flatMap(item => item.transactions.slice(0, 200).map(line => line.description))
          .join(' ')
  ).toLowerCase();
  // "itau_extrato_072026.pdf": underscores and digits would hold the name inside one word.
  const words = fileName.toLowerCase().replace(/[_\d.]+/g, ' ');
  const named = BANKS.find(([pattern]) => pattern.test(words));
  if (named) return named[1];
  let best = '';
  let most = 0;
  for (const [pattern, bank] of BANKS) {
    const times = sample.match(new RegExp(pattern.source, 'g'))?.length ?? 0;
    if (times > most) {
      most = times;
      best = bank;
    }
  }
  return best;
}

/**
 * Every line of the period, after Meu Pluggy's Fluxo: the period and its totals in and out on top,
 * a search and filters, then the lines by day, newest first. A typed or imported line opens Editar;
 * a line from elsewhere links to where it is managed.
 */
function Ledger({ head, statement }: { head: ReactNode; statement: Statement }) {
  const [removeExpense] = useMutation(DeleteExpenseDocument, {
    refetchQueries: [PeriodDocument],
  });
  const [removeIncome] = useMutation(DeleteOneOffIncomeDocument, {
    refetchQueries: [PeriodDocument],
  });
  /** Ids of the typed or imported lines picked to delete together. */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** A Fonte de Renda or Operação about to be deleted from one of its lines. */
  const [deleting, setDeleting] = useState<Entry | null>(null);
  /** A typed or imported line open in Editar. */
  const [editing, setEditing] = useState<Entry | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');

  // Lines just deleted hide at once, while their toast still offers to undo it.
  const { hidden, remove: removeLater } = useUndoableDelete();
  const entries = entriesOf(statement).filter(
    entry => !entry.removable || !hidden.has(entry.removable.id)
  );
  const categories = [...new Set(entries.map(entry => entry.category))].sort();
  const query = plain(search.trim());
  const filtered = filter !== 'ALL' || category !== 'ALL' || query !== '';
  const shown = entries
    .filter(
      entry =>
        (filter === 'ALL' || entry.direction === filter) &&
        (category === 'ALL' || entry.category === category) &&
        (!query || plain(`${entry.description} ${entry.category}`).includes(query))
    )
    .reverse();
  const counted = (entries: Entry[], direction: Entry['direction']) =>
    entries
      .filter(entry => entry.direction === direction && !entry.informative)
      .reduce((total, entry) => total + entry.amountCents, 0);
  const shownTotal = counted(shown, 'IN') - counted(shown, 'OUT');
  // One month or one year: the day headers say only what changes between them.
  const months = new Set(entries.map(entry => entry.date.slice(0, 7))).size;
  const days = new Map<string, Entry[]>();
  for (const entry of shown) {
    const date = entry.date.slice(0, 10);
    days.set(date, [...(days.get(date) ?? []), entry]);
  }

  const send = (entry: Entry) => {
    const variables = { id: entry.removable!.id };
    return entry.removable!.kind === 'EXPENSE'
      ? removeExpense({ variables })
      : removeIncome({ variables });
  };

  /** Deletes a typed or imported line, with a few seconds to undo it. */
  const remove = (entry: Entry) => {
    if (!entry.removable) return;
    removeLater({
      commit: () => send(entry),
      ids: [entry.removable.id],
      message: `Lançamento apagado: ${entry.description}`,
    });
  };

  const pick = (id: string, on: boolean) =>
    setSelected(current => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const removeSelected = () => {
    const picked = entries.filter(entry => entry.removable && selected.has(entry.removable.id));
    removeLater({
      commit: () => Promise.all(picked.map(send)),
      ids: picked.map(entry => entry.removable!.id),
      message:
        picked.length === 1
          ? `Lançamento apagado: ${picked[0]!.description}`
          : `${picked.length} lançamentos apagados`,
    });
    setSelected(new Set());
  };

  return (
    <Card aria-label="Fluxo de caixa" className="gap-0 overflow-hidden p-0" id="entries">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-4 md:px-6">
        {head}
        <p className="ml-auto flex items-center gap-4 text-sm font-medium tabular-nums">
          <span className="flex items-center gap-1 text-success" title="Entradas do período">
            <ArrowDownLeftIcon className="size-4" />
            <span className="sr-only">Entradas</span>
            {formatCents(counted(entries, 'IN'))}
          </span>
          <span className="flex items-center gap-1 text-destructive" title="Saídas do período">
            <ArrowUpRightIcon className="size-4" />
            <span className="sr-only">Saídas</span>
            {formatCents(counted(entries, 'OUT'))}
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3 md:px-6 print:hidden">
        <div className="relative min-w-48 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Buscar lançamentos"
            className="h-10 rounded-xl pl-10"
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar lançamento…"
            type="search"
            value={search}
          />
        </div>
        <Select onValueChange={setCategory} value={category}>
          <SelectTrigger aria-label="Categoria" className="h-10 w-full rounded-xl @xl:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas as categorias</SelectItem>
            {categories.map(name => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-1 rounded-xl border p-1">
          {(
            [
              ['ALL', 'Todos'],
              ['IN', 'Entradas'],
              ['OUT', 'Saídas'],
            ] as const
          ).map(([value, label]) => (
            <Button
              aria-pressed={filter === value}
              className={cn(
                'h-8 rounded-lg px-4 font-normal',
                filter === value && 'bg-accent font-medium text-primary hover:bg-accent'
              )}
              key={value}
              onClick={() => setFilter(value)}
              size="sm"
              variant="ghost"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* The whole period is in the totals above; here only what a filter leaves. */}
      {filtered && shown.length > 0 && (
        <p className="border-b px-4 py-2 text-sm text-muted-foreground tabular-nums md:px-6">
          {shown.length} {shown.length === 1 ? 'lançamento' : 'lançamentos'} ·{' '}
          <strong
            className={cn('font-semibold', shownTotal < 0 ? 'text-destructive' : 'text-foreground')}
          >
            {formatCents(shownTotal)}
          </strong>
        </p>
      )}

      {selected.size > 0 && (
        <div className="flex items-center gap-3 border-b bg-accent px-4 py-2 md:px-6 print:hidden">
          <span className="text-sm">
            {selected.size}{' '}
            {selected.size === 1 ? 'lançamento selecionado' : 'lançamentos selecionados'}
          </span>
          <Button className="ml-auto" onClick={removeSelected} size="sm" variant="destructive">
            <Trash2Icon />
            Apagar
          </Button>
          <Button onClick={() => setSelected(new Set())} size="sm" variant="ghost">
            Cancelar
          </Button>
        </div>
      )}

      {[...days].map(([date, lines]) => (
        <section aria-label={formatDate(date)} key={date}>
          <h3 className="flex items-baseline gap-2 bg-muted/60 px-4 py-2 md:px-6">
            <span className="text-lg font-semibold tabular-nums">{date.slice(8, 10)}</span>
            <span className="text-sm text-muted-foreground">
              {weekday(date)}
              {months > 1 && `, ${SHORT_MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`}
            </span>
          </h3>
          <ul>
            {lines.map((entry, index) => {
              const own = entry.removable;
              const into = entry.direction === 'IN';
              const Arrow = into ? ArrowDownLeftIcon : ArrowUpRightIcon;
              return (
                <li
                  className="group flex items-center gap-3 border-b px-4 py-3 last:border-b-0 hover:bg-muted/40 data-[state=selected]:bg-accent md:px-6"
                  data-state={own && selected.has(own.id) ? 'selected' : undefined}
                  key={`${entry.source}-${own?.id ?? entry.description}-${index}`}
                >
                  <span className="flex w-4 shrink-0 print:hidden">
                    {own && (
                      <Checkbox
                        aria-label={`Selecionar ${entry.description}`}
                        checked={selected.has(own.id)}
                        className={cn(
                          !selected.size &&
                            'pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:focus-visible:opacity-100'
                        )}
                        onCheckedChange={on => pick(own.id, on === true)}
                      />
                    )}
                  </span>
                  <span
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-xl',
                      entry.informative
                        ? 'bg-muted text-muted-foreground'
                        : into
                          ? 'bg-success/10 text-success'
                          : 'bg-destructive/10 text-destructive'
                    )}
                  >
                    <Arrow className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {own ? (
                      <Button
                        className="h-auto max-w-full justify-start p-0 text-left text-base font-medium whitespace-normal text-foreground"
                        onClick={() => setEditing(entry)}
                        title="Editar"
                        variant="link"
                      >
                        {entry.description}
                      </Button>
                    ) : entry.to ? (
                      <Link
                        className="font-medium underline-offset-4 hover:underline"
                        title="Gerenciado em outra página"
                        to={entry.to}
                      >
                        {entry.description}
                      </Link>
                    ) : (
                      <span className="font-medium">{entry.description}</span>
                    )}
                    <p
                      className="truncate text-sm text-muted-foreground"
                      title={entry.informative ? 'Já contado na Fatura do cartão' : undefined}
                    >
                      {entry.source} · {entry.informative ? 'No cartão' : entry.category}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-right font-medium tabular-nums',
                      entry.informative
                        ? 'font-normal text-muted-foreground'
                        : into
                          ? 'text-success'
                          : 'text-destructive'
                    )}
                  >
                    {into ? '+' : '−'}
                    {formatCents(entry.amountCents)}
                  </span>
                  <span className="flex w-8 shrink-0 justify-end print:hidden">
                    {(own || entry.owner) && (
                      // Out of sight until the line is pointed at or reached by keyboard.
                      <Button
                        aria-label={`Apagar ${entry.description}`}
                        className="pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-within:opacity-100"
                        onClick={() => (own ? remove(entry) : setDeleting(entry))}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <XIcon />
                      </Button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {!shown.length && (
        <p className="px-6 py-10 text-center text-muted-foreground">
          {filtered
            ? 'Nenhum lançamento com esse filtro.'
            : 'Nenhum lançamento neste período. Salários, Parcelas, Faturas e Impostos entram sozinhos; Gastos e Receitas avulsas você adiciona ou importa.'}
        </p>
      )}
      {editing?.removable && (
        <EditRecordDialog
          id={editing.removable.id}
          kind={editing.removable.kind === 'EXPENSE' ? 'EXPENSE' : 'ONE_OFF_INCOME'}
          onClose={() => setEditing(null)}
          title={editing.description}
        />
      )}
      {deleting?.owner && (
        <ConfirmDelete
          id={deleting.owner.id}
          kind={deleting.owner.kind}
          name={deleting.description.replace(/ · Parcela .*$/, '')}
          onClose={() => setDeleting(null)}
        />
      )}
    </Card>
  );
}

const NO_TABLE: SpreadsheetTable = { headers: [], rows: [] };

/**
 * What an imported file brings in: for a sheet, its columns picked (guessed first); an OFX says
 * what each line is. Lines imported before (the same OFX again) are skipped by the server.
 */
function ImportDialog({
  holderId,
  name,
  onClose,
  owner,
  source,
}: {
  holderId: string;
  name: string;
  onClose: () => void;
  owner: string;
  source: ImportSource;
}) {
  const table = source.kind === 'table' ? source.table : NO_TABLE;
  const [columns, setColumns] = useState<Columns>(() => guessColumns(table.headers));
  const [bankName, setBankName] = useState(() => guessBank(name, source));
  const [accountKind, setAccountKind] = useState<ImportAccountKind>('CHECKING');
  // The Titular's name as banks write it, to tell money sent to their own accounts; a one-word
  // name (an e-mail's, from signing up) tells nothing, so the User types it.
  const [ownerName, setOwnerName] = useState(() => (/\S\s+\S/.test(owner.trim()) ? owner : ''));
  const [added, setAdded] = useState<number | null>(null);
  const [importRows, { error, loading }] = useMutation(ImportExpensesDocument, {
    refetchQueries: [PeriodDocument, ExpenseImportsDocument],
  });
  const ready = columns.date >= 0 && columns.description >= 0 && columns.amount >= 0;
  const reading =
    source.kind === 'ofx'
      ? { invalid: 0, ...ofxExpenses(source.statements, ownerName) }
      : ready
        ? readExpenses(table, columns, ownerName)
        : null;
  const lineCount =
    source.kind === 'ofx'
      ? source.statements.reduce((total, item) => total + item.transactions.length, 0)
      : table.rows.length;

  const pick = (part: keyof Columns, label: string, optional = false) => (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select
        onValueChange={value =>
          setColumns(current => ({
            ...current,
            [part]: value === 'none' ? (optional ? null : -1) : Number(value),
          }))
        }
        value={columns[part] == null || columns[part] < 0 ? 'none' : String(columns[part])}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Escolha a coluna" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">{optional ? 'Nenhuma' : 'Escolha a coluna'}</SelectItem>
          {table.headers.map((header, index) => (
            <SelectItem key={index} value={String(index)}>
              {header || `Coluna ${index + 1}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const confirm = async () => {
    if (!reading?.lines.length) return;
    try {
      const result = await importRows({
        variables: {
          file: {
            accountKind,
            bankName: bankName.trim() || null,
            fileName: name,
            source:
              source.kind === 'ofx'
                ? 'OFX'
                : /\.xlsx$/i.test(name)
                  ? 'XLSX'
                  : /\.pdf$/i.test(name)
                    ? 'PDF'
                    : 'CSV',
          },
          holderId,
          rows: reading.lines,
        },
      });
      const count = result.data?.importExpenses ?? 0;
      // All new: nothing to tell. Some were there already: say so before closing.
      if (count === reading.lines.length) onClose();
      else setAdded(count);
    } catch {
      // Shown by `error` in the dialog.
    }
  };

  if (added != null && reading) {
    return (
      <Dialog onOpenChange={open => !open && onClose()} open>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importado</DialogTitle>
            <DialogDescription>
              {added === 1 ? '1 gasto novo' : `${added} gastos novos`}.{' '}
              {reading.lines.length - added} já estavam no Fluxo de caixa (de uma importação
              anterior) e não entraram de novo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="min-w-0">
          <DialogTitle className="break-all">Importar {name}</DialogTitle>
          <DialogDescription>
            {lineCount} linhas.{' '}
            {source.kind === 'table'
              ? 'Confira de qual coluna vem cada parte do gasto.'
              : 'Um lançamento importado antes não entra de novo.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="import-bank">Banco</Label>
            <Input
              id="import-bank"
              onChange={event => setBankName(event.target.value)}
              placeholder="Ex.: Inter"
              value={bankName}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Tipo da conta</Label>
            <Select
              onValueChange={value => setAccountKind(value as ImportAccountKind)}
              value={accountKind}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCOUNT_KINDS.map(kind => (
                  <SelectItem key={kind.value} value={kind.value}>
                    {kind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="import-owner">Seu nome no extrato</Label>
            <Input
              id="import-owner"
              onChange={event => setOwnerName(event.target.value)}
              placeholder="Nome e sobrenome, para deixar de fora o que você manda para suas contas"
              value={ownerName}
            />
          </div>
        </div>
        {source.kind === 'table' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {pick('date', 'Data')}
            {pick('description', 'Descrição')}
            {pick('amount', 'Valor')}
            {pick('category', 'Categoria', true)}
            {pick('kind', 'Tipo do lançamento', true)}
          </div>
        )}
        {reading && (
          <div className="flex min-w-0 flex-col gap-3">
            <p>
              <strong>{reading.lines.length}</strong> gastos para importar
              {reading.credits > 0 && `, ${reading.credits} entradas de dinheiro deixadas de fora`}
              {reading.billPayments > 0 &&
                `, ${reading.billPayments} pagamentos de fatura deixados de fora (a Fatura já conta)`}
              {reading.investments > 0 &&
                `, ${reading.investments} aplicações em investimentos e caixinhas deixadas de fora`}
              {reading.ownTransfers > 0 &&
                `, ${reading.ownTransfers} transferências para contas suas deixadas de fora (o gasto conta de onde ele sai)`}
              {reading.invalid > 0 && `, ${reading.invalid} linhas sem data, descrição ou valor`}.
            </p>
            {reading.lines.length > 0 && (
              <Table>
                <TableBody>
                  {reading.lines.slice(0, 5).map((line, index) => (
                    <TableRow key={index}>
                      <TableCell className="tabular-nums">{formatDate(line.date)}</TableCell>
                      {/* Long bank descriptions are cut, not allowed to widen the dialog. */}
                      <TableCell className="w-full max-w-0 truncate" title={line.description}>
                        {line.description}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {line.category ?? '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCents(line.amountCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
        {error && <FormError error={error} />}
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">
            Cancelar
          </Button>
          <Button disabled={!reading?.lines.length || loading} onClick={() => void confirm()}>
            {loading ? 'Importando…' : `Importar ${reading?.lines.length ?? 0} gastos`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The period as a spreadsheet (CSV, opened by Excel and Google Sheets) or printed to PDF. */
function Export({ file, statement }: { file: string; statement: Statement | undefined }) {
  const csv = () => {
    if (!statement) return;
    const cents = (value: number) => (value / 100).toFixed(2).replace('.', ',');
    const quote = (text: string) => `"${text.replace(/"/g, '""')}"`;
    const lines = [
      ['Tipo', 'Data', 'Descrição', 'Categoria', 'Valor (R$)'],
      ...statement.incomes.map(line => [
        'Receita',
        line.date,
        line.label,
        KIND_LABELS[line.kind],
        cents(line.amountCents),
      ]),
      ...statement.commitments.map(line => [
        'Compromisso',
        line.date,
        line.label,
        KIND_LABELS[line.kind],
        cents(-line.amountCents),
      ]),
      ...statement.expenses.map(item => [
        'Gasto',
        item.date,
        item.description,
        item.category ?? '',
        cents(-item.amountCents),
      ]),
    ]
      // By date, like the sheet on screen, the header kept first.
      .sort((a, b) => (a[0] === 'Tipo' ? -1 : b[0] === 'Tipo' ? 1 : a[1]!.localeCompare(b[1]!)));
    lines.push(['Saldo', '', '', '', cents(statement.balanceCents)]);
    // `;` and a BOM, the way Excel in pt-BR opens a CSV with accents and decimal commas.
    const text = '﻿' + lines.map(row => row.map(quote).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `caishen-${file}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="rounded-full print:hidden" disabled={!statement} variant="secondary">
          <DownloadIcon />
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={csv}>
          <FileSpreadsheetIcon />
          Planilha (.csv)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.print()}>
          <PrinterIcon />
          PDF (imprimir)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
