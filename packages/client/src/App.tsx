import { Navigate, Route, Routes } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';

import { Layout } from './components/Layout';
import { authClient } from './lib/auth';
import { BuddiesPage } from './pages/BuddiesPage';
import { ChatPage } from './pages/ChatPage';
import { ConnectionsPage } from './pages/ConnectionsPage';
import { CreditOperationPage } from './pages/CreditOperationPage';
import { FinancePage } from './pages/FinancePage';
import { FitnessPage } from './pages/FitnessPage';
import { LoginPage } from './pages/LoginPage';
import { NotePage } from './pages/NotePage';
import { NotesPage } from './pages/NotesPage';
import { TodayPage } from './pages/TodayPage';
import { WorkPage } from './pages/WorkPage';

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
        <Route element={<Navigate replace to="/" />} path="*" />
      </Route>
    </Routes>
  );
}
