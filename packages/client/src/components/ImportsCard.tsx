import { useMutation, useQuery } from '@apollo/client/react';
import {
  DeleteExpenseImportDocument,
  ExpenseImportsDocument,
  PeriodDocument,
  UpdateExpenseImportDocument,
  type ExpenseImportFieldsFragment,
  type ExpenseImportInput,
  type ImportAccountKind,
} from '@zapbots/graphql/client';
import { FileSpreadsheetIcon, Trash2Icon } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';

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

import { formatCents, formatDate } from '../lib/format';
import { FormError } from './FormError';
import { QueryError } from './QueryError';

type ExpenseImport = ExpenseImportFieldsFragment;

/** The kinds of account an Importação can be of, as the User reads them. */
export const ACCOUNT_KINDS: { label: string; value: ImportAccountKind }[] = [
  { label: 'Conta corrente', value: 'CHECKING' },
  { label: 'Cartão de crédito', value: 'CREDIT_CARD' },
  { label: 'Poupança', value: 'SAVINGS' },
  { label: 'Outra', value: 'OTHER' },
];

/** What changing an Importação refreshes: the list, and the sheet its Gastos are in. */
const REFRESH = {
  awaitRefetchQueries: true,
  refetchQueries: [ExpenseImportsDocument, PeriodDocument],
};

/**
 * Arquivos importados, under the Fluxo de caixa: each file with its bank and kind of account (both
 * editable), how many of its Gastos are there and for how much, a category to put all of them
 * under at once, and deleting it with its Gastos.
 */
export function ImportsCard({ holderId }: { holderId: string }) {
  const { data, error, refetch } = useQuery(ExpenseImportsDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { holderId },
  });
  const [update, updating] = useMutation(UpdateExpenseImportDocument, REFRESH);
  const [deleting, setDeleting] = useState<ExpenseImport | null>(null);
  const imports = data?.holder?.imports ?? [];

  if (error && !data) {
    return (
      <QueryError
        error={error}
        onRetry={() => refetch()}
        title="Não foi possível carregar os arquivos importados"
      />
    );
  }
  if (!imports.length) return null;

  const save = (id: string, input: ExpenseImportInput) =>
    void update({ variables: { id, input } }).catch(() => {
      // Shown by `updating.error` under the table.
    });

  return (
    <section
      aria-label="Arquivos importados"
      className="flex flex-col gap-4 rounded-2xl bg-card p-6 md:p-8"
      id="imports"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold tracking-tight">Arquivos importados</h2>
        <p className="text-muted-foreground">
          Cada extrato que você importou. Corrija o banco e o tipo da conta, ponha todos os gastos
          de um arquivo numa categoria, ou apague o arquivo com os gastos dele.
        </p>
      </div>
      <div className="-mx-2 overflow-x-auto">
        <Table className="min-w-[860px]">
          <TableHeader>
            <TableRow className="border-0 hover:bg-transparent">
              <TableHead className="px-2">Arquivo</TableHead>
              <TableHead className="w-44 px-2">Banco</TableHead>
              <TableHead className="w-44 px-2">Tipo</TableHead>
              <TableHead className="w-44 px-2">Categoria de todos</TableHead>
              <TableHead className="w-24 text-right">Gastos</TableHead>
              <TableHead className="w-32 text-right">Total</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {imports.map(item => (
              <TableRow className="border-0 hover:bg-secondary/70" key={item.id}>
                <TableCell className="px-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <FileSpreadsheetIcon className="size-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate font-medium" title={item.fileName}>
                        {item.fileName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.source} · importado em {formatDate(item.createdAt.slice(0, 10))}
                        {item.firstDate &&
                          item.lastDate &&
                          ` · ${formatDate(item.firstDate)} a ${formatDate(item.lastDate)}`}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-2">
                  <TextCell
                    label={`Banco de ${item.fileName}`}
                    onSave={value => save(item.id, { bankName: value })}
                    placeholder="Qual banco?"
                    value={item.bankName ?? ''}
                  />
                </TableCell>
                <TableCell className="px-2">
                  <Select
                    onValueChange={value =>
                      save(item.id, { accountKind: value as ImportAccountKind })
                    }
                    value={item.accountKind}
                  >
                    <SelectTrigger aria-label={`Tipo de ${item.fileName}`} className="w-full">
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
                </TableCell>
                <TableCell className="px-2">
                  <TextCell
                    label={`Categoria de todos os gastos de ${item.fileName}`}
                    onSave={value => value && save(item.id, { category: value })}
                    placeholder="Ex.: Mercado"
                    resetOnSave
                    value=""
                  />
                </TableCell>
                <TableCell className="text-right tabular-nums">{item.expenseCount}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatCents(item.totalCents)}
                </TableCell>
                <TableCell>
                  <Button
                    aria-label={`Apagar ${item.fileName}`}
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleting(item)}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2Icon />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {updating.error && <FormError error={updating.error} />}
      {deleting && <DeleteImport item={deleting} onClose={() => setDeleting(null)} />}
    </section>
  );
}

/** A text typed in place, saved on Enter or on leaving the field when it changed. */
function TextCell({
  label,
  onSave,
  placeholder,
  resetOnSave = false,
  value,
}: {
  label: string;
  onSave: (value: string) => void;
  placeholder: string;
  /** Empties the field once saved: it applies a value, it does not show one. */
  resetOnSave?: boolean;
  value: string;
}) {
  const [draft, setDraft] = useState(value);
  const [shown, setShown] = useState(value);
  // A new value from the server replaces what was typed.
  if (value !== shown) {
    setShown(value);
    setDraft(value);
  }
  const commit = () => {
    if (draft.trim() === value.trim()) return;
    onSave(draft.trim());
    if (resetOnSave) setDraft('');
  };
  const keys = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') setDraft(value);
  };

  return (
    <Input
      aria-label={label}
      onBlur={commit}
      onChange={event => setDraft(event.target.value)}
      onKeyDown={keys}
      placeholder={placeholder}
      value={draft}
    />
  );
}

/** Asks before deleting an Importação, saying how many Gastos go with it. */
function DeleteImport({ item, onClose }: { item: ExpenseImport; onClose: () => void }) {
  const [remove, { error, loading }] = useMutation(DeleteExpenseImportDocument, REFRESH);
  const confirm = async () => {
    try {
      await remove({ variables: { id: item.id } });
      onClose();
    } catch {
      // Shown by `error` in the dialog.
    }
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apagar {item.fileName}?</DialogTitle>
          <DialogDescription>
            {item.expenseCount === 1
              ? 'O gasto que veio desse arquivo sai do Fluxo de caixa junto.'
              : `Os ${item.expenseCount} gastos que vieram desse arquivo saem do Fluxo de caixa junto.`}{' '}
            Isso não pode ser desfeito, mas você pode importar o arquivo de novo.
          </DialogDescription>
        </DialogHeader>
        {error && <FormError error={error} />}
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">
            Cancelar
          </Button>
          <Button disabled={loading} onClick={() => void confirm()} variant="destructive">
            {loading ? 'Apagando…' : 'Apagar arquivo e gastos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
