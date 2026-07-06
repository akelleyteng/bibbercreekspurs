import { Resolver, Query, Mutation, Arg, Ctx } from 'type-graphql';
import { CatalogProductGQL } from '../types/Catalog.type';
import { CreateCatalogProductInput, UpdateCatalogProductInput } from '../inputs/CatalogInput';
import {
  CatalogRepository,
  CatalogProductWithDecorations,
} from '../../repositories/catalog.repository';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';

@Resolver()
export class CatalogResolver {
  private catalogRepo: CatalogRepository;
  private userRepo: UserRepository;

  constructor() {
    this.catalogRepo = new CatalogRepository();
    this.userRepo = new UserRepository();
  }

  private mapProduct(row: CatalogProductWithDecorations): CatalogProductGQL {
    return {
      id: row.id,
      itemType: row.item_type,
      name: row.name,
      brandStyle: row.brand_style ?? undefined,
      description: row.description ?? undefined,
      imageUrl: row.image_url ?? undefined,
      blankCostCents: row.blank_cost_cents,
      colors: (row.colors ?? []).map((c) => ({ name: c.name, hex: c.hex ?? undefined })),
      sizes: row.sizes ?? [],
      isVisible: row.is_visible,
      creditEligible: row.credit_eligible,
      sortOrder: row.sort_order,
      decorations: (row.decorations ?? []).map((d) => ({
        id: d.id,
        decorationType: d.decoration_type,
        label: d.label,
        placementOptions: d.placement_options ?? [],
        priceCents: d.price_cents,
        requiresText: d.requires_text,
        sortOrder: d.sort_order,
      })),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private async requireAdmin(context: Context): Promise<void> {
    const authHeader = context.req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', { extensions: { code: 'UNAUTHENTICATED' } });
    }
    const payload = verifyAccessToken(authHeader.substring(7));
    const user = await this.userRepo.findById(payload.userId);
    if (!user || user.role !== Role.ADMIN) {
      throw new GraphQLError('Admin access required', { extensions: { code: 'FORBIDDEN' } });
    }
  }

  // ── Public ──

  @Query(() => [CatalogProductGQL])
  async catalogProducts(): Promise<CatalogProductGQL[]> {
    const rows = await this.catalogRepo.findProducts(true);
    return rows.map((r) => this.mapProduct(r));
  }

  @Query(() => CatalogProductGQL, { nullable: true })
  async catalogProduct(@Arg('id') id: string): Promise<CatalogProductGQL | null> {
    const row = await this.catalogRepo.findById(id);
    // Only expose visible products publicly.
    if (!row || !row.is_visible) return null;
    return this.mapProduct(row);
  }

  // ── Admin ──

  @Query(() => [CatalogProductGQL])
  async adminCatalogProducts(@Ctx() context: Context): Promise<CatalogProductGQL[]> {
    await this.requireAdmin(context);
    const rows = await this.catalogRepo.findProducts(false);
    return rows.map((r) => this.mapProduct(r));
  }

  @Mutation(() => CatalogProductGQL)
  async createCatalogProduct(
    @Arg('input') input: CreateCatalogProductInput,
    @Ctx() context: Context
  ): Promise<CatalogProductGQL> {
    await this.requireAdmin(context);
    const row = await this.catalogRepo.create({
      itemType: input.itemType,
      name: input.name,
      brandStyle: input.brandStyle,
      description: input.description,
      imageUrl: input.imageUrl,
      blankCostCents: input.blankCostCents,
      colors: input.colors,
      sizes: input.sizes,
      isVisible: input.isVisible,
      creditEligible: input.creditEligible,
      sortOrder: input.sortOrder,
      decorations: input.decorations?.map((d) => ({
        decorationType: d.decorationType,
        label: d.label,
        placementOptions: d.placementOptions,
        priceCents: d.priceCents,
        requiresText: d.requiresText,
        sortOrder: d.sortOrder,
      })),
    });
    return this.mapProduct(row);
  }

  @Mutation(() => CatalogProductGQL)
  async updateCatalogProduct(
    @Arg('input') input: UpdateCatalogProductInput,
    @Ctx() context: Context
  ): Promise<CatalogProductGQL> {
    await this.requireAdmin(context);
    const row = await this.catalogRepo.update(input.id, {
      itemType: input.itemType,
      name: input.name,
      brandStyle: input.brandStyle,
      description: input.description,
      imageUrl: input.imageUrl,
      blankCostCents: input.blankCostCents,
      colors: input.colors,
      sizes: input.sizes,
      isVisible: input.isVisible,
      creditEligible: input.creditEligible,
      sortOrder: input.sortOrder,
      decorations: input.decorations?.map((d) => ({
        decorationType: d.decorationType,
        label: d.label,
        placementOptions: d.placementOptions,
        priceCents: d.priceCents,
        requiresText: d.requiresText,
        sortOrder: d.sortOrder,
      })),
    });
    if (!row) {
      throw new GraphQLError('Catalog product not found', { extensions: { code: 'NOT_FOUND' } });
    }
    return this.mapProduct(row);
  }

  @Mutation(() => Boolean)
  async deleteCatalogProduct(
    @Arg('id') id: string,
    @Ctx() context: Context
  ): Promise<boolean> {
    await this.requireAdmin(context);
    const deleted = await this.catalogRepo.delete(id);
    if (!deleted) {
      throw new GraphQLError('Catalog product not found', { extensions: { code: 'NOT_FOUND' } });
    }
    return true;
  }
}
