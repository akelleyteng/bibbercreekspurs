import { ObjectType, Field, ID, Int } from 'type-graphql';
import { DateTimeScalar } from './scalars';

@ObjectType()
export class Sponsor {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  logoUrl!: string;

  @Field({ nullable: true })
  websiteUrl?: string;

  @Field({ nullable: true })
  description?: string;

  @Field(() => Int, { nullable: true })
  orderIndex?: number;

  @Field()
  isActive!: boolean;

  @Field(() => DateTimeScalar)
  createdAt!: Date;

  @Field(() => DateTimeScalar)
  updatedAt!: Date;
}
