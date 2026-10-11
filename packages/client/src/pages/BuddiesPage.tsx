import { useMutation, useQuery } from '@apollo/client/react';
import {
  BuddiesDocument,
  ModelsDocument,
  UpdateBuddyDocument,
  type BuddyFieldsFragment,
  type ModelsQuery,
} from '@mny/graphql/client';
import { useState, type FormEvent } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

import { BuddyGlyph } from '../components/BuddyGlyph';
import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import { AREAS } from '../lib/areas';

type Model = ModelsQuery['models'][number];

/** Where each Buddy gets its name, its personality and its Model. */
export function BuddiesPage() {
  const { data, loading } = useQuery(BuddiesDocument);
  const { data: catalog } = useQuery(ModelsDocument);
  const [onlyFree, setOnlyFree] = useState(true);

  if (loading && !data) return <PageSkeleton />;
  if (!data) return <p>Não foi possível carregar os Buddies.</p>;
  const models = catalog?.models ?? [];

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <header>
        <span className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          IA
        </span>
        <h1>Buddies</h1>
        <p className="mt-1 max-w-prose text-muted-foreground">
          Cada Área tem um Buddy que conhece os dados dela, e o geral enxerga todas. Aqui você muda
          o nome, a personalidade e o Modelo de cada um.
        </p>
      </header>

      {!data.aiStatus.configured && (
        <Alert>
          <AlertTitle>Os Buddies ainda não respondem</AlertTitle>
          <AlertDescription>
            Falta a chave do OpenRouter no servidor (OPENROUTER_API_KEY no .env). Você já pode
            configurá-los; eles começam a responder quando a chave existir.
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
        {data.buddies.map(buddy => (
          <BuddyForm
            buddy={buddy}
            key={buddy.id}
            models={models.filter(model => !onlyFree || model.free || model.id === buddy.model)}
          />
        ))}
      </div>
    </div>
  );
}

function BuddyForm({ buddy, models }: { buddy: BuddyFieldsFragment; models: Model[] }) {
  const [update, { error, loading }] = useMutation(UpdateBuddyDocument);
  const [model, setModel] = useState(buddy.model);
  const [saved, setSaved] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setSaved(false);
    await update({
      variables: {
        id: buddy.id,
        input: {
          model: model || null,
          name: String(values.get('name') ?? ''),
          personality: String(values.get('personality') ?? ''),
        },
      },
    })
      .then(() => setSaved(true))
      .catch(() => undefined);
  };

  const current = models.find(candidate => candidate.id === model);

  return (
    <form
      className="grid gap-x-8 gap-y-4 border-t border-ink py-6 md:grid-cols-[9rem_minmax(0,1fr)]"
      data-area={buddy.area}
      onSubmit={submit}
    >
      <div className="flex items-center gap-3 md:flex-col md:items-start">
        <BuddyGlyph area={buddy.area} size={64} />
        <span className="text-xs font-medium tracking-[0.14em] text-ink uppercase">
          {buddy.area === 'GENERAL' ? 'Geral' : AREAS[buddy.area].label}
        </span>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`name-${buddy.id}`}>Nome</Label>
          <Input
            className="max-w-xs bg-card font-serif text-lg md:text-lg"
            defaultValue={buddy.name}
            id={`name-${buddy.id}`}
            name="name"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`personality-${buddy.id}`}>Personalidade</Label>
          <Textarea
            className="min-h-20 bg-card"
            defaultValue={buddy.personality}
            id={`personality-${buddy.id}`}
            name="personality"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Modelo</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Select onValueChange={setModel} value={model}>
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
            {current && !current.supportsTools && <Badge variant="outline">sem Ações</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">
            {current && !current.supportsTools
              ? `Este Modelo não executa Ações: ${buddy.name} só conversa e lê seus dados.`
              : `${buddy.name} pode criar Tarefas, Treinos e Anotações quando você pedir. Nunca altera valores.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button disabled={loading} type="submit">
            Salvar
          </Button>
          {saved && <span className="text-xs text-success">Salvo.</span>}
        </div>
        {error && <FormError message={error.message} />}
      </div>
    </form>
  );
}
