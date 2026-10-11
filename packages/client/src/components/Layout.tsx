import { useApolloClient, useQuery } from '@apollo/client/react';
import { MarketIndicatorsDocument } from '@mny/graphql/client';
import { ChevronDownIcon, LogOutIcon } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

import { Button, buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { authClient } from '../lib/auth';

interface Props {
  user: { email: string; name: string };
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(buttonVariants({ size: 'sm', variant: isActive ? 'secondary' : 'ghost' }));

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
    <div className="min-h-svh">
      <header className="flex flex-wrap items-center gap-4 border-b bg-card px-6 py-2.5">
        <strong className="text-lg">mny</strong>
        <nav className="flex gap-1">
          <NavLink className={navClass} end to="/">
            Titulares
          </NavLink>
          <NavLink className={navClass} to="/anotacoes">
            Anotações
          </NavLink>
        </nav>
        <div className="flex-1" />
        {indicators && (
          <span className="text-xs text-muted-foreground" title="Fonte: Bacen (SGS)">
            Selic {indicators.selic ?? '—'}% · CDI {indicators.cdi ?? '—'}% · IPCA{' '}
            {indicators.ipca ?? '—'}%
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <span className="flex flex-col items-end leading-tight">
                <span>{user.name}</span>
                {active && <span className="text-xs text-muted-foreground">{active.name}</span>}
              </span>
              <ChevronDownIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="font-medium">{user.name}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Organização
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              onValueChange={organizationId => void switchOrganization(organizationId)}
              value={active?.id ?? ''}
            >
              {organizations?.map(organization => (
                <DropdownMenuRadioItem key={organization.id} value={organization.id}>
                  {organization.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void authClient.signOut()}>
              <LogOutIcon />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <main className="mx-auto max-w-[1080px] px-4 pt-6 pb-16">
        <Outlet />
      </main>
    </div>
  );
}
