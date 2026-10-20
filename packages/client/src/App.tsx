import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';

import { Layout, Scrolling } from './components/Layout';
import { Splash } from './components/Logo';
import { authClient } from './lib/auth';
import { isLanguage, useI18n } from './lib/i18n';
import { LoginPage } from './pages/LoginPage';

/** A page loaded on first visit, so the finance screens stay out of the first load. */
function page<Name extends string, Props>(
  load: () => Promise<Record<Name, ComponentType<Props>>>,
  name: Name
) {
  return lazy(async () => ({ default: (await load())[name] }));
}

const LandingPage = page(() => import('./pages/LandingPage'), 'LandingPage');
const BotLayout = page(() => import('./components/BotLayout'), 'BotLayout');
const CreditOperationPage = page(
  () => import('./pages/CreditOperationPage'),
  'CreditOperationPage'
);
const finance = <Name extends string>(name: Name) =>
  page(() => import('./pages/FinancePage') as Promise<Record<Name, ComponentType>>, name);
const FinanceOverviewPage = finance('FinanceOverviewPage');
const IncomePage = finance('IncomePage');
const ObligationsPage = finance('ObligationsPage');
const TaxesPage = finance('TaxesPage');
/** Workflows used to live under the Caishen's page; old links still land on them. */
function LegacyJobRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate replace to={`/workflows/${id}`} />;
}

const JobPage = page(() => import('./pages/JobPage'), 'JobPage');
const JobsPage = page(() => import('./pages/JobsPage'), 'JobsPage');
const DashboardPage = page(() => import('./pages/DashboardPage'), 'DashboardPage');
const ChatPage = page(() => import('./pages/ChatPage'), 'ChatPage');
const DocumentsPage = page(() => import('./pages/DocumentsPage'), 'DocumentsPage');
const DocumentPage = page(() => import('./pages/DocumentPage'), 'DocumentPage');
const IntegrationsLayout = page(() => import('./pages/IntegrationsPage'), 'IntegrationsLayout');
const IntegrationsPage = page(() => import('./pages/IntegrationsPage'), 'IntegrationsPage');
const OrganizationPage = page(() => import('./pages/OrganizationPage'), 'OrganizationPage');
const ModelsPage = page(() => import('./pages/ModelsPage'), 'ModelsPage');
const PlanPage = page(() => import('./pages/PlanPage'), 'PlanPage');
const ProfilePage = page(() => import('./pages/ProfilePage'), 'ProfilePage');

export function App() {
  const { data: session, isPending } = authClient.useSession();
  const { setLanguage } = useI18n();
  const language = session?.user.language;

  // Signed in, the User's own language wins over the one this browser remembered.
  useEffect(() => {
    if (isLanguage(language)) setLanguage(language);
  }, [language, setLanguage]);

  if (isPending) {
    return <Splash />;
  }
  // Every User has a personal Organization from their first session on (docs/adr/0007).
  if (!session) {
    return (
      <Suspense fallback={null}>
        <Routes>
          <Route element={<LandingPage />} index />
          <Route element={<LoginPage />} path="sign-in" />
          <Route element={<Navigate replace to="/sign-in" />} path="*" />
        </Routes>
      </Suspense>
    );
  }

  // Every path is in English; the app speaks Portuguese and, later, English too.
  return (
    <Routes>
      <Route element={<Layout user={session.user} />}>
        <Route
          element={
            <Scrolling>
              <DashboardPage user={session.user} />
            </Scrolling>
          }
          index
        />
        <Route element={<ChatPage user={session.user} />} path="chat" />
        <Route
          element={
            <Scrolling>
              <JobsPage />
            </Scrolling>
          }
          path="workflows"
        />
        <Route
          element={
            <Scrolling>
              <JobPage />
            </Scrolling>
          }
          path="workflows/:id"
        />
        <Route element={<BotLayout bot="FINANCE" />} path="caishen">
          <Route element={<Navigate replace to="overview" />} index />
          <Route element={<FinanceOverviewPage />} path="overview" />
          <Route element={<IncomePage />} path="income" />
          <Route element={<TaxesPage />} path="taxes" />
          <Route element={<ObligationsPage />} path="obligations" />
          {['loans', 'financing', 'cards'].map(path => (
            <Route
              element={<Navigate replace to="/caishen/obligations" />}
              key={path}
              path={path}
            />
          ))}
          <Route element={<CreditOperationPage />} path="operations/:id" />
          <Route element={<Navigate replace to="/workflows" />} path="jobs" />
          <Route element={<LegacyJobRedirect />} path="jobs/:id" />
        </Route>
        <Route
          element={
            <Scrolling>
              <DocumentsPage />
            </Scrolling>
          }
          path="documents"
        />
        <Route element={<DocumentPage />} path="documents/:id" />
        <Route element={<IntegrationsLayout />} path="integrations">
          <Route element={<IntegrationsPage />} index />
          <Route element={<ModelsPage />} path="models" />
          <Route element={<IntegrationsPage />} path=":group" />
        </Route>
        <Route
          element={
            <Scrolling>
              <OrganizationPage />
            </Scrolling>
          }
          path="organization"
        />
        <Route element={<Navigate replace to="/integrations/models" />} path="models" />
        <Route
          element={
            <Scrolling>
              <PlanPage />
            </Scrolling>
          }
          path="plan"
        />
        <Route
          element={
            <Scrolling>
              <ProfilePage />
            </Scrolling>
          }
          path="profile"
        />
        <Route element={<Navigate replace to="/" />} path="*" />
      </Route>
    </Routes>
  );
}
