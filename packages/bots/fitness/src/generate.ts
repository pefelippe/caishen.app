/**
 * Fichas de treino written by a Model from a brief: what the person wants, how often and with
 * what. The Model answers JSON only; nothing is saved until the User reviews the drafts.
 */

export type WorkoutGoal = 'CONDITIONING' | 'FAT_LOSS' | 'HEALTH' | 'HYPERTROPHY' | 'STRENGTH';
export type WorkoutLevel = 'ADVANCED' | 'BEGINNER' | 'INTERMEDIATE';
export type WorkoutEquipment = 'BODYWEIGHT' | 'GYM' | 'HOME';

export interface WorkoutBrief {
  daysPerWeek: number;
  equipment: WorkoutEquipment;
  /** Who the Fichas are for; null for the User. */
  forName?: null | string;
  goal: WorkoutGoal;
  level: WorkoutLevel;
  /** Minutes a workout may take. */
  minutes: number;
  /** Injuries, preferences, what to avoid… as typed. */
  notes?: null | string;
}

export interface WorkoutExerciseDraft {
  /** Kilograms as text ("22,5"), or null for the body's own weight or when it is up to the person. */
  load: null | string;
  name: string;
  notes: string;
  reps: string;
  restSeconds: null | number;
  sets: number;
}

export interface WorkoutPlanDraft {
  exercises: WorkoutExerciseDraft[];
  name: string;
  notes: string;
  weekdays: number[];
}

const GOALS: Record<WorkoutGoal, string> = {
  CONDITIONING: 'condicionamento e resistência',
  FAT_LOSS: 'emagrecimento',
  HEALTH: 'saúde e qualidade de vida',
  HYPERTROPHY: 'hipertrofia (ganho de massa muscular)',
  STRENGTH: 'força',
};
const LEVELS: Record<WorkoutLevel, string> = {
  ADVANCED: 'avançado',
  BEGINNER: 'iniciante',
  INTERMEDIATE: 'intermediário',
};
const EQUIPMENT: Record<WorkoutEquipment, string> = {
  BODYWEIGHT: 'só o peso do corpo, sem equipamento',
  GYM: 'academia completa',
  HOME: 'em casa, com halteres e elásticos',
};

/** The instructions the Model writes Fichas under. */
export function workoutInstructions(): string {
  return [
    'Você é um profissional de educação física que monta fichas de treino em português do Brasil.',
    'Responda SOMENTE com um objeto JSON, sem texto antes ou depois e sem ```.',
    'Formato: {"plans":[{"name":"Treino A: peito e tríceps","notes":"aquecimento, cuidados","weekdays":[1,4],"exercises":[{"name":"Supino reto com barra","sets":4,"reps":"8-12","load":null,"restSeconds":90,"notes":""}]}]}',
    'Regras:',
    '- Uma ficha por divisão (A, B, C…), com os dias da semana distribuídos sem dias seguidos para o mesmo grupo quando possível; weekdays vai de 0 (domingo) a 6 (sábado).',
    '- O total de dias de todas as fichas é exatamente o número de dias pedido.',
    '- 4 a 9 exercícios por ficha, que caibam no tempo pedido contando o descanso.',
    '- reps é texto: "10", "8-12", "30 s" ou "até a falha". sets de 1 a 10. restSeconds de 0 a 300.',
    '- load fica null: a carga é ajustada por quem treina. Use notes do exercício para técnica ou carga sugerida (ex.: "carga que permita 12 repetições").',
    '- Respeite o nível, o equipamento e as observações (lesões, preferências). Na dúvida, escolha o exercício mais seguro.',
    '- notes da ficha: aquecimento e cuidados em uma ou duas frases.',
  ].join('\n');
}

/** What the person asked for, as the Model reads it. */
export function workoutRequest(brief: WorkoutBrief): string {
  return [
    `Monte as fichas de treino${brief.forName ? ` para ${brief.forName}` : ''}.`,
    `Objetivo: ${GOALS[brief.goal]}.`,
    `Nível: ${LEVELS[brief.level]}.`,
    `Dias por semana: ${brief.daysPerWeek}.`,
    `Tempo por treino: ${brief.minutes} minutos.`,
    `Equipamento: ${EQUIPMENT[brief.equipment]}.`,
    brief.notes?.trim() ? `Observações: ${brief.notes.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const textOf = (value: unknown, max: number) =>
  typeof value === 'string'
    ? value.trim().slice(0, max)
    : typeof value === 'number'
      ? String(value)
      : '';

const wholeIn = (value: unknown, min: number, max: number): null | number => {
  const number = typeof value === 'string' ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isFinite(number)) return null;
  return Math.min(max, Math.max(min, Math.round(number)));
};

function exerciseOf(value: unknown): null | WorkoutExerciseDraft {
  if (!isRecord(value)) return null;
  const name = textOf(value.name, 120);
  if (!name) return null;
  const load = textOf(value.load, 10).replace('.', ',');
  return {
    load: /^\d{1,4}(,\d{1,3})?$/.test(load) ? load : null,
    name,
    notes: textOf(value.notes, 300),
    reps: textOf(value.reps, 40),
    restSeconds: wholeIn(value.restSeconds, 0, 600),
    sets: wholeIn(value.sets, 1, 20) ?? 3,
  };
}

function planOf(value: unknown): null | WorkoutPlanDraft {
  if (!isRecord(value)) return null;
  const exercises = (Array.isArray(value.exercises) ? value.exercises : [])
    .map(exerciseOf)
    .filter((exercise): exercise is WorkoutExerciseDraft => exercise !== null)
    .slice(0, 40);
  const name = textOf(value.name, 120);
  if (!name || exercises.length === 0) return null;
  const weekdays = [
    ...new Set(
      (Array.isArray(value.weekdays) ? value.weekdays : [])
        .map(day => wholeIn(day, -1, 7))
        .filter((day): day is number => day !== null && day >= 0 && day <= 6)
    ),
  ].sort((a, b) => a - b);
  return { exercises, name, notes: textOf(value.notes, 1_000), weekdays };
}

/**
 * The Fichas in a Model's answer: the JSON object in it (fences and prose around it are ignored),
 * keeping what is usable and dropping the rest. Empty when nothing is.
 */
export function parseWorkoutDrafts(answer: string): WorkoutPlanDraft[] {
  const start = answer.indexOf('{');
  const end = answer.lastIndexOf('}');
  if (start < 0 || end <= start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(answer.slice(start, end + 1));
  } catch {
    return [];
  }
  const plans = isRecord(parsed) && Array.isArray(parsed.plans) ? parsed.plans : [parsed];
  return plans
    .map(planOf)
    .filter((plan): plan is WorkoutPlanDraft => plan !== null)
    .slice(0, 7);
}
