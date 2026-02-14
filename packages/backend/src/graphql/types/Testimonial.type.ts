import { ObjectType, Field, ID, Int } from 'type-graphql';
import { DateTimeScalar } from './User.type';

@ObjectType()
export class Testimonial {
  @Field(() => ID)
  id!: string;

  @Field()
  authorName!: string;

  @Field({ nullable: true })
  authorRole?: string;

  @Field()
  content!: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field(() => Int, { nullable: true })
  orderIndex?: number;

  @Field()
  isActive!: boolean;

  @Field(() => DateTimeScalar)
  createdAt!: Date;

  @Field(() => DateTimeScalar)
  updatedAt!: Date;
}
