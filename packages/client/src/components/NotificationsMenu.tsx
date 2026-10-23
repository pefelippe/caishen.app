import { useQuery } from '@apollo/client/react';
import { BotsDocument, type AlertKind } from '@zapbots/graphql/client';
import {
  BellIcon,
  CalendarClockIcon,
  CircleAlertIcon,
  CreditCardIcon,
  GaugeIcon,
  RefreshCwOffIcon,
  TrendingUpIcon,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { useI18n, type StringKey } from '../lib/i18n';

/** Each kind of Aviso: its mark, its short title and how loud it is. */
const KINDS: Record<AlertKind, { icon: LucideIcon; title: StringKey; tone: string }> = {
  ABOVE_MARKET: {
    icon: TrendingUpIcon,
    title: 'notifications.aboveMarket',
    tone: 'bg-warning/15 text-warning',
  },
  DUE_SOON: {
    icon: CalendarClockIcon,
    title: 'notifications.dueSoon',
    tone: 'bg-primary/10 text-primary',
  },
  HIGH_UTILIZATION: {
    icon: CreditCardIcon,
    title: 'notifications.highUtilization',
    tone: 'bg-warning/15 text-warning',
  },
  OVERDUE: {
    icon: CircleAlertIcon,
    title: 'notifications.overdue',
    tone: 'bg-destructive/10 text-destructive',
  },
  ROUTINE_FAILED: {
    icon: RefreshCwOffIcon,
    title: 'notifications.routineFailed',
    tone: 'bg-muted text-muted-foreground',
  },
  STALE_ASSESSMENT: {
    icon: GaugeIcon,
    title: 'notifications.staleAssessment',
    tone: 'bg-muted text-muted-foreground',
  },
};

/** Overdue first, then what falls due, then the rest. */
const ORDER: AlertKind[] = [
  'OVERDUE',
  'DUE_SOON',
  'HIGH_UTILIZATION',
  'ABOVE_MARKET',
  'STALE_ASSESSMENT',
  'ROUTINE_FAILED',
];

/**
 * The bell in the header: every Bot's Alerts, each with its mark and a short title over the
 * detail, overdue ones first, with their count on the bell. An Alert with a link opens its screen.
 */
export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const { data } = useQuery(BotsDocument, { fetchPolicy: 'cache-and-network' });

  const alerts = (data?.bots ?? [])
    .flatMap(bot => bot.alerts)
    .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-label={
            alerts.length
              ? `${t('notifications.label')} (${alerts.length})`
              : t('notifications.label')
          }
          className="relative size-9 rounded-full text-header-foreground hover:bg-white/10 hover:text-header-foreground"
          size="icon"
          variant="ghost"
        >
          <BellIcon className="size-5" />
          {alerts.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-white ring-2 ring-header tabular-nums">
              {alerts.length > 9 ? '9+' : alerts.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 overflow-hidden rounded-xl p-0" sideOffset={10}>
        <div className="flex items-baseline justify-between px-4 pt-4 pb-2">
          <p className="font-semibold">{t('notifications.label')}</p>
          {alerts.length > 0 && (
            <p className="text-xs text-muted-foreground tabular-nums">{alerts.length}</p>
          )}
        </div>
        {alerts.length === 0 ? (
          <p className="px-4 pt-4 pb-8 text-center text-sm text-muted-foreground">
            {t('notifications.empty')}
          </p>
        ) : (
          <ul className="flex max-h-[26rem] flex-col gap-1 overflow-y-auto px-2 pb-2 [scrollbar-width:none]">
            {alerts.map((alert, index) => {
              const kind = KINDS[alert.kind];
              const body = (
                <>
                  <span
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-full',
                      kind.tone
                    )}
                  >
                    <kind.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{t(kind.title)}</span>
                    <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                      {alert.message}
                    </span>
                  </span>
                </>
              );
              const row = 'flex gap-3 rounded-lg px-2 py-2.5';
              return (
                <li key={index}>
                  {alert.href ? (
                    <Link
                      className={cn(row, 'transition-colors hover:bg-muted')}
                      onClick={() => setOpen(false)}
                      to={alert.href}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className={row}>{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
