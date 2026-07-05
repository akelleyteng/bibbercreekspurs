import { InputType, Field, Int } from 'type-graphql';
import { IsString, IsOptional, IsInt, IsBoolean, MaxLength, IsUrl } from 'class-validator';

@InputType()
export class CreateImportantLinkInput {
  @Field()
  @IsString()
  @MaxLength(255)
  title!: string;

  @Field()
  @IsString()
  @IsUrl({ require_protocol: true }, { message: 'URL must be a valid link starting with http:// or https://' })
  @MaxLength(1000)
  url!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  orderIndex?: number;
}

@InputType()
export class UpdateImportantLinkInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true }, { message: 'URL must be a valid link starting with http:// or https://' })
  @MaxLength(1000)
  url?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  orderIndex?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
