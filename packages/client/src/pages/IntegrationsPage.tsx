import { BotIcon, LayoutGridIcon, PlugIcon } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';

import { ConnectionsSettings, INTEGRATION_GROUPS } from '../components/ConnectionsSettings';
import { SectionLayout } from '../components/SectionLayout';
import { useI18n } from '../lib/i18n';

/** Integrações: every kind of tool the Bots can enter, each with its own section, and the Models. */
export function IntegrationsLayout() {
  const { t } = useI18n();
  return (
    <SectionLayout
      groups={[
        {
          links: [
            { icon: LayoutGridIcon, label: t('integrations.all'), to: '/integrations' },
            { icon: BotIcon, label: t('rail.models'), to: '/integrations/models' },
          ],
        },
        {
          label: t('integrations.categories'),
          links: INTEGRATION_GROUPS.map(group => ({
            icon: group.icon,
            label: group.title,
            to: `/integrations/${group.id}`,
          })),
        },
      ]}
      icon={PlugIcon}
      title={t('integrations.title')}
    />
  );
}

export function IntegrationsPage() {
  const { group } = useParams<{ group?: string }>();
  if (group && !INTEGRATION_GROUPS.some(item => item.id === group)) {
    return <Navigate replace to="/integrations" />;
  }
  return <ConnectionsSettings group={group} />;
}
