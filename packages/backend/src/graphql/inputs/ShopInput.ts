import { InputType, Field, Int } from 'type-graphql';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

@InputType()
export class UpdateShopProductCurationInput {
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  retailPriceCents?: number;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  creditEligible?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
