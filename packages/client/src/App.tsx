import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';

import { Splash } from '@zapbots/ui/blocks/logo';

import { Layout, Scrolling } from './components/Layout';
import { authClient } from './lib/auth';
import { isLanguage, useI18n } from './lib/i18n';
import { DOCUMENTS_ENABLED } from './lib/nav';
import { useAppliedTheme } from './lib/theme';
import { useDocumentTitle } from './lib/title';
import { LoginPage, ResetPasswordPage } from './pages/LoginPage';

/** A page loaded on first visit, so the finance screens stay out of the first load. */
function page<Name extends string, Props>(
  load: () => Promise<Record<Name, ComponentType<Props>>>,
  name: Name
) {
  return lazy(async () => ({ default: (await load())[name] }));
}

const LandingPage = page(() => import('./pages/LandingPage'), 'LandingPage');
const TermsPage = page(() => import('./pages/LegalPage'), 'TermsPage');
const PrivacyPage = page(() => import('./pages/LegalPage'), 'PrivacyPage');
const BotLayout = page(() => import('./components/BotLayout'), 'BotLayout');
const CreditOperationPage = page(
  () => import('./pages/CreditOperationPage'),
  'CreditOperationPage'
);
const finance = <Name extends string>(name: Name) =>
  page(() => import('./pages/FinancePage') as Promise<Record<Name, ComponentType>>, name);
const IncomePage = finance('IncomePage');
const FixedPage = finance('FixedPage');
const EntriesPage = page(() => import('./pages/EntriesPage'), 'EntriesPage');
const PayoffPage = page(() => import('./pages/PayoffPage'), 'PayoffPage');
const CalculatorsPage = page(() => import('./pages/CalculatorsPage'), 'CalculatorsPage');
const DashboardPage = page(() => import('./pages/DashboardPage'), 'DashboardPage');
const ChatPage = page(() => import('./pages/ChatPage'), 'ChatPage');
const JobsPage = page(() => import('./pages/JobsPage'), 'JobsPage');
const JobPage = page(() => import('./pages/JobPage'), 'JobPage');
const DocumentsPage = page(() => import('./pages/DocumentsPage'), 'DocumentsPage');
const DocumentPage = page(() => import('./pages/DocumentPage'), 'DocumentPage');
const IntegrationsPage = page(() => import('./pages/IntegrationsPage'), 'IntegrationsPage');
const SettingsPage = page(() => import('./pages/SettingsPage'), 'SettingsPage');
const ProfilePage = page(() => import('./pages/ProfilePage'), 'ProfilePage');
const PlanPage = page(() => import('./pages/PlanPage'), 'PlanPage');

/** Financeiro was split: Salário went to Entradas, the rest (Obrigações too) to Gastos. */
function LegacyFinances() {
  const { hash } = useLocation();
  return (
    <Navigate
      replace
      to={
        hash === '#obligations'
          ? '/caishen/fixed#loans'
          : hash === '#income'
            ? '/caishen/income'
            : `/caishen/fixed${hash}`
      }
    />
  );
}

/** Saídas fixas held the debts too; their old anchor now opens the Empréstimos in Gastos. */
function LegacyFixed() {
  const { hash, search } = useLocation();
  return (
    <Navigate
      replace
      to={hash === '#obligations' ? '/caishen/fixed#loans' : `/caishen/fixed${search}${hash}`}
    />
  );
}

/** Cartões had a page; each card's anchor (`#card-<id>`) now lives in Gastos. */
function LegacyCards() {
  const { hash } = useLocation();
  return <Navigate replace to={`/caishen/fixed${hash || '#cards'}`} />;
}

/** Plano was a tab of Configurações; its old address keeps Stripe's `?checkout=`. */
function LegacyPlan() {
  const { search } = useLocation();
  return <Navigate replace to={`/plan${search}`} />;
}

/** Integrações used to be one page per kind; the old links land on its part of the one page. */
function LegacyIntegration() {
  const { group } = useParams<{ group: string }>();
  return <Navigate replace to={group === 'models' ? '/integrations#ai' : '/integrations'} />;
}

export function App() {
  const { data: session, isPending } = authClient.useSession();
  const { setLanguage } = useI18n();
  const { pathname } = useLocation();
  const language = session?.user.language;
  useDocumentTitle(Boolean(session));
  useAppliedTheme(Boolean(session) && pathname !== '/landing');

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
          <Route element={<ResetPasswordPage />} path="reset-password" />
          <Route element={<TermsPage />} path="terms" />
          <Route element={<PrivacyPage />} path="privacy" />
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
      {/* A reset link opened while signed in still works; choosing the password signs out. */}
      <Route element={<ResetPasswordPage />} path="reset-password" />
      {/* The Termos and the Política read the same signed in or out (docs/adr/0027). */}
      <Route
        element={
          <Suspense fallback={null}>
            <TermsPage />
          </Suspense>
        }
        path="terms"
      />
      <Route
        element={
          <Suspense fallback={null}>
            <PrivacyPage />
          </Suspense>
        }
        path="privacy"
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
        <Route
          element={
            DOCUMENTS_ENABLED ? (
              <Scrolling>
                <DocumentsPage />
              </Scrolling>
            ) : (
              <Navigate replace to="/" />
            )
          }
          path="documents"
        />
        <Route
          element={DOCUMENTS_ENABLED ? <DocumentPage /> : <Navigate replace to="/" />}
          path="documents/:id"
        />
        <Route element={<BotLayout bot="FINANCE" />} path="caishen">
          <Route element={<Navigate replace to="entries" />} index />
          <Route element={<EntriesPage />} path="entries" />
          <Route element={<IncomePage />} path="income" />
          <Route element={<FixedPage />} path="fixed" />
          <Route element={<LegacyCards />} path="cards" />
          <Route
            element={<Navigate replace to="/caishen/fixed#subscriptions" />}
            path="subscriptions"
          />
          <Route element={<Navigate replace to="/caishen/fixed#taxes" />} path="taxes" />
          <Route element={<Navigate replace to="/caishen/entries" />} path="reports" />
          <Route element={<PayoffPage />} path="payoff" />
          <Route element={<CalculatorsPage />} path="calculators" />
          {/* Old addresses: the tabs of Lançamentos, Visão geral, Relatório, Mês, Financeiro, Orçamento, Score. */}
          <Route element={<Navigate replace to="/caishen/income" />} path="entries/income" />
          <Route element={<LegacyFixed />} path="entries/fixed" />
          <Route element={<Navigate replace to="/caishen/fixed#taxes" />} path="entries/taxes" />
          <Route element={<Navigate replace to="/caishen/entries" />} path="report" />
          {['overview', 'month', 'budget', 'credit'].map(path => (
            <Route element={<Navigate replace to="/caishen/entries" />} key={path} path={path} />
          ))}
          <Route element={<LegacyFinances />} path="finances" />
          {['debts', 'obligations', 'loans', 'financing'].map(path => (
            <Route
              element={<Navigate replace to="/caishen/fixed#loans" />}
              key={path}
              path={path}
            />
          ))}
          <Route element={<CreditOperationPage />} path="operations/:id" />
          <Route element={<Navigate replace to="/" />} path="jobs/*" />
        </Route>
        <Route element={<IntegrationsPage />} path="integrations" />
        <Route element={<Navigate replace to="/integrations#ai" />} path="integrations/models" />
        <Route element={<LegacyIntegration />} path="integrations/:group" />
        <Route
          element={
            <Scrolling>
              <SettingsPage />
            </Scrolling>
          }
          path="settings"
        />
        <Route element={<LegacyPlan />} path="settings/plan" />
        <Route element={<Navigate replace to="/settings" />} path="organization" />
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
