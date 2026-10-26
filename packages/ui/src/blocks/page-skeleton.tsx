import { Skeleton } from '@zapbots/ui/components/skeleton';

/**
 * Placeholder while a page's query loads, laid out as a page is (the title and the line under it,
 * then a card), with the same tags and margins, so nothing moves when the page arrives.
 */
export function PageSkeleton() {
  return (
    <div aria-busy aria-label="Carregando" className="flex flex-col gap-8" role="status">
      <header>
        <h1>
          <Skeleton className="inline-block h-[0.8em] w-64 max-w-full align-middle" inline />
        </h1>
        <p className="mt-1">
          <Skeleton className="inline-block h-[0.9em] w-96 max-w-full align-middle" inline />
        </p>
      </header>
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}
