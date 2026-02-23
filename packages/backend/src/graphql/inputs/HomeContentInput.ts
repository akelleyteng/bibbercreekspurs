import { InputType, Field, Int } from 'type-graphql';
import { IsString, IsOptional, IsInt, IsBoolean, MaxLength } from 'class-validator';
import { JSONScalar } from '../types/scalars';

@InputType()
export class UpsertHomeContentInput {
  @Field()
  @IsString()
  @MaxLength(100)
  sectionType!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  content?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @Field(() => JSONScalar, { nullable: true })
  @IsOptional()
  metadata?: Record<string, string>;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  orderIndex?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
