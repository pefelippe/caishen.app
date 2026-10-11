import { lazy, type ComponentType } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';

import { Layout } from './components/Layout';
import { authClient } from './lib/auth';
import { LoginPage } from './pages/LoginPage';
import { TodayPage } from './pages/TodayPage';

/** A page loaded on first visit, so the editor and the finance screens stay out of the first load. */
function page<Name extends string, Props>(
  load: () => Promise<Record<Name, ComponentType<Props>>>,
  name: Name
) {
  return lazy(async () => ({ default: (await load())[name] }));
}

const BuddiesPage = page(() => import('./pages/BuddiesPage'), 'BuddiesPage');
const ChatPage = page(() => import('./pages/ChatPage'), 'ChatPage');
const ConnectionsPage = page(() => import('./pages/ConnectionsPage'), 'ConnectionsPage');
const CreditOperationPage = page(
  () => import('./pages/CreditOperationPage'),
  'CreditOperationPage'
);
const FinancePage = page(() => import('./pages/FinancePage'), 'FinancePage');
const FitnessPage = page(() => import('./pages/FitnessPage'), 'FitnessPage');
const NotePage = page(() => import('./pages/NotePage'), 'NotePage');
const NotesPage = page(() => import('./pages/NotesPage'), 'NotesPage');
const SearchPage = page(() => import('./pages/SearchPage'), 'SearchPage');
const WorkPage = page(() => import('./pages/WorkPage'), 'WorkPage');

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
        <Route element={<TodayPage user={session.user} />} index />
        <Route element={<FinancePage />} path="financas" />
        <Route element={<CreditOperationPage />} path="financas/operacoes/:id" />
        <Route element={<NotesPage />} path="anotacoes" />
        <Route element={<NotePage user={session.user} />} path="anotacoes/:id" />
        <Route element={<WorkPage />} path="trabalho" />
        <Route element={<FitnessPage />} path="fitness" />
        <Route element={<ChatPage />} path="chat" />
        <Route element={<ChatPage />} path="chat/:id" />
        <Route element={<BuddiesPage />} path="buddies" />
        <Route element={<ConnectionsPage />} path="conexoes" />
        <Route element={<SearchPage />} path="busca" />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Route>
    </Routes>
  );
}
