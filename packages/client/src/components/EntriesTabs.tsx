import { NavLink, useSearchParams } from 'react-router-dom';

import { cn } from '@/lib/utils';

/**
 * The two tabs of Lançamentos: the month's lines, and the Fixos that make some of them appear
 * every month. The month picked stays in the link.
 */
export function EntriesTabs() {
  const [params] = useSearchParams();
  const month = params.get('m');
  const tabs = [
    { label: 'Lançamentos do mês', to: `/caishen/entries${month ? `?m=${month}` : ''}` },
    { label: 'Fixos', to: `/caishen/entries/fixed${month ? `?m=${month}` : ''}` },
  ];
  return (
    <nav aria-label="Lançamentos" className="mb-4 flex gap-1 rounded-full bg-card p-1 print:hidden">
      {tabs.map(tab => (
        <NavLink
          className={({ isActive }) =>
            cn(
              'rounded-full px-4 py-1.5 text-sm transition-colors',
              isActive ? 'bg-foreground text-background' : 'hover:bg-secondary'
            )
          }
          end
          key={tab.label}
          to={tab.to}
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
