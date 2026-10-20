import { useQuery } from '@apollo/client/react';
import { BotsDocument } from '@zapbots/graphql/client';
import { BellIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import { useI18n } from '../lib/i18n';
import { BotGlyph } from './BotGlyph';

/**
 * The bell in the header: the Alerts of every Bot, overdue ones first, with their count on the
 * bell. An Alert with a link opens its screen.
 */
export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const { data } = useQuery(BotsDocument, { fetchPolicy: 'cache-and-network' });

  const alerts = (data?.bots ?? [])
    .flatMap(bot => bot.alerts.map(alert => ({ ...alert, bot })))
    .sort((a, b) => Number(b.kind === 'OVERDUE') - Number(a.kind === 'OVERDUE'));

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
      <PopoverContent align="end" className="w-80 p-0" sideOffset={10}>
        <div className="border-b px-4 py-3 font-medium">{t('notifications.label')}</div>
        {alerts.length === 0 ? (
          <p className="px-4 py-8 text-center text-muted-foreground">{t('notifications.empty')}</p>
        ) : (
          <ul className="max-h-96 divide-y overflow-y-auto">
            {alerts.map((alert, index) => {
              const body = (
                <>
                  <BotGlyph bot={alert.bot.key} size={28} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {alert.bot.name}
                      {alert.kind === 'OVERDUE' && (
                        <span className="font-medium text-destructive">
                          · {t('notifications.overdue')}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block leading-snug">{alert.message}</span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      alert.kind === 'OVERDUE' ? 'bg-destructive' : 'bg-transparent'
                    )}
                  />
                </>
              );
              return (
                <li key={index}>
                  {alert.href ? (
                    <Link
                      className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted"
                      onClick={() => setOpen(false)}
                      to={alert.href}
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex gap-3 px-4 py-3">{body}</div>
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
