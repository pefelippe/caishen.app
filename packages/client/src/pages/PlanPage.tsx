import { useMutation, useQuery } from '@apollo/client/react';
import {
  BillingDocument,
  OpenBillingPortalDocument,
  StartCheckoutDocument,
  UsageDocument,
  type BillingQuery,
} from '@zapbots/graphql/client';
import { CheckIcon, CreditCardIcon, ExternalLinkIcon } from 'lucide-react';
import { type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

import { PageHeading } from '@zapbots/ui/blocks/field';
import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { Alert, AlertDescription, AlertTitle } from '@zapbots/ui/components/alert';
import { Badge } from '@zapbots/ui/components/badge';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import { Progress } from '@zapbots/ui/components/progress';
import { cn } from '@zapbots/ui/lib/utils';

import { FormError } from '../components/FormError';
import { formatCents, formatDate } from '../lib/format';
import { useI18n, type Language } from '../lib/i18n';

type Plan = BillingQuery['plans'][number];

/** How much of a Limit is used, as a bar that turns to warning near the end. */
function Meter({
  label,
  limit,
  note,
  used,
}: {
  label: string;
  limit: number;
  note?: ReactNode;
  used: number;
}) {
  const ratio = limit ? Math.min(used / limit, 1) : 1;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-3xl font-semibold tracking-tight tabular-nums">
        {used}
        <span className="text-lg font-normal text-muted-foreground"> / {limit}</span>
      </span>
      <Progress
        className={cn(ratio >= 0.9 && '[&>[data-slot=progress-indicator]]:bg-destructive')}
        value={ratio * 100}
      />
      {note && <span className="text-sm text-muted-foreground">{note}</span>}
    </div>
  );
}

const monthName = (month: string, language: Language) =>
  new Date(`${month}-15T12:00:00`).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

/** Plano (`/plan`, under Perfil in the menu): the Organization's Plan as a page of its own. */
export function PlanPage() {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-6">
      <PageHeading subtitle={t('billing.subtitle')}>{t('rail.plan')}</PageHeading>
      <PlanSettings />
    </div>
  );
}

/**
 * Plano: the Organization's Plan with what it used of its Limits this month, the Plans side by side
 * (Pro on a field of the primary colour, bought there through Stripe; docs/adr/0011).
 */
export function PlanSettings() {
  const { language, t } = useI18n();
  const [params] = useSearchParams();
  const { data, loading } = useQuery(BillingDocument, { fetchPolicy: 'cache-and-network' });
  const { data: usage } = useQuery(UsageDocument, { fetchPolicy: 'cache-and-network' });
  const [checkout, checkoutState] = useMutation(StartCheckoutDocument);
  const [portal, portalState] = useMutation(OpenBillingPortalDocument);

  if (loading && !data) return <PageSkeleton />;
  if (!data) return <p>{t('common.loadFailed')}</p>;
  const billing = data.billing;
  const onPro = billing.plan.key === 'PRO';

  const goTo = async (start: () => Promise<string | undefined>) => {
    const url = await start().catch(() => undefined);
    if (url) window.location.assign(url);
  };

  const status = (() => {
    if (!onPro) return null;
    if (billing.cancelAtPeriodEnd && billing.currentPeriodEnd) {
      return t('billing.endsOn', { date: formatDate(billing.currentPeriodEnd) });
    }
    if (billing.status === 'past_due') return t('billing.pastDue');
    if (billing.currentPeriodEnd) {
      return t('billing.renewsOn', { date: formatDate(billing.currentPeriodEnd) });
    }
    return null;
  })();

  return (
    <div className="flex flex-col gap-8">
      {params.get('checkout') === 'ok' && (
        <Alert>
          <CheckIcon />
          <AlertTitle>{t('billing.thanks')}</AlertTitle>
          <AlertDescription>{t('billing.thanksText')}</AlertDescription>
        </Alert>
      )}

      <Card className="grid gap-8 md:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12">
        <div className="flex flex-col gap-3">
          <h2 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
            {t('billing.currentPlan', { plan: billing.plan.name })}
            {billing.status === 'past_due' && (
              <Badge variant="destructive">{t('billing.pastDueBadge')}</Badge>
            )}
          </h2>
          {status && <p>{status}</p>}
          {usage && (
            <p className="text-muted-foreground">
              {t('usage.subtitle', { month: monthName(usage.usage.month, language) })}
            </p>
          )}
          {billing.hasCustomer && (
            <Button
              className="mt-2 self-start"
              disabled={portalState.loading}
              onClick={() => void goTo(async () => (await portal()).data?.openBillingPortal)}
              variant="outline"
            >
              <ExternalLinkIcon />
              {t('billing.manage')}
            </Button>
          )}
          {portalState.error && <FormError error={portalState.error} />}
        </div>
        <div className="grid gap-8 sm:grid-cols-3 sm:gap-6">
          <Meter
            label={t('usage.jobs')}
            limit={billing.limits.jobs}
            note={usage && t('usage.routineJobs', { count: usage.usage.routineJobs })}
            used={billing.used.jobs}
          />
          <Meter
            label={t('usage.messages')}
            limit={billing.limits.messages}
            note={t('usage.messagesNote')}
            used={billing.used.messages}
          />
          {usage && (
            <div className="flex flex-col gap-2">
              <span className="text-muted-foreground">{t('usage.conversations')}</span>
              <span className="text-3xl font-semibold tracking-tight tabular-nums">
                {usage.usage.conversations}
              </span>
            </div>
          )}
          {(billing.credits.jobs > 0 || billing.credits.messages > 0) && (
            <p className="text-sm text-muted-foreground sm:col-span-3">
              {t('billing.credits', {
                jobs: billing.credits.jobs,
                messages: billing.credits.messages,
              })}
            </p>
          )}
        </div>
      </Card>

      <section aria-label={t('billing.plans')} className="grid gap-4 md:grid-cols-2">
        {data.plans.map(plan => (
          <PlanCard current={plan.key === billing.plan.key} key={plan.key} plan={plan}>
            {plan.key === 'PRO' && !onPro && (
              <div className="flex flex-col gap-2">
                <Button
                  className="self-start bg-card text-primary hover:bg-card/90"
                  disabled={!billing.configured || checkoutState.loading}
                  onClick={() => void goTo(async () => (await checkout()).data?.startCheckout)}
                  size="lg"
                >
                  <CreditCardIcon />
                  {t('billing.upgrade')}
                </Button>
                {!billing.configured && (
                  <p className="text-sm text-primary-foreground/80">{t('billing.notConfigured')}</p>
                )}
                {checkoutState.error && <FormError error={checkoutState.error} />}
              </div>
            )}
          </PlanCard>
        ))}
      </section>
    </div>
  );
}

/** One Plan: its price and Limits. Pro sits on a field of the primary colour, with its action. */
function PlanCard({
  children,
  current,
  plan,
}: {
  children?: ReactNode;
  current: boolean;
  plan: Plan;
}) {
  const { t } = useI18n();
  const pro = plan.key === 'PRO';
  return (
    <div
      className={cn(
        'flex flex-col gap-6 rounded-2xl p-6 md:p-8',
        pro ? 'bg-primary text-primary-foreground' : 'bg-card'
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{plan.name}</h2>
          {current && (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-sm font-medium',
                pro ? 'text-primary-foreground' : 'text-primary'
              )}
            >
              <CheckIcon className="size-4" />
              {t('billing.current')}
            </span>
          )}
        </div>
        <p className="text-4xl font-semibold tracking-tight tabular-nums">
          {formatCents(plan.priceCents)}
          <span
            className={cn(
              'text-base font-normal',
              pro ? 'text-primary-foreground/80' : 'text-muted-foreground'
            )}
          >
            {' '}
            {t('billing.perMonth')}
          </span>
        </p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {[
          t('billing.jobsPerMonth', { count: plan.jobs }),
          t('billing.messagesPerMonth', { count: plan.messages }),
          t(pro ? 'billing.proModels' : 'billing.freeModels'),
        ].map(item => (
          <li className="flex items-center gap-2.5" key={item}>
            <CheckIcon className={cn('size-4 shrink-0', !pro && 'text-primary')} />
            {item}
          </li>
        ))}
      </ul>
      {children && <div className="mt-auto pt-2">{children}</div>}
    </div>
  );
}
