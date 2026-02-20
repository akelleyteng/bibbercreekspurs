import { ObjectType, Field, ID, Int } from 'type-graphql';

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
}
