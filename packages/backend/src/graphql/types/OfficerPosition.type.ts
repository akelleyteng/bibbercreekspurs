import { ObjectType, Field, ID, Int } from 'type-graphql';
import { DateTimeScalar } from './scalars';

@ObjectType()
export class OfficerRoleType {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  label!: string;

  @Field()
  description!: string;

  @Field(() => Int)
  sortOrder!: number;
}

@ObjectType()
export class OfficerPositionHolder {
  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  profilePhotoUrl?: string;

  @Field()
  holderType!: string; // 'user' or 'youth'
}

@ObjectType()
export class OfficerPositionType {
  @Field(() => ID)
  id!: string;

  @Field()
  position!: string;

  @Field()
  termYear!: string;

  @Field({ nullable: true })
  holderUserId?: string;

  @Field({ nullable: true })
  holderYouthMemberId?: string;

  @Field(() => OfficerPositionHolder, { nullable: true })
  holder?: OfficerPositionHolder;

  @Field()
  label!: string;

  @Field()
  description!: string;

  @Field(() => DateTimeScalar)
  createdAt!: Date;

  @Field(() => DateTimeScalar)
  updatedAt!: Date;
}
