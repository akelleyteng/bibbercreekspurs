import { InputType, Field } from 'type-graphql';
import { IsString, IsOptional, IsUrl, IsEnum, IsDateString } from 'class-validator';

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
}
