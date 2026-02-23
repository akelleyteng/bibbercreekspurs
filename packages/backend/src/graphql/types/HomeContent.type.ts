import { ObjectType, Field, ID, Int } from 'type-graphql';
import { DateTimeScalar, JSONScalar } from './scalars';

@ObjectType()
export class HomeContent {
  @Field(() => ID)
  id!: string;

  @Field()
  sectionType!: string;

  @Field({ nullable: true })
  title?: string;

  @Field()
  content!: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field(() => JSONScalar, { nullable: true })
  metadata?: Record<string, string>;

  @Field(() => Int, { nullable: true })
  orderIndex?: number;

  @Field()
  isActive!: boolean;

  @Field(() => DateTimeScalar)
  createdAt!: Date;

  @Field(() => DateTimeScalar)
  updatedAt!: Date;
}
