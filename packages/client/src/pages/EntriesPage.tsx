import { useMutation, useQuery } from '@apollo/client/react';
import {
  AddExpenseDocument,
  AddOneOffIncomeDocument,
  DeleteExpenseDocument,
  DeleteOneOffIncomeDocument,
  ImportExpensesDocument,
  MonthDocument,
  ViewerHolderDocument,
  type MonthLineKind,
  type MonthQuery,
} from '@zapbots/graphql/client';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  PlusIcon,
  PrinterIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import { EntriesTabs } from '../components/EntriesTabs';
import { Sheet } from '../components/Sheet';
import { localToday } from '../lib/bots';
import { formatCents, formatDate, parseCents } from '../lib/format';
import {
  guessColumns,
  readExpenses,
  readTable,
  type Columns,
  type Table as SpreadsheetTable,
} from '../lib/spreadsheet';

type Statement = NonNullable<MonthQuery['holder']>['month'];

const KIND_LABELS: Record<MonthLineKind, string> = {
  INSTALLMENT: 'Parcela',
  ONE_OFF: 'Avulsa',
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
  INSTALLMENT: 'Dívidas',
  ONE_OFF: 'Receita avulsa',
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
  /** Where it is managed, for the lines that come from Fixos or Dívidas. */
  to: string | null;
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
      to: line.kind === 'SALARY' ? '/caishen/entries/fixed#income' : null,
    })),
    ...statement.commitments.map(line => ({
      amountCents: line.amountCents,
      category: KIND_CATEGORIES[line.kind],
      date: line.date,
      description: line.label,
      direction: 'OUT' as const,
      removable: null,
      source: KIND_LABELS[line.kind],
      to:
        line.kind === 'INSTALLMENT' && line.id
          ? `/caishen/operations/${line.id}`
          : line.kind === 'TAX'
            ? '/caishen/entries/fixed#taxes'
            : '/caishen/debts',
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
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));
}

type Filter = 'ALL' | 'IN' | 'OUT';

/**
 * Lançamentos: one month of money as one spreadsheet. Salários, Parcelas, Faturas and Impostos show
 * up by themselves (from Fixos and Dívidas); Receitas avulsas and Gastos are typed in here, and
 * Gastos also come in from a .csv or .xlsx. It filters, totals, and exports as CSV or PDF.
 */
export function EntriesPage() {
  const [params, setParams] = useSearchParams();
  const month = /^\d{4}-\d{2}$/.test(params.get('m') ?? '')
    ? params.get('m')!
    : localToday().slice(0, 7);
  const { data: viewer } = useQuery(ViewerHolderDocument);
  const holderId = viewer?.viewerHolder.id;
  const { data, loading } = useQuery(MonthDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !holderId,
    variables: { holderId: holderId!, month },
  });
  const statement = data?.holder?.month;
  const go = (delta: number) => setParams({ m: shift(month, delta) });

  if (!statement && (loading || !holderId)) return <PageSkeleton />;
  if (!statement || !holderId) return <p>Não foi possível carregar o mês.</p>;

  return (
    <div className="flex flex-col gap-6" data-bot="FINANCE">
      <div>
        <EntriesTabs />
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Button
              aria-label="Mês anterior"
              className="print:hidden"
              onClick={() => go(-1)}
              size="icon"
              variant="ghost"
            >
              <ChevronLeftIcon />
            </Button>
            <motion.h1
              animate={{ opacity: 1, y: 0 }}
              className="min-w-56 text-center"
              initial={{ opacity: 0, y: 6 }}
              key={month}
            >
              {monthName(month)}
            </motion.h1>
            <Button
              aria-label="Próximo mês"
              className="print:hidden"
              onClick={() => go(1)}
              size="icon"
              variant="ghost"
            >
              <ChevronRightIcon />
            </Button>
          </div>
          <Export statement={statement} />
        </header>
      </div>

      <Totals statement={statement} />
      <Ledger holderId={holderId} month={month} statement={statement} />
    </div>
  );
}

function Totals({ statement }: { statement: Statement }) {
  const figures = [
    { label: 'Entradas', value: statement.incomeCents },
    { label: 'Saídas', value: statement.commitmentsCents + statement.expensesCents },
    { label: 'Saldo do mês', value: statement.balanceCents },
  ];
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-3">
      {figures.map(figure => (
        <div className="flex flex-col gap-1 bg-card p-5" key={figure.label}>
          <span className="text-sm text-muted-foreground">{figure.label}</span>
          <strong
            className={cn(
              'text-3xl font-semibold tracking-tight tabular-nums',
              figure.label === 'Saldo do mês' && figure.value < 0 && 'text-destructive'
            )}
          >
            {formatCents(figure.value)}
          </strong>
        </div>
      ))}
    </div>
  );
}

/** The month's spreadsheet: a row to add an entrada or a saída, then every line, filterable. */
function Ledger({
  holderId,
  month,
  statement,
}: {
  holderId: string;
  month: string;
  statement: Statement;
}) {
  const [addExpense, { error: expenseError }] = useMutation(AddExpenseDocument, {
    refetchQueries: [MonthDocument],
  });
  const [addIncome, { error: incomeError }] = useMutation(AddOneOffIncomeDocument, {
    refetchQueries: [MonthDocument],
  });
  const [removeExpense] = useMutation(DeleteExpenseDocument, { refetchQueries: [MonthDocument] });
  const [removeIncome] = useMutation(DeleteOneOffIncomeDocument, {
    refetchQueries: [MonthDocument],
  });
  const [direction, setDirection] = useState<'IN' | 'OUT'>('OUT');
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
  const shownTotal = shown.reduce(
    (total, entry) => total + (entry.direction === 'IN' ? entry.amountCents : -entry.amountCents),
    0
  );
  const outByCategory = Object.entries(
    entries
      .filter(entry => entry.direction === 'OUT')
      .reduce<Record<string, number>>((totals, entry) => {
        totals[entry.category] = (totals[entry.category] ?? 0) + entry.amountCents;
        return totals;
      }, {})
  ).sort((a, b) => b[1] - a[1]);
  const outTotal = statement.commitmentsCents + statement.expensesCents;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const amountCents = parseCents(String(values.get('amount')));
    if (amountCents == null) return;
    const common = {
      amountCents,
      date: String(values.get('date')),
      description: String(values.get('description')),
      holderId,
    };
    try {
      if (direction === 'IN') await addIncome({ variables: { input: common } });
      else {
        await addExpense({
          variables: {
            input: { ...common, category: String(values.get('category') ?? '') || null },
          },
        });
      }
      form.reset();
      (form.elements.namedItem('description') as HTMLInputElement | null)?.focus();
    } catch {
      // Shown by the error under the sheet; the typed values stay.
    }
  };

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

  const error = expenseError ?? incomeError;

  return (
    <Sheet
      id="entries"
      intro="Tudo o que entrou e saiu no mês. Salários, Parcelas, Faturas e Impostos aparecem sozinhos; o resto você digita ou importa."
      title="Planilha do mês"
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
        <Button className="ml-auto" onClick={() => file.current?.click()} variant="outline">
          <UploadIcon />
          Importar planilha
        </Button>
        <input
          accept=".csv,.txt,.xlsx"
          className="hidden"
          onChange={event => void open(event.target.files?.[0])}
          ref={file}
          type="file"
        />
      </div>
      {readError && <FormError message={readError} />}

      <form id="entry-row" onSubmit={submit} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="w-48">Categoria</TableHead>
            <TableHead className="w-28">Tipo</TableHead>
            <TableHead className="w-36 text-right">Valor</TableHead>
            <TableHead className="w-12 print:hidden" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="bg-secondary/60 hover:bg-secondary/60 print:hidden [&_[data-slot=select-trigger]]:bg-card [&_input]:bg-card">
            <TableCell>
              <Input
                aria-label="Data"
                defaultValue={localToday().startsWith(month) ? localToday() : `${month}-01`}
                form="entry-row"
                key={month}
                name="date"
                required
                type="date"
              />
            </TableCell>
            <TableCell>
              <Input
                aria-label="Descrição"
                form="entry-row"
                name="description"
                placeholder={
                  direction === 'IN' ? 'Freela, venda, reembolso…' : 'Mercado, aluguel, Uber…'
                }
                required
              />
            </TableCell>
            <TableCell>
              <Input
                aria-label="Categoria"
                disabled={direction === 'IN'}
                form="entry-row"
                list="entry-categories"
                name="category"
                placeholder={direction === 'IN' ? 'Receita avulsa' : 'Alimentação'}
              />
              <datalist id="entry-categories">
                {categories.map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </TableCell>
            <TableCell>
              <Select
                onValueChange={value => setDirection(value as 'IN' | 'OUT')}
                value={direction}
              >
                <SelectTrigger aria-label="Tipo" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OUT">Saída</SelectItem>
                  <SelectItem value="IN">Entrada</SelectItem>
                </SelectContent>
              </Select>
            </TableCell>
            <TableCell>
              <Input
                aria-label="Valor"
                className="text-right"
                form="entry-row"
                inputMode="decimal"
                name="amount"
                placeholder="0,00"
                required
              />
            </TableCell>
            <TableCell>
              <Button
                aria-label="Adicionar lançamento"
                form="entry-row"
                size="icon-sm"
                type="submit"
              >
                <PlusIcon />
              </Button>
            </TableCell>
          </TableRow>
          {shown.map((entry, index) => (
            <TableRow key={`${entry.source}-${entry.description}-${entry.date}-${index}`}>
              <TableCell className="tabular-nums">{formatDate(entry.date)}</TableCell>
              <TableCell>
                {entry.to ? (
                  <Link className="underline-offset-4 hover:underline" to={entry.to}>
                    {entry.description}
                  </Link>
                ) : (
                  entry.description
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{entry.category}</TableCell>
              <TableCell>
                <Badge variant="secondary">{entry.source}</Badge>
              </TableCell>
              <TableCell
                className={cn(
                  'text-right font-medium tabular-nums',
                  entry.direction === 'IN' && 'text-success'
                )}
              >
                {entry.direction === 'IN' ? '+' : '−'} {formatCents(entry.amountCents)}
              </TableCell>
              <TableCell className="print:hidden">
                {entry.removable && (
                  <Button
                    aria-label={`Remover ${entry.description}`}
                    onClick={() => remove(entry)}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <XIcon />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!shown.length && <p className="text-muted-foreground">Nenhum lançamento aqui.</p>}
      {error && <FormError message={error.message} />}

      {outByCategory.length > 1 && (
        <section aria-labelledby="by-category" className="flex flex-col gap-3">
          <h3 className="text-lg font-semibold" id="by-category">
            Saídas por categoria
          </h3>
          <ul className="flex flex-col gap-2">
            {outByCategory.map(([name, cents]) => (
              <li
                className="grid grid-cols-[10rem_minmax(0,1fr)_7rem] items-center gap-3"
                key={name}
              >
                <span className="truncate text-sm">{name}</span>
                <span className="h-2 overflow-hidden rounded-full bg-secondary">
                  <motion.span
                    animate={{ width: `${(cents / outTotal) * 100}%` }}
                    className="block h-full rounded-full bg-foreground"
                    initial={{ width: 0 }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
                <span className="text-right text-sm font-medium tabular-nums">
                  {formatCents(cents)}
                </span>
              </li>
            ))}
          </ul>
        </section>
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
    refetchQueries: [MonthDocument],
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

/** The month as a spreadsheet (CSV, opened by Excel and Google Sheets) or printed to PDF. */
function Export({ statement }: { statement: Statement }) {
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
      ['Saldo', '', '', '', cents(statement.balanceCents)],
    ];
    // `;` and a BOM, the way Excel in pt-BR opens a CSV with accents and decimal commas.
    const text = '﻿' + lines.map(row => row.map(quote).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `caishen-${statement.month}.csv`;
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
