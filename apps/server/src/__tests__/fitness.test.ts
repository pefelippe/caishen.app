import { closeDb } from '@zapbots/database';
import { addDays } from '@zapbots/finance';
import { dateIn } from '@zapbots/personal';
import { afterAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';

afterAll(async () => {
  await closeDb();
});

const today = () => dateIn('America/Sao_Paulo');

const SAVE_PLAN = /* GraphQL */ `
  mutation ($id: ID, $input: WorkoutPlanInput!) {
    saveWorkoutPlan(id: $id, input: $input) {
      id
      name
      weekdays
      lastDoneOn
      exercises {
        name
        sets
        reps
        loadGrams
      }
    }
  }
`;
const TODAY = /* GraphQL */ `
  query {
    fitnessToday {
      date
      eaten {
        meals
        kcal
        proteinG
      }
      target {
        kcal
      }
      lastSleep {
        minutes
      }
      plans {
        name
      }
      done {
        title
      }
    }
  }
`;
const MACRO_DAYS = `query ($from: Date!, $to: Date!) { macroDays(from: $from, to: $to) { date meals kcal } }`;
const MEALS = `query ($from: Date!, $to: Date!) { meals(from: $from, to: $to) { id } }`;

describe('Fitness', () => {
  it('keeps a Ficha with its exercises, replaces them on save and logs Treinos from it', async () => {
    const viewer = await createViewer();
    const weekday = new Date(`${today()}T12:00:00Z`).getUTCDay();
    const created = await gql(viewer, SAVE_PLAN, {
      input: {
        exercises: [
          { load: '22,5', name: 'Supino', reps: '8-12', sets: 4 },
          { name: 'Barra fixa', sets: 3 },
        ],
        name: 'Treino A',
        weekdays: [weekday],
      },
    });
    expect(created.errors).toEqual([]);
    const plan = created.data.saveWorkoutPlan;
    expect(plan.exercises).toEqual([
      { loadGrams: 22_500, name: 'Supino', reps: '8-12', sets: 4 },
      { loadGrams: null, name: 'Barra fixa', reps: '', sets: 3 },
    ]);

    const changed = await gql(viewer, SAVE_PLAN, {
      id: plan.id,
      input: {
        exercises: [{ load: '25', name: 'Supino', sets: 4 }],
        name: 'Treino A',
        weekdays: [weekday],
      },
    });
    expect(changed.data.saveWorkoutPlan.exercises).toHaveLength(1);

    const bad = await gql(viewer, SAVE_PLAN, {
      input: { exercises: [{ load: 'muito', name: 'X', sets: 3 }], name: 'B' },
    });
    expect(bad.errors).toEqual(['BAD_USER_INPUT']);

    const logged = await gql(
      viewer,
      `mutation ($input: WorkoutSessionInput!) { logWorkout(input: $input) { title doneOn } }`,
      { input: { doneOn: today(), durationMinutes: 50, planId: plan.id } }
    );
    expect(logged.data.logWorkout).toEqual({ doneOn: today(), title: 'Treino A' });
    const plans = (await gql(viewer, `query { workoutPlans { lastDoneOn } }`)).data.workoutPlans;
    expect(plans).toEqual([{ lastDoneOn: today() }]);

    const home = (await gql(viewer, TODAY)).data.fitnessToday;
    expect(home.plans).toEqual([{ name: 'Treino A' }]);
    expect(home.done).toEqual([{ title: 'Treino A' }]);

    const other = await createViewer();
    expect((await gql(other, `query { workoutPlans { id } }`)).data.workoutPlans).toEqual([]);
    const stolen = await gql(other, `mutation ($id: ID!) { deleteWorkoutPlan(id: $id) }`, {
      id: plan.id,
    });
    expect(stolen.data.deleteWorkoutPlan).toBe(false);
  });

  it('adds up the Refeições of each day against the macro targets', async () => {
    const viewer = await createViewer();
    const create = `mutation ($input: MealInput!) { createMeal(input: $input) { id kind } }`;
    const day = today();
    await gql(viewer, create, {
      input: {
        carbsG: 60,
        description: 'Arroz e frango',
        eatenOn: day,
        fatG: 10,
        kcal: 550,
        kind: 'LUNCH',
        proteinG: 40,
        time: '12:30',
      },
    });
    await gql(viewer, create, {
      input: { description: 'Iogurte', eatenOn: day, kcal: 150, proteinG: 10 },
    });
    await gql(viewer, create, {
      input: { description: 'Ontem', eatenOn: addDays(day, -1), kcal: 999 },
    });
    const target = await gql(
      viewer,
      `mutation { setMacroTarget(input: { kcal: 2000, proteinG: 150 }) { kcal proteinG carbsG } }`
    );
    expect(target.data.setMacroTarget).toEqual({ carbsG: null, kcal: 2000, proteinG: 150 });

    const days = (await gql(viewer, MACRO_DAYS, { from: addDays(day, -1), to: day })).data
      .macroDays;
    expect(days).toEqual([
      { date: addDays(day, -1), kcal: 999, meals: 1 },
      { date: day, kcal: 700, meals: 2 },
    ]);
    const home = (await gql(viewer, TODAY)).data.fitnessToday;
    expect(home.eaten).toEqual({ kcal: 700, meals: 2, proteinG: 50 });
    expect(home.target).toEqual({ kcal: 2000 });

    const tooLong = await gql(viewer, MEALS, { from: addDays(day, -200), to: day });
    expect(tooLong.errors).toEqual(['BAD_USER_INPUT']);
  });

  it('logs nights across midnight and reads Medidas as typed, without floats', async () => {
    const viewer = await createViewer();
    const night = await gql(
      viewer,
      `mutation ($input: SleepLogInput!) { saveSleepLog(input: $input) { id minutes quality } }`,
      { input: { bedTime: '23:30', quality: 4, wakeTime: '07:00', wokeOn: today() } }
    );
    expect(night.data.saveSleepLog).toMatchObject({ minutes: 450, quality: 4 });
    expect((await gql(viewer, TODAY)).data.fitnessToday.lastSleep).toEqual({ minutes: 450 });

    const add = `mutation ($input: MeasurementInput!) { addMeasurement(input: $input) { kind value } }`;
    const weight = await gql(viewer, add, {
      input: { kind: 'WEIGHT', measuredOn: today(), value: '72,5' },
    });
    expect(weight.data.addMeasurement).toEqual({ kind: 'WEIGHT', value: 72_500 });
    await gql(viewer, add, { input: { kind: 'WAIST', measuredOn: today(), value: '81.5' } });
    const absurd = await gql(viewer, add, {
      input: { kind: 'WEIGHT', measuredOn: today(), value: '7250' },
    });
    expect(absurd.errors).toEqual(['BAD_USER_INPUT']);

    const weights = (await gql(viewer, `query { measurements(kind: WEIGHT) { value } }`)).data
      .measurements;
    expect(weights).toEqual([{ value: 72_500 }]);
    const all = (await gql(viewer, `query { measurements { kind } }`)).data.measurements;
    expect(all).toHaveLength(2);
  });
});
