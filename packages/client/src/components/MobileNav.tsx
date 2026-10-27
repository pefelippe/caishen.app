import { HouseIcon, LayoutGridIcon, RepeatIcon, SheetIcon, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';

import { AgentIcon } from '@zapbots/ui/blocks/agent-icon';
import { BottomSheet } from '@zapbots/ui/blocks/bottom-sheet';
import { Button } from '@zapbots/ui/components/button';
import { cn } from '@zapbots/ui/lib/utils';

import { useI18n } from '../lib/i18n';
import { activeItem, useNav, type NavItem } from '../lib/nav';
import { useChatPanel } from './ChatPanel';

/** The four screens a thumb reaches without opening anything; the Agente sits in the middle. */
const TABS: {
  icon: LucideIcon;
  label: 'tabs.entries' | 'tabs.expenses' | 'tabs.home';
  to: string;
}[] = [
  { icon: HouseIcon, label: 'tabs.home', to: '/' },
  { icon: SheetIcon, label: 'tabs.entries', to: '/caishen/entries' },
  { icon: RepeatIcon, label: 'tabs.expenses', to: '/caishen/fixed' },
];

const TAB =
  'flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors active:scale-95 [&_svg]:size-[22px]';

/**
 * The menu on a phone, along the bottom of the screen in place of the one on the left: Início,
 * Fluxo de caixa, the Agente (opens the chat panel), Gastos and Mais, a sheet from the bottom with
 * every other screen, grouped as on the left.
 */
export function MobileNav() {
  const { pathname } = useLocation();
  const nav = useNav();
  const { t } = useI18n();
  const { open: chatOpen, toggle } = useChatPanel();
  const [more, setMore] = useState(false);

  const all = [...nav.main, ...nav.groups.flatMap(group => group.items), ...nav.account];
  const current = activeItem(all, pathname);
  const onTab = TABS.some(tab => tab.to === current?.to);
  const onChat = pathname === '/chat';

  const tab = ({ icon: Icon, label, to }: (typeof TABS)[number]) => (
    <NavLink
      className={cn(TAB, current?.to === to && 'text-primary')}
      end={to === '/'}
      key={to}
      onClick={() => setMore(false)}
      to={to}
    >
      <Icon strokeWidth={current?.to === to ? 2.25 : 1.75} />
      <span className="max-w-full truncate">{t(label)}</span>
    </NavLink>
  );

  return (
    <>
      <nav
        aria-label={t('tabs.label')}
        className="z-30 shrink-0 bg-card pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_var(--border)] md:hidden print:hidden"
      >
        <div className="flex h-16 items-stretch px-2">
          {tab(TABS[0]!)}
          {tab(TABS[1]!)}
          <div className="flex flex-1 items-center justify-center">
            <Button
              aria-label={t('chat.toggle')}
              aria-pressed={chatOpen || onChat}
              className="size-12 rounded-full transition-transform active:scale-95 [&_svg]:size-[22px]"
              disabled={onChat}
              onClick={toggle}
              size="icon"
            >
              <AgentIcon />
            </Button>
          </div>
          {tab(TABS[2]!)}
          <Button
            aria-expanded={more}
            className={cn(
              TAB,
              'h-full rounded-none hover:bg-transparent',
              (more || (!onTab && !onChat)) && 'text-primary'
            )}
            onClick={() => setMore(true)}
            variant="ghost"
          >
            <LayoutGridIcon strokeWidth={more || (!onTab && !onChat) ? 2.25 : 1.75} />
            <span>{t('tabs.more')}</span>
          </Button>
        </div>
      </nav>

      <BottomSheet className="md:hidden" onOpenChange={setMore} open={more} title={t('tabs.more')}>
        <div className="flex flex-col gap-6 px-5 pt-2">
          {/* A group whose entries are all still to come has nothing to open here. */}
          {nav.groups
            .filter(group => group.items.some(item => !item.soon))
            .map(group => (
              <MoreGroup
                active={current}
                items={group.items}
                key={group.key}
                label={group.label}
                onPick={() => setMore(false)}
              />
            ))}
          <MoreGroup
            active={current}
            items={nav.account}
            label={t('tabs.account')}
            onPick={() => setMore(false)}
          />
        </div>
      </BottomSheet>
    </>
  );
}

/** A group of the Mais sheet: its title over a grid of tiles, each an icon over its name. */
function MoreGroup({
  active,
  items,
  label,
  onPick,
}: {
  active: NavItem | undefined;
  items: NavItem[];
  label: string;
  onPick: () => void;
}) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="text-sm font-semibold text-muted-foreground">{label}</h2>
      <div className="grid grid-cols-3 gap-2">
        {items
          .filter(item => !item.soon)
          .map(item => {
            const on = active?.to === item.to;
            return (
              <Link
                className={cn(
                  'flex min-h-[84px] flex-col items-center justify-center gap-2 rounded-2xl bg-muted px-2 py-3 text-center text-[13px] leading-tight font-medium transition-transform active:scale-95',
                  on && 'bg-primary/10 text-primary'
                )}
                key={item.to}
                onClick={onPick}
                to={item.to}
              >
                <item.icon className="size-[22px]" strokeWidth={on ? 2.25 : 1.75} />
                {item.label}
              </Link>
            );
          })}
      </div>
    </section>
  );
}
