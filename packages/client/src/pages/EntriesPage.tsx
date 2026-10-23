import { useMutation, useQuery } from '@apollo/client/react';
import {
  DeleteExpenseDocument,
  DeleteOneOffIncomeDocument,
  ImportExpensesDocument,
  PeriodDocument,
  UpdateRecordDocument,
  ViewerHolderDocument,
  type MonthLineKind,
  type PeriodQuery,
} from '@zapbots/graphql/client';
import { addDays, addMonths } from '@zapbots/finance';
import {
  CalendarRangeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  PrinterIcon,
  Trash2Icon,
  UploadIcon,
  XIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { ConfirmDelete } from '../components/ConfirmDelete';
import { QueryError } from '../components/QueryError';
import { ReportCharts } from '../components/ReportCharts';
import { AddEntryButton } from './FinancePage';
import { FormError } from '../components/FormError';
import { EntriesTabs } from '../components/EntriesTabs';
import { Sheet } from '../components/Sheet';
import { localToday } from '../lib/bots';
import { formatCents, formatDate } from '../lib/format';
import {
  guessColumns,
  readExpenses,
  readTable,
  type Columns,
  type Table as SpreadsheetTable,
} from '../lib/spreadsheet';

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
  COMPANY_TAX: 'Guia',
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

/** Where each kind of line is filed when it has no category of its own. */
const KIND_CATEGORIES: Record<MonthLineKind, string> = {
  COMPANY_TAX: 'Impostos da empresa',
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
  /** Where it is managed, for the lines that come from Fixos or Obrigações. */
  to: string | null;
  /** The Fonte de Renda, Operação or Gasto recorrente a line comes from, deleted as a whole from here. */
  owner: { id: string; kind: 'CREDIT_OPERATION' | 'INCOME_SOURCE' | 'RECURRING_EXPENSE' } | null;
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
      to: line.kind === 'SALARY' ? '/caishen/entries/income' : null,
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
            ? '/caishen/entries/fixed#taxes'
            : line.kind === 'COMPANY_TAX'
              ? '/caishen/entries/taxes'
              : line.kind === 'RECURRING'
                ? '/caishen/entries/fixed#recurring'
                : '/caishen/entries/fixed#obligations',
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
      to: '/caishen/entries/fixed#recurring',
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

/** Cents as people type them back: 4590 → "45,90". */
const typed = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

/** Moves to the same column in the row `delta` away, as Enter and Shift+Enter do in a spreadsheet. */
function moveFrom(cell: HTMLInputElement, delta: number) {
  const [column, row] = (cell.dataset.cell ?? '').split(':');
  const next = document.querySelector<HTMLInputElement>(
    `[data-cell="${column}:${Number(row) + delta}"]`
  );
  if (next) next.focus();
  else cell.blur();
}

/**
 * One cell of the sheet you can type in: it saves when you leave it or press Enter (which also
 * moves down a row), and Esc puts back what was there. It reads as plain text until touched.
 */
function SheetCell({
  align,
  cell,
  label,
  list,
  onCommit,
  type = 'text',
  value,
}: {
  align?: 'right';
  /** "column:row", for moving between cells with Enter. */
  cell: string;
  label: string;
  list?: string;
  /** Saves the new value; false puts the old one back. */
  onCommit: (value: string) => Promise<boolean>;
  type?: 'date' | 'text';
  value: string;
}) {
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(value), [value]);

  const commit = async () => {
    const next = draft.trim();
    if (next === value) return;
    setSaving(true);
    const saved = await onCommit(next);
    setSaving(false);
    if (!saved) setDraft(value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      moveFrom(event.currentTarget, event.shiftKey ? -1 : 1);
    } else if (event.key === 'Escape') {
      setDraft(value);
      // Leave the cell without saving what was undone.
      requestAnimationFrame(() => (event.target as HTMLInputElement).blur());
    }
  };

  return (
    <Input
      aria-label={label}
      className={cn(
        'h-8 rounded-md border-transparent bg-transparent px-2 shadow-none hover:border-border focus-visible:border-ring focus-visible:bg-card print:border-0',
        align === 'right' && 'text-right tabular-nums',
        saving && 'opacity-60'
      )}
      data-cell={cell}
      inputMode={align === 'right' ? 'decimal' : undefined}
      list={list}
      onBlur={() => void commit()}
      onChange={event => setDraft(event.target.value)}
      onKeyDown={onKeyDown}
      type={type}
      value={draft}
    />
  );
}

/**
 * Lançamentos: one month of money as one spreadsheet. Salários, Parcelas, Faturas and Impostos show
 * up by themselves (from Fixos and Dívidas); Receitas avulsas and Gastos are typed in here, and
 * Gastos also come in from a .csv or .xlsx. It filters, totals, and exports as CSV or PDF.
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
  const file = isMonth ? month : `${from}_${to}`;

  // Only the month's part of the page waits or fails; the header and the tabs always show.
  const body = viewer.error ? (
    <QueryError
      error={viewer.error}
      onRetry={() => viewer.refetch()}
      title="Não foi possível carregar suas finanças"
    />
  ) : backwards ? (
    <FormError message="O início do período vem depois do fim. Troque as datas." />
  ) : !statement && (loading || !holderId) ? (
    <MonthSkeleton />
  ) : !statement ? (
    <QueryError
      error={error}
      onRetry={() => refetch()}
      title={`Não foi possível carregar ${isMonth ? name.toLowerCase() : 'o período'}`}
    />
  ) : (
    <>
      {error && (
        <QueryError
          error={error}
          onRetry={() => refetch()}
          title="Parte do período não carregou; o resto está abaixo"
        />
      )}
      <Totals isMonth={isMonth} statement={statement} />
      <Ledger file={file} holderId={holderId!} isMonth={isMonth} statement={statement} />
      <ReportCharts holderId={holderId!} />
    </>
  );

  return (
    <div className="flex flex-col gap-6" data-bot="FINANCE">
      <div>
        <EntriesTabs />
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              {isMonth && (
                <Button
                  aria-label="Mês anterior"
                  className="print:hidden"
                  onClick={() => go(-1)}
                  size="icon"
                  variant="ghost"
                >
                  <ChevronLeftIcon />
                </Button>
              )}
              <motion.h1
                animate={{ opacity: 1, y: 0 }}
                className={cn(isMonth && 'min-w-56 text-center')}
                initial={{ opacity: 0, y: 6 }}
                key={`${from}..${to}`}
              >
                {name}
              </motion.h1>
              {isMonth && (
                <Button
                  aria-label="Próximo mês"
                  className="print:hidden"
                  onClick={() => go(1)}
                  size="icon"
                  variant="ghost"
                >
                  <ChevronRightIcon />
                </Button>
              )}
            </div>
            {!isMonth && (
              <p className="text-sm text-muted-foreground tabular-nums">{spanName(from, to)}</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <AddEntryButton direction="IN" month={isMonth ? month : undefined} />
            <AddEntryButton direction="OUT" month={isMonth ? month : undefined} />
          </div>
        </header>
        {/* What span the sheet covers: a month walked with the arrows, the last days or months, or any two dates. */}
        <div className="mt-4 flex flex-wrap items-end gap-3 print:hidden">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="period">Período</Label>
            <Select onValueChange={value => choose(value as Preset)} value={preset}>
              <SelectTrigger className="w-52 bg-card" id="period">
                <CalendarRangeIcon />
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
          </div>
          {preset === 'custom' && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="period-from">De</Label>
                <Input
                  className="w-44 bg-card"
                  id="period-from"
                  max={to}
                  onChange={event => setSpan('from', event.target.value)}
                  type="date"
                  value={from}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="period-to">Até</Label>
                <Input
                  className="w-44 bg-card"
                  id="period-to"
                  min={from}
                  onChange={event => setSpan('to', event.target.value)}
                  type="date"
                  value={to}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {body}
    </div>
  );
}

/** The month's place while it loads: the totals and the sheet, as shapes. */
function MonthSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-6" role="status">
      <span className="sr-only">Carregando o mês…</span>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-96 w-full rounded-2xl" />
    </div>
  );
}

function Totals({ isMonth, statement }: { isMonth: boolean; statement: Statement }) {
  const balance = isMonth ? 'Saldo do mês' : 'Saldo do período';
  const figures = [
    { detail: 'Renda fixa e receitas avulsas', label: 'Entradas', value: statement.incomeCents },
    {
      detail: `Compromissos ${formatCents(statement.commitmentsCents)} · Gastos ${formatCents(statement.expensesCents)}`,
      label: 'Saídas',
      value: statement.commitmentsCents + statement.expensesCents,
    },
    {
      detail:
        statement.balanceCents < 0
          ? `${isMonth ? 'O mês fecha' : 'O período fecha'} no vermelho`
          : `O que sobra no ${isMonth ? 'mês' : 'período'}`,
      label: balance,
      value: statement.balanceCents,
    },
  ];
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-3">
      {figures.map(figure => (
        <div className="flex flex-col gap-1 bg-card p-5" key={figure.label}>
          <span className="text-sm text-muted-foreground">{figure.label}</span>
          <strong
            className={cn(
              'text-3xl font-semibold tracking-tight tabular-nums',
              figure.label === balance && (figure.value < 0 ? 'text-destructive' : 'text-success')
            )}
          >
            {formatCents(figure.value)}
          </strong>
          <span className="text-[13px] text-muted-foreground tabular-nums">{figure.detail}</span>
        </div>
      ))}
    </div>
  );
}

/** The period's spreadsheet: every line, filterable, with the file going in and out. */
function Ledger({
  file: fileName,
  holderId,
  isMonth,
  statement,
}: {
  /** The period in the exported file's name: `2026-10` or `2026-05-01_2026-10-31`. */
  file: string;
  holderId: string;
  isMonth: boolean;
  statement: Statement;
}) {
  const [removeExpense] = useMutation(DeleteExpenseDocument, { refetchQueries: [PeriodDocument] });
  const [removeIncome] = useMutation(DeleteOneOffIncomeDocument, {
    refetchQueries: [PeriodDocument],
  });
  const [update] = useMutation(UpdateRecordDocument, {
    awaitRefetchQueries: true,
    refetchQueries: [PeriodDocument],
  });
  /** Ids of the typed or imported lines picked to delete together. */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  /** A Fonte de Renda or Operação about to be deleted from one of its lines. */
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [category, setCategory] = useState('ALL');
  const file = useRef<HTMLInputElement>(null);
  const [table, setTable] = useState<{ name: string; table: SpreadsheetTable } | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const entries = entriesOf(statement);
  const categories = [...new Set(entries.map(entry => entry.category))].sort();
  const shown = entries.filter(
    entry =>
      (filter === 'ALL' || entry.direction === filter) &&
      (category === 'ALL' || entry.category === category)
  );
  // A Gasto recorrente on a Cartão is in its Fatura already: listed, not counted.
  const shownTotal = shown
    .filter(entry => !entry.informative)
    .reduce(
      (total, entry) => total + (entry.direction === 'IN' ? entry.amountCents : -entry.amountCents),
      0
    );

  const open = async (picked: File | undefined) => {
    setReadError(null);
    if (!picked) return;
    try {
      setTable({ name: picked.name, table: await readTable(picked) });
    } catch {
      setReadError('Não foi possível ler esse arquivo. Use .csv ou .xlsx.');
    }
    if (file.current) file.current.value = '';
  };

  const remove = (entry: Entry) => {
    if (!entry.removable) return;
    const variables = { id: entry.removable.id };
    void (entry.removable.kind === 'EXPENSE'
      ? removeExpense({ variables })
      : removeIncome({ variables }));
  };

  /** Saves one cell of a typed or imported line, checked by the server like when it was added. */
  const save = async (entry: Entry, field: string, value: string): Promise<boolean> => {
    if (!entry.removable) return false;
    const expense = entry.removable.kind === 'EXPENSE';
    const current: Record<string, string> = {
      amount: typed(entry.amountCents),
      date: entry.date,
      description: entry.description,
      ...(expense ? { category: entry.category === 'Sem categoria' ? '' : entry.category } : {}),
    };
    setSaveError(null);
    try {
      await update({
        variables: {
          id: entry.removable.id,
          kind: expense ? 'EXPENSE' : 'ONE_OFF_INCOME',
          values: Object.entries({ ...current, [field]: value }).map(([key, next]) => ({
            key,
            value: next,
          })),
        },
      });
      return true;
    } catch (failure) {
      setSaveError(failure instanceof Error ? failure.message : 'Não foi possível salvar.');
      return false;
    }
  };

  const editable = shown.filter(entry => entry.removable);
  const allPicked =
    editable.length > 0 && editable.every(entry => selected.has(entry.removable!.id));
  const pick = (id: string, on: boolean) =>
    setSelected(current => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const removeSelected = async () => {
    const picked = entries.filter(entry => entry.removable && selected.has(entry.removable.id));
    await Promise.all(
      picked.map(entry =>
        entry.removable!.kind === 'EXPENSE'
          ? removeExpense({ variables: { id: entry.removable!.id } })
          : removeIncome({ variables: { id: entry.removable!.id } })
      )
    );
    setSelected(new Set());
  };

  return (
    <Sheet
      id="entries"
      intro={`Tudo o que entrou e saiu no ${isMonth ? 'mês' : 'período'}. Salários, Parcelas, Faturas e Impostos aparecem sozinhos; o resto você digita ou importa.`}
      title={isMonth ? 'Planilha do mês' : 'Planilha do período'}
      total={
        <span className={shownTotal < 0 ? 'text-destructive' : undefined}>
          {formatCents(shownTotal)}
        </span>
      }
    >
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="flex gap-1 rounded-full bg-secondary p-1">
          {(
            [
              ['ALL', 'Tudo'],
              ['IN', 'Entradas'],
              ['OUT', 'Saídas'],
            ] as const
          ).map(([value, label]) => (
            <Button
              className={cn('h-8 rounded-full px-4', filter === value && 'bg-card shadow-xs')}
              key={value}
              onClick={() => setFilter(value)}
              size="sm"
              variant="ghost"
            >
              {label}
            </Button>
          ))}
        </div>
        <Select onValueChange={setCategory} value={category}>
          <SelectTrigger aria-label="Categoria" className="h-10 w-52 rounded-full bg-card">
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
        {/* The sheet in and out of a file, together on the right. */}
        <div className="ml-auto flex gap-2">
          <Button onClick={() => file.current?.click()} variant="outline">
            <UploadIcon />
            Importar planilha
          </Button>
          <Export file={fileName} statement={statement} />
        </div>
        <input
          accept=".csv,.txt,.xlsx"
          className="hidden"
          onChange={event => void open(event.target.files?.[0])}
          ref={file}
          type="file"
        />
      </div>
      {readError && <FormError message={readError} />}

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-secondary px-4 py-2 print:hidden">
          <span className="text-sm">
            {selected.size}{' '}
            {selected.size === 1 ? 'lançamento selecionado' : 'lançamentos selecionados'}
          </span>
          <Button
            className="ml-auto"
            onClick={() => void removeSelected()}
            size="sm"
            variant="destructive"
          >
            <Trash2Icon />
            Apagar
          </Button>
          <Button onClick={() => setSelected(new Set())} size="sm" variant="ghost">
            Cancelar
          </Button>
        </div>
      )}

      <datalist id="entry-categories">
        {categories.map(name => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 print:hidden">
              <Checkbox
                aria-label="Selecionar todos os lançamentos editáveis"
                checked={allPicked}
                disabled={!editable.length}
                onCheckedChange={on =>
                  setSelected(on ? new Set(editable.map(entry => entry.removable!.id)) : new Set())
                }
              />
            </TableHead>
            <TableHead className="w-40">Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="w-48">Categoria</TableHead>
            <TableHead className="w-28">Tipo</TableHead>
            <TableHead className="w-36 text-right">Valor</TableHead>
            <TableHead className="w-12 print:hidden" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map((entry, index) => {
            const own = entry.removable;
            const sign = entry.direction === 'IN' ? '+' : '−';
            return (
              <TableRow
                data-state={own && selected.has(own.id) ? 'selected' : undefined}
                key={`${entry.source}-${own?.id ?? entry.description}-${entry.date}-${index}`}
              >
                <TableCell className="print:hidden">
                  {own && (
                    <Checkbox
                      aria-label={`Selecionar ${entry.description}`}
                      checked={selected.has(own.id)}
                      onCheckedChange={on => pick(own.id, on === true)}
                    />
                  )}
                </TableCell>
                {own ? (
                  <>
                    <TableCell className="py-1">
                      <SheetCell
                        cell={`date:${index}`}
                        label={`Data de ${entry.description}`}
                        onCommit={value => save(entry, 'date', value)}
                        type="date"
                        value={entry.date}
                      />
                    </TableCell>
                    <TableCell className="py-1">
                      <SheetCell
                        cell={`description:${index}`}
                        label={`Descrição de ${entry.description}`}
                        onCommit={value => save(entry, 'description', value)}
                        value={entry.description}
                      />
                    </TableCell>
                    <TableCell className="py-1">
                      {own.kind === 'EXPENSE' ? (
                        <SheetCell
                          cell={`category:${index}`}
                          label={`Categoria de ${entry.description}`}
                          list="entry-categories"
                          onCommit={value => save(entry, 'category', value)}
                          value={entry.category === 'Sem categoria' ? '' : entry.category}
                        />
                      ) : (
                        <span className="px-2 text-muted-foreground">{entry.category}</span>
                      )}
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell className="tabular-nums">{formatDate(entry.date)}</TableCell>
                    <TableCell>
                      {entry.to ? (
                        <Link
                          className="underline-offset-4 hover:underline"
                          title="Gerenciado em outra página"
                          to={entry.to}
                        >
                          {entry.description}
                        </Link>
                      ) : (
                        entry.description
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{entry.category}</TableCell>
                  </>
                )}
                <TableCell>
                  <Badge variant="secondary">{entry.source}</Badge>
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-medium tabular-nums',
                    own && 'py-1',
                    entry.direction === 'IN' && 'text-success',
                    entry.informative && 'font-normal text-muted-foreground'
                  )}
                >
                  {own ? (
                    <span className="flex items-center justify-end gap-1">
                      {sign}
                      <SheetCell
                        align="right"
                        cell={`amount:${index}`}
                        label={`Valor de ${entry.description}`}
                        onCommit={value => save(entry, 'amount', value)}
                        value={typed(entry.amountCents)}
                      />
                    </span>
                  ) : (
                    `${sign} ${formatCents(entry.amountCents)}`
                  )}
                </TableCell>
                <TableCell className="print:hidden">
                  {(own || entry.owner) && (
                    <Button
                      aria-label={`Apagar ${entry.description}`}
                      onClick={() => (own ? remove(entry) : setDeleting(entry))}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <XIcon />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {!shown.length && <p className="text-muted-foreground">Nenhum lançamento aqui.</p>}
      {saveError && <FormError message={saveError} />}
      {deleting?.owner && (
        <ConfirmDelete
          id={deleting.owner.id}
          kind={deleting.owner.kind}
          name={deleting.description.replace(/ · Parcela .*$/, '')}
          onClose={() => setDeleting(null)}
        />
      )}

      {table && (
        <ImportDialog
          holderId={holderId}
          name={table.name}
          onClose={() => setTable(null)}
          table={table.table}
        />
      )}
    </Sheet>
  );
}

/** The columns of an imported sheet, picked (guessed first), and what will come in. */
function ImportDialog({
  holderId,
  name,
  onClose,
  table,
}: {
  holderId: string;
  name: string;
  onClose: () => void;
  table: SpreadsheetTable;
}) {
  const [columns, setColumns] = useState<Columns>(() => guessColumns(table.headers));
  const [importRows, { error, loading }] = useMutation(ImportExpensesDocument, {
    refetchQueries: [PeriodDocument],
  });
  const ready = columns.date >= 0 && columns.description >= 0 && columns.amount >= 0;
  const reading = ready ? readExpenses(table, columns) : null;

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
      await importRows({ variables: { holderId, rows: reading.lines } });
      onClose();
    } catch {
      // Shown by `error` in the dialog.
    }
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar {name}</DialogTitle>
          <DialogDescription>
            {table.rows.length} linhas. Confira de qual coluna vem cada parte do gasto.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {pick('date', 'Data')}
          {pick('description', 'Descrição')}
          {pick('amount', 'Valor')}
          {pick('category', 'Categoria', true)}
        </div>
        {reading && (
          <div className="flex flex-col gap-3">
            <p>
              <strong>{reading.lines.length}</strong> gastos para importar
              {reading.credits > 0 && `, ${reading.credits} entradas de dinheiro deixadas de fora`}
              {reading.invalid > 0 && `, ${reading.invalid} linhas sem data, descrição ou valor`}.
            </p>
            {reading.lines.length > 0 && (
              <Table>
                <TableBody>
                  {reading.lines.slice(0, 5).map((line, index) => (
                    <TableRow key={index}>
                      <TableCell className="tabular-nums">{formatDate(line.date)}</TableCell>
                      <TableCell>{line.description}</TableCell>
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
        {error && <FormError message={error.message} />}
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
function Export({ file, statement }: { file: string; statement: Statement }) {
  const csv = () => {
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
        <Button className="print:hidden" variant="outline">
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
