import { closeDb } from '@zapbots/database';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { completionHandler, modelListHandler, mswServer, textOf } from '../../test/msw/openrouter';

beforeAll(() => mswServer.listen());
afterEach(() => mswServer.resetHandlers());
afterAll(async () => {
  mswServer.close();
  await closeDb();
});

const GENERATE = /* GraphQL */ `
  mutation ($brief: WorkoutBrief!) {
    generateWorkoutPlans(brief: $brief) {
      name
      weekdays
      exercises {
        name
        sets
        reps
        load
      }
    }
  }
`;
const BRIEF = {
  daysPerWeek: 2,
  equipment: 'GYM',
  forName: 'Bia',
  goal: 'HYPERTROPHY',
  level: 'BEGINNER',
  minutes: 50,
  notes: 'dor no joelho',
};
const ANSWER = JSON.stringify({
  plans: [
    {
      exercises: [{ load: null, name: 'Supino', reps: '10-12', restSeconds: 60, sets: 3 }],
      name: 'Treino A',
      notes: 'Aqueça 5 min',
      weekdays: [1],
    },
    {
      exercises: [{ name: 'Leg press', reps: '12', sets: 3 }],
      name: 'Treino B',
      weekdays: [4],
    },
  ],
});

describe('Fichas para si e para outros', () => {
  it("writes drafts with the Agente's Model from the brief, saving nothing", async () => {
    const viewer = await createViewer();
    const model = completionHandler([{ text: `Aqui estão:\n\`\`\`json\n${ANSWER}\n\`\`\`` }]);
    mswServer.use(modelListHandler, model.handler);

    const result = await gql(viewer, GENERATE, { brief: BRIEF });
    expect(result.errors).toEqual([]);
    expect(result.data.generateWorkoutPlans).toEqual([
      {
        exercises: [{ load: null, name: 'Supino', reps: '10-12', sets: 3 }],
        name: 'Treino A',
        weekdays: [1],
      },
      {
        exercises: [{ load: null, name: 'Leg press', reps: '12', sets: 3 }],
        name: 'Treino B',
        weekdays: [4],
      },
    ]);
    const asked = textOf(model.log[0]!.messages.at(-1));
    expect(asked).toContain('para Bia');
    expect(asked).toContain('dor no joelho');
    expect((await gql(viewer, `query { workoutPlans { id } }`)).data.workoutPlans).toEqual([]);
  });

  it('says so when the Model answers nothing usable, and checks the brief', async () => {
    const viewer = await createViewer();
    mswServer.use(modelListHandler, completionHandler([{ text: 'Não sei.' }]).handler);
    expect((await gql(viewer, GENERATE, { brief: BRIEF })).errors).toEqual(['BAD_USER_INPUT']);
    expect((await gql(viewer, GENERATE, { brief: { ...BRIEF, daysPerWeek: 9 } })).errors).toEqual([
      'BAD_USER_INPUT',
    ]);
  });

  it('keeps who a Ficha is for, and shares it by a link anyone can open until it is closed', async () => {
    const viewer = await createViewer('Ana');
    const save = `mutation ($input: WorkoutPlanInput!) { saveWorkoutPlan(input: $input) { id forName } }`;
    await gql(viewer, save, {
      input: { exercises: [{ name: 'Corrida', sets: 1 }], name: 'Meu treino' },
    });
    const plan = (
      await gql(viewer, save, {
        input: {
          exercises: [{ load: '10', name: 'Remada', reps: '12', sets: 3 }],
          forName: ' Bia ',
          name: 'Treino A',
        },
      })
    ).data.saveWorkoutPlan;
    expect(plan.forName).toBe('Bia');
    const listed = (await gql(viewer, `query { workoutPlans { name forName } }`)).data.workoutPlans;
    expect(listed).toEqual([
      { forName: null, name: 'Meu treino' },
      { forName: 'Bia', name: 'Treino A' },
    ]);

    const share = `mutation ($id: ID!, $shared: Boolean!) { shareWorkoutPlan(id: $id, shared: $shared) { shareToken } }`;
    const token = (await gql(viewer, share, { id: plan.id, shared: true })).data.shareWorkoutPlan
      .shareToken;
    expect(token).toMatch(/^[\w-]{20,}$/);

    const PUBLIC = `query ($token: String!) { publicWorkoutPlan(token: $token) { name forName ownerName exercises { name loadGrams } } }`;
    expect((await gql(null, PUBLIC, { token })).data.publicWorkoutPlan).toEqual({
      exercises: [{ loadGrams: 10_000, name: 'Remada' }],
      forName: 'Bia',
      name: 'Treino A',
      ownerName: 'Ana',
    });

    const other = await createViewer();
    expect((await gql(other, share, { id: plan.id, shared: false })).errors).toEqual(['NOT_FOUND']);
    await gql(viewer, share, { id: plan.id, shared: false });
    expect((await gql(null, PUBLIC, { token })).data.publicWorkoutPlan).toBeNull();
  });
});
