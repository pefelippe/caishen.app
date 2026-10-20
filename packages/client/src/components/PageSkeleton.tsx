import { Skeleton } from '@/components/ui/skeleton';

/** Placeholder while a page's query loads. */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy aria-label="Carregando">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96 max-w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
