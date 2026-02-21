import { InputType, Field } from 'type-graphql';
import { IsString, IsOptional, IsEnum, MaxLength, ArrayMaxSize } from 'class-validator';

@InputType()
export class CreatePostInput {
  @Field({ defaultValue: '' })
  @IsString()
  @MaxLength(5000)
  content!: string;

  @Field({ defaultValue: 'MEMBER_ONLY' })
  @IsEnum(['PUBLIC', 'MEMBER_ONLY'])
  visibility!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @ArrayMaxSize(4, { message: 'Maximum 4 media items per post' })
  mediaIds?: string[];
}

@InputType()
export class UpdatePostInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEnum(['PUBLIC', 'MEMBER_ONLY'])
  visibility?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @ArrayMaxSize(4, { message: 'Maximum 4 media items per post' })
  mediaIds?: string[];
}
