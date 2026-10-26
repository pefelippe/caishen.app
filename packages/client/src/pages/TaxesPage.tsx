import { useQuery } from '@apollo/client/react';
import { CompanyGuidesDocument, type CompanyGuidesQuery } from '@zapbots/graphql/client';
import { useSearchParams } from 'react-router-dom';

import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { Section, SectionRow } from '@zapbots/ui/blocks/section';
import { Badge } from '@zapbots/ui/components/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@zapbots/ui/components/tabs';

import { BotPage } from '../components/BotPage';
import { QueryError } from '../components/QueryError';
import { formatCents, formatDate } from '../lib/format';
import { AddEntryButton, TaxesSection, useHolderQuery } from './FinancePage';

type Guide = NonNullable<CompanyGuidesQuery['holder']>['companyGuides'][number];

type Tab = 'pf' | 'pj';

/** "09/2026". */
const competenceName = (month: string) => `${month.slice(5)}/${month.slice(0, 4)}`;

/**
 * Impostos in two tabs (docs/adr/0023): the Titular's own (IPVA, IPTU), the same list as in Gastos,
 * and their company's guides, read from Adaflow by competência, each paid or not. `?tab=pj` opens
 * the second.
 */
export function TaxesPage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'pj' ? 'pj' : 'pf';

  return (
    <BotPage
      actions={tab === 'pf' && <AddEntryButton direction="OUT" />}
      bot="FINANCE"
      description="Os seus, como IPVA e IPTU, e os da sua empresa. Todos entram nas Saídas do mês em que vencem."
      title="Impostos"
    >
      <Tabs
        onValueChange={value => setParams(value === 'pj' ? { tab: 'pj' } : {}, { replace: true })}
        value={tab}
      >
        <TabsList>
          <TabsTrigger value="pf">Pessoa física</TabsTrigger>
          <TabsTrigger value="pj">Pessoa jurídica</TabsTrigger>
        </TabsList>
        <TabsContent className="pt-4" value="pf">
          <PersonTaxes />
        </TabsContent>
        <TabsContent className="pt-4" value="pj">
          <CompanyTaxes />
        </TabsContent>
      </Tabs>
    </BotPage>
  );
}

function PersonTaxes() {
  const { error, holder, retry } = useHolderQuery();
  if (error) {
    return (
      <QueryError error={error} onRetry={retry} title="Não foi possível carregar os impostos" />
    );
  }
  if (!holder) return <PageSkeleton />;
  return <TaxesSection holder={holder} />;
}

function CompanyTaxes() {
  const { error: holderError, holder } = useHolderQuery();
  const { data, error, loading, refetch } = useQuery(CompanyGuidesDocument, {
    errorPolicy: 'all',
    fetchPolicy: 'cache-and-network',
    skip: !holder,
    variables: { holderId: holder?.id ?? '' },
  });
  const failure = holderError ?? (data?.holder ? undefined : error);
  if (failure) {
    return (
      <QueryError
        error={failure}
        onRetry={() => void refetch()}
        title="Não foi possível carregar as guias"
      />
    );
  }
  if (!data?.holder || (loading && !data)) return <PageSkeleton />;
  const guides = data.holder.companyGuides;

  if (!guides.length) {
    return (
      <Section
        id="company"
        intro="O DAS, a DARF e as outras guias da sua empresa, mês a mês, pagas ou em aberto."
        title="Guias da empresa"
      >
        <p className="text-muted-foreground">
          Nenhuma guia ainda. Elas chegam da Adaflow, a contabilidade da sua empresa, quando ela
          estiver ligada em Integrações.
        </p>
      </Section>
    );
  }

  const byCompetence = new Map<string, Guide[]>();
  for (const guide of guides) {
    byCompetence.set(guide.competence, [...(byCompetence.get(guide.competence) ?? []), guide]);
  }
  return (
    <div className="flex flex-col gap-6">
      {[...byCompetence].map(([competence, items]) => {
        const open = items.filter(guide => !guide.paid);
        return (
          <Section
            id={`competence-${competence}`}
            intro={
              open.length
                ? `${formatCents(open.reduce((sum, guide) => sum + guide.amountCents, 0))} em aberto`
                : 'Tudo pago'
            }
            key={competence}
            title={competenceName(competence)}
            total={formatCents(items.reduce((sum, guide) => sum + guide.amountCents, 0))}
          >
            <ul className="flex flex-col gap-2">
              {items.map(guide => (
                <SectionRow
                  action={
                    <Badge variant={guide.paid ? 'secondary' : 'outline'}>
                      {guide.paid ? 'Paga' : 'Em aberto'}
                    </Badge>
                  }
                  amount={formatCents(guide.amountCents)}
                  detail={`Vence em ${formatDate(guide.dueDate)}`}
                  key={guide.id}
                  name={guide.name}
                />
              ))}
            </ul>
          </Section>
        );
      })}
    </div>
  );
}
