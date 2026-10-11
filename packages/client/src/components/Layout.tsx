import type { BuddyArea } from '@mny/graphql/client';
import { LogOutIcon, PlugIcon, SunIcon, UsersRoundIcon } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

import { AREA_ORDER, AREAS } from '../lib/areas';
import { authClient } from '../lib/auth';
import { BuddyGlyph } from './BuddyGlyph';

interface Props {
  user: { email: string; name: string };
}

interface ItemProps {
  children: ReactNode;
  end?: boolean;
  icon: ReactNode;
  to: string;
}

function Item({ children, end, icon, to }: ItemProps) {
  const { pathname } = useLocation();
  const active = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active}>
        <NavLink end={end} to={to}>
          {icon}
          <span>{children}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

const glyph = (area: BuddyArea) => <BuddyGlyph area={area} className="!size-5" size={20} />;

export function Layout({ user }: Props) {
  const navigate = useNavigate();

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const term = String(new FormData(event.currentTarget).get('q') ?? '').trim();
    if (term) navigate(`/busca?q=${encodeURIComponent(term)}`);
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="gap-4 px-4 pt-5 pb-2">
          <NavLink className="font-serif text-3xl leading-none tracking-tight italic" to="/">
            mny
          </NavLink>
          <form onSubmit={search} role="search">
            <SidebarInput aria-label="Buscar" className="bg-card" name="q" placeholder="Buscar…" />
          </form>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <Item end icon={<SunIcon />} to="/">
                  Hoje
                </Item>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Áreas</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {AREA_ORDER.map(area => (
                  <Item icon={glyph(area)} key={area} to={AREAS[area].path}>
                    {AREAS[area].label}
                  </Item>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>IA</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <Item icon={glyph('GENERAL')} to="/chat">
                  Chat
                </Item>
                <Item icon={<UsersRoundIcon />} to="/buddies">
                  Buddies
                </Item>
                <Item icon={<PlugIcon />} to="/conexoes">
                  Conexões
                </Item>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="gap-2 border-t p-4">
          <div className="min-w-0 leading-tight">
            <div className="truncate font-medium">{user.name}</div>
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
          </div>
          <Button
            className="justify-start px-0 text-muted-foreground hover:bg-transparent"
            onClick={() => void authClient.signOut()}
            size="sm"
            variant="ghost"
          >
            <LogOutIcon />
            Sair
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex items-center gap-2 border-b px-4 py-2 md:hidden">
          <SidebarTrigger />
          <span className="font-serif text-xl italic">mny</span>
        </div>
        <main className="w-full max-w-[1320px] px-5 pt-8 pb-16 md:px-12 md:pt-10">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
