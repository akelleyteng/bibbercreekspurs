import { InputType, Field, Int } from 'type-graphql';
import { IsString, IsOptional, IsInt, IsBoolean, MaxLength } from 'class-validator';

@InputType()
export class CreateSponsorInput {
  @Field()
  @IsString()
  @MaxLength(255)
  name!: string;

  @Field()
  @IsString()
  logoUrl!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  websiteUrl?: string;

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
export class UpdateSponsorInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  websiteUrl?: string;

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
