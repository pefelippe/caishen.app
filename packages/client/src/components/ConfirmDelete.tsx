import { useMutation } from '@apollo/client/react';
import { DeleteRecordDocument, type RecordKind } from '@zapbots/graphql/client';

import { Button } from '@zapbots/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@zapbots/ui/components/dialog';

import { FormError } from './FormError';

/** What a deletion takes along, said before it happens. */
const CONSEQUENCES: Record<RecordKind, string> = {
  CREDIT_OPERATION: 'A Operação sai de todos os meses, com as Parcelas, amortizações e atrasos.',
  EXPENSE: 'O Gasto sai deste mês.',
  INCOME_SOURCE: 'A Fonte de Renda sai de todos os meses.',
  ONE_OFF_INCOME: 'A Receita sai deste mês.',
  RECURRING_EXPENSE:
    'O Gasto recorrente sai de todos os meses. Para só parar de contar daqui em diante, edite e informe quando foi cancelado.',
};

interface Props {
  id: string;
  kind: RecordKind;
  /** What is being deleted, as the User knows it. */
  name: string;
  onClose: () => void;
}

/** Deletes a saved record after saying what goes with it; it cannot be undone. */
export function ConfirmDelete({ id, kind, name, onClose }: Props) {
  // Whatever page shows the record refreshes without it.
  const [remove, { error, loading }] = useMutation(DeleteRecordDocument, {
    refetchQueries: 'active',
  });

  const confirm = async () => {
    const result = await remove({ variables: { id, kind } }).catch(() => null);
    if (result?.data) onClose();
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apagar “{name}”?</DialogTitle>
          <DialogDescription>{CONSEQUENCES[kind]} Não dá para desfazer.</DialogDescription>
        </DialogHeader>
        {error && <FormError error={error} />}
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">
            Cancelar
          </Button>
          <Button disabled={loading} onClick={() => void confirm()} variant="destructive">
            {loading ? 'Apagando…' : 'Apagar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
