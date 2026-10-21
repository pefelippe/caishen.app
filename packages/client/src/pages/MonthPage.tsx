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
import { Sheet, SheetRow } from '../components/Sheet';
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

/**
 * Mês: one month of the Holder's money, picked with the arrows. What came in (Fontes de Renda and
 * Receitas avulsas, which are added here), the Compromissos that fall due, the Gastos as a
 * spreadsheet (typed in or imported) and what is left; it exports as CSV or prints to PDF.
 */
export function MonthPage() {
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
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

      <Totals statement={statement} />
      <Incomes holderId={holderId} month={month} statement={statement} />
      <Commitments statement={statement} />
      <Expenses holderId={holderId} month={month} statement={statement} />
    </div>
  );
}

function Totals({ statement }: { statement: Statement }) {
  const figures = [
    { label: 'Receitas', value: statement.incomeCents },
    { label: 'Compromissos', value: statement.commitmentsCents },
    { label: 'Gastos', value: statement.expensesCents },
    { label: 'Saldo', value: statement.balanceCents },
  ];
  return (
    <div className="grid gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-4">
      {figures.map(figure => (
        <div className="flex flex-col gap-1 bg-card p-5" key={figure.label}>
          <span className="text-sm text-muted-foreground">{figure.label}</span>
          <strong
            className={cn(
              'text-2xl font-semibold tracking-tight tabular-nums',
              figure.label === 'Saldo' && figure.value < 0 && 'text-destructive'
            )}
          >
            {formatCents(figure.value)}
          </strong>
        </div>
      ))}
    </div>
  );
}

function Incomes({
  holderId,
  month,
  statement,
}: {
  holderId: string;
  month: string;
  statement: Statement;
}) {
  const [add, { error }] = useMutation(AddOneOffIncomeDocument, {
    refetchQueries: [MonthDocument],
  });
  const [remove] = useMutation(DeleteOneOffIncomeDocument, { refetchQueries: [MonthDocument] });

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
            date: String(values.get('date')),
            description: String(values.get('description')),
            holderId,
          },
        },
      });
      form.reset();
    } catch {
      // Shown by `error` under the form; the typed values stay.
    }
  };

  return (
    <Sheet
      id="incomes"
      intro={
        <>
          Salários em vigor e Receitas avulsas. Salários se cadastram no{' '}
          <Link className="underline underline-offset-4" to="/caishen/finances#income">
            Financeiro
          </Link>
          .
        </>
      }
      title="Receitas"
      total={formatCents(statement.incomeCents)}
    >
      {statement.incomes.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {statement.incomes.map((line, index) => (
            <SheetRow
              action={
                line.kind === 'ONE_OFF' && line.id ? (
                  <Button
                    aria-label={`Remover ${line.label}`}
                    className="print:hidden"
                    onClick={() => void remove({ variables: { id: line.id! } })}
                    size="icon-sm"
                    variant="ghost"
                  >
                    <XIcon />
                  </Button>
                ) : undefined
              }
              amount={formatCents(line.amountCents)}
              detail={
                <>
                  {formatDate(line.date)}{' '}
                  <Badge variant="secondary">{KIND_LABELS[line.kind]}</Badge>
                </>
              }
              key={`${line.label}-${index}`}
              name={line.label}
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Nenhuma receita neste mês.</p>
      )}
      <form
        className="grid gap-3 rounded-xl bg-secondary p-4 sm:grid-cols-[10rem_minmax(0,1fr)_10rem_auto] sm:items-end print:hidden [&_input]:bg-card"
        onSubmit={submit}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="income-date">Data</Label>
          <Input
            defaultValue={localToday().startsWith(month) ? localToday() : `${month}-01`}
            id="income-date"
            key={month}
            name="date"
            required
            type="date"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="income-description">Receita avulsa</Label>
          <Input
            id="income-description"
            name="description"
            placeholder="Freela, venda, reembolso…"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="income-amount">Valor (R$)</Label>
          <Input
            id="income-amount"
            inputMode="decimal"
            name="amount"
            placeholder="800,00"
            required
          />
        </div>
        <Button type="submit">Adicionar</Button>
      </form>
      {error && <FormError message={error.message} />}
    </Sheet>
  );
}

function Commitments({ statement }: { statement: Statement }) {
  return (
    <Sheet
      id="commitments"
      intro={
        <>
          Parcelas, Faturas e Impostos que vencem no mês. Cadastre-os no{' '}
          <Link className="underline underline-offset-4" to="/caishen/finances#obligations">
            Financeiro
          </Link>
          .
        </>
      }
      title="Compromissos"
      total={formatCents(statement.commitmentsCents)}
    >
      {statement.commitments.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {statement.commitments.map((line, index) => (
            <SheetRow
              amount={formatCents(line.amountCents)}
              detail={
                <>
                  {formatDate(line.date)}{' '}
                  <Badge variant="secondary">{KIND_LABELS[line.kind]}</Badge>
                </>
              }
              key={`${line.label}-${index}`}
              name={
                line.kind === 'INSTALLMENT' && line.id ? (
                  <Link
                    className="underline-offset-4 hover:underline"
                    to={`/caishen/operations/${line.id}`}
                  >
                    {line.label}
                  </Link>
                ) : (
                  line.label
                )
              }
            />
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">Nada vence neste mês.</p>
      )}
    </Sheet>
  );
}

function Expenses({
  holderId,
  month,
  statement,
}: {
  holderId: string;
  month: string;
  statement: Statement;
}) {
  const [add, { error }] = useMutation(AddExpenseDocument, { refetchQueries: [MonthDocument] });
  const [remove] = useMutation(DeleteExpenseDocument, { refetchQueries: [MonthDocument] });
  const file = useRef<HTMLInputElement>(null);
  const [table, setTable] = useState<{ name: string; table: SpreadsheetTable } | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

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
            category: String(values.get('category') ?? '') || null,
            date: String(values.get('date')),
            description: String(values.get('description')),
            holderId,
          },
        },
      });
      form.reset();
      (form.elements.namedItem('description') as HTMLInputElement | null)?.focus();
    } catch {
      // Shown by `error` under the sheet; the typed values stay.
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

  const categories = Object.entries(
    statement.expenses.reduce<Record<string, number>>((totals, item) => {
      const key = item.category ?? 'Sem categoria';
      totals[key] = (totals[key] ?? 0) + item.amountCents;
      return totals;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  return (
    <Sheet
      id="expenses"
      intro="Sua planilha de gastos do mês: digite uma linha ou importe um .csv ou .xlsx do banco ou da sua planilha."
      title="Gastos"
      total={formatCents(statement.expensesCents)}
    >
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button onClick={() => file.current?.click()} variant="outline">
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

      {categories.length > 1 && (
        <ul aria-label="Por categoria" className="flex flex-col gap-2">
          {categories.map(([name, cents]) => (
            <li className="grid grid-cols-[10rem_minmax(0,1fr)_7rem] items-center gap-3" key={name}>
              <span className="truncate text-sm">{name}</span>
              <span className="h-2 overflow-hidden rounded-full bg-secondary">
                <motion.span
                  animate={{ width: `${(cents / statement.expensesCents) * 100}%` }}
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
      )}

      <form id="expense-row" onSubmit={submit} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-40">Data</TableHead>
            <TableHead>Descrição</TableHead>
            <TableHead className="w-48">Categoria</TableHead>
            <TableHead className="w-36 text-right">Valor</TableHead>
            <TableHead className="w-12 print:hidden" />
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow className="bg-secondary/60 hover:bg-secondary/60 print:hidden [&_input]:bg-card">
            <TableCell>
              <Input
                aria-label="Data do gasto"
                defaultValue={localToday().startsWith(month) ? localToday() : `${month}-01`}
                form="expense-row"
                key={month}
                name="date"
                required
                type="date"
              />
            </TableCell>
            <TableCell>
              <Input
                aria-label="Descrição do gasto"
                form="expense-row"
                name="description"
                placeholder="Mercado, aluguel, Uber…"
                required
              />
            </TableCell>
            <TableCell>
              <Input
                aria-label="Categoria do gasto"
                form="expense-row"
                list="expense-categories"
                name="category"
                placeholder="Alimentação"
              />
              <datalist id="expense-categories">
                {categories.map(([name]) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </TableCell>
            <TableCell>
              <Input
                aria-label="Valor do gasto"
                className="text-right"
                form="expense-row"
                inputMode="decimal"
                name="amount"
                placeholder="0,00"
                required
              />
            </TableCell>
            <TableCell>
              <Button aria-label="Adicionar gasto" form="expense-row" size="icon-sm" type="submit">
                +
              </Button>
            </TableCell>
          </TableRow>
          {statement.expenses.map(item => (
            <TableRow key={item.id}>
              <TableCell className="tabular-nums">{formatDate(item.date)}</TableCell>
              <TableCell>
                {item.description}
                {item.imported && (
                  <FileSpreadsheetIcon
                    aria-label="importado"
                    className="ml-2 inline size-3.5 text-muted-foreground"
                  />
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{item.category ?? '—'}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatCents(item.amountCents)}
              </TableCell>
              <TableCell className="print:hidden">
                <Button
                  aria-label={`Remover ${item.description}`}
                  onClick={() => void remove({ variables: { id: item.id } })}
                  size="icon-sm"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {!statement.expenses.length && (
        <p className="text-muted-foreground">Nenhum gasto neste mês ainda.</p>
      )}
      {error && <FormError message={error.message} />}

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
