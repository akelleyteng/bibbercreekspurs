import { ObjectType, Field, ID, Int, registerEnumType } from 'type-graphql';
import { Role } from '@4hclub/shared';
import { LinkedFamilyMember } from './FamilyLink.type';
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

  @Field({ nullable: true })
  horseName?: string;

  @Field({ nullable: true })
  project?: string;

  @Field(() => DateTimeScalar, { nullable: true })
  birthday?: Date;

  @Field({ nullable: true })
  tshirtSize?: string;

  @Field()
  approvalStatus!: string;

  @Field(() => [YouthMember], { nullable: true })
  youthMembers?: YouthMember[];

  @Field(() => [LinkedFamilyMember], { nullable: true })
  linkedChildren?: LinkedFamilyMember[];

  @Field(() => [LinkedFamilyMember], { nullable: true })
  linkedParents?: LinkedFamilyMember[];

  @Field(() => DateTimeScalar, { nullable: true })
  lastLogin?: Date;

  @Field({ nullable: true })
  lastLoginDevice?: string;

  @Field(() => Int, { defaultValue: 0 })
  postCount!: number;

  @Field(() => Int, { defaultValue: 0 })
  commentCount!: number;

  @Field(() => Int, { defaultValue: 0 })
  blogPostCount!: number;

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

@ObjectType()
export class RegisterPayload {
  @Field()
  success!: boolean;

  @Field()
  message!: string;
}
