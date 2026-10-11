import { db, schema } from '@mny/database';
import { addDays, today } from '@mny/finance';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { docExportHandler } from '../../test/msw/google';
import {
  completionHandler,
  MODEL_WITHOUT_TOOLS,
  modelListHandler,
  mswServer,
} from '../../test/msw/openrouter';
import { replyInConversation, type ChatEvent } from '../services/buddies/chat';
import { attachmentText, DRIVE_SCOPE } from '../services/drive';
import { weekRange } from '../services/fitness';
import { ModelError } from '../services/models';
import { noteContentToText } from '../services/noteContent';

beforeAll(() => mswServer.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => mswServer.use(modelListHandler));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

type Viewer = Awaited<ReturnType<typeof createViewer>>;

/** Starts a Conversation with the Buddy of `area` and returns a function that sends Messages. */
async function conversationWith(viewer: Viewer, area: string) {
  const { data } = await gql(viewer, `query ($area: BuddyArea!) { buddy(area: $area) { id } }`, {
    area,
  });
  const started = await gql(
    viewer,
    `mutation ($id: ID!) { startConversation(buddyId: $id) { id } }`,
    { id: data.buddy.id }
  );
  const conversationId: string = started.data.startConversation.id;
  const say = async (content: string) => {
    const events: ChatEvent[] = [];
    await replyInConversation({
      content,
      conversationId,
      send: event => events.push(event),
      viewer,
    });
    return events;
  };
  const messages = async () => {
    const result = await gql(
      viewer,
      `query ($id: ID!) { conversation(id: $id) { title messages { role content actions { kind label } } } }`,
      { id: conversationId }
    );
    return result.data.conversation;
  };
  return { buddyId: data.buddy.id as string, conversationId, messages, say };
}

describe('personal organizer', () => {
  it('gives the User a Holder of their own, adopting the oldest one when the Organization has any', async () => {
    const fresh = await createViewer('Bruna');
    const first = await gql(fresh, `{ viewerHolder { id name } }`);
    const again = await gql(fresh, `{ viewerHolder { id } }`);
    expect(first.data.viewerHolder.name).toBe('Bruna');
    expect(again.data.viewerHolder.id).toBe(first.data.viewerHolder.id);

    const legacy = await createViewer('Caio');
    const [existing] = await db
      .insert(schema.holder)
      .values({ name: 'Titular antigo', organizationId: legacy.organizationId })
      .returning();
    const adopted = await gql(legacy, `{ viewerHolder { id name } }`);
    expect(adopted.data.viewerHolder).toEqual({ id: existing!.id, name: 'Titular antigo' });
  });

  it('keeps one Organization from reading or changing another one’s records', async () => {
    const owner = await createViewer();
    const intruder = await createViewer('Davi');
    const created = await gql(
      owner,
      `mutation {
        createTask(input: { title: "Privada" }) { id }
        logWorkout(input: { date: "2026-01-05", kind: "Corrida", durationMinutes: 30 }) { id }
        createNote(input: { title: "Privada" }) { id }
      }`
    );
    const chat = await conversationWith(owner, 'WORK');
    const ids = {
      buddy: chat.buddyId,
      conversation: chat.conversationId,
      note: created.data.createNote.id,
      task: created.data.createTask.id,
      workout: created.data.logWorkout.id,
    };

    // One operation each: a failed non-null mutation would stop the ones after it.
    const refused = (mutation: string) =>
      gql(
        intruder,
        // Ids are written into the text: unused variables would fail validation.
        `mutation { ${mutation.replace(/\$(\w+)/g, (_, name: keyof typeof ids) => JSON.stringify(ids[name]))} }`
      );
    for (const mutation of [
      'updateTask(id: $task, input: { title: "Invadida" }) { id }',
      'createNote(input: { taskId: $task }) { id }',
      'addAttachment(input: { noteId: $note, fileId: "f", name: "n", mimeType: "text/plain", url: "u" }) { id }',
      'addAttachment(input: { taskId: $task, fileId: "f", name: "n", mimeType: "text/plain", url: "u" }) { id }',
      'updateBuddy(id: $buddy, input: { name: "Invadido" }) { id }',
      'startConversation(buddyId: $buddy) { id }',
      'renameNote(id: $note, title: "Invadida") { id }',
    ]) {
      expect((await refused(mutation)).errors, mutation).toEqual(['NOT_FOUND']);
    }
    for (const mutation of [
      'deleteTask(id: $task)',
      'deleteWorkout(id: $workout)',
      'deleteNote(id: $note)',
      'deleteConversation(id: $conversation)',
    ]) {
      expect(Object.values((await refused(mutation)).data), mutation).toEqual([false]);
    }
    const chatAttempt = replyInConversation({
      content: 'oi',
      conversationId: ids.conversation,
      send: () => undefined,
      viewer: intruder,
    });
    await expect(chatAttempt).rejects.toThrow('Conversa não encontrada.');

    const reads = await gql(
      intruder,
      `query ($note: ID!, $conversation: ID!) {
        tasks { id } workouts { id } notes { id }
        note(id: $note) { id }
        conversation(id: $conversation) { id }
      }`,
      ids
    );
    expect(reads.data).toEqual({
      conversation: null,
      note: null,
      notes: [],
      tasks: [],
      workouts: [],
    });
    const mine = await gql(owner, `{ tasks { title } }`);
    expect(mine.data.tasks).toEqual([{ title: 'Privada' }]);
    const kept = await gql(
      owner,
      `{ buddy(area: WORK) { name } notes { title } workouts { kind } }`
    );
    expect(kept.data).toEqual({
      buddy: { name: 'Prumo' },
      notes: [{ title: 'Privada' }],
      workouts: [{ kind: 'Corrida' }],
    });
  });

  it('counts the Weekly Goal from Monday to Sunday', async () => {
    // 2026-10-14 is a Wednesday; a Sunday closes its week instead of opening the next.
    expect(weekRange('2026-10-14')).toEqual({ weekEnd: '2026-10-18', weekStart: '2026-10-12' });
    expect(weekRange('2026-10-11')).toEqual({ weekEnd: '2026-10-11', weekStart: '2026-10-05' });
    expect(weekRange('2027-01-01')).toEqual({ weekEnd: '2027-01-03', weekStart: '2026-12-28' });

    const viewer = await createViewer();
    const { weekStart } = weekRange(today());
    const log = (date: string, minutes: number) =>
      gql(
        viewer,
        `mutation ($date: Date!, $minutes: Int!) {
          logWorkout(input: { date: $date, kind: "Corrida", durationMinutes: $minutes }) { id }
        }`,
        { date, minutes }
      );
    await log(weekStart, 30);
    await log(addDays(weekStart, 6), 45);
    await log(addDays(weekStart, -1), 60);
    await log(addDays(weekStart, 7), 60);

    const result = await gql(
      viewer,
      `mutation { setWeeklyGoal(workoutsPerWeek: 3) { goal done minutes } }`
    );
    expect(result.data.setWeeklyGoal).toEqual({ done: 2, goal: 3, minutes: 75 });
    const tooMany = await gql(viewer, `mutation { setWeeklyGoal(workoutsPerWeek: 99) { goal } }`);
    expect(tooMany.errors).toEqual(['BAD_USER_INPUT']);
  });

  it('lets a Buddy create a Task when asked, and records the Action', async () => {
    const viewer = await createViewer();
    await gql(viewer, `mutation { createTask(input: { title: "Fechar o mês" }) { id } }`);
    const chat = await conversationWith(viewer, 'WORK');
    const { handler, log } = completionHandler([
      { arguments: { prazo: '2026-12-01', titulo: 'Pagar o IPTU' }, tool: 'criar_tarefa' },
      { text: 'Criei a Tarefa.' },
    ]);
    mswServer.use(handler);

    const events = await chat.say('Crie uma tarefa para pagar o IPTU até 1º de dezembro');

    expect(events.map(event => event.type)).toEqual(['action', 'delta', 'delta', 'done']);
    expect(await chat.messages()).toEqual({
      messages: [
        {
          actions: [],
          content: 'Crie uma tarefa para pagar o IPTU até 1º de dezembro',
          role: 'USER',
        },
        {
          actions: [{ kind: 'TASK', label: 'Tarefa criada: Pagar o IPTU' }],
          content: 'Criei a Tarefa.',
          role: 'BUDDY',
        },
      ],
      title: 'Crie uma tarefa para pagar o IPTU até 1º de dezembro',
    });
    const tasks = await gql(viewer, `{ tasks { title dueOn status } }`);
    expect(tasks.data.tasks).toContainEqual({
      dueOn: '2026-12-01',
      status: 'TODO',
      title: 'Pagar o IPTU',
    });

    // The Model was shown the Area's data and its tools, then the tool's result.
    expect(log[0]!.messages[0]!.content).toContain('Fechar o mês [a fazer]');
    expect(log[0]!.tools?.map(tool => tool.function.name)).toEqual([
      'criar_tarefa',
      'criar_anotacao',
    ]);
    expect(log[1]!.messages.at(-1)).toMatchObject({ role: 'tool' });
  });

  it('never lets a Buddy act outside its Area or with a Model that has no tools', async () => {
    const viewer = await createViewer();

    // The Finanças Buddy has no Task tool, even if the Model asks for it.
    const finance = await conversationWith(viewer, 'FINANCE');
    const refused = completionHandler([
      { arguments: { titulo: 'Indevida' }, tool: 'criar_tarefa' },
      { text: 'Não posso criar Tarefas.' },
    ]);
    mswServer.use(refused.handler);
    await finance.say('Crie uma tarefa');
    expect(refused.log[1]!.messages.at(-1)!.content).toBe('Ferramenta indisponível: criar_tarefa');

    // A Model without tool support is sent no tools at all.
    const work = await conversationWith(viewer, 'WORK');
    await gql(
      viewer,
      `mutation ($id: ID!, $model: String) { updateBuddy(id: $id, input: { model: $model }) { canAct } }`,
      { id: work.buddyId, model: MODEL_WITHOUT_TOOLS }
    );
    const plain = completionHandler([{ text: 'Só converso.' }]);
    mswServer.use(plain.handler);
    await work.say('Crie uma tarefa');
    expect(plain.log[0]!.tools).toBeUndefined();
    expect(plain.log[0]!.model).toBe(MODEL_WITHOUT_TOOLS);

    const tasks = await gql(viewer, `{ tasks { id } }`);
    expect(tasks.data.tasks).toEqual([]);
  });

  it('explains a rate limit and keeps an Action that ran before the Model failed', async () => {
    const viewer = await createViewer();

    const limited = await conversationWith(viewer, 'FITNESS');
    mswServer.use(completionHandler([{ status: 429 }]).handler);
    const failure = limited.say('Como foi minha semana?');
    await expect(failure).rejects.toBeInstanceOf(ModelError);
    await expect(failure).rejects.toThrow(/limite/);
    expect((await limited.messages()).messages).toHaveLength(1);

    const partial = await conversationWith(viewer, 'FITNESS');
    mswServer.use(
      completionHandler([
        { arguments: { minutos: 40, tipo: 'Natação' }, tool: 'registrar_treino' },
        { status: 500 },
      ]).handler
    );
    await partial.say('Registre uma natação de 40 minutos');
    const saved = (await partial.messages()).messages.at(-1);
    expect(saved.actions).toEqual([
      { kind: 'WORKOUT', label: 'Treino registrado: Natação, 40 min' },
    ]);
    const workouts = await gql(viewer, `{ workouts { kind durationMinutes date } }`);
    expect(workouts.data.workouts).toEqual([
      { date: today(), durationMinutes: 40, kind: 'Natação' },
    ]);
  });

  it('writes a Buddy’s Note in the format the collaborative editor reads', async () => {
    const viewer = await createViewer();
    const chat = await conversationWith(viewer, 'NOTES');
    mswServer.use(
      completionHandler([
        {
          arguments: { texto: 'Arroz\nFeijão\n\nCafé', titulo: 'Compras' },
          tool: 'criar_anotacao',
        },
        { text: 'Anotado.' },
      ]).handler
    );
    await chat.say('Crie uma anotação com a lista de compras');

    const [note] = await db
      .select()
      .from(schema.note)
      .where(eq(schema.note.organizationId, viewer.organizationId));
    expect(note!.title).toBe('Compras');
    expect(noteContentToText(note!.content)).toBe('Arroz\nFeijão\n\nCafé');
  });

  it('reads the text of a Google Doc Attachment and skips types it cannot read', async () => {
    const viewer = await createViewer();
    await db.insert(schema.account).values({
      accessToken: 'drive-token',
      accessTokenExpiresAt: new Date(Date.now() + 3_600_000),
      accountId: 'google-user',
      id: crypto.randomUUID(),
      providerId: 'google',
      scope: `openid,${DRIVE_SCOPE}`,
      userId: viewer.userId,
    });
    const { handler, tokens } = docExportHandler('doc-1', '  Ata da reunião  ');
    mswServer.use(handler);

    const doc = { fileId: 'doc-1', mimeType: 'application/vnd.google-apps.document' };
    expect(await attachmentText(viewer.userId, doc)).toBe('Ata da reunião');
    expect(tokens).toEqual(['Bearer drive-token']);
    // A PDF has no text here; no request is made (an unhandled one would fail the test).
    expect(
      await attachmentText(viewer.userId, { fileId: 'x', mimeType: 'application/pdf' })
    ).toBeNull();

    const connections = await gql(viewer, `{ connections { kind connected } }`);
    expect(connections.data.connections).toEqual([
      { connected: true, kind: 'GOOGLE_DRIVE' },
      { connected: false, kind: 'SPOTIFY' },
    ]);
  });
});
