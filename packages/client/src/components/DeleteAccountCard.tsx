import { useMutation } from '@apollo/client/react';
import { DeleteAccountDocument } from '@zapbots/graphql/client';
import { TriangleAlertIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Field } from '@zapbots/ui/blocks/field';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import { Input } from '@zapbots/ui/components/input';

import { useI18n } from '../lib/i18n';
import { FormError } from './FormError';

/**
 * Excluir conta (docs/adr/0027): the User and every Organization only they belong to, with its
 * data and its paid plan, gone at once. Typing the account's e-mail confirms it.
 */
export function DeleteAccountCard({ email }: { email: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [deleteAccount, { error, loading }] = useMutation(DeleteAccountDocument);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await deleteAccount({ variables: { confirm } }).catch(() => null);
    // The session went with the User: a full load lands on the landing page, signed out.
    if (result?.data?.deleteAccount) window.location.assign('/');
  };

  const matches = confirm.trim().toLowerCase() === email.toLowerCase();

  return (
    <Card>
      <div className="flex items-center gap-3">
        <TriangleAlertIcon className="size-5 text-destructive" />
        <h2 className="text-lg font-semibold">{t('deleteAccount.title')}</h2>
      </div>
      <p className="max-w-prose text-muted-foreground">{t('deleteAccount.body')}</p>
      {open ? (
        <form className="flex max-w-sm flex-col gap-4" onSubmit={event => void submit(event)}>
          <Field label={t('deleteAccount.confirm', { email })}>
            <Input
              autoComplete="off"
              autoFocus
              onChange={event => setConfirm(event.target.value)}
              type="email"
              value={confirm}
            />
          </Field>
          <div className="flex gap-2">
            <Button disabled={loading || !matches} type="submit" variant="destructive">
              {t('deleteAccount.submit')}
            </Button>
            <Button
              onClick={() => {
                setOpen(false);
                setConfirm('');
              }}
              type="button"
              variant="ghost"
            >
              {t('common.cancel')}
            </Button>
          </div>
          {error && <FormError error={error} />}
        </form>
      ) : (
        <Button className="self-start" onClick={() => setOpen(true)} variant="outline">
          {t('deleteAccount.title')}
        </Button>
      )}
    </Card>
  );
}
