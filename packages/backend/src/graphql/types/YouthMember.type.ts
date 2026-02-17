import { ObjectType, Field, ID } from 'type-graphql';
import { DateTimeScalar } from './scalars';

@ObjectType()
export class YouthMember {
  @Field(() => ID)
  id!: string;

  @Field()
  parentUserId!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field(() => DateTimeScalar, { nullable: true })
  birthdate?: Date;

  @Field({ nullable: true })
  project?: string;

  @Field({ nullable: true })
  horseNames?: string;

  @Field(() => DateTimeScalar)
  createdAt!: Date;

  @Field(() => DateTimeScalar)
  updatedAt!: Date;
}
