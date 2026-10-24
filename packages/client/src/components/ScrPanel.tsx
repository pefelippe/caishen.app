import { useMutation } from '@apollo/client/react';
import {
  CreateScrSnapshotDocument,
  DeleteScrSnapshotDocument,
  HolderDocument,
  type HolderQuery,
  type ScrEntryInput,
} from '@zapbots/graphql/client';
import { TriangleAlertIcon } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { Metric, Metrics } from '@zapbots/ui/blocks/metric';
import { Alert, AlertDescription } from '@zapbots/ui/components/alert';
import { Button } from '@zapbots/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@zapbots/ui/components/card';
import { Input } from '@zapbots/ui/components/input';
import { Label } from '@zapbots/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@zapbots/ui/components/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@zapbots/ui/components/table';
import { cn } from '@zapbots/ui/lib/utils';

import { formatCents, parseCents } from '../lib/format';
import { FormError } from './FormError';

type Holder = NonNullable<HolderQuery['holder']>;

/** Overdue buckets as the SCR reports them; the value is the bucket's upper bound in days. */
const OVERDUE_BUCKETS = [
  { days: 30, label: 'até 30 dias' },
  { days: 60, label: '31 a 60 dias' },
  { days: 90, label: '61 a 90 dias' },
  { days: 180, label: '91 a 180 dias' },
  { days: 360, label: '181 a 360 dias' },
  { days: 9999, label: 'acima de 360 dias' },
];

/** Radix Select forbids an empty item value, so "no overdue" gets its own sentinel. */
const NO_BUCKET = 'none';

/** Gap between SCR and registered debt worth flagging (5%). */
const RECONCILE_TOLERANCE = 0.05;

let draftKey = 0;
const emptyLine = () => ({ key: draftKey++ });

export function ScrPanel({ holder }: { holder: Holder }) {
  const refetch = { refetchQueries: [HolderDocument] };
  const [remove] = useMutation(DeleteScrSnapshotDocument, refetch);
  const [latest, ...older] = holder.scrSnapshots;
  const consented = holder.consents.some(
    consent => consent.source === 'BACEN_REGISTRATO' && !consent.revokedAt
  );

  const gap = latest ? latest.totals.debtCents - holder.registeredDebtCents : 0;
  const unreconciled = latest && gap > latest.totals.debtCents * RECONCILE_TOLERANCE;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retrato SCR (Registrato)</CardTitle>
        <CardDescription>
          O que as instituições reportaram ao Banco Central. Baixe o relatório de Empréstimos e
          Financiamentos em gov.br/registrato. Na Avaliação, esses dados prevalecem sobre os
          declarados.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {latest && (
          <>
            {unreconciled && (
              <Alert className="border-warning/50">
                <TriangleAlertIcon />
                <AlertDescription>
                  O SCR de {latest.referenceMonth} mostra {formatCents(latest.totals.debtCents)} em
                  dívidas, mas só {formatCents(holder.registeredDebtCents)} estão cadastrados.
                  Faltam {formatCents(gap)}: confira se há Operações ou Cartões não cadastrados.
                </AlertDescription>
              </Alert>
            )}
            <Metrics>
              <Metric
                label={`Data-base ${latest.referenceMonth}`}
                value={`Estágio ${latest.totals.stage}`}
              />
              <Metric label="A vencer" value={formatCents(latest.totals.dueCents)} />
              <Metric label="Vencido" value={formatCents(latest.totals.overdueCents)} />
              <Metric label="Prejuízo" value={formatCents(latest.totals.lossCents)} />
              <Metric label="Limites" value={formatCents(latest.totals.limitCents)} />
            </Metrics>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instituição</TableHead>
                  <TableHead>Modalidade</TableHead>
                  <TableHead className="text-right">A vencer</TableHead>
                  <TableHead className="text-right">Vencido</TableHead>
                  <TableHead className="text-right">Prejuízo</TableHead>
                  <TableHead className="text-right">Limite</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latest.entries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.institution}</TableCell>
                    <TableCell>{entry.modality}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCents(entry.dueCents)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right tabular-nums',
                        entry.overdueCents && 'text-destructive'
                      )}
                    >
                      {formatCents(entry.overdueCents)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right tabular-nums',
                        entry.lossCents && 'text-destructive'
                      )}
                    >
                      {formatCents(entry.lossCents)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCents(entry.limitCents)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        {holder.scrSnapshots.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="text-muted-foreground">Retratos:</span>
            {[latest!, ...older].map(snapshot => (
              <span className="flex items-center gap-1" key={snapshot.id}>
                {snapshot.referenceMonth} ({formatCents(snapshot.totals.debtCents)})
                <Button
                  className="h-auto p-0 text-xs"
                  onClick={() => void remove({ variables: { id: snapshot.id } })}
                  variant="link"
                >
                  excluir
                </Button>
              </span>
            ))}
          </div>
        )}

        {consented ? (
          <ManualEntryForm holderId={holder.id} />
        ) : (
          <p className="text-muted-foreground">
            Autorize a consulta ao Registrato (no aviso acima) para registrar um Retrato.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ManualEntryForm({ holderId }: { holderId: string }) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState(() => [emptyLine()]);
  const [create, { error, loading }] = useMutation(CreateScrSnapshotDocument, {
    refetchQueries: [HolderDocument],
  });

  if (!open) {
    return (
      <Button className="self-start" onClick={() => setOpen(true)} variant="outline">
        Preencher Retrato a partir do relatório
      </Button>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const money = (name: string) => parseCents(String(values.get(name) ?? '')) ?? 0;
    const entries: ScrEntryInput[] = lines.map(({ key }) => {
      const bucket = String(values.get(`bucket-${key}`) ?? '');
      return {
        dueCents: money(`due-${key}`),
        institution: String(values.get(`institution-${key}`)),
        limitCents: money(`limit-${key}`),
        lossCents: money(`loss-${key}`),
        modality: String(values.get(`modality-${key}`)),
        overdueCents: money(`overdue-${key}`),
        overdueMaxDays: bucket && bucket !== NO_BUCKET ? Number(bucket) : null,
      };
    });
    const result = await create({
      variables: { input: { entries, holderId, referenceMonth: String(values.get('month')) } },
    }).catch(() => null);
    if (result?.data) {
      setOpen(false);
      setLines([emptyLine()]);
    }
  };

  return (
    <Card className="px-0 py-4 shadow-none">
      <CardContent className="px-4">
        <form className="flex flex-col gap-3" onSubmit={submit}>
          <div className="flex items-center gap-2">
            <Label htmlFor="scr-month">Data-base</Label>
            <Input className="w-auto" id="scr-month" name="month" required type="month" />
          </div>
          {lines.map(({ key }) => (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2" key={key}>
              <Input name={`institution-${key}`} placeholder="Instituição" required />
              <Input
                name={`modality-${key}`}
                placeholder="Modalidade (como no relatório)"
                required
              />
              <Input name={`due-${key}`} placeholder="A vencer (R$)" />
              <Input name={`overdue-${key}`} placeholder="Vencido (R$)" />
              <Select name={`bucket-${key}`}>
                <SelectTrigger className="w-full" title="Faixa do vencido">
                  <SelectValue placeholder="Faixa do vencido (se houver)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_BUCKET}>Sem vencido</SelectItem>
                  {OVERDUE_BUCKETS.map(bucket => (
                    <SelectItem key={bucket.days} value={String(bucket.days)}>
                      {bucket.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input name={`loss-${key}`} placeholder="Prejuízo (R$)" />
              <Input name={`limit-${key}`} placeholder="Limite (R$)" />
              {lines.length > 1 && (
                <Button
                  className="justify-self-start"
                  onClick={() => setLines(lines.filter(line => line.key !== key))}
                  type="button"
                  variant="link"
                >
                  remover linha
                </Button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setLines([...lines, emptyLine()])}
              type="button"
              variant="outline"
            >
              + linha
            </Button>
            <Button disabled={loading} type="submit">
              Salvar Retrato
            </Button>
            <Button onClick={() => setOpen(false)} type="button" variant="link">
              cancelar
            </Button>
          </div>
          {error && <FormError error={error} />}
        </form>
      </CardContent>
    </Card>
  );
}
