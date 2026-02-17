import { ObjectType, Field, ID } from 'type-graphql';
import { DateTimeScalar } from './scalars';

@ObjectType()
export class BlogAuthor {
  @Field(() => ID)
  id!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field({ nullable: true })
  profileImageUrl?: string;
}

@ObjectType('BlogPost')
export class BlogPostGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;

  @Field()
  slug!: string;

  @Field()
  content!: string;

  @Field({ nullable: true })
  excerpt?: string;

  @Field()
  visibility!: string;

  @Field({ nullable: true })
  featuredImageUrl?: string;

  @Field(() => DateTimeScalar, { nullable: true })
  publishedAt?: Date;

  @Field(() => BlogAuthor)
  author!: BlogAuthor;

  @Field(() => DateTimeScalar)
  createdAt!: Date;

  @Field(() => DateTimeScalar)
  updatedAt!: Date;
}
