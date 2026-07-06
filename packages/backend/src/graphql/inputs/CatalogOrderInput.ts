import { InputType, Field, Int } from 'type-graphql';
import { IsString, IsOptional, IsInt, Min, Max, MaxLength, ArrayMinSize } from 'class-validator';

@InputType()
export class CatalogOrderDecorationInput {
  @Field()
  @IsString()
  @MaxLength(255)
  label!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  text?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  placement?: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  priceCents!: number;
}

@InputType()
export class CatalogOrderItemInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  productId?: string;

  @Field()
  @IsString()
  @MaxLength(255)
  productName!: string;

  @Field()
  @IsString()
  @MaxLength(50)
  itemType!: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  color?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  size?: string;

  @Field(() => [CatalogOrderDecorationInput], { nullable: true })
  @IsOptional()
  decorations?: CatalogOrderDecorationInput[];

  @Field(() => Int)
  @IsInt()
  @Min(0)
  unitPriceCents!: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(20)
  quantity!: number;
}

@InputType()
export class CreateCatalogOrderInput {
  @Field(() => [CatalogOrderItemInput])
  @ArrayMinSize(1)
  items!: CatalogOrderItemInput[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
