import { useMutation, useQuery } from '@apollo/client/react';
import {
  BudgetDocument,
  SaveBudgetDocument,
  type BudgetMethod,
  type BudgetQuery,
} from '@zapbots/graphql/client';
import { addMonths, BUDGET_METHODS, budgetSlicesProblem } from '@zapbots/finance';
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { BotPage } from '../components/BotPage';
import { FormError } from '../components/FormError';
import { localToday } from '../lib/bots';
import { formatCents } from '../lib/format';

type Budget = BudgetQuery['viewerHolder']['budget'];
type Slice = { key: string; label: string; percent: number };

const METHODS: { key: BudgetMethod; label: string; note: string }[] = [
  { key: 'FIFTY_THIRTY_TWENTY', label: '50/30/20', note: 'Necessidades, desejos e objetivos.' },
  { key: 'SEVENTY_TWENTY_TEN', label: '70/20/10', note: 'Para quem está apertado ou endividado.' },
  { key: 'AUVP', label: 'Categorias AUVP', note: 'Seis fatias, de custos fixos a conhecimento.' },
  { key: 'CUSTOM', label: 'Personalizado', note: 'Você define as fatias.' },
];

const monthTitle = (month: string) => {
  const name = new Date(`${month}-01T12:00:00`).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return name.charAt(0).toUpperCase() + name.slice(1);
};

/** The slices and the category map as the mutation takes them. */
function inputOf(
  holderId: string,
  method: BudgetMethod,
  slices: Slice[],
  categories: Record<string, string>
) {
  const keys = new Set(slices.map(slice => slice.key));
  return {
    categories: Object.entries(categories)
      .filter(([, sliceKey]) => keys.has(sliceKey))
      .map(([name, sliceKey]) => ({ name, sliceKey })),
    holderId,
    method,
    slices: slices.map(({ key, label, percent }) => ({ key, label, percent })),
  };
}

/** Edits the slices' names and shares; they must add up to 100%. */
function SlicesDialog({
  initial,
  onClose,
  onSave,
}: {
  initial: Slice[];
  onClose: () => void;
  onSave: (slices: Slice[]) => Promise<boolean>;
}) {
  const [slices, setSlices] = useState(initial);
  const [saving, setSaving] = useState(false);
  const problem = budgetSlicesProblem(slices);
  const total = slices.reduce((sum, slice) => sum + slice.percent, 0);
  const change = (index: number, patch: Partial<Slice>) =>
    setSlices(current =>
      current.map((slice, at) => (at === index ? { ...slice, ...patch } : slice))
    );

  const save = async () => {
    setSaving(true);
    if (await onSave(slices)) onClose();
    setSaving(false);
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar fatias</DialogTitle>
          <DialogDescription>
            Dê nome a cada fatia e quanto da renda vai para ela.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {slices.map((slice, index) => (
            <li className="flex items-center gap-2" key={slice.key}>
              <Input
                aria-label="Nome da fatia"
                className="flex-1"
                onChange={event => change(index, { label: event.target.value })}
                value={slice.label}
              />
              <div className="flex w-24 items-center gap-1 rounded-md bg-muted pr-2">
                <Input
                  aria-label={`Porcentagem de ${slice.label}`}
                  className="border-0 bg-transparent text-right tabular-nums shadow-none focus-visible:ring-0"
                  inputMode="numeric"
                  onChange={event =>
                    change(index, { percent: Number.parseInt(event.target.value, 10) || 0 })
                  }
                  value={String(slice.percent)}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <Button
                aria-label={`Tirar ${slice.label}`}
                disabled={slices.length <= 2}
                onClick={() => setSlices(current => current.filter((_, at) => at !== index))}
                size="icon-sm"
                variant="ghost"
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-3">
          <Button
            disabled={slices.length >= 8}
            onClick={() =>
              setSlices(current => [
                ...current,
                { key: `slice-${Date.now().toString(36)}`, label: 'Nova fatia', percent: 0 },
              ])
            }
            size="sm"
            variant="secondary"
          >
            <PlusIcon />
            Fatia
          </Button>
          <span
            className={cn(
              'text-sm tabular-nums',
              total === 100 ? 'text-success' : 'text-destructive'
            )}
          >
            Total: {total}%
          </span>
        </div>
        {problem && total === 100 && <FormError message={problem} />}
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">
            Cancelar
          </Button>
          <Button disabled={Boolean(problem) || saving} onClick={() => void save()}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** One slice: its share, what went out in it against what it allows, and its categories. */
function SliceCard({ slice }: { slice: Budget['slices'][number] }) {
  const over = slice.spentCents > slice.plannedCents;
  const used =
    slice.plannedCents > 0 ? Math.min(100, (slice.spentCents / slice.plannedCents) * 100) : 0;
  return (
    <Card className="gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-semibold">{slice.label}</h2>
        <span className="text-sm text-muted-foreground tabular-nums">{slice.percent}%</span>
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          <span
            className={cn(
              'text-xl font-semibold tabular-nums',
              over ? 'text-destructive' : 'text-foreground'
            )}
          >
            {formatCents(slice.spentCents)}
          </span>{' '}
          de {formatCents(slice.plannedCents)}
        </p>
        <Progress
          className={cn(
            'h-2.5 bg-muted',
            over && '[&>[data-slot=progress-indicator]]:bg-destructive'
          )}
          value={over ? 100 : used}
        />
        <p className="text-xs text-muted-foreground">
          {over
            ? `${formatCents(slice.spentCents - slice.plannedCents)} acima do previsto`
            : `Sobram ${formatCents(slice.plannedCents - slice.spentCents)}`}
          {' · '}
          {slice.count === 1 ? '1 lançamento' : `${slice.count} lançamentos`}
        </p>
      </div>
      {slice.categories.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {slice.categories.map(category => (
            <li className="rounded-full bg-muted px-2.5 py-1 text-xs" key={category}>
              {category}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/**
 * Orçamento, after the AUVP's: the month's income split into slices by a method (50/30/20,
 * 70/20/10, the AUVP's categories or the User's own), each slice with what went out against what
 * it allows, and where each spending category goes. Sums are the server's (docs/adr/0018).
 */
export function BudgetPage() {
  const [params, setParams] = useSearchParams();
  const month = /^\d{4}-\d{2}$/.test(params.get('m') ?? '')
    ? params.get('m')!
    : localToday().slice(0, 7);
  const go = (delta: number) => setParams({ m: addMonths(`${month}-01`, delta).slice(0, 7) });
  const { data, refetch } = useQuery(BudgetDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { month },
  });
  const [save, { error }] = useMutation(SaveBudgetDocument);
  const [editing, setEditing] = useState(false);

  const holderId = data?.viewerHolder.id;
  const budget = data?.viewerHolder.budget;
  const mapping = Object.fromEntries(
    (budget?.categories ?? [])
      .filter(item => item.sliceKey)
      .map(item => [item.name, item.sliceKey!])
  );
  const slices: Slice[] =
    budget?.slices.map(({ key, label, percent }) => ({ key, label, percent })) ?? [];

  const store = async (method: BudgetMethod, nextSlices: Slice[], categories = mapping) => {
    if (!holderId) return false;
    const result = await save({
      variables: { input: inputOf(holderId, method, nextSlices, categories) },
    }).catch(() => null);
    if (!result?.data) return false;
    await refetch();
    return true;
  };

  const pickMethod = (method: BudgetMethod) => {
    if (!budget || method === budget.method) return;
    if (method === 'CUSTOM') {
      setEditing(true);
      return;
    }
    const preset = BUDGET_METHODS[method];
    // Categories follow a slice of the same key; the rest wait to be placed again.
    void store(method, preset);
  };

  const spentCents =
    (budget?.slices.reduce((sum, slice) => sum + slice.spentCents, 0) ?? 0) +
    (budget?.unassigned.reduce((sum, item) => sum + item.amountCents, 0) ?? 0);

  return (
    <BotPage
      actions={
        <div className="flex items-center gap-1">
          <Button aria-label="Mês anterior" onClick={() => go(-1)} size="icon" variant="ghost">
            <ChevronLeftIcon />
          </Button>
          <span className="min-w-36 text-center font-medium">{monthTitle(month)}</span>
          <Button aria-label="Próximo mês" onClick={() => go(1)} size="icon" variant="ghost">
            <ChevronRightIcon />
          </Button>
        </div>
      }
      bot="FINANCE"
      description="Divida a renda em fatias e acompanhe quanto já saiu de cada uma no mês."
      title="Orçamento"
    >
      {!budget ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map(index => (
            <Skeleton className="h-32 rounded-2xl" key={index} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: 'Sua renda', value: budget.incomeCents },
              { label: 'Gastos do mês', value: spentCents },
              { label: 'Saldo restante', signed: true, value: budget.incomeCents - spentCents },
            ].map(figure => (
              <Card className="gap-1" key={figure.label}>
                <span className="text-sm text-muted-foreground">{figure.label}</span>
                <strong
                  className={cn(
                    'text-3xl font-semibold tracking-tight tabular-nums',
                    figure.signed && (figure.value < 0 ? 'text-destructive' : 'text-success')
                  )}
                >
                  {formatCents(figure.value)}
                </strong>
              </Card>
            ))}
          </div>

          <Card className="gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Método</h2>
                <p className="text-sm text-muted-foreground">
                  {budget.saved
                    ? METHODS.find(item => item.key === budget.method)?.note
                    : 'Sugerido pelos seus dados. Escolha outro quando quiser.'}
                </p>
              </div>
              <Button onClick={() => setEditing(true)} size="sm" variant="secondary">
                <PencilIcon />
                Editar fatias
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {METHODS.map(method => (
                <Button
                  className={cn(
                    'rounded-full',
                    method.key === budget.method &&
                      'bg-primary text-primary-foreground hover:bg-primary'
                  )}
                  key={method.key}
                  onClick={() => pickMethod(method.key)}
                  variant="secondary"
                >
                  {method.label}
                </Button>
              ))}
            </div>
            {error && <FormError message={error.message} />}
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {budget.slices.map(slice => (
              <SliceCard key={slice.key} slice={slice} />
            ))}
          </div>

          <Card className="gap-4">
            <div>
              <h2 className="font-semibold">Onde cada categoria entra</h2>
              <p className="text-sm text-muted-foreground">
                {budget.unassigned.length
                  ? `${formatCents(budget.unassigned.reduce((sum, item) => sum + item.amountCents, 0))} deste mês ainda não estão em nenhuma fatia.`
                  : 'Tudo o que saiu neste mês já está numa fatia.'}
              </p>
            </div>
            {budget.categories.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum gasto neste mês ainda. Os que você lançar aparecem aqui.
              </p>
            ) : (
              <ul className="grid gap-2 md:grid-cols-2">
                {budget.categories.map(category => (
                  <li
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2',
                      category.sliceKey ? 'bg-muted' : 'bg-accent'
                    )}
                    key={category.name}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{category.name}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatCents(category.amountCents)} neste mês
                      </span>
                    </span>
                    <Select
                      onValueChange={sliceKey =>
                        void store(budget.method, slices, { ...mapping, [category.name]: sliceKey })
                      }
                      value={category.sliceKey ?? undefined}
                    >
                      <SelectTrigger
                        aria-label={`Fatia de ${category.name}`}
                        className="w-44 bg-card"
                        size="sm"
                      >
                        <SelectValue placeholder="Escolher fatia" />
                      </SelectTrigger>
                      <SelectContent>
                        {budget.slices.map(slice => (
                          <SelectItem key={slice.key} value={slice.key}>
                            {slice.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
      {editing && budget && (
        <SlicesDialog
          initial={slices}
          onClose={() => setEditing(false)}
          onSave={next => {
            const same =
              budget.method !== 'CUSTOM' &&
              JSON.stringify(next) === JSON.stringify(BUDGET_METHODS[budget.method]);
            return store(same ? budget.method : 'CUSTOM', next);
          }}
        />
      )}
    </BotPage>
  );
}
