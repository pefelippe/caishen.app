import { describe, expect, it } from 'vitest';

import { streamDemoCompletion } from '../services/demoModel';

async function reply(system: string) {
  let text = '';
  await streamDemoCompletion({
    messages: [
      { content: system, role: 'system' },
      { content: 'Oi', role: 'user' },
    ],
    onText: piece => {
      text += piece;
    },
  });
  return text;
}

describe('demo model', () => {
  it('puts the Alerts first, then the start of the data', async () => {
    const text = await reply(
      [
        'Você é Caishen.',
        '',
        '## Finanças',
        'Renda mensal líquida: R$ 9.700,00',
        'Operações de Crédito:',
        '',
        '## Avisos',
        'O que merece atenção agora.',
        '- Empréstimo pessoal tem R$ 723,92 em atraso.',
        '',
        '## Entregas anteriores',
        '### 01/10/2026: Plano',
      ].join('\n')
    );
    expect(text).toBe(
      [
        'Este é o Modelo de demonstração: não há IA respondendo, só um resumo dos seus dados.',
        '',
        'O que merece atenção agora:',
        '- Empréstimo pessoal tem R$ 723,92 em atraso.',
        '',
        'Finanças:',
        'Renda mensal líquida: R$ 9.700,00',
        'Operações de Crédito:',
      ].join('\n')
    );
  });

  it('says there is no data yet when the prompt has none', async () => {
    expect(await reply('Você é Caishen.')).toContain('Ainda não há dados.');
  });
});
