import type { Viewer } from '@zapbots/auth';
import type { BotRow } from '@zapbots/database';
import { today } from '@zapbots/finance';

import { CATALOG } from './catalog';
import { botContext } from './context';

const MODE = {
  chat: 'Responda de forma curta e direta.',
  job: 'Você recebeu um Trabalho. Entregue o resultado completo e pronto para usar, organizado em seções curtas. Não faça perguntas: se faltar algum dado, diga no fim o que faltou.',
} as const;

/**
 * The system prompt of a Bot: who it is, its rules and the Viewer's data. Bots only read; they
 * never change records or move money (docs/adr/0009).
 */
export async function botPrompt(
  viewer: Viewer,
  bot: BotRow,
  options: { mode: keyof typeof MODE; screen?: string }
): Promise<string> {
  const entry = CATALOG[bot.key];
  return [
    `Você é ${entry.name}, um Bot do zapbots. ${entry.description}`,
    `Sua personalidade: ${entry.personality}`,
    'Responda em português do Brasil, em texto simples sem markdown.',
    MODE[options.mode],
    'Use apenas os dados abaixo e os arquivos que vierem junto. Se a resposta não estiver neles, diga que não sabe.',
    'Os valores em reais já estão calculados: cite-os como estão e não faça contas com dinheiro.',
    'Você só lê: não altera registros nem movimenta dinheiro. Se pedirem, explique o que a pessoa pode fazer.',
    `Hoje é ${today()}.`,
    options.screen ? `A pessoa está na tela ${options.screen}.` : '',
    '',
    await botContext(viewer, bot.key),
  ]
    .filter(line => line !== '')
    .join('\n');
}
