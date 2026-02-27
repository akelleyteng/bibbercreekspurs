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

  @Field({ nullable: true })
  role?: string;
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

  @Field()
  approvalStatus!: string;

  @Field({ nullable: true })
  rejectionReason?: string;

  @Field(() => DateTimeScalar, { nullable: true })
  reviewedAt?: Date;

  @Field(() => BlogAuthor)
  author!: BlogAuthor;

  @Field(() => DateTimeScalar)
  createdAt!: Date;

  @Field(() => DateTimeScalar)
  updatedAt!: Date;
}

@ObjectType('BlogGuidelines')
export class BlogGuidelinesGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  content!: string;

  @Field(() => DateTimeScalar)
  updatedAt!: Date;
}
