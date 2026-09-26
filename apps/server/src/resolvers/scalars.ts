import { GraphQLError, GraphQLScalarType, Kind } from 'graphql';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(value: unknown): string {
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    throw new GraphQLError(`Data inválida: ${String(value)} (use YYYY-MM-DD)`);
  }
  return value;
}

function parseCents(value: unknown): number {
  const cents = typeof value === 'string' ? Number(value) : value;
  if (typeof cents !== 'number' || !Number.isSafeInteger(cents)) {
    throw new GraphQLError(`Valor em centavos inválido: ${String(value)}`);
  }
  return cents;
}

export const scalars = {
  Cents: new GraphQLScalarType({
    name: 'Cents',
    parseLiteral: ast =>
      parseCents(ast.kind === Kind.INT || ast.kind === Kind.STRING ? ast.value : undefined),
    parseValue: parseCents,
    serialize: value => parseCents(value),
  }),
  Date: new GraphQLScalarType({
    name: 'Date',
    parseLiteral: ast => parseDate(ast.kind === Kind.STRING ? ast.value : undefined),
    parseValue: parseDate,
    serialize: value => parseDate(value),
  }),
  DateTime: new GraphQLScalarType({
    name: 'DateTime',
    parseValue: value => new Date(String(value)),
    serialize: value => (value instanceof Date ? value.toISOString() : String(value)),
  }),
};
