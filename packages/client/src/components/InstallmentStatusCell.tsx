import { useMutation } from '@apollo/client/react';
import {
  ClearLatePaymentDocument,
  CreditOperationDocument,
  HolderDocument,
  RecordLatePaymentDocument,
  type CreditOperationQuery,
} from '@mny/graphql/client';
import { type FormEvent, useState } from 'react';

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

  if (row.status === 'UPCOMING') return <span className="muted small">a vencer</span>;

  if (editing) {
    const submit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const paidOn = String(new FormData(event.currentTarget).get('paidOn')) || null;
      await record({ variables: { ...variables, paidOn } }).catch(() => undefined);
      setEditing(false);
    };
    return (
      <form className="row" onSubmit={submit}>
        <input
          defaultValue={row.status === 'PAID_LATE' ? (row.paidOn ?? '') : ''}
          name="paidOn"
          title="Pago em (vazio = em aberto)"
          type="date"
        />
        <button className="secondary" type="submit">
          Salvar
        </button>
        <button className="link" onClick={() => setEditing(false)} type="button">
          cancelar
        </button>
        {error && <span className="error small">{error.message}</span>}
      </form>
    );
  }

  return (
    <span className="row small">
      {row.status === 'PAID' && <span className="muted">em dia</span>}
      {row.status === 'PAID_LATE' && (
        <span className="warn-text">
          pago em {formatDate(row.paidOn)} ({row.daysLate} dias de atraso)
        </span>
      )}
      {row.status === 'OPEN_LATE' && (
        <span className="error">em aberto há {row.daysLate} dias</span>
      )}
      <button className="link" onClick={() => setEditing(true)} type="button">
        {row.status === 'PAID' ? 'registrar atraso' : 'editar'}
      </button>
      {row.status !== 'PAID' && (
        <button className="link" onClick={() => void clear({ variables })} type="button">
          foi em dia
        </button>
      )}
    </span>
  );
}
