import { ArrowRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@zapbots/ui/components/card';
import { Skeleton } from '@zapbots/ui/components/skeleton';

/** One card of the Dashboard: a title, a link to its screen, and what it shows. */
export function Panel({
  children,
  link,
  title,
}: {
  children: ReactNode;
  link?: { label: string; to: string };
  title: string;
}) {
  return (
    <Card className="h-full gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold">
          {/* The area's colour, from the `data-area` the Dashboard puts around each card. */}
          <span aria-hidden className="h-4 w-1 rounded-full bg-(--area,var(--primary))" />
          {title}
        </h2>
        {link && (
          <Link
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            to={link.to}
          >
            {link.label}
            <ArrowRightIcon className="size-3.5" />
          </Link>
        )}
      </div>
      {children}
    </Card>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function Lines({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton className="h-5" key={index} />
      ))}
    </div>
  );
}
