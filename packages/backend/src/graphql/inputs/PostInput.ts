import { InputType, Field } from 'type-graphql';
import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';

@InputType()
export class CreatePostInput {
  @Field()
  @IsString()
  @MaxLength(5000)
  content!: string;

  @Field({ defaultValue: 'MEMBER_ONLY' })
  @IsEnum(['PUBLIC', 'MEMBER_ONLY'])
  visibility!: string;
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
}
