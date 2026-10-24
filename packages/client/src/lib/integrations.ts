import type { ConnectionKind } from '@zapbots/graphql/client';

/** An Integration still to come, listed disabled so the User sees where the team is going. */
export interface Upcoming {
  description: string;
  /** Built but switched off on this server: listed here until it is on. */
  kind?: ConnectionKind;
  name: string;
}

/** A kind of tool the Bots can enter, with the Integrations that already work for it. */
export interface IntegrationGroup {
  description: string;
  /** Anchor of the group on the page. */
  id: string;
  /** Integrations that already work, by their kind on the server. */
  kinds: ConnectionKind[];
  title: string;
  upcoming: Upcoming[];
}

/** Few kinds, each with what it holds; the page lists them in this order. */
export const INTEGRATION_GROUPS: IntegrationGroup[] = [
  {
    description: 'O Modelo de linguagem que o Caishen usa. Só os gratuitos, pelo OpenRouter.',
    id: 'ai',
    kinds: [],
    title: 'Modelos de IA',
    upcoming: [
      { description: 'Os Modelos Claude com a sua própria chave.', name: 'Anthropic' },
      { description: 'Os Modelos GPT com a sua própria chave.', name: 'OpenAI' },
      { description: 'Os Modelos Gemini com a sua própria chave.', name: 'Google AI' },
    ],
  },
  {
    description: 'Fale com o Caishen fora do app e deixe que ele leia o que chega por e-mail.',
    id: 'messages',
    kinds: ['WHATSAPP'],
    title: 'Comunicação',
    upcoming: [
      {
        description: 'Cadastre gastos, confira e confirme pelo WhatsApp.',
        kind: 'WHATSAPP',
        name: 'WhatsApp',
      },
      { description: 'Lê os e-mails dos bancos e das contas, sem enviar nada.', name: 'Gmail' },
      { description: 'Lê os e-mails do Outlook, sem enviar nada.', name: 'Outlook' },
      { description: 'Lê canais e mensagens que você escolher.', name: 'Slack' },
    ],
  },
  {
    description: 'Os arquivos que você entrega ao Caishen para ele ler.',
    id: 'files',
    kinds: ['GOOGLE_DRIVE'],
    title: 'Arquivos',
    upcoming: [
      { description: 'Arquivos do OneDrive, só leitura.', name: 'OneDrive' },
      { description: 'Arquivos do Dropbox, só leitura.', name: 'Dropbox' },
      { description: 'Arquivos do Box, só leitura.', name: 'Box' },
    ],
  },
  {
    description: 'Seus dados financeiros direto das instituições, com o seu consentimento.',
    id: 'finance',
    kinds: [],
    title: 'Bancos e finanças',
    upcoming: [
      {
        description: 'Contas, cartões e empréstimos pelo Open Finance, só leitura.',
        name: 'Open Finance',
      },
      {
        description: 'O relatório do SCR do Bacen, lido sozinho a partir do PDF.',
        name: 'Registrato',
      },
    ],
  },
  {
    description: 'Agenda, tarefas e hábitos, para lembrar do que vence e do que importa.',
    id: 'productivity',
    kinds: [],
    title: 'Produtividade e saúde',
    upcoming: [
      { description: 'Lê seus eventos para lembrar o que vence.', name: 'Google Agenda' },
      { description: 'Lê seus eventos do Outlook.', name: 'Outlook Agenda' },
      { description: 'Lê suas páginas e bases de tarefas.', name: 'Notion' },
      { description: 'Lê quadros e cartões.', name: 'Trello' },
      { description: 'Passos, sono e atividade.', name: 'Google Fit' },
      { description: 'Passos, sono e atividade, pelo iPhone.', name: 'Apple Saúde' },
    ],
  },
];
