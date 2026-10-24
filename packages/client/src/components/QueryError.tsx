import { RefreshCwIcon, TriangleAlertIcon } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { friendlyError } from '../lib/errors';

/**
 * A part of a page that failed to load, saying why, with a way to try again. The rest of the page
 * stays: only the part that failed shows this.
 */
export function QueryError({
  className,
  error,
  onRetry,
  title,
}: {
  className?: string;
  error: unknown;
  onRetry?: () => Promise<unknown> | unknown;
  /** What could not be loaded, e.g. "Não foi possível carregar o mês". */
  title: string;
}) {
  const [retrying, setRetrying] = useState(false);
  const retry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
    } catch {
      // The query shows its new error.
    }
    setRetrying(false);
  };

  return (
    <Alert className={cn('bg-card', className)} variant="destructive">
      <TriangleAlertIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <p>{friendlyError(error)}</p>
        {onRetry && (
          <Button disabled={retrying} onClick={() => void retry()} size="sm" variant="outline">
            <RefreshCwIcon className={cn(retrying && 'animate-spin')} />
            {retrying ? 'Tentando…' : 'Tentar de novo'}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
