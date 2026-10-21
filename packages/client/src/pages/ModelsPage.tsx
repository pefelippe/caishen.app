import { useMutation, useQuery } from '@apollo/client/react';
import {
  BotsDocument,
  ModelsDocument,
  SetBotModelDocument,
  type BotsQuery,
  type ModelsQuery,
} from '@zapbots/graphql/client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { BotGlyph } from '../components/BotGlyph';
import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import { SheetRow } from '../components/Sheet';
import { useI18n } from '../lib/i18n';
import { matches } from '../lib/search';

type Model = ModelsQuery['models'][number];
type Bot = BotsQuery['bots'][number];

/**
 * Which Model each Bot uses, from the ones OpenRouter offers; `search` keeps the Bots whose name
 * or Model matches. Lives on Integrações, under OpenRouter.
 */
export function ModelsList({ search }: { search: string }) {
  const { t } = useI18n();
  const { data, loading } = useQuery(BotsDocument);
  const { data: catalog } = useQuery(ModelsDocument);

  if (loading && !data) return <PageSkeleton />;
  if (!data) return <p>{t('common.loadFailed')}</p>;
  // Only free Models, always; a paid one chosen before stays listed for its Bot.
  const models = catalog?.models ?? [];
  const bots = data.bots.filter(bot =>
    matches(search, bot.name, models.find(model => model.id === bot.model)?.name ?? '')
  );

  return (
    <div className="flex flex-col gap-4">
      {!data.aiStatus.configured && (
        <Alert>
          <AlertTitle>{t('models.notConfigured')}</AlertTitle>
          <AlertDescription>{t('models.notConfiguredText')}</AlertDescription>
        </Alert>
      )}
      <ul className="flex flex-col gap-2">
        {bots.map(bot => (
          <ModelRow
            bot={bot}
            key={bot.id}
            models={models.filter(model => model.free || model.id === bot.model)}
          />
        ))}
      </ul>
    </div>
  );
}

function ModelRow({ bot, models }: { bot: Bot; models: Model[] }) {
  const { t } = useI18n();
  const [setModel, { error, loading }] = useMutation(SetBotModelDocument);
  const current = models.find(candidate => candidate.id === bot.model);

  return (
    <SheetRow
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
      {error && <FormError message={error.message} />}
    </SheetRow>
  );
}
