import { ObjectType, Field, ID, Int } from 'type-graphql';
import { DateTimeScalar } from './scalars';

@ObjectType()
export class ImportantLink {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;

  @Field()
  url!: string;

  @Field({ nullable: true })
  category?: string;

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
