import { CircleAlertIcon } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';

/** A mutation or sign-in error shown under the form that caused it. */
export function FormError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
