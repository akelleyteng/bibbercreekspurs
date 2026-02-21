import { ObjectType, Field, ID } from 'type-graphql';
import { DateTimeScalar } from './scalars';

@ObjectType()
export class PostAuthor {
  @Field(() => ID)
  id!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field({ nullable: true })
  profilePhotoUrl?: string;
}

@ObjectType()
export class ReactionSummaryGQL {
  @Field()
  reactionType!: string;

  @Field()
  count!: number;
}

@ObjectType()
export class CommentGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  postId!: string;

  @Field(() => PostAuthor)
  author!: PostAuthor;

  @Field()
  content!: string;

  @Field(() => DateTimeScalar)
  createdAt!: Date;
}

@ObjectType()
export class PostMediaGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  mediaType!: string;

  @Field()
  publicUrl!: string;

  @Field()
  originalFilename!: string;

  @Field()
  mimeType!: string;

  @Field()
  fileSize!: number;

  @Field()
  sortOrder!: number;
}

@ObjectType('SocialPost')
export class PostGQL {
  @Field(() => ID)
  id!: string;

  @Field(() => PostAuthor)
  author!: PostAuthor;

  @Field()
  content!: string;

  @Field()
  visibility!: string;

  @Field()
  isHidden!: boolean;

  @Field(() => DateTimeScalar, { nullable: true })
  hiddenAt?: Date;

  @Field(() => [PostMediaGQL])
  media!: PostMediaGQL[];

  @Field(() => [CommentGQL])
  comments!: CommentGQL[];

  @Field(() => [ReactionSummaryGQL])
  reactions!: ReactionSummaryGQL[];

  @Field({ nullable: true })
  userReaction?: string;

  @Field()
  canEdit!: boolean;

  @Field(() => DateTimeScalar)
  createdAt!: Date;

  @Field(() => DateTimeScalar)
  updatedAt!: Date;
}
