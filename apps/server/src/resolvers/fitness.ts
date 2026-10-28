import type { Resolvers } from '@zapbots/graphql/server';
import { plansOn, sleepMinutes } from '@zapbots/fitness';

import {
  addMeasurement,
  deleteMeasurement,
  deleteSleepLog,
  lastSleep,
  listMeasurements,
  listSleepLogs,
  saveSleepLog,
} from '../services/fitness/body';
import { stepsOn } from '../services/fitness/health';
import {
  createMeal,
  deleteMeal,
  listMeals,
  macroDays,
  macroTarget,
  setMacroTarget,
  updateMeal,
} from '../services/fitness/meals';
import {
  deleteWorkoutPlan,
  deleteWorkoutSession,
  listWorkoutPlans,
  listWorkoutSessions,
  logWorkout,
  planExercises,
  planLastDoneOn,
  publicWorkoutPlan,
  saveWorkoutPlan,
  shareWorkoutPlan,
  sessionsOn,
} from '../services/fitness/workouts';
import { generateWorkoutPlans } from '../services/fitness/generate';
import { viewerToday } from '../services/personal/clock';
import { requireViewer } from './guards';

/** Fitness: Fichas, Treinos, Dieta, Macros, Sono and Medidas, all through `services/fitness`. */
export const fitnessResolvers: Resolvers = {
  Mutation: {
    addMeasurement: (_, { input }, context) => addMeasurement(requireViewer(context), input),
    createMeal: (_, { input }, context) => createMeal(requireViewer(context), input),
    deleteMeal: (_, { id }, context) => deleteMeal(requireViewer(context), id),
    deleteMeasurement: (_, { id }, context) => deleteMeasurement(requireViewer(context), id),
    deleteSleepLog: (_, { id }, context) => deleteSleepLog(requireViewer(context), id),
    deleteWorkoutPlan: (_, { id }, context) => deleteWorkoutPlan(requireViewer(context), id),
    deleteWorkoutSession: (_, { id }, context) => deleteWorkoutSession(requireViewer(context), id),
    generateWorkoutPlans: (_, { brief }, context) =>
      generateWorkoutPlans(requireViewer(context), brief),
    logWorkout: (_, { input }, context) => logWorkout(requireViewer(context), input),
    shareWorkoutPlan: (_, { id, shared }, context) =>
      shareWorkoutPlan(requireViewer(context), id, shared),
    saveSleepLog: (_, { id, input }, context) => saveSleepLog(requireViewer(context), id, input),
    saveWorkoutPlan: (_, { id, input }, context) =>
      saveWorkoutPlan(requireViewer(context), id, input),
    setMacroTarget: (_, { input }, context) => setMacroTarget(requireViewer(context), input),
    updateMeal: (_, { id, input }, context) => updateMeal(requireViewer(context), id, input),
  },
  Query: {
    fitnessToday: async (_, __, context) => {
      const viewer = requireViewer(context);
      const date = await viewerToday(viewer);
      const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
      const [plans, done, [eaten], target, sleep, steps] = await Promise.all([
        listWorkoutPlans(viewer),
        sessionsOn(viewer, date),
        macroDays(viewer, date, date),
        macroTarget(viewer),
        lastSleep(viewer),
        stepsOn(viewer, date),
      ]);
      return {
        date,
        done,
        eaten: eaten!,
        lastSleep: sleep,
        plans: plansOn(plans, weekday),
        steps,
        target,
      };
    },
    // Public: anyone with the link, signed in or not.
    publicWorkoutPlan: (_, { token }) => publicWorkoutPlan(token),
    macroDays: (_, { from, to }, context) => macroDays(requireViewer(context), from, to),
    macroTarget: (_, __, context) => macroTarget(requireViewer(context)),
    meals: (_, { from, to }, context) => listMeals(requireViewer(context), from, to),
    measurements: (_, { kind }, context) => listMeasurements(requireViewer(context), kind),
    sleepLogs: (_, { from, to }, context) => listSleepLogs(requireViewer(context), { from, to }),
    workoutPlans: (_, __, context) => listWorkoutPlans(requireViewer(context)),
    workoutSessions: (_, { from, to }, context) =>
      listWorkoutSessions(requireViewer(context), { from, to }),
  },
  SleepLog: {
    minutes: night => sleepMinutes(night.bedTime, night.wakeTime),
  },
  PublicWorkoutPlan: {
    exercises: plan => planExercises(plan.id),
    ownerName: plan => ('ownerName' in plan ? String(plan.ownerName) : 'Caishen'),
  },
  WorkoutPlan: {
    exercises: plan => planExercises(plan.id),
    lastDoneOn: plan => planLastDoneOn(plan.id),
  },
};
