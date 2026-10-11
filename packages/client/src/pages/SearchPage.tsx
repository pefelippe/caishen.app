import { useQuery } from '@apollo/client/react';
import { SearchDocument, type SearchQuery } from '@mny/graphql/client';
import { Link, useSearchParams } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';

import { BuddyGlyph } from '../components/BuddyGlyph';

type Hit = SearchQuery['search'][number];

/** Where a hit opens. Tasks and Workouts have no page of their own, so they open their Area. */
const PATH: Record<Hit['kind'], (id: string) => string> = {
  CREDIT_CARD: () => '/financas',
  CREDIT_OPERATION: id => `/financas/operacoes/${id}`,
  NOTE: id => `/anotacoes/${id}`,
  TASK: () => '/trabalho',
  WORKOUT: () => '/fitness',
};

const KIND: Record<Hit['kind'], string> = {
  CREDIT_CARD: 'Cartão',
  CREDIT_OPERATION: 'Operação de Crédito',
  NOTE: 'Anotação',
  TASK: 'Tarefa',
  WORKOUT: 'Treino',
};

/** Results of the sidebar search, across the four Areas. */
export function SearchPage() {
  const [params] = useSearchParams();
  const term = (params.get('q') ?? '').trim();
  const { data, loading } = useQuery(SearchDocument, {
    fetchPolicy: 'cache-and-network',
    skip: term.length < 2,
    variables: { term },
  });
  const hits = term.length < 2 ? [] : (data?.search ?? []);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <header>
        <span className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Busca
        </span>
        <h1>{term ? `“${term}”` : 'Busca'}</h1>
        <p className="mt-1 text-muted-foreground">
          {term.length < 2
            ? 'Digite ao menos duas letras na busca da barra lateral.'
            : loading && !data
              ? 'Procurando…'
              : `${hits.length} ${hits.length === 1 ? 'resultado' : 'resultados'} em Tarefas, Anotações, Finanças e Treinos.`}
        </p>
      </header>

      {loading && !data ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <ul className="flex flex-col border-t border-foreground/60">
          {hits.map(hit => (
            <li className="border-b" data-area={hit.area} key={`${hit.kind}-${hit.id}`}>
              <Link className="group flex items-start gap-3 py-3" to={PATH[hit.kind](hit.id)}>
                <BuddyGlyph area={hit.area} className="mt-0.5" size={20} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="underline-offset-4 group-hover:underline">{hit.title}</span>
                  {hit.detail && (
                    <span className="truncate text-xs text-muted-foreground">{hit.detail}</span>
                  )}
                </span>
                <span className="shrink-0 text-xs text-ink">{KIND[hit.kind]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
