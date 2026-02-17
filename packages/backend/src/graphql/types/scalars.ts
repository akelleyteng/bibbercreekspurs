import { GraphQLScalarType, Kind } from 'graphql';

// Custom DateTime scalar that serializes Date objects to ISO strings
export const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'DateTime custom scalar type (ISO 8601)',
  serialize(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    return String(value);
  },
  parseValue(value: unknown): Date {
    return new Date(value as string);
  },
  parseLiteral(ast): Date | null {
    if (ast.kind === Kind.STRING) return new Date(ast.value);
    return null;
  },
});
