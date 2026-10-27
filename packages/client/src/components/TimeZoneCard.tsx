import { useMutation } from '@apollo/client/react';
import { SetTimeZoneDocument } from '@zapbots/graphql/client';

import { Field } from '@zapbots/ui/blocks/field';
import { Card } from '@zapbots/ui/components/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@zapbots/ui/components/select';

import { authClient } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useToast } from './Toaster';

/** Brazil's zones, east to west, with a city each zone is known by. */
const BRAZIL = [
  { city: 'Fernando de Noronha', zone: 'America/Noronha' },
  { city: 'São Paulo, Rio, Brasília', zone: 'America/Sao_Paulo' },
  { city: 'Salvador', zone: 'America/Bahia' },
  { city: 'Recife', zone: 'America/Recife' },
  { city: 'Fortaleza', zone: 'America/Fortaleza' },
  { city: 'Belém', zone: 'America/Belem' },
  { city: 'Cuiabá', zone: 'America/Cuiaba' },
  { city: 'Manaus', zone: 'America/Manaus' },
  { city: 'Porto Velho', zone: 'America/Porto_Velho' },
  { city: 'Boa Vista', zone: 'America/Boa_Vista' },
  { city: 'Rio Branco', zone: 'America/Rio_Branco' },
];

/** The Viewer's time zone: where "today" is for their Tarefas, Agenda and Metas. */
export function TimeZoneCard({ timezone }: { timezone: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const { refetch } = authClient.useSession();
  const [save, { loading }] = useMutation(SetTimeZoneDocument, { refetchQueries: 'active' });
  const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const options = [
    ...BRAZIL,
    ...[browser, timezone]
      .filter((zone, index, all) => zone && all.indexOf(zone) === index)
      .filter(zone => !BRAZIL.some(option => option.zone === zone))
      .map(zone => ({ city: zone.split('/').pop()!.replace(/_/g, ' '), zone })),
  ];

  const change = async (zone: string) => {
    const result = await save({ variables: { timezone: zone } }).catch(() => null);
    if (result?.data) await refetch();
    else toast({ message: t('common.saveFailed'), tone: 'error' });
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold">{t('profile.timezone')}</h2>
      <Field hint={t('profile.timezoneHint')} label={t('profile.timezone')}>
        <Select disabled={loading} onValueChange={zone => void change(zone)} value={timezone}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option.zone} value={option.zone}>
                {option.city} ({option.zone})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </Card>
  );
}
