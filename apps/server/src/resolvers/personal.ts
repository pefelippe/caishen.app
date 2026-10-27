import { db, schema } from '@zapbots/database';
import type { Resolvers } from '@zapbots/graphql/server';
import { isTimeZone } from '@zapbots/personal';
import { eq } from 'drizzle-orm';

import { agenda } from '../services/personal/agenda';
import { viewerToday } from '../services/personal/clock';
import { createEvent, deleteEvent, findEvent, updateEvent } from '../services/personal/events';
import {
  addGoalProgress,
  createGoal,
  deleteGoal,
  deleteGoalProgress,
  goalEntries,
  listGoals,
  setGoalArchived,
  updateGoal,
} from '../services/personal/goals';
import {
  createNote,
  deleteNote,
  findNote,
  listNotes,
  updateNote,
} from '../services/personal/notes';
import {
  createTask,
  createTaskList,
  deleteTask,
  deleteTaskList,
  listTaskLists,
  listTasks,
  renameTaskList,
  setTaskDone,
  updateTask,
} from '../services/personal/tasks';
import { badInput, requireViewer } from './guards';

/** A record the Viewer cannot see reads as missing, like a deleted one. */
const orNull = <T>(promise: Promise<T>) => promise.catch(() => null);

/** Pessoal: Tarefas, Notas, Agenda and Metas, all through `services/personal`. */
export const personalResolvers: Resolvers = {
  Goal: {
    entries: goal => goalEntries(goal.id),
    openTasks: (goal, _, context) => listTasks(requireViewer(context), { goalId: goal.id }),
  },
  Mutation: {
    addGoalProgress: (_, { amount, goalId, note }, context) =>
      addGoalProgress(requireViewer(context), goalId, amount, note),
    archiveGoal: (_, { archived, id }, context) =>
      setGoalArchived(requireViewer(context), id, archived),
    createEvent: (_, { input }, context) => createEvent(requireViewer(context), input),
    createGoal: (_, { input }, context) => createGoal(requireViewer(context), input),
    createNote: (_, { input }, context) => createNote(requireViewer(context), input),
    createTask: (_, { input }, context) => createTask(requireViewer(context), input),
    createTaskList: (_, { name }, context) => createTaskList(requireViewer(context), name),
    deleteEvent: (_, { id }, context) => deleteEvent(requireViewer(context), id),
    deleteGoal: (_, { id }, context) => deleteGoal(requireViewer(context), id),
    deleteGoalProgress: (_, { id }, context) => deleteGoalProgress(requireViewer(context), id),
    deleteNote: (_, { id }, context) => deleteNote(requireViewer(context), id),
    deleteTask: (_, { id }, context) => deleteTask(requireViewer(context), id),
    deleteTaskList: (_, { id }, context) => deleteTaskList(requireViewer(context), id),
    renameTaskList: (_, { id, name }, context) => renameTaskList(requireViewer(context), id, name),
    setTaskDone: (_, { done, id }, context) => setTaskDone(requireViewer(context), id, done),
    setTimeZone: async (_, { timezone }, context) => {
      const viewer = requireViewer(context);
      if (!isTimeZone(timezone)) badInput('Fuso horário desconhecido.');
      await db.update(schema.user).set({ timezone }).where(eq(schema.user.id, viewer.userId));
      return timezone;
    },
    updateEvent: (_, { id, input }, context) => updateEvent(requireViewer(context), id, input),
    updateGoal: (_, { id, input }, context) => updateGoal(requireViewer(context), id, input),
    updateNote: (_, { id, input }, context) => updateNote(requireViewer(context), id, input),
    updateTask: (_, { id, input }, context) => updateTask(requireViewer(context), id, input),
  },
  Query: {
    agenda: (_, { from, to }, context) => agenda(requireViewer(context), from, to),
    event: (_, { id }, context) => orNull(findEvent(requireViewer(context), id)),
    goals: (_, { archived }, context) => listGoals(requireViewer(context), archived ?? false),
    note: (_, { id }, context) => orNull(findNote(requireViewer(context), id)),
    notes: (_, { pinned, search }, context) =>
      listNotes(requireViewer(context), { pinned, search }),
    personalToday: (_, __, context) => viewerToday(requireViewer(context)),
    taskLists: (_, __, context) => listTaskLists(requireViewer(context)),
    tasks: (_, { done, listId }, context) =>
      listTasks(requireViewer(context), { done: done ?? false, listId }),
  },
};
