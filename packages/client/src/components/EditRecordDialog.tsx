import { useMutation, useQuery } from '@apollo/client/react';
import {
  RecordFieldsDocument,
  UpdateRecordDocument,
  type RecordKind,
} from '@zapbots/graphql/client';
import { useEffect, useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';

import { FormError } from './FormError';
import { RecordFields } from './RecordFields';

interface Props {
  id: string;
  kind: RecordKind;
  onClose: () => void;
  /** What is being edited, e.g. "Gasto" or the Operation's name. */
  title: string;
}

/** Corrects a saved record; the server checks it as when it was created. */
export function EditRecordDialog({ id, kind, onClose, title }: Props) {
  const { data, loading } = useQuery(RecordFieldsDocument, {
    fetchPolicy: 'network-only',
    variables: { id, kind },
  });
  // Whatever page shows the record refreshes with the corrected values.
  const [update, updating] = useMutation(UpdateRecordDocument, { refetchQueries: 'active' });
  const [values, setValues] = useState<Record<string, string> | null>(null);
  const fields = data?.recordFields;

  useEffect(() => {
    if (fields) setValues(Object.fromEntries(fields.map(field => [field.key, field.value])));
  }, [fields]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!values) return;
    const result = await update({
      variables: {
        id,
        kind,
        values: Object.entries(values).map(([key, value]) => ({ key, value })),
      },
    }).catch(() => null);
    if (result?.data) onClose();
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar {title}</DialogTitle>
          <DialogDescription>Corrija o que estiver errado e salve.</DialogDescription>
        </DialogHeader>
        {loading || !fields || !values ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <form className="flex flex-col gap-3" id={`edit-${id}`} onSubmit={save}>
            <RecordFields
              fields={fields}
              idPrefix={`edit-${id}`}
              onChange={(key, value) =>
                setValues(current => current && { ...current, [key]: value })
              }
              values={values}
            />
          </form>
        )}
        {updating.error && <FormError message={updating.error.message} />}
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">
            Cancelar
          </Button>
          <Button disabled={!values || updating.loading} form={`edit-${id}`} type="submit">
            {updating.loading ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
