import { ObjectType, Field, ID, Int } from 'type-graphql';
import { DateTimeScalar } from './scalars';

@ObjectType('ShippingEstimate')
export class ShippingEstimateGQL {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field()
  rate!: string;

  @Field()
  currency!: string;

  @Field(() => Int)
  minDeliveryDays!: number;

  @Field(() => Int)
  maxDeliveryDays!: number;
}

@ObjectType('OrderItem')
export class OrderItemGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  productName!: string;

  @Field()
  variantName!: string;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Int)
  unitPriceCents!: number;
}

@ObjectType('Order')
export class OrderGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  confirmationCode!: string;

  @Field()
  status!: string;

  @Field()
  buyerEmail!: string;

  @Field()
  buyerName!: string;

  @Field(() => Int)
  subtotalCents!: number;

  @Field(() => Int)
  shippingCents!: number;

  @Field(() => Int)
  taxCents!: number;

  @Field(() => Int)
  totalCents!: number;

  @Field({ nullable: true })
  trackingNumber?: string;

  @Field({ nullable: true })
  trackingUrl?: string;

  @Field({ nullable: true })
  carrier?: string;

  @Field(() => [OrderItemGQL])
  items!: OrderItemGQL[];

  @Field(() => DateTimeScalar)
  createdAt!: Date;
}

@ObjectType('CreatePayPalOrderResult')
export class CreatePayPalOrderResultGQL {
  @Field()
  paypalOrderId!: string;

  @Field()
  confirmationCode!: string;
}

@ObjectType('CapturePayPalOrderResult')
export class CapturePayPalOrderResultGQL {
  @Field()
  success!: boolean;

  @Field()
  confirmationCode!: string;

  @Field()
  status!: string;
}

@ObjectType('AdminOrder')
export class AdminOrderGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  confirmationCode!: string;

  @Field()
  status!: string;

  @Field()
  buyerEmail!: string;

  @Field()
  buyerName!: string;

  @Field(() => Int)
  subtotalCents!: number;

  @Field(() => Int)
  shippingCents!: number;

  @Field(() => Int)
  taxCents!: number;

  @Field(() => Int)
  totalCents!: number;

  @Field({ nullable: true })
  trackingNumber?: string;

  @Field({ nullable: true })
  trackingUrl?: string;

  @Field({ nullable: true })
  carrier?: string;

  @Field({ nullable: true })
  paypalOrderId?: string;

  @Field(() => Int, { nullable: true })
  printfulOrderId?: number;

  @Field()
  shippingAddress!: string;

  @Field({ nullable: true })
  userId?: string;

  @Field(() => [OrderItemGQL])
  items!: OrderItemGQL[];

  @Field(() => DateTimeScalar)
  createdAt!: Date;
}
