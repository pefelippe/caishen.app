import { useMutation, useQuery } from '@apollo/client/react';
import {
  BotsDocument,
  DismissAlertDocument,
  MarkAlertsReadDocument,
  type AlertKind,
  type BotKey,
} from '@zapbots/graphql/client';
import {
  BellIcon,
  CalendarClockIcon,
  CircleAlertIcon,
  CreditCardIcon,
  CheckIcon,
  GaugeIcon,
  MoreHorizontalIcon,
  RefreshCwOffIcon,
  Trash2Icon,
  TrendingUpIcon,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { HEADER_ICON } from '../lib/header';

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
 * detail, overdue ones first, with the unread ones counted on the bell. Opening an Alert marks it
 * read; its ⋯ menu marks it read or removes it, and the header marks them all read.
 */
export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const { data } = useQuery(BotsDocument, { fetchPolicy: 'cache-and-network' });
  const [markRead] = useMutation(MarkAlertsReadDocument);
  const [dismiss] = useMutation(DismissAlertDocument);

  const alerts = (data?.bots ?? [])
    .flatMap(bot => bot.alerts.map(alert => ({ ...alert, bot: bot.key })))
    .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  const unread = alerts.filter(alert => !alert.read);

  const read = (bot: BotKey, ids: string[]) => void markRead({ variables: { bot, ids } });
  const readAll = () => {
    for (const bot of new Set(unread.map(alert => alert.bot))) {
      read(
        bot,
        unread.filter(alert => alert.bot === bot).map(alert => alert.id)
      );
    }
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-label={
            unread.length
              ? `${t('notifications.label')} (${unread.length})`
              : t('notifications.label')
          }
          className={cn(HEADER_ICON, 'relative')}
          size="icon"
          variant="ghost"
        >
          <BellIcon className="size-[18px]" />
          {unread.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-white ring-2 ring-header tabular-nums">
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 overflow-hidden rounded-xl p-0" sideOffset={10}>
        <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1.5">
          <p className="font-semibold">{t('notifications.label')}</p>
          {unread.length > 0 && (
            <Button className="h-8 px-2 text-xs" onClick={readAll} size="sm" variant="ghost">
              <CheckIcon className="size-3.5" />
              {t('notifications.readAll')}
            </Button>
          )}
        </div>
        {alerts.length === 0 ? (
          <p className="px-4 pt-4 pb-8 text-center text-sm text-muted-foreground">
            {t('notifications.empty')}
          </p>
        ) : (
          <ul className="flex max-h-[26rem] flex-col gap-1 overflow-y-auto px-2 pb-2 [scrollbar-width:none]">
            {alerts.map(alert => {
              const kind = KINDS[alert.kind];
              const body = (
                <>
                  <span
                    className={cn(
                      'grid size-9 shrink-0 place-items-center rounded-full',
                      kind.tone,
                      alert.read && 'opacity-60'
                    )}
                  >
                    <kind.icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'block text-sm',
                        alert.read ? 'text-muted-foreground' : 'font-semibold'
                      )}
                    >
                      {t(kind.title)}
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
                      {alert.message}
                    </span>
                  </span>
                </>
              );
              const row = 'flex gap-3 rounded-lg py-2.5 pr-10 pl-2';
              return (
                <li className="group relative" key={alert.id}>
                  {alert.href ? (
                    <Link
                      className={cn(row, 'transition-colors hover:bg-muted')}
                      onClick={() => {
                        if (!alert.read) read(alert.bot, [alert.id]);
                        setOpen(false);
                      }}
                      to={alert.href}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className={row}>{body}</div>
                  )}
                  {!alert.read && (
                    <span
                      aria-hidden
                      className="absolute top-4 right-3.5 size-2 rounded-full bg-primary group-hover:hidden group-has-data-[state=open]:hidden"
                    />
                  )}
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-label={t('notifications.options')}
                        className="absolute top-2 right-1.5 size-7 rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                        size="icon"
                        variant="ghost"
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {!alert.read && (
                        <DropdownMenuItem onSelect={() => read(alert.bot, [alert.id])}>
                          <CheckIcon />
                          {t('notifications.markRead')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onSelect={() =>
                          void dismiss({ variables: { bot: alert.bot, id: alert.id } })
                        }
                        variant="destructive"
                      >
                        <Trash2Icon />
                        {t('notifications.dismiss')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
