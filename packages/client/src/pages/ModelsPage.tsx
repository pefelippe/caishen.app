import { useMutation, useQuery } from '@apollo/client/react';
import {
  BotsDocument,
  ModelsDocument,
  SetBotModelDocument,
  type BotsQuery,
  type ModelsQuery,
} from '@zapbots/graphql/client';
import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { BotGlyph } from '../components/BotGlyph';
import { PageHeading } from '../components/Field';
import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import { useI18n } from '../lib/i18n';

type Model = ModelsQuery['models'][number];
type Bot = BotsQuery['bots'][number];

/** Modelos: which Model each Bot uses, from the ones OpenRouter offers. */
export function ModelsPage() {
  const { t } = useI18n();
  const { data, loading } = useQuery(BotsDocument);
  const { data: catalog } = useQuery(ModelsDocument);
  const [onlyFree, setOnlyFree] = useState(true);

  if (loading && !data) return <PageSkeleton />;
  if (!data) return <p>{t('common.loadFailed')}</p>;
  const models = catalog?.models ?? [];

  return (
    <div className="flex flex-col gap-8">
      <PageHeading subtitle={t('models.subtitle', { model: data.aiStatus.defaultModel })}>
        {t('models.title')}
      </PageHeading>
      <div className="flex flex-col gap-6">
        {!data.aiStatus.configured && (
          <Alert>
            <AlertTitle>{t('models.notConfigured')}</AlertTitle>
            <AlertDescription>{t('models.notConfiguredText')}</AlertDescription>
          </Alert>
        )}
        <Label className="font-normal text-muted-foreground">
          <Checkbox checked={onlyFree} onCheckedChange={checked => setOnlyFree(checked === true)} />
          {t('models.onlyFree')}
          <span className="tabular-nums">
            ({models.filter(model => model.free).length}/{models.length})
          </span>
        </Label>
        <ul className="flex flex-col divide-y border-t">
          {data.bots.map(bot => (
            <ModelRow
              bot={bot}
              key={bot.id}
              models={models.filter(model => !onlyFree || model.free || model.id === bot.model)}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function ModelRow({ bot, models }: { bot: Bot; models: Model[] }) {
  const { t } = useI18n();
  const [setModel, { error, loading }] = useMutation(SetBotModelDocument);
  const current = models.find(candidate => candidate.id === bot.model);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4" data-bot={bot.key}>
      <span className="flex w-36 items-center gap-2 font-medium">
        <BotGlyph bot={bot.key} size={28} />
        {bot.name}
      </span>
      <Select
        disabled={loading}
        onValueChange={model => void setModel({ variables: { id: bot.id, model } })}
        value={bot.model}
      >
        <SelectTrigger aria-label={bot.name} className="w-full max-w-md bg-card">
          <SelectValue placeholder={t('models.none')} />
        </SelectTrigger>
        <SelectContent>
          {models.map(candidate => (
            <SelectItem key={candidate.id} value={candidate.id}>
              {candidate.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {current?.free && <Badge variant="secondary">{t('models.free')}</Badge>}
      {error && <FormError message={error.message} />}
    </li>
  );
}
