import { ObjectType, Field, ID, Int } from 'type-graphql';
import { DateTimeScalar } from './scalars';

@ObjectType()
export class NotificationActorGQL {
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
export class GroupedNotificationGQL {
  @Field()
  type!: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  body?: string;

  @Field({ nullable: true })
  relatedPostId?: string;

  @Field({ nullable: true })
  relatedEventId?: string;

  @Field({ nullable: true })
  relatedUserId?: string;

  @Field(() => Int)
  count!: number;

  @Field(() => [String])
  actorNames!: string[];

  @Field(() => DateTimeScalar)
  latestAt!: Date;

  @Field(() => [String])
  notificationIds!: string[];

  @Field()
  isRead!: boolean;
}

@ObjectType()
export class NotificationCountGQL {
  @Field(() => Int)
  unreadCount!: number;
}
