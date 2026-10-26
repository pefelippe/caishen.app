import { cn } from '@zapbots/ui/lib/utils';

/** A keyboard shortcut shown beside what it does, e.g. ⌘K. */
export function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cn(
        'pointer-events-none inline-flex h-5 shrink-0 items-center rounded border bg-muted px-1.5 font-sans text-[11px] font-medium text-muted-foreground tabular-nums',
        className
      )}
      {...props}
    />
  );
}
