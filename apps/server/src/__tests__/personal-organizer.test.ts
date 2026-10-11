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

  it('edits a Task field by field and buckets Workouts into past weeks', async () => {
    const viewer = await createViewer();
    const created = await gql(
      viewer,
      `mutation {
        createProject(name: "Casa") { id }
        createTask(input: { title: "Pintar a sala", dueOn: "2026-11-02" }) { id }
      }`
    );
    const update = (input: Record<string, unknown>) =>
      gql(
        viewer,
        `mutation ($id: ID!, $input: UpdateTaskInput!) {
          updateTask(id: $id, input: $input) { title status dueOn project { name } }
        }`,
        { id: created.data.createTask.id, input }
      );
    // An omitted field stays; an explicit null clears.
    expect((await update({ projectId: created.data.createProject.id })).data.updateTask).toEqual({
      dueOn: '2026-11-02',
      project: { name: 'Casa' },
      status: 'TODO',
      title: 'Pintar a sala',
    });
    expect((await update({ dueOn: null, status: 'DONE' })).data.updateTask).toEqual({
      dueOn: null,
      project: { name: 'Casa' },
      status: 'DONE',
      title: 'Pintar a sala',
    });
    expect((await update({ title: '  ' })).errors).toEqual(['BAD_USER_INPUT']);

    const { weekStart } = weekRange(today());
    for (const [date, minutes] of [
      [addDays(weekStart, -14), 20],
      [addDays(weekStart, -8), 30],
      [addDays(weekStart, -7), 40],
      [addDays(weekStart, -22), 99],
    ] as const) {
      await gql(
        viewer,
        `mutation ($date: Date!, $minutes: Int!) {
          logWorkout(input: { date: $date, kind: "Corrida", durationMinutes: $minutes }) { id }
        }`,
        { date, minutes }
      );
    }
    const history = await gql(viewer, `{ fitnessHistory(weeks: 3) { weekStart done minutes } }`);
    expect(history.data.fitnessHistory).toEqual([
      { done: 2, minutes: 50, weekStart: addDays(weekStart, -14) },
      { done: 1, minutes: 40, weekStart: addDays(weekStart, -7) },
      { done: 0, minutes: 0, weekStart },
    ]);
  });

  it('shortens the schedule with an Extra Amortization and refuses one above the balance', async () => {
    const viewer = await createViewer();
    const holder = await gql(viewer, `{ viewerHolder { id } }`);
    const created = await gql(
      viewer,
      `mutation ($holderId: ID!) {
        createCreditOperation(input: {
          holderId: $holderId, name: "Carro", modality: VEHICLE_FINANCING, system: PRICE,
          principalCents: 1200000, termMonths: 12, firstDueDate: "2030-01-10", monthlyRate: 0.02
        }) { id schedule { number } }
      }`,
      { holderId: holder.data.viewerHolder.id }
    );
    const id: string = created.data.createCreditOperation.id;
    expect(created.data.createCreditOperation.schedule).toHaveLength(12);

    const add = (as: Viewer, amountCents: number, date = '2030-02-15') =>
      gql(
        as,
        `mutation ($id: ID!, $date: Date!, $amountCents: Cents!) {
          addExtraAmortization(creditOperationId: $id, date: $date, amountCents: $amountCents) {
            schedule { number }
            extraAmortizations { id date amountCents }
          }
        }`,
        { amountCents, date, id }
      );

    const added = await add(viewer, 500_000);
    const operation = added.data.addExtraAmortization;
    expect(operation.extraAmortizations).toMatchObject([
      { amountCents: 500_000, date: '2030-02-15' },
    ]);
    expect(operation.schedule.length).toBeLessThan(12);

    expect((await add(viewer, 99_000_000)).errors).toEqual(['BAD_USER_INPUT']);
    expect((await add(viewer, 100, '2029-12-31')).errors).toEqual(['BAD_USER_INPUT']);
    expect((await add(await createViewer('Davi'), 100)).errors).toEqual(['NOT_FOUND']);

    const removed = await gql(
      viewer,
      `mutation ($id: ID!) { removeExtraAmortization(id: $id) { schedule { number } } }`,
      { id: operation.extraAmortizations[0].id }
    );
    expect(removed.data.removeExtraAmortization.schedule).toHaveLength(12);
  });

  it('searches titles and Note text inside the Organization, ignoring case and accents', async () => {
    const viewer = await createViewer();
    const other = await createViewer('Davi');
    await gql(other, `mutation { createTask(input: { title: "Orçamento alheio" }) { id } }`);
    const seeded = await gql(
      viewer,
      `mutation {
        budget: createTask(input: { title: "Revisar o orçamento", dueOn: "2026-12-01" }) { id }
        discount: createTask(input: { title: "Desconto de 100%" }) { id }
        logWorkout(input: { date: "2026-01-05", kind: "Corrida", durationMinutes: 30, notes: "Orçamento de fôlego" }) { id }
      }`
    );
    expect(seeded.errors).toEqual([]);
    const chat = await conversationWith(viewer, 'NOTES');
    mswServer.use(
      completionHandler([
        {
          arguments: { texto: 'Cortar assinaturas para fechar o orçamento.', titulo: 'Metas' },
          tool: 'criar_anotacao',
        },
        { text: 'Anotado.' },
      ]).handler
    );
    await chat.say('Crie uma anotação');

    const search = async (term: string) =>
      (
        await gql(viewer, `query ($term: String!) { search(term: $term) { kind title detail } }`, {
          term,
        })
      ).data.search;

    expect(await search('ORCAMENTO')).toEqual([
      { detail: 'Prazo 01/12/2026', kind: 'TASK', title: 'Revisar o orçamento' },
      { detail: 'Cortar assinaturas para fechar o orçamento.', kind: 'NOTE', title: 'Metas' },
      { detail: '05/01/2026 · 30 min · Orçamento de fôlego', kind: 'WORKOUT', title: 'Corrida' },
    ]);
    expect(await search('100%')).toEqual([
      { detail: null, kind: 'TASK', title: 'Desconto de 100%' },
    ]);
    expect(await search('%')).toEqual([]);

    // Cards of the Viewer's Holder are found; those of another Holder in the Organization are not.
    const mine = await gql(viewer, `{ viewerHolder { id } }`);
    const [legacy] = await db
      .insert(schema.holder)
      .values({ name: 'Outro Titular', organizationId: viewer.organizationId })
      .returning();
    const card = { closingDay: 1, dueDay: 10, limitCents: 100_000 };
    await db.insert(schema.creditCard).values([
      {
        ...card,
        holderId: mine.data.viewerHolder.id,
        name: 'Mastercard meu',
        organizationId: viewer.organizationId,
      },
      {
        ...card,
        holderId: legacy!.id,
        name: 'Mastercard antigo',
        organizationId: viewer.organizationId,
      },
    ]);
    expect(await search('mastercard')).toEqual([
      { detail: null, kind: 'CREDIT_CARD', title: 'Mastercard meu' },
    ]);
  });
});
