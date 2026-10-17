import { useMutation, useQuery } from '@apollo/client/react';
import {
  BotsDocument,
  ModelsDocument,
  SetBotModelDocument,
  type BotFieldsFragment,
  type ModelsQuery,
} from '@zapbots/graphql/client';
import { useState } from 'react';
import { Link } from 'react-router-dom';

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

import { BotGlyph } from '../components/BotGlyph';
import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import { BOTS } from '../lib/bots';

type Model = ModelsQuery['models'][number];

/** The home page: the Bots on the User's team, what each does and the Model each uses. */
export function TeamPage({ user }: { user: { name: string } }) {
  const { data, loading } = useQuery(BotsDocument);
  const { data: catalog } = useQuery(ModelsDocument);
  const [onlyFree, setOnlyFree] = useState(true);

  if (loading && !data) return <PageSkeleton />;
  if (!data) return <p>Não foi possível carregar sua Equipe.</p>;
  const models = catalog?.models ?? [];

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <header>
        <span className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Equipe
        </span>
        <h1>Olá, {user.name.split(' ')[0]}</h1>
        <p className="mt-1 max-w-prose text-muted-foreground">
          Seus Bots entram nas ferramentas que você conectar, fazem o trabalho e voltam com a
          Entrega pronta.
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

      <div className="flex flex-col">
        {data.bots.map(bot => (
          <BotRow
            bot={bot}
            key={bot.id}
            models={models.filter(model => !onlyFree || model.free || model.id === bot.model)}
          />
        ))}
      </div>
    </div>
  );
}

function BotRow({ bot, models }: { bot: BotFieldsFragment; models: Model[] }) {
  const [setModel, { error, loading }] = useMutation(SetBotModelDocument);
  const current = models.find(candidate => candidate.id === bot.model);

  return (
    <section
      className="grid gap-x-8 gap-y-4 border-t border-ink py-6 md:grid-cols-[9rem_minmax(0,1fr)]"
      data-bot={bot.key}
    >
      <BotGlyph bot={bot.key} size={64} />
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="font-serif text-3xl">{bot.name}</h2>
          <p className="max-w-prose text-muted-foreground">{bot.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to={`${BOTS[bot.key].path}/trabalhos`}>Dar um Trabalho</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={BOTS[bot.key].path}>Abrir {BOTS[bot.key].home}</Link>
          </Button>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Modelo</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              disabled={loading}
              onValueChange={model => void setModel({ variables: { id: bot.id, model } })}
              value={bot.model}
            >
              <SelectTrigger aria-label="Modelo" className="w-full max-w-md bg-card">
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
          </div>
          <p className="text-xs text-muted-foreground">
            {bot.name} só lê seus dados e os arquivos que você entregar. Nunca altera valores nem
            movimenta dinheiro.
          </p>
        </div>
        {error && <FormError message={error.message} />}
      </div>
    </section>
  );
}
