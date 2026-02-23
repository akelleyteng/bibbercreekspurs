import { GraphQLScalarType, Kind, ObjectValueNode } from 'graphql';

// Custom JSON scalar for arbitrary key-value objects (e.g. metadata fields)
function parseLiteralObject(ast: ObjectValueNode): Record<string, any> {
  const obj: Record<string, any> = {};
  for (const field of ast.fields) {
    if (field.value.kind === Kind.STRING) obj[field.name.value] = field.value.value;
    else if (field.value.kind === Kind.INT) obj[field.name.value] = parseInt(field.value.value, 10);
    else if (field.value.kind === Kind.FLOAT) obj[field.name.value] = parseFloat(field.value.value);
    else if (field.value.kind === Kind.BOOLEAN) obj[field.name.value] = field.value.value;
    else if (field.value.kind === Kind.NULL) obj[field.name.value] = null;
    else if (field.value.kind === Kind.OBJECT) obj[field.name.value] = parseLiteralObject(field.value);
  }
  return obj;
}

export const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON object scalar type',
  serialize(value: unknown) {
    return value;
  },
  parseValue(value: unknown) {
    return value;
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.OBJECT) return parseLiteralObject(ast);
    if (ast.kind === Kind.STRING) {
      try { return JSON.parse(ast.value); } catch { return null; }
    }
    return null;
  },
});

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
