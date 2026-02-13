import { ObjectType, Field, ID, registerEnumType } from 'type-graphql';
import { Role } from '@4hclub/shared';

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

  @Field()
  createdAt!: Date;

  @Field()
  updatedAt!: Date;
}

@ObjectType()
export class AuthPayload {
  @Field(() => User)
  user!: User;

  @Field()
  accessToken!: string;
}

@ObjectType()
export class RefreshTokenPayload {
  @Field()
  accessToken!: string;
}
