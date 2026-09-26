import { readFileSync } from 'node:fs';

export type { Context } from './context';
export * from './generated/resolvers';

export const typeDefs = readFileSync(new URL('./schema/schema.graphql', import.meta.url), 'utf8');
