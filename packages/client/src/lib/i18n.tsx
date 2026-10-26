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
  'billing.credits': {
    en: 'Includes {jobs} Workflows and {messages} Messages from Usage codes this month.',
    pt: 'Inclui {jobs} Workflows e {messages} Mensagens de Códigos de uso neste mês.',
  },
  'billing.current': { en: 'Your plan', pt: 'Seu plano' },
  'billing.currentPlan': { en: 'You are on {plan}', pt: 'Você está no {plan}' },
  'billing.endsOn': {
    en: 'Cancelled: Pro lasts until {date}.',
    pt: 'Cancelado: o Pro vale até {date}.',
  },
  'billing.freeModels': { en: 'Every Model on OpenRouter', pt: 'Todos os Modelos do OpenRouter' },
  'billing.jobsPerMonth': { en: '{count} Workflows a month', pt: '{count} Workflows por mês' },
  'billing.manage': { en: 'Manage subscription', pt: 'Gerenciar assinatura' },
  'billing.messagesPerMonth': { en: '{count} Messages a month', pt: '{count} Mensagens por mês' },
  'billing.notConfigured': {
    en: 'Pro is not on sale yet. The free Plan keeps working as it is.',
    pt: 'O Pro ainda não está à venda. O Gratuito continua funcionando como está.',
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
  'proposal.back': { en: 'Back', pt: 'Voltar' },
  'proposal.cancel': { en: 'Cancel', pt: 'Cancelar' },
  'proposal.cancelled': { en: 'Cancelled, nothing was saved', pt: 'Cancelada, nada foi gravado' },
  'proposal.confirm': { en: 'Confirm', pt: 'Confirmar' },
  'proposal.confirmed': { en: 'Confirmed and saved', pt: 'Confirmada e gravada' },
  'proposal.edit': { en: 'Edit', pt: 'Editar' },
  'proposal.pending': {
    en: 'Check it before confirming. Nothing is saved until then.',
    pt: 'Confira antes de confirmar. Nada é gravado até lá.',
  },
  'proposal.save': { en: 'Save', pt: 'Salvar' },
  'proposal.saving': { en: 'Saving…', pt: 'Gravando…' },
  'proposal.view': { en: 'View', pt: 'Ver' },
  'proposal.title': { en: 'Add {kind}', pt: 'Adicionar {kind}' },
  'proposal.titleDelete': { en: 'Delete {kind}', pt: 'Apagar {kind}' },
  'proposal.titleUpdate': { en: 'Correct {kind}', pt: 'Corrigir {kind}' },
  'proposal.deleted': { en: 'Deleted', pt: 'Apagado' },
  'proposal.deletePending': {
    en: 'Confirm to delete it. This cannot be undone.',
    pt: 'Confirme para apagar. Não dá para desfazer.',
  },
  'header.chat': { en: 'Agent', pt: 'Agente' },
  'header.menu': { en: 'Open the menu', pt: 'Abrir o menu' },
  'integrations.title': { en: 'Integrations', pt: 'Integrações' },
  'menu.plan': { en: 'Plan', pt: 'Plano' },
  'menu.profile': { en: 'Profile', pt: 'Perfil' },
  'nav.agent': { en: 'Agent', pt: 'Agente' },
  'nav.automation': { en: 'Automation', pt: 'Automação' },
  'nav.calculators': { en: 'Calculators', pt: 'Calculadoras' },
  'nav.documents': { en: 'Documents', pt: 'Documentos' },
  'nav.entries': { en: 'Cash flow', pt: 'Fluxo de caixa' },
  'nav.finances': { en: 'Finances', pt: 'Finanças' },
  'nav.fixed': { en: 'Expenses', pt: 'Gastos' },
  'nav.income': { en: 'Income', pt: 'Entradas' },
  'nav.integrations': { en: 'Integrations', pt: 'Integrações' },
  'nav.payoff': { en: 'Get out of debt', pt: 'Sair das dívidas' },
  'nav.planning': { en: 'Planning', pt: 'Planejamento' },
  'nav.taxes': { en: 'Taxes', pt: 'Impostos' },
  'nav.workflows': { en: 'Workflows', pt: 'Workflows' },
  'nav.home': { en: 'Home', pt: 'Página inicial' },
  'nav.soon': { en: 'Soon', pt: 'Em breve' },
  'tabs.account': { en: 'Account', pt: 'Conta' },
  'tabs.entries': { en: 'Cash flow', pt: 'Fluxo' },
  'tabs.expenses': { en: 'Expenses', pt: 'Gastos' },
  'tabs.home': { en: 'Home', pt: 'Início' },
  'tabs.label': { en: 'Main screens', pt: 'Telas principais' },
  'tabs.more': { en: 'More', pt: 'Mais' },
  'notifications.empty': { en: 'Nothing needs your attention.', pt: 'Nada pedindo sua atenção.' },
  'notifications.label': { en: 'Notifications', pt: 'Notificações' },
  'notifications.dismiss': { en: 'Remove', pt: 'Remover' },
  'notifications.markRead': { en: 'Mark as read', pt: 'Marcar como lida' },
  'notifications.options': { en: 'Options', pt: 'Opções' },
  'notifications.readAll': { en: 'Mark all as read', pt: 'Marcar todas como lidas' },
  'notifications.aboveMarket': { en: 'Rate above the market', pt: 'Juros acima do mercado' },
  'notifications.dueSoon': { en: 'Due soon', pt: 'Vence em breve' },
  'notifications.highUtilization': { en: 'Card limit nearly used', pt: 'Limite do cartão alto' },
  'notifications.overdue': { en: 'Overdue', pt: 'Em atraso' },
  'notifications.routineFailed': { en: 'A Routine failed', pt: 'Rotina falhou' },
  'notifications.staleAssessment': { en: 'Assessment out of date', pt: 'Avaliação desatualizada' },
  'month.balance': { en: 'Left over', pt: 'Saldo' },
  'month.commitments': { en: 'Commitments', pt: 'Compromissos' },
  'month.expenses': { en: 'Expenses', pt: 'Gastos' },
  'month.incomes': { en: 'Income', pt: 'Receitas' },
  'month.title': { en: 'Month', pt: 'Mês' },
  'models.title': { en: 'Models', pt: 'Modelos' },
  'theme.dark': { en: 'Dark', pt: 'Escuro' },
  'theme.light': { en: 'Light', pt: 'Claro' },
  'theme.system': { en: 'System', pt: 'Sistema' },
  'theme.title': { en: 'Theme', pt: 'Tema' },
  'nav.collapse': { en: 'Collapse', pt: 'Recolher' },
  'nav.profile': { en: 'Profile', pt: 'Perfil' },
  'nav.settings': { en: 'Settings', pt: 'Configurações' },
  'org.info': { en: 'Organization details', pt: 'Informações da organização' },
  'org.memberCount': { en: '{count} member(s)', pt: '{count} membro(s)' },
  'profile.info': { en: 'Profile details', pt: 'Informações do perfil' },
  'profile.image': { en: 'Photo URL', pt: 'URL da foto' },
  'profile.imageHint': { en: 'Optional', pt: 'Opcional' },
  'profile.organizations': { en: 'Your organizations', pt: 'Organizações em que você participa' },
  'profile.you': { en: '(you)', pt: '(você)' },
  'settings.subtitle': {
    en: 'Your organization and its members.',
    pt: 'Sua organização e quem faz parte dela.',
  },
  'settings.title': { en: 'Settings', pt: 'Configurações' },
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
  'quick.chat': { en: 'New chat', pt: 'Nova conversa' },
  'quick.income': { en: 'Add income', pt: 'Adicionar renda' },
  'quick.integration': { en: 'Connect an integration', pt: 'Conectar Integração' },
  'quick.open': { en: 'Quick actions', pt: 'Ações rápidas' },
  'quick.operation': { en: 'Add a Credit Operation', pt: 'Adicionar Operação de Crédito' },
  'rail.workflows': { en: 'Workflows', pt: 'Workflows' },
  'rail.integrations': { en: 'Integrations', pt: 'Integrações' },
  'rail.models': { en: 'Models', pt: 'Modelos' },
  'rail.organization': { en: 'Organization', pt: 'Organização' },
  'rail.plan': { en: 'Plan', pt: 'Plano' },
  'usage.conversations': { en: 'Chats started', pt: 'Conversas iniciadas' },
  'usage.jobs': { en: 'Workflows', pt: 'Workflows' },
  'usage.messages': { en: 'Messages sent', pt: 'Mensagens enviadas' },
  'usage.messagesNote': { en: 'each one asks for an answer', pt: 'cada uma pede uma resposta' },
  'usage.routineJobs': { en: '{count} from Routines', pt: '{count} de Rotinas' },
  'usage.subtitle': {
    en: 'Usage in {month}. The Limits start again on the 1st.',
    pt: 'Uso em {month}. Os Limites recomeçam no dia 1º.',
  },
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
  'welcome.askAi': {
    en: 'Ask the Caishen about your money…',
    pt: 'Pergunte ao Caishen sobre o seu dinheiro…',
  },
  'welcome.hello': { en: 'Hello, {name}', pt: 'Olá, {name}' },
  'summary.commitments': { en: 'Commitments', pt: 'Compromissos' },
  'summary.commitments.detail': {
    en: 'Installments, card bills, taxes and recurring',
    pt: 'Parcelas, Faturas, Impostos e recorrentes',
  },
  'summary.expenses': { en: 'Expenses', pt: 'Gastos' },
  'summary.expenses.detail': {
    en: 'What you typed in or imported',
    pt: 'O que você digitou ou importou',
  },
  'summary.in': { en: 'Came in', pt: 'Entrou' },
  'summary.in.detail': {
    en: 'Salaries and one-off income',
    pt: 'Salários e Receitas avulsas',
  },
  'summary.left': { en: 'Left', pt: 'Sobra' },
  'summary.left.detail': { en: 'What stays with you', pt: 'O que fica para você' },
  'summary.missing': { en: 'Short', pt: 'Faltou' },
  'summary.missing.detail': {
    en: 'More went out than came in',
    pt: 'Saiu mais do que entrou',
  },
  'home.chats': { en: 'Recent conversations', pt: 'Conversas recentes' },
  'home.chats.empty': {
    en: 'No conversations yet. Ask something above.',
    pt: 'Nenhuma conversa ainda. Pergunte algo acima.',
  },
  'home.chats.open': { en: 'Open the Agent', pt: 'Abrir o Agente' },
  'home.dues': { en: 'Coming due', pt: 'Próximos vencimentos' },
  'home.dues.empty': {
    en: 'Nothing falls due in the next 30 days.',
    pt: 'Nada vence nos próximos 30 dias.',
  },
  'home.month.open': { en: 'See entries', pt: 'Ver lançamentos' },
  'home.more': { en: 'and {count} more', pt: 'e mais {count}' },
  'welcome.send': { en: 'Send', pt: 'Enviar' },
  'account.emailHint': {
    en: 'It comes from Google and cannot be changed here.',
    pt: 'Vem do Google e não muda por aqui.',
  },
  'account.preferences': { en: 'Preferences', pt: 'Preferências' },
  'common.loadFailed': { en: 'Could not load this page.', pt: 'Não foi possível carregar.' },
  'common.save': { en: 'Save', pt: 'Salvar' },
  'common.saveFailed': { en: 'Could not save.', pt: 'Não foi possível salvar.' },
  'dashboard.notifications': { en: 'Your notifications', pt: 'Suas notificações' },
  'dashboard.notificationsIntro': {
    en: 'What the Caishen points out, the most urgent first.',
    pt: 'O que o Caishen aponta, do mais urgente ao menos.',
  },
  'dashboard.noAlerts': { en: 'Nothing to point out today.', pt: 'Nada a apontar hoje.' },
  'dashboard.noDues': {
    en: 'Nothing falls due in the next 30 days.',
    pt: 'Nada vence nos próximos 30 dias.',
  },
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
  'dashboard.upcoming': { en: 'Coming up', pt: 'Próximos vencimentos' },
  'dashboard.upcomingIntro': { en: 'The next 30 days.', pt: 'Os próximos 30 dias.' },
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
  /** The locale dates and numbers are written in. */
  locale: { en: 'en-US', pt: 'pt-BR' },
  'models.free': { en: 'free', pt: 'gratuito' },
  'models.none': { en: 'No Model available', pt: 'Nenhum Modelo disponível' },
  'models.perBot': { en: 'Model of each Bot', pt: 'Modelo de cada Bot' },
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
