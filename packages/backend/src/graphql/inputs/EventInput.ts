import { InputType, Field } from 'type-graphql';
import { IsString, IsOptional, IsUrl, IsEnum, IsDateString, IsBoolean, IsArray, IsInt, Min } from 'class-validator';

@InputType()
export class CreateEventInput {
  @Field()
  @IsString()
  title!: string;

  @Field()
  @IsString()
  description!: string;

  @Field()
  @IsDateString()
  startTime!: string;

  @Field()
  @IsDateString()
  endTime!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  location?: string;

  @Field()
  @IsEnum(['PUBLIC', 'MEMBER_ONLY'])
  visibility!: string;

  @Field({ defaultValue: 'internal' })
  @IsEnum(['internal', 'external'])
  eventType!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Invalid external registration URL format' })
  externalRegistrationUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Invalid image URL format' })
  imageUrl?: string;

  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  recurringFrequency?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  recurringEndDate?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  recurringDaysOfWeek?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['day_of_month', 'nth_weekday'])
  monthlyPattern?: string;

  @Field({ nullable: true, defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  recurringInterval?: number;

  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  publishToGoogleCalendar?: boolean;

  @Field(() => [Number], { nullable: true })
  @IsOptional()
  @IsArray()
  reminderMinutesBefore?: number[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  reminderMethods?: string[];
}

@InputType()
export class UpdateEventInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  startTime?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  location?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['PUBLIC', 'MEMBER_ONLY'])
  visibility?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['internal', 'external'])
  eventType?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Invalid external registration URL format' })
  externalRegistrationUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Invalid image URL format' })
  imageUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  recurringFrequency?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  recurringEndDate?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  recurringDaysOfWeek?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['day_of_month', 'nth_weekday'])
  monthlyPattern?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  recurringInterval?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  publishToGoogleCalendar?: boolean;

  @Field(() => [Number], { nullable: true })
  @IsOptional()
  @IsArray()
  reminderMinutesBefore?: number[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  reminderMethods?: string[];
}
