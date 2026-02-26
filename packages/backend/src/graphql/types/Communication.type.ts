import { ObjectType, Field, ID, Int } from 'type-graphql';
import { DateTimeScalar } from './scalars';

@ObjectType()
export class CommunicationSender {
  @Field(() => ID)
  id!: string;

  @Field()
  firstName!: string;

  @Field()
  lastName!: string;

  @Field()
  email!: string;
}

@ObjectType()
export class CommunicationAttachment {
  @Field()
  type!: string;

  @Field()
  filename!: string;

  @Field({ nullable: true })
  url?: string;

  @Field({ nullable: true })
  mimeType?: string;

  @Field(() => Int, { nullable: true })
  fileSize?: number;
}

@ObjectType()
export class Communication {
  @Field(() => ID)
  id!: string;

  @Field()
  subject!: string;

  @Field()
  body!: string;

  @Field()
  emailType!: string;

  @Field()
  recipientGroup!: string;

  @Field(() => Int)
  recipientCount!: number;

  @Field(() => [String])
  recipientEmails!: string[];

  @Field()
  status!: string;

  @Field(() => [CommunicationAttachment])
  attachments!: CommunicationAttachment[];

  @Field({ nullable: true })
  errorMessage?: string;

  @Field(() => CommunicationSender)
  sender!: CommunicationSender;

  @Field(() => DateTimeScalar, { nullable: true })
  sentAt?: Date;

  @Field(() => DateTimeScalar)
  createdAt!: Date;
}

@ObjectType()
export class CommunicationListResult {
  @Field(() => [Communication])
  items!: Communication[];

  @Field(() => Int)
  total!: number;
}
