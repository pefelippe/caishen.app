import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

export type Language = 'en' | 'pt';

export const LANGUAGES: { label: string; value: Language }[] = [
  { label: 'Português (Brasil)', value: 'pt' },
  { label: 'English', value: 'en' },
];

/**
 * Every translated string, keyed by its Portuguese text's meaning. Portuguese is the source; a key
 * missing in English falls back to it, so a screen not translated yet still reads.
 */
const STRINGS = {
  'account.email': { en: 'E-mail', pt: 'E-mail' },
  'account.language': { en: 'Language', pt: 'Idioma' },
  'account.languageHint': {
    en: 'The language of the app. The Bots keep answering in Portuguese for now.',
    pt: 'O idioma do app. Os Bots continuam respondendo em português por enquanto.',
  },
  'account.name': { en: 'Name', pt: 'Nome' },
  'account.subtitle': {
    en: 'Your sign-in details, from your Google account.',
    pt: 'Seus dados de acesso, que vêm da sua conta Google.',
  },
  'account.title': { en: 'Profile', pt: 'Perfil' },
  'apiKeys.create': { en: 'Create key', pt: 'Criar chave' },
  'apiKeys.empty': {
    en: 'No keys yet. The public API is coming soon.',
    pt: 'Nenhuma chave ainda. A API pública chega em breve.',
  },
  'apiKeys.subtitle': {
    en: 'To use the Bots from outside zapbots, from your own systems.',
    pt: 'Para usar os Bots de fora do zapbots, a partir dos seus próprios sistemas.',
  },
  'apiKeys.title': { en: 'API keys', pt: 'Chaves de API' },
  'billing.change': { en: 'Change plan', pt: 'Mudar de plano' },
  'billing.current': { en: 'current', pt: 'atual' },
  'billing.free': { en: 'Free plan', pt: 'Plano Gratuito' },
  'billing.freeText': {
    en: 'Caishen and every Bot to come, with the free Models on OpenRouter. Paid plans, with larger Models and more Jobs, are coming soon.',
    pt: 'O Caishen e todos os Bots que chegarem, com os Modelos gratuitos do OpenRouter. Planos pagos, com Modelos maiores e mais Trabalhos, chegam em breve.',
  },
  'billing.subtitle': {
    en: 'The Organization’s plan and how it is billed.',
    pt: 'O plano da Organização e como ele é cobrado.',
  },
  'billing.title': { en: 'Billing', pt: 'Faturamento' },
  'bot.chatWith': { en: 'Chat with {name}', pt: 'Conversar com {name}' },
  'bot.soon': { en: 'coming soon', pt: 'em breve' },
  'chat.back': { en: 'Back to chats', pt: 'Voltar às conversas' },
  'chat.delete': { en: 'Delete chat', pt: 'Excluir conversa' },
  'chat.new': { en: 'New chat', pt: 'Nova conversa' },
  'chat.newWith': { en: 'New chat with…', pt: 'Nova conversa com…' },
  'chats.all': { en: 'All', pt: 'Tudo' },
  'chats.empty': { en: 'No chats yet.', pt: 'Nenhuma conversa ainda.' },
  'chats.none': { en: 'No chats found.', pt: 'Nenhuma conversa encontrada.' },
  'chats.noMessages': { en: 'No messages yet', pt: 'Sem mensagens ainda' },
  'chats.search': { en: 'Search chats', pt: 'Pesquisar conversas' },
  'chats.title': { en: 'Chats', pt: 'Chats' },
  'integrations.title': { en: 'Integrations', pt: 'Integrações' },
  'menu.agents': { en: 'Agents', pt: 'Agentes' },
  'menu.billing': { en: 'Billing', pt: 'Faturamento' },
  'menu.general': { en: 'General', pt: 'Geral' },
  'menu.models': { en: 'Models', pt: 'Modelos' },
  'menu.organization': { en: 'Organization', pt: 'Organização' },
  'menu.plan': { en: 'Plan', pt: 'Plano' },
  'menu.profile': { en: 'Profile', pt: 'Perfil' },
  'menu.tools': { en: 'Tools', pt: 'Ferramentas' },
  'menu.usage': { en: 'Usage', pt: 'Uso' },
  'menu.users': { en: 'Users', pt: 'Usuários' },
  'models.onlyFree': { en: 'Show only free Models', pt: 'Mostrar só Modelos gratuitos' },
  'models.subtitle': {
    en: 'The language model each Bot uses, through OpenRouter. If the chosen one fails, the Job retries once with the server default ({model}).',
    pt: 'O modelo de linguagem que cada Bot usa, pelo OpenRouter. Se o escolhido falhar, o Trabalho tenta uma vez com o padrão do servidor ({model}).',
  },
  'models.title': { en: 'Models', pt: 'Modelos' },
  'org.created': { en: 'Created on', pt: 'Criada em' },
  'org.name': { en: 'Name', pt: 'Nome' },
  'org.subtitle': {
    en: 'The space where your data lives. For now it is personal: only you and your Bots work in it.',
    pt: 'O espaço onde ficam seus dados. Por enquanto ele é pessoal: só você e seus Bots trabalham nele.',
  },
  'org.title': { en: 'Organization', pt: 'Organização' },
  'org.users': { en: 'Users', pt: 'Usuários' },
  'profile.editProfile': { en: 'Edit profile', pt: 'Editar perfil' },
  'profile.label': { en: 'Profile', pt: 'Perfil' },
  'profile.settings': { en: 'Settings', pt: 'Configurações' },
  'profile.signOut': { en: 'Sign out', pt: 'Sair' },
  'rail.bots': { en: 'Bots', pt: 'Bots' },
  'rail.chats': { en: 'Chats', pt: 'Chats' },
  'rail.dashboard': { en: 'Dashboard', pt: 'Dashboard' },
  'rail.documents': { en: 'Documents', pt: 'Documentos' },
  'settings.title': { en: 'Settings', pt: 'Configurações' },
  'usage.conversations': { en: 'Chats started', pt: 'Conversas iniciadas' },
  'usage.jobs': { en: 'Jobs', pt: 'Trabalhos' },
  'usage.messages': { en: 'Messages sent', pt: 'Mensagens enviadas' },
  'usage.messagesNote': { en: 'each one asks for an answer', pt: 'cada uma pede uma resposta' },
  'usage.routineJobs': { en: '{count} from Routines', pt: '{count} de Rotinas' },
  'usage.subtitle': {
    en: 'What the Organization used in {month}, on the São Paulo calendar.',
    pt: 'O que a Organização usou em {month}, no calendário de São Paulo.',
  },
  'usage.title': { en: 'Usage', pt: 'Uso' },
  'users.email': { en: 'E-mail', pt: 'E-mail' },
  'users.invite': { en: 'Invite user', pt: 'Convidar usuário' },
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
  'welcome.giveJob': { en: 'Give a Job', pt: 'Dar um Trabalho' },
  'welcome.hello': { en: 'Hello, {name}', pt: 'Olá, {name}' },
  'welcome.intro': {
    en: 'Pick a chat on the left or ask the team for something. The Bots go into your tools, do the work and come back with it finished.',
    pt: 'Escolha uma conversa à esquerda ou peça algo à equipe. Os Bots entram nas suas ferramentas, fazem o trabalho e voltam com a Entrega pronta.',
  },
  'welcome.alerts': { en: 'Caishen’s Alerts', pt: 'Avisos do Caishen' },
  'welcome.models': { en: 'Set up Models', pt: 'Configurar Modelos' },
  'welcome.newChat': { en: 'New chat', pt: 'Nova conversa' },
  'welcome.recentJobs': { en: 'Latest Jobs', pt: 'Últimos Trabalhos' },
  'welcome.seeFinance': { en: 'See Finances', pt: 'Ver Finanças' },
} satisfies Record<string, Record<Language, string>>;

export type StringKey = keyof typeof STRINGS;

const STORAGE_KEY = 'zapbots.language';

function storedLanguage(): Language {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === 'en' || value === 'pt') return value;
  } catch {
    // Storage unavailable: fall back to the browser.
  }
  return navigator.language.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

interface I18n {
  language: Language;
  setLanguage: (language: Language) => void;
  /** The string for `key` in the current language, with `{name}`-style values filled in. */
  t: (key: StringKey, values?: Record<string, number | string>) => string;
}

const I18nContext = createContext<I18n | null>(null);

/** The app's language, chosen on the Profile page and remembered in this browser. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setState] = useState<Language>(storedLanguage);

  const setLanguage = useCallback((next: Language) => {
    setState(next);
    document.documentElement.lang = next === 'pt' ? 'pt-BR' : 'en';
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
