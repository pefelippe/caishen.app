import type { Viewer } from '@zapbots/auth';
import {
  parseWorkoutDrafts,
  workoutInstructions,
  workoutRequest,
  type WorkoutBrief,
  type WorkoutPlanDraft,
} from '@zapbots/fitness';
import { GraphQLError } from 'graphql';

import { badInput } from '../../resolvers/guards';
import { PlanLimitError, requireWithinLimit } from '../billing/billing';
import { ensureBots } from '../bots/catalog';
import { botModel, ModelError, talk } from '../models';
import { text } from '../personal/clock';
import { count } from './shared';

/**
 * Fichas de treino written by the Agente's Model from a brief, for the User or someone they train.
 * Only drafts come back (docs/adr/0009: Bots write nothing): the User reviews and saves them.
 */
export async function generateWorkoutPlans(
  viewer: Viewer,
  brief: WorkoutBrief
): Promise<WorkoutPlanDraft[]> {
  const checked: WorkoutBrief = {
    ...brief,
    daysPerWeek: count(brief.daysPerWeek, 'Os dias por semana', [1, 7])!,
    forName: text(brief.forName, 'Para quem', 120) || null,
    minutes: count(brief.minutes, 'O tempo por treino (min)', [10, 240])!,
    notes: text(brief.notes, 'As observações', 1_000),
  };
  let answer = '';
  try {
    await requireWithinLimit(viewer, 'messages');
    const [bot] = await ensureBots(viewer.organizationId);
    const model = await botModel(viewer.organizationId, bot?.model ?? null);
    if (!model)
      throw new ModelError('Nenhum Modelo disponível. Cole uma chave de IA em Integrações.', 400);
    await talk(viewer.organizationId, model, {
      instructions: workoutInstructions(),
      messages: [{ content: workoutRequest(checked), role: 'user' }],
      onText: piece => {
        answer += piece;
      },
      toolRounds: 0,
    });
  } catch (error) {
    // Their messages are written for people; anything else stays a server error.
    if (error instanceof PlanLimitError)
      throw new GraphQLError(error.message, { extensions: { code: 'PLAN_LIMIT' } });
    if (error instanceof ModelError)
      throw new GraphQLError(error.message, { extensions: { code: 'MODEL_ERROR' } });
    throw error;
  }
  const drafts = parseWorkoutDrafts(answer);
  if (drafts.length === 0)
    badInput(
      'O Modelo não devolveu uma ficha que dê para usar. Tente de novo ou troque de Modelo.'
    );
  return drafts;
}
