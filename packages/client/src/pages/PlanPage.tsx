import { useMutation, useQuery } from '@apollo/client/react';
import {
  BillingDocument,
  OpenBillingPortalDocument,
  RedeemUsageCodeDocument,
  StartCheckoutDocument,
  UsageDocument,
  type BillingQuery,
} from '@zapbots/graphql/client';
import { CheckIcon, CreditCardIcon, ExternalLinkIcon, TicketIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

import { PageHeading } from '../components/Field';
import { FormError } from '../components/FormError';
import { Metric, Metrics } from '../components/Metric';
import { PageSkeleton } from '../components/PageSkeleton';
import { formatCents, formatDate } from '../lib/format';
import { useI18n, type Language } from '../lib/i18n';

type Plan = BillingQuery['plans'][number];

/** How much of a Limit is used, as a bar that turns to warning near the end. */
function Meter({ label, limit, used }: { label: string; limit: number; used: number }) {
  const ratio = limit ? Math.min(used / limit, 1) : 1;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {used} / {limit}
        </span>
      </div>
      <Progress
        className={cn(ratio >= 0.9 && '[&>[data-slot=progress-indicator]]:bg-destructive')}
        value={ratio * 100}
      />
    </div>
  );
}

const monthName = (month: string, language: Language) =>
  new Date(`${month}-15T12:00:00`).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

/**
 * Plano: the Organization's Plan, how much of its Limits this month went and what it used, the
 * Plans to pick from (paid through Stripe) and the Usage codes (docs/adr/0011).
 */
export function PlanPage() {
  const { language, t } = useI18n();
  const [params] = useSearchParams();
  const { data, loading } = useQuery(BillingDocument, { fetchPolicy: 'cache-and-network' });
  const { data: usage } = useQuery(UsageDocument, { fetchPolicy: 'cache-and-network' });
  const [checkout, checkoutState] = useMutation(StartCheckoutDocument);
  const [portal, portalState] = useMutation(OpenBillingPortalDocument);
  const [redeem, redeemState] = useMutation(RedeemUsageCodeDocument);
  const [code, setCode] = useState('');
  const [redeemed, setRedeemed] = useState<string | null>(null);

  if (loading && !data) return <PageSkeleton />;
  if (!data) return <p>{t('common.loadFailed')}</p>;
  const billing = data.billing;
  const onPro = billing.plan.key === 'PRO';

  const goTo = async (start: () => Promise<string | undefined>) => {
    const url = await start().catch(() => undefined);
    if (url) window.location.assign(url);
  };

  const submitCode = async (event: FormEvent) => {
    event.preventDefault();
    setRedeemed(null);
    const result = await redeem({ variables: { code } }).catch(() => null);
    if (result?.data) {
      setRedeemed(code.trim().toUpperCase());
      setCode('');
    }
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
    <div className="flex flex-col gap-10">
      <PageHeading subtitle={t('billing.subtitle')}>{t('menu.plan')}</PageHeading>

      {params.get('checkout') === 'ok' && (
        <Alert>
          <CheckIcon />
          <AlertTitle>{t('billing.thanks')}</AlertTitle>
          <AlertDescription>{t('billing.thanksText')}</AlertDescription>
        </Alert>
      )}
      {!billing.configured && (
        <Alert>
          <AlertTitle>{t('billing.notConfigured')}</AlertTitle>
          <AlertDescription>{t('billing.notConfiguredText')}</AlertDescription>
        </Alert>
      )}

      <section className="flex flex-col gap-5 rounded-lg border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t('billing.currentPlan')}
            </div>
            <div className="mt-1 flex items-center gap-2 text-2xl font-semibold">
              {billing.plan.name}
              {billing.status === 'past_due' && (
                <Badge variant="destructive">{t('billing.pastDueBadge')}</Badge>
              )}
            </div>
            {status && <p className="text-muted-foreground">{status}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            {billing.hasCustomer && (
              <Button
                disabled={portalState.loading}
                onClick={() => void goTo(async () => (await portal()).data?.openBillingPortal)}
                variant="outline"
              >
                <ExternalLinkIcon />
                {t('billing.manage')}
              </Button>
            )}
            {!onPro && (
              <Button
                disabled={!billing.configured || checkoutState.loading}
                onClick={() => void goTo(async () => (await checkout()).data?.startCheckout)}
              >
                <CreditCardIcon />
                {t('billing.upgrade')}
              </Button>
            )}
          </div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Meter label={t('usage.jobs')} limit={billing.limits.jobs} used={billing.used.jobs} />
          <Meter
            label={t('usage.messages')}
            limit={billing.limits.messages}
            used={billing.used.messages}
          />
        </div>
        {(billing.credits.jobs > 0 || billing.credits.messages > 0) && (
          <p className="text-xs text-muted-foreground">
            {t('billing.credits', {
              jobs: billing.credits.jobs,
              messages: billing.credits.messages,
            })}
          </p>
        )}
        {checkoutState.error && <FormError message={checkoutState.error.message} />}
        {portalState.error && <FormError message={portalState.error.message} />}
      </section>

      {usage && (
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-lg font-semibold">{t('usage.title')}</h2>
            <p className="mt-1 max-w-prose text-muted-foreground">
              {t('usage.subtitle', { month: monthName(usage.usage.month, language) })}
            </p>
          </div>
          <Metrics>
            <Metric
              label={t('usage.jobs')}
              note={t('usage.routineJobs', { count: usage.usage.routineJobs })}
              value={usage.usage.jobs}
            />
            <Metric label={t('usage.conversations')} value={usage.usage.conversations} />
            <Metric
              label={t('usage.messages')}
              note={t('usage.messagesNote')}
              value={usage.usage.messages}
            />
          </Metrics>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">{t('billing.plans')}</h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {data.plans.map(plan => (
            <PlanCard current={plan.key === billing.plan.key} key={plan.key} plan={plan} />
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4 border-t pt-8">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <TicketIcon className="size-5" />
            {t('billing.codes')}
          </h2>
          <p className="mt-1 max-w-prose text-muted-foreground">{t('billing.codesText')}</p>
        </div>
        <form className="flex max-w-md gap-2" onSubmit={event => void submitCode(event)}>
          <Input
            aria-label={t('billing.code')}
            className="bg-card uppercase"
            maxLength={40}
            onChange={event => setCode(event.target.value)}
            placeholder={t('billing.code')}
            value={code}
          />
          <Button disabled={!code.trim() || redeemState.loading} type="submit" variant="outline">
            {t('billing.redeem')}
          </Button>
        </form>
        {redeemState.error && <FormError message={redeemState.error.message} />}
        {redeemed && !redeemState.error && (
          <p className="text-success">{t('billing.redeemed', { code: redeemed })}</p>
        )}
      </section>
    </div>
  );
}

function PlanCard({ current, plan }: { current: boolean; plan: Plan }) {
  const { t } = useI18n();
  return (
    <li
      className={cn(
        'flex flex-col gap-3 rounded-lg border bg-card p-5',
        current && 'border-primary ring-1 ring-primary'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg font-semibold">{plan.name}</span>
        {current && <Badge>{t('billing.current')}</Badge>}
      </div>
      <div className="text-2xl font-semibold tabular-nums">
        {plan.priceCents ? formatCents(plan.priceCents) : t('billing.freePrice')}
        {plan.priceCents > 0 && (
          <span className="text-sm font-normal text-muted-foreground">
            {' '}
            {t('billing.perMonth')}
          </span>
        )}
      </div>
      <ul className="flex flex-col gap-1.5 text-muted-foreground">
        <li className="flex items-center gap-2">
          <CheckIcon className="size-4 text-foreground" />
          {t('billing.jobsPerMonth', { count: plan.jobs })}
        </li>
        <li className="flex items-center gap-2">
          <CheckIcon className="size-4 text-foreground" />
          {t('billing.messagesPerMonth', { count: plan.messages })}
        </li>
        <li className="flex items-center gap-2">
          <CheckIcon className="size-4 text-foreground" />
          {t(plan.key === 'PRO' ? 'billing.proModels' : 'billing.freeModels')}
        </li>
      </ul>
    </li>
  );
}
