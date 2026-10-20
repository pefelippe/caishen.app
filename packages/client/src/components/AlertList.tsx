import type { AlertFieldsFragment } from '@zapbots/graphql/client';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

/** A Bot's Alerts, most urgent first; overdue ones get the red dot. */
export function AlertList({ alerts }: { alerts: AlertFieldsFragment[] }) {
  return (
    <ul className="flex max-w-prose flex-col divide-y">
      {alerts.map((alert, index) => (
        <li className="flex items-baseline gap-2 py-1.5" key={index}>
          <span
            aria-hidden
            className={cn(
              'size-1.5 shrink-0 translate-y-[-1px] rounded-full',
              alert.kind === 'OVERDUE' ? 'bg-destructive' : 'bg-ink'
            )}
          />
          {alert.href ? (
            <Link className="underline-offset-4 hover:underline" to={alert.href}>
              {alert.message}
            </Link>
          ) : (
            <span>{alert.message}</span>
          )}
        </li>
      ))}
    </ul>
  );
}
