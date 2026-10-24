import { CircleAlertIcon } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';

import { friendlyError } from '../lib/errors';

/**
 * A mutation or sign-in error shown under the form that caused it, always in the User's words
 * (`friendlyError`): pass the error itself, or a message already written for people.
 */
export function FormError({ error, message }: { error?: unknown; message?: string }) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertDescription>{friendlyError(error ?? message)}</AlertDescription>
    </Alert>
  );
}
