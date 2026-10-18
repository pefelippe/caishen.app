import { useMutation, useQuery } from '@apollo/client/react';
import {
  BotsDocument,
  ModelsDocument,
  SetBotModelDocument,
  type BotsQuery,
  type ModelsQuery,
} from '@zapbots/graphql/client';
import {
  BotIcon,
  LogOutIcon,
  PlugIcon,
  SettingsIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

import { BotGlyph } from '../components/BotGlyph';
import { ConnectionsSettings, INTEGRATION_GROUPS } from '../components/ConnectionsSettings';
import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import { authClient } from '../lib/auth';

type Model = ModelsQuery['models'][number];
type Bot = BotsQuery['bots'][number];

/** One entry of the Settings menu, jumping to its section. */
function MenuLink({ child, icon: Icon, label, to }: MenuItem & { child?: boolean }) {
  return (
    <li>
      <a
        className={cn(
          'flex items-center gap-2 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground',
          child && 'ml-5 border-l pl-4 text-[13px]'
        )}
        href={`#${to}`}
      >
        <Icon className="size-4" />
        {label}
      </a>
    </li>
  );
}

interface MenuItem {
  icon: LucideIcon;
  label: string;
  to: string;
}

/**
 * Settings, the way admin pages usually are: a menu on the left (Integrações and their kinds,
 * Modelos, Conta) and the sections on the right.
 */
export function SettingsPage({ user }: { user: { email: string; name: string } }) {
  return (
    <div className="grid h-full min-h-0 md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden min-h-0 overflow-y-auto border-r bg-card px-3 py-6 md:block">
        <div className="mb-3 flex items-center gap-2 px-3 font-medium">
          <SettingsIcon className="size-4" />
          Configurações
        </div>
        <ul className="flex flex-col gap-0.5">
          <MenuLink icon={PlugIcon} label="Integrações" to="integracoes" />
          {INTEGRATION_GROUPS.map(group => (
            <MenuLink child icon={group.icon} key={group.id} label={group.title} to={group.id} />
          ))}
          <MenuLink icon={BotIcon} label="Modelos" to="modelos" />
          <MenuLink icon={UserIcon} label="Conta" to="conta" />
        </ul>
      </aside>
      <div className="min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-14 px-5 pt-10 pb-24 md:px-10">
          <ConnectionsSettings />
          <ModelsSettings />
          <section className="flex scroll-mt-6 flex-col gap-4" id="conta">
            <h2>Conta</h2>
            <div className="leading-tight">
              <div className="font-medium">{user.name}</div>
              <div className="text-muted-foreground">{user.email}</div>
            </div>
            <div>
              <Button onClick={() => void authClient.signOut()} variant="outline">
                <LogOutIcon />
                Sair
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/** Which Model each Bot uses, from the ones OpenRouter offers. */
function ModelsSettings() {
  const { data, loading } = useQuery(BotsDocument);
  const { data: catalog } = useQuery(ModelsDocument);
  const [onlyFree, setOnlyFree] = useState(true);

  if (loading && !data) return <PageSkeleton />;
  if (!data) return <p>Não foi possível carregar os Bots.</p>;
  const models = catalog?.models ?? [];

  return (
    <section className="flex scroll-mt-6 flex-col gap-6" id="modelos">
      <header>
        <h2>Modelos</h2>
        <p className="mt-1 max-w-prose text-muted-foreground">
          O modelo de linguagem que cada Bot usa, pelo OpenRouter. Se o escolhido falhar, o Trabalho
          tenta uma vez com o padrão do servidor ({data.aiStatus.defaultModel}).
        </p>
      </header>
      {!data.aiStatus.configured && (
        <Alert>
          <AlertTitle>Os Bots ainda não trabalham</AlertTitle>
          <AlertDescription>
            Falta a chave do OpenRouter no servidor (OPENROUTER_API_KEY no .env). Você já pode
            escolher os Modelos; eles começam a trabalhar quando a chave existir.
          </AlertDescription>
        </Alert>
      )}
      <Label className="font-normal text-muted-foreground">
        <Checkbox checked={onlyFree} onCheckedChange={checked => setOnlyFree(checked === true)} />
        Mostrar só Modelos gratuitos
        <span className="tabular-nums">
          ({models.filter(model => model.free).length} de {models.length})
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
    </section>
  );
}

function ModelRow({ bot, models }: { bot: Bot; models: Model[] }) {
  const [setModel, { error, loading }] = useMutation(SetBotModelDocument);
  const current = models.find(candidate => candidate.id === bot.model);

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4" data-bot={bot.key}>
      <span className="flex w-36 items-center gap-2 font-serif text-lg">
        <BotGlyph bot={bot.key} size={28} />
        {bot.name}
      </span>
      <Select
        disabled={loading}
        onValueChange={model => void setModel({ variables: { id: bot.id, model } })}
        value={bot.model}
      >
        <SelectTrigger aria-label={`Modelo do ${bot.name}`} className="w-full max-w-md bg-card">
          <SelectValue placeholder="Nenhum Modelo disponível" />
        </SelectTrigger>
        <SelectContent>
          {models.map(candidate => (
            <SelectItem key={candidate.id} value={candidate.id}>
              {candidate.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {current?.free && <Badge variant="secondary">gratuito</Badge>}
      {error && <FormError message={error.message} />}
    </li>
  );
}
