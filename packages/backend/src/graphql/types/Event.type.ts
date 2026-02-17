import { ObjectType, Field, ID, Int } from 'type-graphql';
import { DateTimeScalar } from './scalars';

@ObjectType()
export class EventCreator {
  @Field(() => ID)
  id!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field({ nullable: true })
  profileImageUrl?: string;
}

@ObjectType('Event')
export class EventGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  title!: string;

  @Field()
  description!: string;

  @Field(() => DateTimeScalar)
  startTime!: Date;

  @Field(() => DateTimeScalar)
  endTime!: Date;

  @Field({ nullable: true })
  location?: string;

  @Field()
  visibility!: string;

  @Field()
  eventType!: string;

  @Field({ nullable: true })
  externalRegistrationUrl?: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field({ nullable: true })
  seriesId?: string;

  @Field(() => Int)
  registrationCount!: number;

  @Field(() => EventCreator)
  creator!: EventCreator;

  @Field({ nullable: true })
  userRegistrationStatus?: string;

  @Field(() => DateTimeScalar)
  createdAt!: Date;

  @Field(() => DateTimeScalar)
  updatedAt!: Date;
}
