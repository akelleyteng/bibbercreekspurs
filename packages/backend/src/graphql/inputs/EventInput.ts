import { InputType, Field } from 'type-graphql';
import { IsBoolean, IsString } from 'class-validator';

@InputType()
export class RsvpInput {
  @Field()
  @IsString()
  eventId!: string;

  @Field({ defaultValue: false })
  @IsBoolean()
  addToCalendar!: boolean;
}
