import type { Viewer } from '@zapbots/auth';
import { closeDb, db, schema } from '@zapbots/database';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import {
  completionHandler,
  modelListHandler,
  MODEL_WITHOUT_TOOLS,
  mswServer,
} from '../../test/msw/openrouter';
import { readAttachments, type ChatAttachment } from '../services/bots/attachments';
import { ensureBots } from '../services/bots/catalog';
import { replyInConversation } from '../services/bots/chat';

beforeAll(() => mswServer.listen());
afterEach(() => mswServer.resetHandlers());
afterAll(async () => {
  mswServer.close();
  await closeDb();
});

const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const PDF = 'data:application/pdf;base64,JVBERi0xLjQ=';

const MESSAGES = /* GraphQL */ `
  query ($id: ID!) {
    conversation(id: $id) {
      title
      messages {
        role
        content
        attachments {
          kind
          name
        }
      }
    }
  }
`;

async function startConversation(viewer: Viewer, model?: string) {
  const [bot] = await ensureBots(viewer.organizationId);
  await db
    .update(schema.bot)
    .set({ model: model ?? null })
    .where(eq(schema.bot.id, bot!.id));
  const [conversation] = await db
    .insert(schema.conversation)
    .values({ botId: bot!.id, organizationId: viewer.organizationId })
    .returning();
  return conversation!.id;
}

/** Sends a Message with files; returns what reached OpenRouter and the errors shown. */
async function send(
  viewer: Viewer,
  conversationId: string,
  content: string,
  attachments: ChatAttachment[],
  replies = 1
) {
  const { handler, log } = completionHandler(
    Array.from({ length: replies }, () => ({ text: 'Recebi os arquivos.' }))
  );
  mswServer.use(modelListHandler, handler);
  const errors: string[] = [];
  await replyInConversation({
    attachments,
    content,
    conversationId,
    send: event => {
      if (event.type === 'error') errors.push(event.message);
    },
    viewer,
  }).catch((error: Error) => errors.push(error.message));
  return { errors, log };
}

describe('Anexos no chat', () => {
  it('reach the Model as text, image and file parts, and only their names are kept', async () => {
    const viewer = await createViewer();
    const conversationId = await startConversation(viewer);

    const { errors, log } = await send(viewer, conversationId, 'Cadastre isso', [
      { data: 'Data;Valor\n05/10/2026;-120,00', kind: 'TEXT', name: 'extrato.csv' },
      { data: PNG, kind: 'IMAGE', name: 'comprovante.png' },
      { data: PDF, kind: 'PDF', name: 'contrato.pdf' },
    ]);

    expect(errors).toEqual([]);
    const turn = log[0]!.messages.at(-1)!;
    expect(turn.role).toBe('user');
    expect(turn.content).toEqual([
      { text: expect.stringContaining('05/10/2026;-120,00'), type: 'text' },
      { image_url: { url: PNG }, type: 'image_url' },
      { file: { file_data: PDF, filename: 'contrato.pdf' }, type: 'file' },
    ]);
    // The spreadsheet is fenced off as data, after the User's own words.
    const [text] = turn.content as { text: string }[];
    expect(text!.text).toMatch(/^Cadastre isso\n\nArquivo anexado "extrato.csv"/);
    expect(log[0]!.plugins).toEqual([{ id: 'file-parser', pdf: { engine: 'cloudflare-ai' } }]);

    const { data } = await gql(viewer, MESSAGES, { id: conversationId });
    expect(data.conversation.messages[0]).toEqual({
      attachments: [
        { kind: 'TEXT', name: 'extrato.csv' },
        { kind: 'IMAGE', name: 'comprovante.png' },
        { kind: 'PDF', name: 'contrato.pdf' },
      ],
      content: 'Cadastre isso',
      role: 'USER',
    });
  });

  it('may go without text, and later turns only say which files came', async () => {
    const viewer = await createViewer();
    const conversationId = await startConversation(viewer);

    const first = await send(viewer, conversationId, '', [
      { data: PNG, kind: 'IMAGE', name: 'recibo.png' },
    ]);
    expect(first.errors).toEqual([]);
    const { data } = await gql(viewer, MESSAGES, { id: conversationId });
    expect(data.conversation.title).toBe('recibo.png');

    const second = await send(viewer, conversationId, 'E agora?', []);
    const earlier = second.log[0]!.messages.find(message => message.role === 'user')!;
    expect(earlier.content).toContain('[Anexou "recibo.png"');
    expect(JSON.stringify(second.log[0]!.messages)).not.toContain('base64');
    expect(second.log[0]!.plugins).toBeUndefined();
  });

  it('refuse images when the Model cannot read them', async () => {
    const viewer = await createViewer();
    const conversationId = await startConversation(viewer, MODEL_WITHOUT_TOOLS);

    const { errors, log } = await send(viewer, conversationId, 'Leia', [
      { data: PNG, kind: 'IMAGE', name: 'foto.png' },
    ]);

    expect(errors).toEqual([expect.stringContaining('não lê imagens')]);
    expect(log).toEqual([]);
  });

  it('turn away malformed or oversized files before anything is sent', () => {
    expect(() => readAttachments([{ data: 'oi', kind: 'IMAGE', name: 'x.png' }])).toThrow(
      'não é uma imagem ou um PDF'
    );
    expect(() =>
      readAttachments(Array.from({ length: 6 }, () => ({ data: 'a', kind: 'TEXT', name: 'a.txt' })))
    ).toThrow('até 5 arquivos');
    const big = `data:application/pdf;base64,${'A'.repeat(5 * 1024 * 1024)}`;
    expect(() => readAttachments([{ data: big, kind: 'PDF', name: 'grande.pdf' }])).toThrow('3 MB');
  });
});
