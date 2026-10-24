import { useMutation } from '@apollo/client/react';
import {
  ClearLatePaymentDocument,
  CreditOperationDocument,
  HolderDocument,
  RecordLatePaymentDocument,
  type CreditOperationQuery,
} from '@zapbots/graphql/client';
import { type FormEvent, useState } from 'react';

import { Button } from '@zapbots/ui/components/button';
import { Input } from '@zapbots/ui/components/input';

import { friendlyError } from '../lib/errors';
import { formatDate } from '../lib/format';

type Row = NonNullable<CreditOperationQuery['creditOperation']>['schedule'][number];

interface Props {
  operationId: string;
  row: Row;
}

/**
 * Past installments are presumed paid on time; this lets the user record a Late Payment
 * (open, or settled on a date) or undo it.
 */
export function InstallmentStatusCell({ operationId, row }: Props) {
  const [editing, setEditing] = useState(false);
  const options = { refetchQueries: [CreditOperationDocument, HolderDocument] };
  const [record, { error }] = useMutation(RecordLatePaymentDocument, options);
  const [clear] = useMutation(ClearLatePaymentDocument, options);
  const variables = { creditOperationId: operationId, installmentNumber: row.number };

  if (row.status === 'UPCOMING')
    return <span className="text-xs text-muted-foreground">a vencer</span>;

  if (editing) {
    const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const paidOn = String(new FormData(event.currentTarget).get('paidOn')) || null;
      await record({ variables: { ...variables, paidOn } }).catch(() => undefined);
      setEditing(false);
    };
    return (
      <form className="flex flex-wrap items-center gap-2" onSubmit={submit}>
        <Input
          className="h-8 w-auto"
          defaultValue={row.status === 'PAID_LATE' ? (row.paidOn ?? '') : ''}
          name="paidOn"
          title="Pago em (vazio = em aberto)"
          type="date"
        />
        <Button size="sm" type="submit" variant="outline">
          Salvar
        </Button>
        <Button onClick={() => setEditing(false)} size="sm" type="button" variant="link">
          cancelar
        </Button>
        {error && <span className="text-xs text-destructive">{friendlyError(error)}</span>}
      </form>
    );
  }

  return (
    <span className="flex flex-wrap items-center gap-2 text-xs">
      {row.status === 'PAID' && <span className="text-muted-foreground">em dia</span>}
      {row.status === 'PAID_LATE' && (
        <span className="text-warning">
          pago em {formatDate(row.paidOn)} ({row.daysLate} dias de atraso)
        </span>
      )}
      {row.status === 'OPEN_LATE' && (
        <span className="text-destructive">em aberto há {row.daysLate} dias</span>
      )}
      <Button className="h-auto p-0 text-xs" onClick={() => setEditing(true)} variant="link">
        {row.status === 'PAID' ? 'registrar atraso' : 'editar'}
      </Button>
      {row.status !== 'PAID' && (
        <Button
          className="h-auto p-0 text-xs"
          onClick={() => void clear({ variables })}
          variant="link"
        >
          foi em dia
        </Button>
      )}
    </span>
  );
}
