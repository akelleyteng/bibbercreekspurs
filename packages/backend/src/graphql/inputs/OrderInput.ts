import { InputType, Field, Int } from 'type-graphql';
import { Min, Max } from 'class-validator';

@InputType()
export class ShippingAddressInput {
  @Field()
  name!: string;

  @Field()
  address1!: string;

  @Field({ nullable: true })
  address2?: string;

  @Field()
  city!: string;

  @Field()
  state!: string;

  @Field()
  zip!: string;

  @Field({ defaultValue: 'US' })
  country!: string;
}

@InputType()
export class CartItemInput {
  @Field(() => Int)
  printfulVariantId!: number;

  @Field(() => Int)
  printfulProductId!: number;

  @Field()
  productName!: string;

  @Field()
  variantName!: string;

  @Field(() => Int)
  @Min(1)
  @Max(10)
  quantity!: number;

  @Field(() => Int)
  @Min(0)
  unitPriceCents!: number;
}

@InputType()
export class EstimateShippingInput {
  @Field(() => ShippingAddressInput)
  address!: ShippingAddressInput;

  @Field(() => [CartItemInput])
  items!: CartItemInput[];
}

@InputType()
export class CreatePayPalOrderInput {
  @Field()
  buyerEmail!: string;

  @Field()
  buyerName!: string;

  @Field(() => ShippingAddressInput)
  address!: ShippingAddressInput;

  @Field(() => [CartItemInput])
  items!: CartItemInput[];

  @Field()
  shippingRateId!: string;

  @Field(() => Int)
  shippingCents!: number;
}
