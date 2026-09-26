import { useApolloClient, useQuery } from '@apollo/client/react';
import { MarketIndicatorsDocument } from '@mny/graphql/client';
import { NavLink, Outlet } from 'react-router-dom';

import { authClient } from '../lib/auth';

interface Props {
  user: { email: string; name: string };
}

export function Layout({ user }: Props) {
  const apollo = useApolloClient();
  const { data: organizations } = authClient.useListOrganizations();
  const { data: active } = authClient.useActiveOrganization();
  const { data: market } = useQuery(MarketIndicatorsDocument);

  const switchOrganization = async (organizationId: string) => {
    await authClient.organization.setActive({ organizationId });
    await apollo.resetStore();
  };

  const indicators = market?.marketIndicators;

  return (
    <div className="shell">
      <header className="topbar">
        <strong className="brand">mny</strong>
        <nav>
          <NavLink end to="/">
            Titulares
          </NavLink>
          <NavLink to="/anotacoes">Anotações</NavLink>
        </nav>
        <div className="spacer" />
        {indicators && (
          <span className="muted small" title="Fonte: Bacen (SGS)">
            Selic {indicators.selic ?? '—'}% · CDI {indicators.cdi ?? '—'}% · IPCA{' '}
            {indicators.ipca ?? '—'}%
          </span>
        )}
        <select
          aria-label="Organização"
          onChange={event => void switchOrganization(event.target.value)}
          value={active?.id ?? ''}
        >
          {organizations?.map(organization => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
            </option>
          ))}
        </select>
        <span className="muted small">{user.name}</span>
        <button className="link" onClick={() => void authClient.signOut()} type="button">
          Sair
        </button>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
