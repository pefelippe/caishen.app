import { lazy, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';

import { Layout } from './components/Layout';
import { authClient } from './lib/auth';
import { LoginPage } from './pages/LoginPage';
import { TeamPage } from './pages/TeamPage';

/** A page loaded on first visit, so the finance screens stay out of the first load. */
function page<Name extends string, Props>(
  load: () => Promise<Record<Name, ComponentType<Props>>>,
  name: Name
) {
  return lazy(async () => ({ default: (await load())[name] }));
}

const ConnectionsPage = page(() => import('./pages/ConnectionsPage'), 'ConnectionsPage');
const CreditOperationPage = page(
  () => import('./pages/CreditOperationPage'),
  'CreditOperationPage'
);
const FinancePage = page(() => import('./pages/FinancePage'), 'FinancePage');
const JobPage = page(() => import('./pages/JobPage'), 'JobPage');
const JobsPage = page(() => import('./pages/JobsPage'), 'JobsPage');

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
        <Route element={<TeamPage user={session.user} />} index />
        <Route element={<FinancePage />} path="caishen" />
        <Route element={<CreditOperationPage />} path="caishen/operacoes/:id" />
        <Route element={<JobsPage />} path="caishen/trabalhos" />
        <Route element={<JobPage />} path="caishen/trabalhos/:id" />
        <Route element={<ConnectionsPage />} path="conexoes" />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Route>
    </Routes>
  );
}
