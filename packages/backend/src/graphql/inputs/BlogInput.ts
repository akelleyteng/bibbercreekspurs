import { InputType, Field } from 'type-graphql';
import { IsString, IsOptional, IsUrl, IsEnum, IsDateString } from 'class-validator';

@InputType()
export class CreateBlogPostInput {
  @Field()
  @IsString()
  title!: string;

  @Field()
  @IsString()
  content!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @Field({ defaultValue: 'PUBLIC' })
  @IsEnum(['PUBLIC', 'MEMBER_ONLY'])
  visibility!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Invalid featured image URL format' })
  featuredImageUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}

@InputType()
export class UpdateBlogPostInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  slug?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  content?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['PUBLIC', 'MEMBER_ONLY'])
  visibility?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl({}, { message: 'Invalid featured image URL format' })
  featuredImageUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsDateString()
  publishedAt?: string;
}
