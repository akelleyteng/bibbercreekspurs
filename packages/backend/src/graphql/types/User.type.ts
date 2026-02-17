import { ObjectType, Field, ID, registerEnumType } from 'type-graphql';
import { Role } from '@4hclub/shared';
import { DateTimeScalar } from './scalars';
export { DateTimeScalar } from './scalars';
import { YouthMember } from './YouthMember.type';

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

  @Field(() => [YouthMember], { nullable: true })
  youthMembers?: YouthMember[];

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
