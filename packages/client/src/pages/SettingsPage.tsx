import { PageHeading } from '@zapbots/ui/blocks/field';

import { useI18n } from '../lib/i18n';
import { OrganizationSettings } from './OrganizationPage';

/** Configurações: the Organization, its name and its Users. The Plan has its own page (`/plan`). */
export function SettingsPage() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-6">
      <PageHeading subtitle={t('settings.subtitle')}>{t('settings.title')}</PageHeading>
      <OrganizationSettings />
    </div>
  );
}
