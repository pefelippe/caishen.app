import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Language = 'en' | 'pt';

export const isLanguage = (value: unknown): value is Language => value === 'en' || value === 'pt';

export const LANGUAGES: { label: string; value: Language }[] = [
  { label: 'Português (Brasil)', value: 'pt' },
  { label: 'English', value: 'en' },
];

/**
 * Every translated string, in both languages. Screens not moved here yet stay in Portuguese
 * whatever the choice.
 */
const STRINGS = {
  'account.email': { en: 'E-mail', pt: 'E-mail' },
  'account.language': { en: 'Language', pt: 'Idioma' },
  'account.languageHint': {
    en: 'The language of the app. The Caishen keeps answering in Portuguese for now.',
    pt: 'O idioma do app. O Caishen continua respondendo em português por enquanto.',
  },
  'account.name': { en: 'Name', pt: 'Nome' },
  'account.subtitle': {
    en: 'Your sign-in details, from your Google account.',
    pt: 'Seus dados de acesso, que vêm da sua conta Google.',
  },
  'account.title': { en: 'Profile', pt: 'Perfil' },
  'billing.code': { en: 'Usage code', pt: 'Código de uso' },
  'billing.codes': { en: 'Usage codes', pt: 'Códigos de uso' },
  'billing.codesText': {
    en: 'A code adds Workflows and Messages to this month’s Limit. Each Organization redeems a code once.',
    pt: 'Um código soma Workflows e Mensagens ao Limite deste mês. Cada Organização resgata um código uma vez.',
  },
  'billing.credits': {
    en: 'Includes {jobs} Workflows and {messages} Messages from Usage codes this month.',
    pt: 'Inclui {jobs} Workflows e {messages} Mensagens de Códigos de uso neste mês.',
  },
  'billing.current': { en: 'current', pt: 'atual' },
  'billing.currentPlan': { en: 'Current plan', pt: 'Plano atual' },
  'billing.endsOn': {
    en: 'Cancelled: Pro lasts until {date}.',
    pt: 'Cancelado: o Pro vale até {date}.',
  },
  'billing.freeModels': { en: 'Every Model on OpenRouter', pt: 'Todos os Modelos do OpenRouter' },
  'billing.freePrice': { en: 'Free', pt: 'Grátis' },
  'billing.jobsPerMonth': { en: '{count} Workflows a month', pt: '{count} Workflows por mês' },
  'billing.manage': { en: 'Manage subscription', pt: 'Gerenciar assinatura' },
  'billing.messagesPerMonth': { en: '{count} Messages a month', pt: '{count} Mensagens por mês' },
  'billing.notConfigured': { en: 'Billing is not set up', pt: 'A cobrança não está configurada' },
  'billing.notConfiguredText': {
    en: 'The server is missing the Stripe keys (STRIPE_SECRET_KEY and STRIPE_PRICE_PRO in .env). The free Plan keeps working.',
    pt: 'Faltam as chaves do Stripe no servidor (STRIPE_SECRET_KEY e STRIPE_PRICE_PRO no .env). O Plano Gratuito continua funcionando.',
  },
  'billing.pastDue': {
    en: 'The last payment failed. Update the card to keep Pro.',
    pt: 'O último pagamento falhou. Atualize o cartão para manter o Pro.',
  },
  'billing.pastDueBadge': { en: 'payment due', pt: 'pagamento pendente' },
  'billing.perMonth': { en: '/ month', pt: '/ mês' },
  'billing.plans': { en: 'Plans', pt: 'Planos' },
  'billing.proModels': {
    en: 'Room for daily Routines and long chats',
    pt: 'Espaço para Rotinas diárias e conversas longas',
  },
  'billing.redeem': { en: 'Redeem', pt: 'Resgatar' },
  'billing.redeemed': {
    en: 'Code {code} redeemed: the Limit grew this month.',
    pt: 'Código {code} resgatado: o Limite aumentou neste mês.',
  },
  'billing.renewsOn': { en: 'Renews on {date}.', pt: 'Renova em {date}.' },
  'billing.subtitle': {
    en: 'The Organization’s Plan, its monthly Limits and how it is paid, through Stripe.',
    pt: 'O Plano da Organização, seus Limites do mês e como ele é pago, pelo Stripe.',
  },
  'billing.thanks': { en: 'Welcome to Pro', pt: 'Bem-vindo ao Pro' },
  'billing.thanksText': {
    en: 'Stripe confirmed the payment. The new Limits show up as soon as it notifies us.',
    pt: 'O Stripe confirmou o pagamento. Os novos Limites aparecem assim que ele nos avisar.',
  },
  'billing.upgrade': { en: 'Upgrade to Pro', pt: 'Assinar o Pro' },
  'chat.close': { en: 'Close chat', pt: 'Fechar conversa' },
  'chat.panel': { en: 'Chat with the Caishen', pt: 'Conversa com o Caishen' },
  'chat.toggle': { en: 'Open or close the chat', pt: 'Abrir ou fechar a conversa' },
  'header.menu': { en: 'Open the menu', pt: 'Abrir o menu' },
  'header.search': { en: 'Search', pt: 'Buscar' },
  'integrations.title': { en: 'Integrations', pt: 'Integrações' },
  'menu.plan': { en: 'Plan', pt: 'Plano' },
  'menu.profile': { en: 'Profile', pt: 'Perfil' },
  'menu.usage': { en: 'Usage', pt: 'Uso' },
  'nav.agent': { en: 'Agent', pt: 'Agente' },
  'nav.home': { en: 'Home', pt: 'Página inicial' },
  'notifications.empty': { en: 'Nothing needs your attention.', pt: 'Nada pedindo sua atenção.' },
  'notifications.label': { en: 'Notifications', pt: 'Notificações' },
  'notifications.overdue': { en: 'Overdue', pt: 'Atrasado' },
  'models.onlyFree': { en: 'Show only free Models', pt: 'Mostrar só Modelos gratuitos' },
  'models.subtitle': {
    en: 'The language model the Caishen uses, through OpenRouter. If the chosen one fails, the Workflow retries once with the server default ({model}).',
    pt: 'O modelo de linguagem que o Caishen usa, pelo OpenRouter. Se o escolhido falhar, o Workflow tenta uma vez com o padrão do servidor ({model}).',
  },
  'models.title': { en: 'Models', pt: 'Modelos' },
  'org.created': { en: 'Created on', pt: 'Criada em' },
  'org.name': { en: 'Name', pt: 'Nome' },
  'org.subtitle': {
    en: 'The space where your data lives. For now it is personal: only you and the Caishen work in it.',
    pt: 'O espaço onde ficam seus dados. Por enquanto ele é pessoal: só você e o Caishen trabalham nele.',
  },
  'org.title': { en: 'Organization', pt: 'Organização' },
  'profile.label': { en: 'Profile', pt: 'Perfil' },
  'profile.signOut': { en: 'Sign out', pt: 'Sair' },
  'rail.caishen': { en: 'Caishen', pt: 'Caishen' },
  'rail.chat': { en: 'Chat', pt: 'Chat' },
  'rail.finance': { en: 'Finance', pt: 'Financeiro' },
  'rail.dashboard': { en: 'Dashboard', pt: 'Dashboard' },
  'rail.documents': { en: 'Documents', pt: 'Documentos' },
  'rail.workflows': { en: 'Workflows', pt: 'Workflows' },
  'rail.integrations': { en: 'Integrations', pt: 'Integrações' },
  'rail.models': { en: 'Models', pt: 'Modelos' },
  'rail.organization': { en: 'Organization', pt: 'Organização' },
  'rail.plan': { en: 'Plan', pt: 'Plano' },
  'search.documents': { en: 'Documents', pt: 'Documentos' },
  'search.empty': { en: 'Nothing found.', pt: 'Nada encontrado.' },
  'search.pages': { en: 'Pages', pt: 'Páginas' },
  'search.placeholder': { en: 'Search pages and documents…', pt: 'Buscar páginas e documentos…' },
  'usage.conversations': { en: 'Chats started', pt: 'Conversas iniciadas' },
  'usage.jobs': { en: 'Workflows', pt: 'Workflows' },
  'usage.messages': { en: 'Messages sent', pt: 'Mensagens enviadas' },
  'usage.messagesNote': { en: 'each one asks for an answer', pt: 'cada uma pede uma resposta' },
  'usage.routineJobs': { en: '{count} from Routines', pt: '{count} de Rotinas' },
  'usage.subtitle': {
    en: 'What the Organization used in {month}, on the São Paulo calendar.',
    pt: 'O que a Organização usou em {month}, no calendário de São Paulo.',
  },
  'usage.title': { en: 'Usage', pt: 'Uso' },
  'users.email': { en: 'E-mail', pt: 'E-mail' },
  'users.name': { en: 'Name', pt: 'Nome' },
  'users.role': { en: 'Role', pt: 'Papel' },
  'users.roleAdmin': { en: 'Admin', pt: 'Administrador' },
  'users.roleMember': { en: 'Member', pt: 'Membro' },
  'users.roleOwner': { en: 'Owner', pt: 'Dono' },
  'users.since': { en: 'Since', pt: 'Desde' },
  'users.subtitle': {
    en: 'Who has access to this Organization. Inviting others comes with teams.',
    pt: 'Quem tem acesso a esta Organização. Convidar outras pessoas chega junto com as equipes.',
  },
  'users.title': { en: 'Users', pt: 'Usuários' },
  'welcome.giveJob': { en: 'New workflow', pt: 'Novo Workflow' },
  'welcome.ask': { en: 'Ask the Caishen', pt: 'Pergunte ao Caishen' },
  'welcome.askHelp': {
    en: 'Hello, {name}! How can I help you today?',
    pt: 'Olá, {name}! Como posso ajudar você hoje?',
  },
  'welcome.hello': { en: 'Hello, {name}', pt: 'Olá, {name}' },
  'welcome.newChat': { en: 'New chat', pt: 'Nova conversa' },
  'welcome.recentJobs': { en: 'Latest Workflows', pt: 'Últimos Workflows' },
  'welcome.seeFinance': { en: 'See Finances', pt: 'Ver Finanças' },
  'welcome.send': { en: 'Send', pt: 'Enviar' },
  'account.emailHint': {
    en: 'It comes from Google and cannot be changed here.',
    pt: 'Vem do Google e não muda por aqui.',
  },
  'account.preferences': { en: 'Preferences', pt: 'Preferências' },
  'common.loadFailed': { en: 'Could not load this page.', pt: 'Não foi possível carregar.' },
  'common.save': { en: 'Save', pt: 'Salvar' },
  'common.saveFailed': { en: 'Could not save.', pt: 'Não foi possível salvar.' },
  'dashboard.alerts': { en: 'Alerts', pt: 'Avisos' },
  'dashboard.dueNext30': { en: 'Due in 30 days', pt: 'A vencer em 30 dias' },
  'dashboard.income': { en: 'Monthly income', pt: 'Renda mensal' },
  'dashboard.jobsThisMonth': { en: 'Workflows this month', pt: 'Workflows no mês' },
  'dashboard.noAlerts': { en: 'Nothing to point out today.', pt: 'Nada a apontar hoje.' },
  'dashboard.noAssessment': { en: 'no Assessment yet', pt: 'sem Avaliação ainda' },
  'dashboard.noJobs': {
    en: 'No Workflows yet. Create one for the Caishen.',
    pt: 'Nenhum Workflow ainda. Crie um para o Caishen.',
  },
  'dashboard.operations': { en: '{count} Credit Operations', pt: '{count} Operações de Crédito' },
  'dashboard.outstanding': { en: 'Outstanding balance', pt: 'Saldo devedor' },
  'dashboard.score': { en: 'Score', pt: 'Score' },
  'dashboard.startIncome': {
    en: 'Salary, owner’s draw, rent: what comes in each month.',
    pt: 'Salário, pró-labore, aluguel: o que entra todo mês.',
  },
  'dashboard.startObligations': {
    en: 'Loans, financing and credit cards, with what is left to pay.',
    pt: 'Empréstimos, financiamentos e cartões, com o que falta pagar.',
  },
  'dashboard.startText': {
    en: 'With your income and debts, the Caishen works out your Score, what falls due and how to pay it all off.',
    pt: 'Com sua renda e suas dívidas, o Caishen calcula seu Score, o que vence e como quitar tudo.',
  },
  'dashboard.startTitle': { en: 'Add what you owe', pt: 'Cadastre o que você deve' },
  'dashboard.usageLine': {
    en: 'This month: {conversations} chats started and {messages} messages sent.',
    pt: 'Este mês: {conversations} conversas iniciadas e {messages} mensagens enviadas.',
  },
  'document.back': { en: 'Documents', pt: 'Documentos' },
  'document.bold': { en: 'Bold', pt: 'Negrito' },
  'document.bulletList': { en: 'Bulleted list', pt: 'Lista' },
  'document.edited': { en: 'edited by you', pt: 'editada por você' },
  'document.heading': { en: 'Heading {level}', pt: 'Título {level}' },
  'document.italic': { en: 'Italic', pt: 'Itálico' },
  'document.notFound': {
    en: 'This document does not exist or is not ready yet.',
    pt: 'Este documento não existe ou ainda não está pronto.',
  },
  'document.orderedList': { en: 'Numbered list', pt: 'Lista numerada' },
  'document.paragraph': { en: 'Text', pt: 'Texto' },
  'document.redo': { en: 'Redo', pt: 'Refazer' },
  'document.restore': { en: 'Restore original', pt: 'Restaurar original' },
  'document.restoreHint': {
    en: 'Brings back the text the Caishen wrote.',
    pt: 'Volta ao texto que o Caishen escreveu.',
  },
  'document.saved': { en: 'Saved', pt: 'Salvo' },
  'document.saveFailed': { en: 'Not saved', pt: 'Não salvo' },
  'document.saving': { en: 'Saving…', pt: 'Salvando…' },
  'document.toolbar': { en: 'Formatting', pt: 'Formatação' },
  'document.undo': { en: 'Undo', pt: 'Desfazer' },
  'documents.anyOrigin': { en: 'Any origin', pt: 'Qualquer origem' },
  'documents.anyTime': { en: 'Any date', pt: 'Qualquer data' },
  'documents.attachment': { en: 'Attachment', pt: 'Anexo' },
  'documents.count': { en: '{count} documents', pt: '{count} documentos' },
  'documents.created': { en: 'Created at', pt: 'Criado em' },
  'documents.deliverable': { en: 'Deliverable', pt: 'Entrega' },
  'documents.downloadSelected': {
    en: 'Download {count} Deliverables',
    pt: 'Baixar {count} Entregas',
  },
  'documents.empty': {
    en: 'No documents yet. Every finished Workflow and every file handed to the Caishen lands here.',
    pt: 'Nenhum documento ainda. Todo Workflow pronto e todo arquivo entregue ao Caishen chega aqui.',
  },
  'documents.fromJob': { en: 'Single Workflows', pt: 'Workflows avulsos' },
  'documents.fromRoutine': { en: 'Routines', pt: 'Rotinas' },
  'documents.lastDays': { en: 'Last {count} days', pt: 'Últimos {count} dias' },
  'documents.name': { en: 'Name', pt: 'Nome' },
  'documents.select': { en: 'Select {name}', pt: 'Selecionar {name}' },
  'documents.selectAll': { en: 'Select all', pt: 'Selecionar todos' },
  'documents.selected': { en: '{count} selected', pt: '{count} selecionados' },
  'documents.type': { en: 'Type', pt: 'Tipo' },
  'documents.allTypes': { en: 'All types', pt: 'Todos os tipos' },
  'documents.download': { en: 'Download', pt: 'Baixar' },
  'documents.noMatch': { en: 'Nothing matches the search.', pt: 'Nada bate com a pesquisa.' },
  'documents.search': { en: 'Search documents', pt: 'Pesquisar documentos' },
  'documents.subtitle': {
    en: 'What the Caishen delivered and the files he was given, in one place.',
    pt: 'O que o Caishen entregou e os arquivos que ele recebeu, num lugar só.',
  },
  'documents.title': { en: 'Documents', pt: 'Documentos' },
  'integrations.all': { en: 'All', pt: 'Todas' },
  'integrations.categories': { en: 'Categories', pt: 'Categorias' },
  /** The locale dates and numbers are written in. */
  locale: { en: 'en-US', pt: 'pt-BR' },
  'models.free': { en: 'free', pt: 'gratuito' },
  'models.none': { en: 'No Model available', pt: 'Nenhum Modelo disponível' },
  'models.notConfigured': {
    en: 'The Caishen is not working yet',
    pt: 'O Caishen ainda não trabalha',
  },
  'models.notConfiguredText': {
    en: 'The server is missing the OpenRouter key (OPENROUTER_API_KEY in .env). You can pick the Models now; they start working once the key exists.',
    pt: 'Falta a chave do OpenRouter no servidor (OPENROUTER_API_KEY no .env). Você já pode escolher os Modelos; eles começam a trabalhar quando a chave existir.',
  },
} satisfies Record<string, Record<Language, string>>;

export type StringKey = keyof typeof STRINGS;

const STORAGE_KEY = 'zapbots.language';

function storedLanguage(): Language {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (isLanguage(value)) return value;
  } catch {
    // Storage unavailable: the default below.
  }
  // Portuguese until the User picks otherwise on the Profile page.
  return 'pt';
}

interface I18n {
  language: Language;
  setLanguage: (language: Language) => void;
  /** The string for `key` in the current language, with `{name}`-style values filled in. */
  t: (key: StringKey, values?: Record<string, number | string>) => string;
}

const I18nContext = createContext<I18n | null>(null);

/**
 * The app's language. Signed in, it is the User's, chosen on the Profile page; this browser also
 * remembers the last one, for the pages before signing in.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setState] = useState<Language>(storedLanguage);

  useEffect(() => {
    document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en';
  }, [language]);

  const setLanguage = useCallback((next: Language) => {
    setState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice lasts until the page is closed.
    }
  }, []);

  const t = useCallback<I18n['t']>(
    (key, values) =>
      STRINGS[key][language].replace(/\{(\w+)\}/g, (_, name: string) =>
        String(values?.[name] ?? `{${name}}`)
      ),
    [language]
  );

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error('useI18n outside I18nProvider');
  return i18n;
}
