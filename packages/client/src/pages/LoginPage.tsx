import { type FormEvent, useState } from 'react';

import { authClient } from '../lib/auth';

export function LoginPage() {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email'));
    const password = String(form.get('password'));
    const result =
      mode === 'signIn'
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, name: String(form.get('name')), password });
    if (result.error) setError(result.error.message ?? 'Não foi possível entrar');
  };

  return (
    <div className="centered">
      <form className="card narrow stack" onSubmit={submit}>
        <h1>mny</h1>
        <p className="muted">Organizador financeiro</p>
        {mode === 'signUp' && <input name="name" placeholder="Nome" required />}
        <input name="email" placeholder="E-mail" required type="email" />
        <input minLength={8} name="password" placeholder="Senha" required type="password" />
        {error && <p className="error">{error}</p>}
        <button type="submit">{mode === 'signIn' ? 'Entrar' : 'Criar conta'}</button>
        <button
          className="link"
          onClick={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
          type="button"
        >
          {mode === 'signIn' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
        </button>
      </form>
    </div>
  );
}
