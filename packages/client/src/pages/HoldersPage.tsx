import { useMutation, useQuery } from '@apollo/client/react';
import { CreateHolderDocument, HoldersDocument } from '@mny/graphql/client';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { ScoreBadge } from '../components/ScoreBadge';
import { formatCents } from '../lib/format';

export function HoldersPage() {
  const { data, loading } = useQuery(HoldersDocument);
  const [createHolder] = useMutation(CreateHolderDocument, { refetchQueries: [HoldersDocument] });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await createHolder({
      variables: {
        input: {
          document: String(values.get('document')) || null,
          name: String(values.get('name')),
        },
      },
    });
    form.reset();
  };

  return (
    <div className="stack">
      <h1>Titulares</h1>
      <p className="muted">
        Cada Titular é uma pessoa cujas finanças você acompanha. A Avaliação é sempre por Titular.
      </p>

      <div className="card">
        {loading ? (
          <p className="muted">Carregando…</p>
        ) : data?.holders.length ? (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th className="num">Renda mensal</th>
                <th>Última avaliação</th>
              </tr>
            </thead>
            <tbody>
              {data.holders.map(holder => (
                <tr key={holder.id}>
                  <td>
                    <Link to={`/titulares/${holder.id}`}>{holder.name}</Link>
                  </td>
                  <td>{holder.document ?? '—'}</td>
                  <td className="num">{formatCents(holder.monthlyIncomeCents)}</td>
                  <td>
                    {holder.assessments[0] ? (
                      <ScoreBadge
                        band={holder.assessments[0].band}
                        score={holder.assessments[0].score}
                      />
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="muted">Nenhum Titular ainda.</p>
        )}
      </div>

      <form className="card row" onSubmit={submit}>
        <input name="name" placeholder="Nome do Titular" required />
        <input name="document" placeholder="CPF (opcional)" />
        <button type="submit">Adicionar Titular</button>
      </form>
    </div>
  );
}
