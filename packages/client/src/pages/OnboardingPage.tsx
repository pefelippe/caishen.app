import { type FormEvent, useState } from 'react';

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
    <div className="centered">
      <form className="card narrow stack" onSubmit={submit}>
        <h2>Crie sua Organização</h2>
        <p className="muted">
          A Organização agrupa os Titulares e Anotações. Você pode convidar outras pessoas depois.
        </p>
        <input name="name" placeholder="Ex.: Família Fernandes" required />
        {error && <p className="error">{error}</p>}
        <button type="submit">Criar</button>
      </form>
    </div>
  );
}
