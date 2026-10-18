import { lazy, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';

import { Layout } from './components/Layout';
import { authClient } from './lib/auth';
import { LoginPage } from './pages/LoginPage';

/** A page loaded on first visit, so the finance screens stay out of the first load. */
function page<Name extends string, Props>(
  load: () => Promise<Record<Name, ComponentType<Props>>>,
  name: Name
) {
  return lazy(async () => ({ default: (await load())[name] }));
}

const BotLayout = page(() => import('./components/BotLayout'), 'BotLayout');
const ChatsPage = page(() => import('./pages/ChatsPage'), 'ChatsPage');
const CreditOperationPage = page(
  () => import('./pages/CreditOperationPage'),
  'CreditOperationPage'
);
const FinancePage = page(() => import('./pages/FinancePage'), 'FinancePage');
const JobPage = page(() => import('./pages/JobPage'), 'JobPage');
const JobsPage = page(() => import('./pages/JobsPage'), 'JobsPage');
const SettingsPage = page(() => import('./pages/SettingsPage'), 'SettingsPage');

export function App() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="grid min-h-svh place-items-center p-4">
        <Skeleton className="h-48 w-full max-w-sm" />
      </div>
    );
  }
  // Every User has a personal Organization from their first session on (docs/adr/0007).
  if (!session) return <LoginPage />;

  return (
    <Routes>
      <Route element={<Layout user={session.user} />}>
        <Route element={<ChatsPage user={session.user} />} index />
        <Route element={<ChatsPage user={session.user} />} path="c/:id" />
        <Route element={<BotLayout bot="FINANCE" />} path="caishen">
          <Route element={<Navigate replace to="financas" />} index />
          <Route element={<FinancePage />} path="financas" />
          <Route element={<CreditOperationPage />} path="operacoes/:id" />
          <Route element={<JobsPage />} path="trabalhos" />
          <Route element={<JobPage />} path="trabalhos/:id" />
        </Route>
        <Route element={<SettingsPage user={session.user} />} path="configuracoes" />
        <Route element={<Navigate replace to="/" />} path="chat" />
        <Route element={<Navigate replace to="/configuracoes#integracoes" />} path="conexoes" />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Route>
    </Routes>
  );
}
