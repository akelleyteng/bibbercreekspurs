import { InputType, Field, Int } from 'type-graphql';
import { IsString, IsOptional, IsUrl, IsInt, IsBoolean } from 'class-validator';

@InputType()
export class CreateTestimonialInput {
  @Field()
  @IsString()
  authorName!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  authorRole?: string;

  @Field()
  @IsString()
  content!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Invalid image URL format' })
  imageUrl?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  orderIndex?: number;
}

@InputType()
export class UpdateTestimonialInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  authorName?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  authorRole?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  content?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Invalid image URL format' })
  imageUrl?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  orderIndex?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
