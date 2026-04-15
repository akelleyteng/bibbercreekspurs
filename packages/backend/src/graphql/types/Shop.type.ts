import { ObjectType, Field, ID, Int } from 'type-graphql';
import { DateTimeScalar } from './scalars';

@ObjectType('ShopVariant')
export class ShopVariantGQL {
  @Field(() => Int)
  variantId!: number;

  @Field()
  name!: string;

  @Field({ nullable: true })
  size?: string;

  @Field({ nullable: true })
  color?: string;

  @Field({ nullable: true })
  colorHex?: string;

  @Field({ nullable: true })
  thumbnailUrl?: string;

  @Field()
  inStock!: boolean;

  @Field(() => Int, { nullable: true })
  retailPriceCents?: number;
}

@ObjectType('ShopProduct')
export class ShopProductGQL {
  @Field(() => ID)
  id!: string;

  @Field(() => Int)
  printfulId!: number;

  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  thumbnailUrl?: string;

  @Field(() => Int, { nullable: true })
  retailPriceCents?: number;

  @Field()
  creditEligible!: boolean;

  @Field(() => [ShopVariantGQL])
  variants!: ShopVariantGQL[];
}

@ObjectType('AdminShopProduct')
export class AdminShopProductGQL {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  shopProductId!: string;

  @Field(() => Int)
  printfulId!: number;

  @Field()
  name!: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  thumbnailUrl?: string;

  @Field()
  isVisible!: boolean;

  @Field(() => Int, { nullable: true })
  retailPriceCents?: number;

  @Field()
  creditEligible!: boolean;

  @Field(() => Int)
  sortOrder!: number;

  @Field(() => DateTimeScalar)
  syncedAt!: Date;

  @Field(() => [AdminShopVariantGQL])
  variants!: AdminShopVariantGQL[];
}

@ObjectType('AdminShopVariant')
export class AdminShopVariantGQL {
  @Field(() => Int)
  variantId!: number;

  @Field()
  name!: string;

  @Field({ nullable: true })
  size?: string;

  @Field({ nullable: true })
  color?: string;

  @Field({ nullable: true })
  colorHex?: string;

  @Field({ nullable: true })
  thumbnailUrl?: string;

  @Field()
  inStock!: boolean;

  @Field(() => Int, { nullable: true })
  retailPriceCents?: number;

  @Field({ nullable: true })
  printfulRetailPrice?: string;
}

@ObjectType('SyncResult')
export class SyncResultGQL {
  @Field(() => Int)
  synced!: number;

  @Field(() => Int)
  removed!: number;

  @Field(() => DateTimeScalar)
  syncedAt!: Date;
}
