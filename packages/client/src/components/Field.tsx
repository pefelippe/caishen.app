import type { ReactNode } from 'react';

import { Label } from '@/components/ui/label';

/** A label above its control, the way every form on the account pages is laid out. */
export function Field({
  children,
  hint,
  label,
}: {
  children: ReactNode;
  hint?: string;
  label: string;
}) {
  return (
    <div className="flex max-w-md flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** The title of a page and the line under it. */
export function PageHeading({ children, subtitle }: { children: ReactNode; subtitle?: ReactNode }) {
  return (
    <header>
      <h1>{children}</h1>
      {subtitle && <p className="mt-1 max-w-prose text-muted-foreground">{subtitle}</p>}
    </header>
  );
}
