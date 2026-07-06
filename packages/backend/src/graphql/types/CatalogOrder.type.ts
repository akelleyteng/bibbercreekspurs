import { ObjectType, Field, ID, Int } from 'type-graphql';
import { DateTimeScalar } from './scalars';

@ObjectType()
export class CatalogOrderDecorationGQL {
  @Field()
  label!: string;

  @Field({ nullable: true })
  text?: string;

  @Field({ nullable: true })
  placement?: string;

  @Field(() => Int)
  priceCents!: number;
}

@ObjectType()
export class CatalogOrderItemGQL {
  @Field(() => ID)
  id!: string;

  @Field({ nullable: true })
  productId?: string;

  @Field()
  productName!: string;

  @Field()
  itemType!: string;

  @Field({ nullable: true })
  color?: string;

  @Field({ nullable: true })
  size?: string;

  @Field(() => [CatalogOrderDecorationGQL])
  decorations!: CatalogOrderDecorationGQL[];

  @Field(() => Int)
  unitPriceCents!: number;

  @Field(() => Int)
  quantity!: number;
}

@ObjectType()
export class CatalogOrderGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  confirmationCode!: string;

  @Field()
  buyerName!: string;

  @Field()
  buyerEmail!: string;

  @Field()
  status!: string;

  @Field()
  paymentStatus!: string;

  @Field()
  paymentMethod!: string;

  @Field(() => Int)
  subtotalCents!: number;

  @Field({ nullable: true })
  notes?: string;

  @Field(() => [CatalogOrderItemGQL])
  items!: CatalogOrderItemGQL[];

  @Field(() => DateTimeScalar)
  createdAt!: Date;
}

@ObjectType()
export class CreateCatalogOrderResultGQL {
  @Field()
  confirmationCode!: string;
}
