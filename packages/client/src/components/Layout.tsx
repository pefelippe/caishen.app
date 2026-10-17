import { BriefcaseIcon, LogOutIcon, PlugIcon, UsersRoundIcon } from 'lucide-react';
import { Suspense, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';

import { authClient } from '../lib/auth';
import { BotGlyph } from './BotGlyph';
import { PageSkeleton } from './PageSkeleton';

interface Props {
  user: { email: string; name: string };
}

interface ItemProps {
  /** Overrides matching by path, for items whose paths nest inside each other. */
  active?: boolean;
  children: ReactNode;
  end?: boolean;
  icon: ReactNode;
  to: string;
}

function Item({ active, children, end, icon, to }: ItemProps) {
  const { pathname } = useLocation();
  const matches = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={active ?? matches}>
        <NavLink end={end} to={to}>
          {icon}
          <span>{children}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function Layout({ user }: Props) {
  const { pathname } = useLocation();
  const onJobs = pathname.startsWith('/caishen/trabalhos');

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="px-4 pt-5 pb-2">
          <NavLink className="font-serif text-3xl leading-none tracking-tight italic" to="/">
            zapbots
          </NavLink>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <Item end icon={<UsersRoundIcon />} to="/">
                  Equipe
                </Item>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup data-bot="FINANCE">
            <SidebarGroupLabel>Caishen</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <Item
                  active={pathname.startsWith('/caishen') && !onJobs}
                  icon={<BotGlyph bot="FINANCE" className="!size-5" size={20} />}
                  to="/caishen"
                >
                  Finanças
                </Item>
                <Item icon={<BriefcaseIcon />} to="/caishen/trabalhos">
                  Trabalhos
                </Item>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
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
          <span className="font-serif text-xl italic">zapbots</span>
        </div>
        <main className="w-full max-w-[1320px] px-5 pt-8 pb-16 md:px-12 md:pt-10">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
