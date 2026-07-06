import { InputType, Field, Int } from 'type-graphql';
import { IsString, IsOptional, IsInt, IsBoolean, IsIn, MaxLength, Min } from 'class-validator';

const DECORATION_TYPES = ['front_logo', 'back_name', 'leg_logo', 'leg_name'];

@InputType()
export class CatalogColorInput {
  @Field()
  @IsString()
  @MaxLength(60)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(9)
  hex?: string;
}

@InputType()
export class CatalogDecorationInput {
  @Field()
  @IsString()
  @IsIn(DECORATION_TYPES)
  decorationType!: string;

  @Field()
  @IsString()
  @MaxLength(255)
  label!: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsString({ each: true })
  placementOptions?: string[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  requiresText?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

@InputType()
export class CreateCatalogProductInput {
  @Field()
  @IsString()
  @MaxLength(50)
  itemType!: string;

  @Field()
  @IsString()
  @MaxLength(255)
  name!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  brandStyle?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  blankCostCents?: number;

  @Field(() => [CatalogColorInput], { nullable: true })
  @IsOptional()
  colors?: CatalogColorInput[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsString({ each: true })
  sizes?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  creditEligible?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @Field(() => [CatalogDecorationInput], { nullable: true })
  @IsOptional()
  decorations?: CatalogDecorationInput[];
}

@InputType()
export class UpdateCatalogProductInput {
  @Field()
  @IsString()
  id!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  itemType?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  brandStyle?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  blankCostCents?: number;

  @Field(() => [CatalogColorInput], { nullable: true })
  @IsOptional()
  colors?: CatalogColorInput[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsString({ each: true })
  sizes?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  creditEligible?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  // Omit to leave decorations unchanged; pass [] to clear them.
  @Field(() => [CatalogDecorationInput], { nullable: true })
  @IsOptional()
  decorations?: CatalogDecorationInput[];
}
