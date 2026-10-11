import { type FormEvent, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { FormError } from '../components/FormError';
import { authClient } from '../lib/auth';

const slugify = (name: string) =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export function OnboardingPage() {
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('name'));
    const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
    const result = await authClient.organization.create({ name, slug });
    if (result.error) setError(result.error.message ?? 'Não foi possível criar');
    else window.location.reload();
  };

  return (
    <div className="grid min-h-svh place-items-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Crie sua Organização</CardTitle>
          <CardDescription>
            A Organização agrupa os Titulares e Anotações. Você pode convidar outras pessoas depois.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <Input
              aria-label="Nome da Organização"
              name="name"
              placeholder="Ex.: Família Fernandes"
              required
            />
            {error && <FormError message={error} />}
            <Button type="submit">Criar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
