import { ObjectType, Field, ID, registerEnumType } from 'type-graphql';
import { GraphQLScalarType, Kind } from 'graphql';
import { Role } from '@4hclub/shared';

// Custom DateTime scalar that serializes Date objects to ISO strings
const DateTimeScalar = new GraphQLScalarType({
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

// Register the Role enum with TypeGraphQL
registerEnumType(Role, {
  name: 'Role',
  description: 'User role in the system',
});

@ObjectType()
export class User {
  @Field(() => ID)
  id!: string;

  @Field()
  email!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field(() => Role)
  role!: Role;

  @Field({ nullable: true })
  phone?: string;

  @Field({ nullable: true })
  address?: string;

  @Field({ nullable: true })
  emergencyContact?: string;

  @Field({ nullable: true })
  emergencyPhone?: string;

  @Field({ nullable: true })
  profilePhotoUrl?: string;

  @Field()
  passwordResetRequired!: boolean;

  @Field(() => DateTimeScalar)
  createdAt!: Date;

  @Field(() => DateTimeScalar)
  updatedAt!: Date;
}

@ObjectType()
export class AuthPayload {
  @Field(() => User)
  user!: User;

  @Field()
  accessToken!: string;

  @Field({ nullable: true })
  refreshToken?: string;
}

@ObjectType()
export class RefreshTokenPayload {
  @Field()
  accessToken!: string;

  @Field(() => User)
  user!: User;
}
