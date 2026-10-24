import type { Viewer } from '@zapbots/auth';
import { db, schema, type BotRow } from '@zapbots/database';
import { dateOf, today } from '@zapbots/finance';
import { and, desc, eq } from 'drizzle-orm';

import { owned } from '../../resolvers/guards';

import { botAlerts } from './alerts';
import { CATALOG } from './catalog';
import { botContext } from './context';
import { editableRecords } from './proposals';

const RECENT_DELIVERABLES = 3;
const DELIVERABLE_CHARS = 800;
const OPEN_DOCUMENT_CHARS = 8000;
const DOCUMENT_PATH = /^\/documents\/([0-9a-f-]{36})$/i;

/**
 * The Bot's latest Deliverables, so a Conversation can pick up where a Job left off. They were
 * written by a Model, so the prompt says the data above wins over any number in them.
 */
async function recentDeliverables(bot: BotRow): Promise<string> {
  const jobs = await db
    .select()
    .from(schema.job)
    .where(and(eq(schema.job.botId, bot.id), eq(schema.job.status, 'DONE')))
    .orderBy(desc(schema.job.finishedAt))
    .limit(RECENT_DELIVERABLES);
  if (!jobs.length) return '';
  const blocks = jobs.map(job => {
    const text = job.editedDeliverable ?? job.deliverable ?? '';
    const body =
      text.length > DELIVERABLE_CHARS ? `${text.slice(0, DELIVERABLE_CHARS)}… (cortado)` : text;
    const day = dateOf(job.finishedAt ?? job.createdAt)
      .split('-')
      .reverse()
      .join('/');
    return `### ${day}: ${job.instructions}\n${body}`;
  });
  return [
    '## Entregas anteriores',
    'Escritas por você em Workflows já concluídos. Se algum número delas divergir dos dados acima, valem os dados acima.',
    ...blocks,
  ].join('\n');
}

/**
 * The Deliverable open on screen beside the chat, as the User left it, so "explain step 2" works
 * without pasting anything. Only one of the Viewer's own finished Jobs, found by the page's path.
 */
async function openDocument(viewer: Viewer, screen: string | undefined): Promise<string> {
  const id = screen?.match(DOCUMENT_PATH)?.[1];
  if (!id) return '';
  const [job] = await db
    .select()
    .from(schema.job)
    .where(and(owned(schema.job, viewer, id), eq(schema.job.status, 'DONE')));
  const text = job?.editedDeliverable ?? job?.deliverable;
  if (!job || !text) return '';
  const body =
    text.length > OPEN_DOCUMENT_CHARS ? `${text.slice(0, OPEN_DOCUMENT_CHARS)}… (cortado)` : text;
  return [
    '## Documento aberto',
    `A pessoa está lendo esta Entrega, do Workflow "${job.instructions}". Perguntas sobre "o documento" ou "este plano" falam dela.`,
    body,
  ].join('\n');
}

/** The Bot's Alerts, so it brings up what is urgent before anything else. */
async function alertSection(viewer: Viewer, bot: BotRow): Promise<string> {
  const alerts = await botAlerts(viewer, bot.key);
  if (!alerts.length) return '';
  return [
    '## Avisos',
    'O que merece atenção agora, do mais urgente ao menos. Mencione quando for relevante para o pedido.',
    ...alerts.map(alert => `- ${alert.message}`),
  ].join('\n');
}

const MODE = {
  chat: 'Responda de forma curta e direta.',
  // Meta accepts only single-purpose bots on its API, and every part of a reply counts against the
  // month's free cap (docs/adr/0019).
  whatsapp: [
    'Você está no WhatsApp, onde cuida só das finanças desta pessoa: registrar lançamentos, confirmar Propostas e responder sobre o dinheiro dela.',
    'Recuse com gentileza qualquer outro assunto, em uma frase, e lembre o que você faz aqui.',
    'Responda em poucas linhas. Uma Proposta aparece logo depois da sua resposta, com os botões Confirmar e Cancelar.',
  ].join(' '),
  job: 'Você recebeu um Workflow. Entregue o resultado completo e pronto para usar, organizado em seções curtas. Não faça perguntas: se faltar algum dado, diga no fim o que faltou.',
} as const;

/** What a Bot may do about records: propose them in a chat with tools, else only read (ADR 0013). */
const PROPOSE = [
  'Você pode propor registros com as suas ferramentas: Operação de Crédito (empréstimo ou financiamento), Fonte de Renda (renda ou faturamento que se repete todo mês), Receita avulsa (dinheiro que entra uma vez), Gasto (uma saída numa data) e Gasto recorrente (o que sai todo mês ou todo ano: academia, assinaturas, seguros).',
  'Nada é gravado até a pessoa confirmar no cartão que aparece abaixo da sua resposta. Use a ferramenta só quando a pessoa pedir para adicionar ou cadastrar.',
  'Passe os valores e as taxas exatamente como a pessoa disse, sem fazer contas. Converta você mesmo datas como "hoje", "ontem" ou "mês que vem" a partir da data de hoje; nunca peça à pessoa um formato de data.',
  'Num Gasto ou numa Receita avulsa sem data, use hoje: a pessoa confere antes de confirmar.',
  'Se faltar um dado obrigatório (valor, prazo, data da primeira parcela, taxa ou parcela), pergunte antes de propor. Não invente.',
  'Para mudar uma proposta pendente, proponha de novo: a nova substitui a anterior.',
  'Para corrigir algo já gravado ("o açaí foi 45, não 50"), use propose_update com o tipo e o id da lista de registros e mande só o que muda. A pessoa confirma antes de gravar.',
  'Para apagar um registro já gravado, use propose_delete com o tipo e o id da lista, só quando a pessoa pedir para apagar ou remover. A pessoa confirma antes.',
  'Não peça confirmação em texto antes de propor: o cartão com Confirmar e Cancelar já é a confirmação. Proponha direto.',
  'Nunca mostre à pessoa tipos ou ids da lista de registros; fale pelo nome.',
  'Você não movimenta dinheiro.',
].join(' ');
const READ_ONLY =
  'Você só lê: não altera registros nem movimenta dinheiro. Se pedirem, explique o que a pessoa pode fazer.';

/**
 * The system prompt of a Bot: who it is, its rules and the Viewer's data. Bots never move money;
 * in a chat they may propose records the User then confirms (docs/adr/0013).
 */
export async function botPrompt(
  viewer: Viewer,
  bot: BotRow,
  options: { canPropose?: boolean; mode: keyof typeof MODE; screen?: string }
): Promise<string> {
  const entry = CATALOG[bot.key];
  return [
    `Você é ${entry.name}, um Bot do zapbots. ${entry.description}`,
    `Sua personalidade: ${entry.personality}`,
    'Responda em português do Brasil. Pode usar **negrito** e listas curtas com "- "; nada de tabelas, links ou outros markdowns.',
    MODE[options.mode],
    'Use apenas os dados abaixo e os arquivos que vierem junto. Se a resposta não estiver neles, diga que não sabe.',
    'Os valores em reais já estão calculados: cite-os como estão e não faça contas com dinheiro.',
    options.canPropose ? PROPOSE : READ_ONLY,
    `Hoje é ${today()}.`,
    options.screen ? `A pessoa está na tela ${options.screen}.` : '',
    '',
    await botContext(viewer, bot.key),
    '',
    await alertSection(viewer, bot),
    '',
    await recentDeliverables(bot),
    '',
    await openDocument(viewer, options.screen),
    '',
    options.canPropose ? await editableRecords(viewer) : '',
  ]
    .filter(line => line !== '')
    .join('\n');
}
