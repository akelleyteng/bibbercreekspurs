import { InputType, Field, Int } from 'type-graphql';
import { IsString, IsInt, Min, MaxLength, IsOptional, IsIn } from 'class-validator';

@InputType()
export class EnablePresentationsInput {
  @Field()
  @IsString()
  googleEventId!: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  totalSlots!: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}

@InputType()
export class UpdatePresentationMeetingInput {
  @Field()
  @IsString()
  id!: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalSlots?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  notes?: string;
}

@InputType()
export class ReservePresentationInput {
  @Field()
  @IsString()
  meetingId!: string;

  @Field()
  @IsString()
  @MaxLength(200)
  title!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  userId?: string;
}

@InputType()
export class UpdateReservationInput {
  @Field()
  @IsString()
  id!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}

@InputType()
export class AddPresentationFileInput {
  @Field()
  @IsString()
  reservationId!: string;

  @Field()
  @IsString()
  driveFileId!: string;

  @Field()
  @IsString()
  driveFileName!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  driveFileUrl?: string;

  @Field()
  @IsString()
  @IsIn(['presentation', 'image', 'recording'])
  fileType!: string;
}

@InputType()
export class MovePresentationInput {
  @Field()
  @IsString()
  reservationId!: string;

  @Field()
  @IsString()
  newMeetingId!: string;
}
