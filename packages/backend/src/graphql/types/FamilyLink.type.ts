import { ObjectType, Field, ID } from 'type-graphql';
import { DateTimeScalar } from './scalars';

@ObjectType()
export class LinkedFamilyMember {
  @Field(() => ID)
  id!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field()
  email!: string;

  @Field()
  role!: string;

  @Field({ nullable: true })
  profilePhotoUrl?: string;
}

@ObjectType()
export class FamilyLink {
  @Field(() => ID)
  id!: string;

  @Field()
  parentUserId!: string;

  @Field()
  childUserId!: string;

  @Field(() => DateTimeScalar)
  createdAt!: Date;
}
