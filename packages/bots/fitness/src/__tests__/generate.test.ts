import { describe, expect, it } from 'vitest';

import { parseWorkoutDrafts, workoutRequest } from '../generate';

describe('parseWorkoutDrafts', () => {
  it('reads the JSON among fences and prose, keeping what is usable', () => {
    const answer = `Claro! Aqui está:
\`\`\`json
{"plans":[
  {"name":"Treino A","notes":"Aqueça 5 min","weekdays":[1,4,4,9,"3"],"exercises":[
    {"name":"Supino","sets":"4","reps":"8-12","load":"22.5","restSeconds":90},
    {"name":"","sets":3},
    {"name":"Flexão","sets":99,"reps":12,"load":"pesado"}
  ]},
  {"name":"Sem exercícios","exercises":[]}
]}
\`\`\``;
    expect(parseWorkoutDrafts(answer)).toEqual([
      {
        exercises: [
          { load: '22,5', name: 'Supino', notes: '', reps: '8-12', restSeconds: 90, sets: 4 },
          { load: null, name: 'Flexão', notes: '', reps: '12', restSeconds: null, sets: 20 },
        ],
        name: 'Treino A',
        notes: 'Aqueça 5 min',
        weekdays: [1, 3, 4],
      },
    ]);
  });

  it('takes a lone plan, and gives nothing for an answer without JSON', () => {
    expect(
      parseWorkoutDrafts('{"name":"Corpo todo","exercises":[{"name":"Agachamento"}]}')
    ).toHaveLength(1);
    expect(parseWorkoutDrafts('Desculpe, não posso ajudar.')).toEqual([]);
    expect(parseWorkoutDrafts('{quebrado')).toEqual([]);
  });
});

describe('workoutRequest', () => {
  it('says who it is for and what they asked', () => {
    const text = workoutRequest({
      daysPerWeek: 3,
      equipment: 'HOME',
      forName: 'Bia',
      goal: 'HYPERTROPHY',
      level: 'BEGINNER',
      minutes: 45,
      notes: ' dor no joelho ',
    });
    expect(text).toContain('para Bia');
    expect(text).toContain('Dias por semana: 3.');
    expect(text).toContain('Observações: dor no joelho');
  });
});
