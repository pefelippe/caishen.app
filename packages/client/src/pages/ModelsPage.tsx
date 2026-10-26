import { useMutation, useQuery } from '@apollo/client/react';
import {
  BotsDocument,
  ModelsDocument,
  SetBotModelDocument,
  type BotsQuery,
  type ModelsQuery,
} from '@zapbots/graphql/client';

import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { SectionRow } from '@zapbots/ui/blocks/section';
import { Badge } from '@zapbots/ui/components/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@zapbots/ui/components/select';

import { BotGlyph } from '../components/BotGlyph';
import { FormError } from '../components/FormError';
import { useI18n } from '../lib/i18n';
import { matches } from '../lib/search';

type Model = ModelsQuery['models'][number];
type Bot = BotsQuery['bots'][number];

/**
 * Which Model each Bot uses, from the ones the Organization's keys reach; `search` keeps the Bots
 * whose name or Model matches. Lives on Integrações, under the keys.
 */
export function ModelsList({ search }: { search: string }) {
  const { t } = useI18n();
  const { data, loading } = useQuery(BotsDocument);
  const { data: catalog } = useQuery(ModelsDocument);

  if (loading && !data) return <PageSkeleton />;
  if (!data) return <p>{t('common.loadFailed')}</p>;
  // OpenRouter's free Models (its paid ones are hundreds) and every direct one, `provider:id`
  // with no slash, reached by the Organization's own key (docs/adr/0022). A paid OpenRouter one
  // chosen before stays listed for its Bot.
  const models = catalog?.models ?? [];
  const bots = data.bots.filter(bot =>
    matches(search, bot.name, models.find(model => model.id === bot.model)?.name ?? '')
  );

  // Without a key there is nothing to pick: the keys above say what to do.
  if (!data.aiStatus.configured) return null;

  return (
    <section aria-labelledby="bot-models-title" className="flex flex-col gap-2">
      <h3 className="font-medium" id="bot-models-title">
        {t('models.perBot')}
      </h3>
      <ul className="flex flex-col gap-2">
        {bots.map(bot => (
          <ModelRow
            bot={bot}
            key={bot.id}
            models={models.filter(
              model => model.free || !model.id.includes('/') || model.id === bot.model
            )}
          />
        ))}
      </ul>
    </section>
  );
}

function ModelRow({ bot, models }: { bot: Bot; models: Model[] }) {
  const { t } = useI18n();
  const [setModel, { error, loading }] = useMutation(SetBotModelDocument);
  const current = models.find(candidate => candidate.id === bot.model);

  return (
    <SectionRow
      action={
        <Select
          disabled={loading}
          onValueChange={model => void setModel({ variables: { id: bot.id, model } })}
          value={bot.model}
        >
          <SelectTrigger aria-label={bot.name} className="w-72 max-w-full bg-card">
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
      }
      detail={current?.free && <Badge variant="secondary">{t('models.free')}</Badge>}
      name={
        <span className="flex items-center gap-2" data-bot={bot.key}>
          <BotGlyph bot={bot.key} size={28} />
          {bot.name}
        </span>
      }
    >
      {error && <FormError error={error} />}
    </SectionRow>
  );
}
