import type { Viewer } from '@mny/auth';
import { db, schema } from '@mny/database';
import { today } from '@mny/finance';

import { textToNoteContent } from '../noteContent';
import type { ToolDefinition } from '../models';
import type { BuddyArea } from './defaults';

/** A Buddy Action as stored on the Message and shown to the User. */
export interface BuddyAction {
  kind: 'NOTE' | 'TASK' | 'WORKOUT';
  label: string;
  targetId: string | null;
}

type ToolName = 'criar_anotacao' | 'criar_tarefa' | 'registrar_treino';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Actions are only the simple, reversible ones (docs/adr/0008). There is deliberately no tool that
 * touches Obligations, Statements, Income Sources or any amount.
 */
const DEFINITIONS: Record<ToolName, ToolDefinition> = {
  criar_anotacao: {
    function: {
      description: 'Cria uma Anotação nova com título e texto simples.',
      name: 'criar_anotacao',
      parameters: {
        properties: {
          texto: { description: 'Texto da Anotação, uma linha por parágrafo.', type: 'string' },
          titulo: { type: 'string' },
        },
        required: ['titulo', 'texto'],
        type: 'object',
      },
    },
    type: 'function',
  },
  criar_tarefa: {
    function: {
      description: 'Cria uma Tarefa em Trabalho, com prazo opcional.',
      name: 'criar_tarefa',
      parameters: {
        properties: {
          prazo: {
            description: 'Data no formato AAAA-MM-DD. Omita se não houver.',
            type: 'string',
          },
          titulo: { type: 'string' },
        },
        required: ['titulo'],
        type: 'object',
      },
    },
    type: 'function',
  },
  registrar_treino: {
    function: {
      description: 'Registra um Treino que a pessoa fez.',
      name: 'registrar_treino',
      parameters: {
        properties: {
          data: { description: 'Data no formato AAAA-MM-DD. Omita para hoje.', type: 'string' },
          minutos: { description: 'Duração em minutos.', type: 'integer' },
          tipo: { description: 'Ex.: corrida, musculação, natação.', type: 'string' },
        },
        required: ['tipo', 'minutos'],
        type: 'object',
      },
    },
    type: 'function',
  },
};

const BY_AREA: Record<BuddyArea, ToolName[]> = {
  FINANCE: ['criar_anotacao'],
  FITNESS: ['registrar_treino'],
  GENERAL: ['criar_tarefa', 'registrar_treino', 'criar_anotacao'],
  NOTES: ['criar_anotacao'],
  WORK: ['criar_tarefa', 'criar_anotacao'],
};

export const toolsFor = (area: BuddyArea): ToolDefinition[] =>
  BY_AREA[area].map(name => DEFINITIONS[name]);

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/**
 * Runs one tool call for a Buddy of `area`. Returns what to tell the Model and, when something
 * was created, the Action to record. Bad arguments are reported back instead of thrown, so the
 * Model can correct itself.
 */
export async function runTool(
  viewer: Viewer,
  area: BuddyArea,
  name: string,
  rawArguments: string
): Promise<{ action: BuddyAction | null; result: string }> {
  if (!BY_AREA[area].includes(name as ToolName)) {
    return { action: null, result: `Ferramenta indisponível: ${name}` };
  }
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(rawArguments || '{}') as Record<string, unknown>;
  } catch {
    return { action: null, result: 'Argumentos inválidos: não é JSON.' };
  }

  switch (name as ToolName) {
    case 'criar_tarefa': {
      const title = text(args.titulo);
      const dueOn = text(args.prazo) || null;
      if (!title) return { action: null, result: 'Faltou o título da Tarefa.' };
      if (dueOn && !ISO_DATE.test(dueOn)) {
        return { action: null, result: 'O prazo precisa estar no formato AAAA-MM-DD.' };
      }
      const [row] = await db
        .insert(schema.task)
        .values({ dueOn, organizationId: viewer.organizationId, title })
        .returning();
      return {
        action: { kind: 'TASK', label: `Tarefa criada: ${title}`, targetId: row!.id },
        result: `Tarefa criada com id ${row!.id}.`,
      };
    }
    case 'registrar_treino': {
      const kind = text(args.tipo);
      const minutes = Number(args.minutos);
      const date = text(args.data) || today();
      if (!kind) return { action: null, result: 'Faltou o tipo do Treino.' };
      if (!Number.isInteger(minutes) || minutes <= 0) {
        return { action: null, result: 'A duração precisa ser um número inteiro de minutos.' };
      }
      if (!ISO_DATE.test(date)) {
        return { action: null, result: 'A data precisa estar no formato AAAA-MM-DD.' };
      }
      const [row] = await db
        .insert(schema.workout)
        .values({ date, durationMinutes: minutes, kind, organizationId: viewer.organizationId })
        .returning();
      return {
        action: {
          kind: 'WORKOUT',
          label: `Treino registrado: ${kind}, ${minutes} min`,
          targetId: row!.id,
        },
        result: `Treino registrado com id ${row!.id}.`,
      };
    }
    case 'criar_anotacao': {
      const title = text(args.titulo);
      if (!title) return { action: null, result: 'Faltou o título da Anotação.' };
      const [row] = await db
        .insert(schema.note)
        .values({
          content: textToNoteContent(text(args.texto)),
          createdById: viewer.userId,
          organizationId: viewer.organizationId,
          title,
        })
        .returning({ id: schema.note.id });
      return {
        action: { kind: 'NOTE', label: `Anotação criada: ${title}`, targetId: row!.id },
        result: `Anotação criada com id ${row!.id}.`,
      };
    }
  }
}
