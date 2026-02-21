import { InputType, Field, Int } from 'type-graphql';
import { IsString, IsInt, Min, IsIn } from 'class-validator';

@InputType()
export class RsvpInput {
  @Field()
  @IsString()
  eventId!: string;

  @Field()
  @IsString()
  @IsIn(['ATTENDING', 'NOT_ATTENDING', 'MAYBE', 'ATTENDING_PLUS'])
  status!: string;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  guestCount!: number;
}
