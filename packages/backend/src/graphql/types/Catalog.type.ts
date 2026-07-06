import { ObjectType, Field, ID, Int } from 'type-graphql';
import { DateTimeScalar } from './scalars';

@ObjectType()
export class CatalogColorGQL {
  @Field()
  name!: string;

  @Field({ nullable: true })
  hex?: string;
}

@ObjectType()
export class CatalogDecorationGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  decorationType!: string;

  @Field()
  label!: string;

  @Field(() => [String])
  placementOptions!: string[];

  @Field(() => Int)
  priceCents!: number;

  @Field()
  requiresText!: boolean;

  @Field(() => Int)
  sortOrder!: number;
}

@ObjectType()
export class CatalogProductGQL {
  @Field(() => ID)
  id!: string;

  @Field()
  itemType!: string;

  @Field()
  name!: string;

  @Field({ nullable: true })
  brandStyle?: string;

  @Field({ nullable: true })
  description?: string;

  @Field({ nullable: true })
  imageUrl?: string;

  @Field(() => Int)
  blankCostCents!: number;

  @Field(() => [CatalogColorGQL])
  colors!: CatalogColorGQL[];

  @Field(() => [String])
  sizes!: string[];

  @Field()
  isVisible!: boolean;

  @Field()
  creditEligible!: boolean;

  @Field(() => Int)
  sortOrder!: number;

  @Field(() => [CatalogDecorationGQL])
  decorations!: CatalogDecorationGQL[];

  @Field(() => DateTimeScalar)
  createdAt!: Date;

  @Field(() => DateTimeScalar)
  updatedAt!: Date;
}
