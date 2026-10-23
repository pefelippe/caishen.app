import { useMutation } from '@apollo/client/react';
import {
  CancelProposalDocument,
  ConfirmProposalDocument,
  EditProposalDocument,
  type ProposalFieldsFragment,
} from '@zapbots/graphql/client';
import { ArrowRightIcon, CheckIcon, PencilIcon, XIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/lib/i18n';

import { FormError } from './FormError';
import { RecordFields } from './RecordFields';

const TITLE_KEYS = {
  CREATE: 'proposal.title',
  DELETE: 'proposal.titleDelete',
  UPDATE: 'proposal.titleUpdate',
} as const;

/** Where a confirmed record shows up, so the User can see it written. */
function recordPath(proposal: ProposalFieldsFragment): string {
  switch (proposal.kind) {
    case 'CREDIT_OPERATION':
      return proposal.recordId
        ? `/caishen/operations/${proposal.recordId}`
        : '/caishen/entries/fixed#obligations';
    case 'INCOME_SOURCE':
      return '/caishen/entries/income';
    case 'EXPENSE':
    case 'ONE_OFF_INCOME':
      return '/caishen/entries';
    case 'RECURRING_EXPENSE':
      return '/caishen/entries/fixed#recurring';
  }
}

/**
 * A record the Bot offers to create, for the User to check in the chat. Nothing is written until
 * Confirmar (docs/adr/0013); the lines come formatted from the server, as WhatsApp will show them.
 */
export function ProposalCard({ proposal }: { proposal: ProposalFieldsFragment }) {
  const { t } = useI18n();
  const variables = { id: proposal.id };
  // The record shows up on whatever page is open beside the chat.
  const [confirm, confirming] = useMutation(ConfirmProposalDocument, { refetchQueries: 'active' });
  const [cancel, cancelling] = useMutation(CancelProposalDocument);
  const [edit, editing] = useMutation(EditProposalDocument);
  // The values being corrected; `null` while the card only shows them.
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const busy = confirming.loading || cancelling.loading || editing.loading;
  // A deletion has nothing to correct and nothing to see afterwards.
  const deleting = proposal.action === 'DELETE';
  const error = confirming.error ?? cancelling.error ?? editing.error;

  const startEditing = () =>
    setDraft(Object.fromEntries(proposal.fields.map(field => [field.key, field.value])));

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft) return;
    const values = Object.entries(draft).map(([key, value]) => ({ key, value }));
    const result = await edit({ variables: { id: proposal.id, values } }).catch(() => null);
    if (result?.data) setDraft(null);
  };

  return (
    // A raised card of its own, unlike the editorial Card (a rule on top) used on pages.
    <Card className="ml-8 gap-3 rounded-xl border border-border bg-card py-4">
      <CardHeader className="px-4">
        <CardTitle className="text-sm">
          {t(TITLE_KEYS[proposal.action], { kind: proposal.title })}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4">
        {draft ? (
          <form className="flex flex-col gap-3" id={`proposal-${proposal.id}`} onSubmit={save}>
            <RecordFields
              fields={proposal.fields}
              idPrefix={proposal.id}
              onChange={(key, value) =>
                setDraft(current => current && { ...current, [key]: value })
              }
              values={draft}
            />
          </form>
        ) : (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {proposal.lines.map(line => (
              <div className="contents" key={line.label}>
                <dt className="text-muted-foreground">{line.label}</dt>
                <dd className="text-right font-medium tabular-nums">{line.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {error && <FormError message={error.message} />}
      </CardContent>
      <CardFooter className="flex-wrap gap-2 px-4">
        {proposal.status === 'PENDING' && draft ? (
          <>
            <Button disabled={busy} form={`proposal-${proposal.id}`} size="sm" type="submit">
              {editing.loading ? t('proposal.saving') : t('proposal.save')}
            </Button>
            <Button disabled={busy} onClick={() => setDraft(null)} size="sm" variant="ghost">
              {t('proposal.back')}
            </Button>
          </>
        ) : proposal.status === 'PENDING' ? (
          <>
            <p className="w-full text-xs text-muted-foreground">
              {t(deleting ? 'proposal.deletePending' : 'proposal.pending')}
            </p>
            <Button
              disabled={busy}
              onClick={() => void confirm({ variables }).catch(() => undefined)}
              size="sm"
              variant={deleting ? 'destructive' : 'default'}
            >
              {confirming.loading ? t('proposal.saving') : t('proposal.confirm')}
            </Button>
            {!deleting && (
              <Button disabled={busy} onClick={startEditing} size="sm" variant="outline">
                <PencilIcon />
                {t('proposal.edit')}
              </Button>
            )}
            <Button
              disabled={busy}
              onClick={() => void cancel({ variables }).catch(() => undefined)}
              size="sm"
              variant="ghost"
            >
              {t('proposal.cancel')}
            </Button>
          </>
        ) : proposal.status === 'CONFIRMED' ? (
          <>
            <p className="flex items-center gap-1.5 text-sm text-success">
              <CheckIcon className="size-4" />
              {t(deleting ? 'proposal.deleted' : 'proposal.confirmed')}
            </p>
            {!deleting && (
              <Button asChild className="ml-auto h-auto px-0" size="sm" variant="link">
                <Link to={recordPath(proposal)}>
                  {t('proposal.view')}
                  <ArrowRightIcon />
                </Link>
              </Button>
            )}
          </>
        ) : (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <XIcon className="size-4" />
            {t('proposal.cancelled')}
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
