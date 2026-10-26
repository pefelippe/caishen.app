import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Each screen's name for the browser tab, the most specific path first. */
const TITLES: [RegExp, string][] = [
  [/^\/$/, 'Página inicial'],
  [/^\/chat/, 'Agente'],
  [/^\/documents\/.+/, 'Documento'],
  [/^\/documents/, 'Documentos'],
  [/^\/integrations/, 'Integrações'],
  [/^\/organization/, 'Organização'],
  [/^\/plan/, 'Plano'],
  [/^\/profile/, 'Perfil'],
  [/^\/workflows/, 'Workflows'],
  [/^\/caishen\/entries/, 'Fluxo de caixa'],
  [/^\/caishen\/income/, 'Entradas'],
  [/^\/caishen\/fixed/, 'Gastos'],
  [/^\/caishen\/budget/, 'Orçamento'],
  [/^\/caishen\/payoff/, 'Sair das dívidas'],
  [/^\/caishen\/calculators/, 'Calculadoras'],
  [/^\/caishen\/credit/, 'Score de crédito'],
  [/^\/caishen\/operations/, 'Operação de crédito'],
  [/^\/sign-in/, 'Entrar'],
  [/^\/terms/, 'Termos de Uso'],
  [/^\/privacy/, 'Política de Privacidade'],
  [/^\/landing/, 'Saia das dívidas'],
];

/** Names the browser tab after the screen open, as "Lançamentos · Caishen". */
export function useDocumentTitle(signedIn: boolean) {
  const { pathname } = useLocation();
  useEffect(() => {
    // Signed out, `/` is the landing page.
    const path = !signedIn && pathname === '/' ? '/landing' : pathname;
    const name = TITLES.find(([pattern]) => pattern.test(path))?.[1];
    document.title = name ? `${name} · Caishen` : 'Caishen';
  }, [pathname, signedIn]);
}
