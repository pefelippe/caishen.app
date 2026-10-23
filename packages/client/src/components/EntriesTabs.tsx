import { NavLink, useSearchParams } from 'react-router-dom';

import { cn } from '@/lib/utils';

/**
 * The tabs of Lançamentos: the month as a sheet, the Entradas month by month, the Saídas fixas
 * that show up in every month by themselves, and the Impostos of the Titular's company. The month picked stays in the link.
 */
export function EntriesTabs() {
  const [params] = useSearchParams();
  const month = params.get('m');
  const tabs = [
    { label: 'Mês', to: `/caishen/entries${month ? `?m=${month}` : ''}` },
    { label: 'Entradas', to: `/caishen/entries/income${month ? `?m=${month}` : ''}` },
    { label: 'Saídas fixas', to: `/caishen/entries/fixed${month ? `?m=${month}` : ''}` },
    { label: 'Impostos', to: '/caishen/entries/taxes' },
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
