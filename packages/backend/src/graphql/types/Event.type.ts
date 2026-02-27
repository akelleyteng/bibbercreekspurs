import { ObjectType, Field, ID, Int } from 'type-graphql';

@ObjectType('EventPresenter')
export class EventPresenterGQL {
  @Field(() => ID, { nullable: true })
  userId?: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field()
  title!: string;

  @Field({ nullable: true })
  profilePhotoUrl?: string;
}

@ObjectType('Event')
export class EventGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;

  @Field()
  description!: string;

  @Field()
  startTime!: string;

  @Field()
  endTime!: string;

  @Field({ nullable: true })
  location?: string;

  @Field()
  visibility!: string;

  @Field({ nullable: true })
  externalRegistrationUrl?: string;

  @Field()
  isAllDay!: boolean;

  @Field(() => Int)
  registrationCount!: number;

  @Field({ nullable: true })
  userRsvpStatus?: string;

  @Field({ nullable: true })
  agendaUrl?: string;

  @Field({ nullable: true })
  meetingId?: string;

  @Field(() => [EventPresenterGQL], { nullable: true })
  presenters?: EventPresenterGQL[];
}
