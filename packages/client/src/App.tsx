import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';

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
const FixedPage = finance('FixedPage');
const DebtsPage = finance('DebtsPage');
const EntriesPage = page(() => import('./pages/EntriesPage'), 'EntriesPage');
const DashboardPage = page(() => import('./pages/DashboardPage'), 'DashboardPage');
const ChatPage = page(() => import('./pages/ChatPage'), 'ChatPage');
const DocumentsPage = page(() => import('./pages/DocumentsPage'), 'DocumentsPage');
const DocumentPage = page(() => import('./pages/DocumentPage'), 'DocumentPage');
const IntegrationsPage = page(() => import('./pages/IntegrationsPage'), 'IntegrationsPage');
const OrganizationPage = page(() => import('./pages/OrganizationPage'), 'OrganizationPage');
const PlanPage = page(() => import('./pages/PlanPage'), 'PlanPage');
const ProfilePage = page(() => import('./pages/ProfilePage'), 'ProfilePage');

/** Financeiro was split: its Obrigações went to Dívidas, Salário and Impostos to Fixos. */
function LegacyFinances() {
  const { hash } = useLocation();
  return (
    <Navigate
      replace
      to={hash === '#obligations' ? '/caishen/debts' : `/caishen/entries/fixed${hash}`}
    />
  );
}

/** Integrações used to be one page per kind; the old links land on its part of the one page. */
function LegacyIntegration() {
  const { group } = useParams<{ group: string }>();
  return <Navigate replace to={group === 'files' ? '/integrations#files' : '/integrations#ai'} />;
}

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
          <Route element={<LandingPage />} path="landing" />
          <Route element={<LoginPage />} path="sign-in" />
          <Route element={<Navigate replace to="/sign-in" />} path="*" />
        </Routes>
      </Suspense>
    );
  }

  // Every path is in English; the app speaks Portuguese and, later, English too.
  return (
    <Routes>
      {/* Signed in, the landing page is still there to look at, outside the app's frame. */}
      <Route
        element={
          <Suspense fallback={null}>
            <LandingPage />
          </Suspense>
        }
        path="landing"
      />
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
        {/* Workflows are off until they work end to end; JobsPage and JobPage wait for them. */}
        <Route element={<Navigate replace to="/" />} path="workflows/*" />
        <Route element={<BotLayout bot="FINANCE" />} path="caishen">
          <Route element={<Navigate replace to="entries" />} index />
          <Route element={<EntriesPage />} path="entries" />
          <Route element={<FixedPage />} path="entries/fixed" />
          <Route element={<DebtsPage />} path="debts" />
          <Route element={<FinanceOverviewPage />} path="report" />
          {/* Old addresses: Visão geral, Mês, Financeiro and its parts. */}
          <Route element={<Navigate replace to="/caishen/report" />} path="overview" />
          <Route element={<Navigate replace to="/caishen/entries" />} path="month" />
          <Route element={<LegacyFinances />} path="finances" />
          {['income', 'taxes'].map(part => (
            <Route
              element={<Navigate replace to={`/caishen/entries/fixed#${part}`} />}
              key={part}
              path={part}
            />
          ))}
          {['obligations', 'loans', 'financing', 'cards'].map(path => (
            <Route element={<Navigate replace to="/caishen/debts" />} key={path} path={path} />
          ))}
          <Route element={<CreditOperationPage />} path="operations/:id" />
          <Route element={<Navigate replace to="/" />} path="jobs/*" />
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
        <Route element={<IntegrationsPage />} path="integrations" />
        <Route element={<Navigate replace to="/integrations#ai" />} path="integrations/models" />
        <Route element={<LegacyIntegration />} path="integrations/:group" />
        <Route
          element={
            <Scrolling>
              <OrganizationPage />
            </Scrolling>
          }
          path="organization"
        />
        <Route element={<Navigate replace to="/integrations#ai" />} path="models" />
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
