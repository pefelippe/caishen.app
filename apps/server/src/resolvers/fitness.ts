import { db, schema } from '@mny/database';
import type { Resolvers } from '@mny/graphql/server';
import { and, desc, eq } from 'drizzle-orm';

import { fitnessWeek } from '../services/fitness';
import { badInput, requireViewer } from './guards';

export const fitnessResolvers: Resolvers = {
  Mutation: {
    deleteWorkout: async (_, { id }, context) => {
      const viewer = requireViewer(context);
      const deleted = await db
        .delete(schema.workout)
        .where(
          and(eq(schema.workout.id, id), eq(schema.workout.organizationId, viewer.organizationId))
        )
        .returning({ id: schema.workout.id });
      return deleted.length > 0;
    },
    logWorkout: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      if (!input.kind.trim()) badInput('Diga qual foi o Treino');
      if (!Number.isInteger(input.durationMinutes) || input.durationMinutes <= 0) {
        badInput('A duração é em minutos, maior que zero');
      }
      const [row] = await db
        .insert(schema.workout)
        .values({
          date: input.date,
          durationMinutes: input.durationMinutes,
          kind: input.kind.trim(),
          notes: input.notes?.trim() || null,
          organizationId: viewer.organizationId,
        })
        .returning();
      return row!;
    },
    setWeeklyGoal: async (_, { workoutsPerWeek }, context) => {
      const viewer = requireViewer(context);
      if (!Number.isInteger(workoutsPerWeek) || workoutsPerWeek < 1 || workoutsPerWeek > 14) {
        badInput('A Meta Semanal vai de 1 a 14 Treinos');
      }
      await db
        .insert(schema.weeklyGoal)
        .values({ organizationId: viewer.organizationId, workoutsPerWeek })
        .onConflictDoUpdate({
          set: { workoutsPerWeek },
          target: schema.weeklyGoal.organizationId,
        });
      return fitnessWeek(viewer.organizationId);
    },
  },
  Query: {
    fitnessWeek: (_, __, context) => fitnessWeek(requireViewer(context).organizationId),
    workouts: (_, __, context) =>
      db
        .select()
        .from(schema.workout)
        .where(eq(schema.workout.organizationId, requireViewer(context).organizationId))
        .orderBy(desc(schema.workout.date), desc(schema.workout.createdAt))
        .limit(100),
  },
};
