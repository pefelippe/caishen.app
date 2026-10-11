import { Navigate, Route, Routes } from 'react-router-dom';

import { Skeleton } from '@/components/ui/skeleton';

import { Layout } from './components/Layout';
import { authClient } from './lib/auth';
import { CreditOperationPage } from './pages/CreditOperationPage';
import { HolderPage } from './pages/HolderPage';
import { HoldersPage } from './pages/HoldersPage';
import { LoginPage } from './pages/LoginPage';
import { NotePage } from './pages/NotePage';
import { NotesPage } from './pages/NotesPage';
import { OnboardingPage } from './pages/OnboardingPage';

export function App() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) {
    return (
      <div className="grid min-h-svh place-items-center p-4">
        <Skeleton className="h-48 w-full max-w-sm" />
      </div>
    );
  }
  if (!session) return <LoginPage />;
  if (!session.session.activeOrganizationId) return <OnboardingPage />;

  return (
    <Routes>
      <Route element={<Layout user={session.user} />}>
        <Route element={<HoldersPage />} index />
        <Route element={<HolderPage />} path="titulares/:id" />
        <Route element={<CreditOperationPage />} path="operacoes/:id" />
        <Route element={<NotesPage />} path="anotacoes" />
        <Route element={<NotePage user={session.user} />} path="anotacoes/:id" />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Route>
    </Routes>
  );
}
