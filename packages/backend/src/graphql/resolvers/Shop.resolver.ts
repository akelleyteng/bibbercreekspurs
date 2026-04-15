import { Resolver, Query, Mutation, Arg, Ctx, Int } from 'type-graphql';
import {
  ShopProductGQL,
  ShopVariantGQL,
  AdminShopProductGQL,
  AdminShopVariantGQL,
  SyncResultGQL,
} from '../types/Shop.type';
import { UpdateShopProductCurationInput } from '../inputs/ShopInput';
import { ShopProductRepository, JoinedShopProductRow } from '../../repositories/shop-product.repository';
import { PrintfulService, PrintfulSyncVariant } from '../../services/printful.service';
import { UserRepository } from '../../repositories/user.repository';
import { verifyAccessToken } from '../../services/auth.service';
import { Role } from '@4hclub/shared';
import { Context } from '../context';
import { GraphQLError } from 'graphql';
import { logger } from '../../utils/logger';

const CACHE_STALE_MS = 60 * 60 * 1000; // 1 hour

@Resolver()
export class ShopResolver {
  private shopRepo: ShopProductRepository;
  private printfulService: PrintfulService;
  private userRepo: UserRepository;

  constructor() {
    this.shopRepo = new ShopProductRepository();
    this.printfulService = new PrintfulService();
    this.userRepo = new UserRepository();
  }

  // --- Auth helpers ---

  private async requireAuth(context: Context): Promise<{ userId: string; role: Role }> {
    const authHeader = context.req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    const user = await this.userRepo.findById(payload.userId);
    if (!user) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' },
      });
    }
    return { userId: payload.userId, role: user.role };
  }

  private async requireAdmin(context: Context): Promise<string> {
    const { userId, role } = await this.requireAuth(context);
    if (role !== Role.ADMIN) {
      throw new GraphQLError('Admin access required', {
        extensions: { code: 'FORBIDDEN' },
      });
    }
    return userId;
  }

  // --- Variant mapping ---

  private extractVariants(printfulData: any): ShopVariantGQL[] {
    const syncVariants: PrintfulSyncVariant[] = printfulData?.sync_variants || [];
    return syncVariants.map((v) => {
      const size = this.extractOption(v, 'size');
      const color = this.extractOption(v, 'color');
      const colorHex = this.extractOption(v, 'color_hex') || this.extractOption(v, 'color-hex');
      const thumbnailUrl = v.files?.find((f) => f.type === 'preview')?.preview_url
        || v.product?.image
        || null;

      return {
        variantId: v.id,
        name: v.name,
        size: size || undefined,
        color: color || undefined,
        colorHex: colorHex || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        inStock: v.availability_status !== 'out_of_stock',
        retailPriceCents: v.retail_price ? Math.round(parseFloat(v.retail_price) * 100) : undefined,
      };
    });
  }

  private extractAdminVariants(printfulData: any): AdminShopVariantGQL[] {
    const syncVariants: PrintfulSyncVariant[] = printfulData?.sync_variants || [];
    return syncVariants.map((v) => {
      const size = this.extractOption(v, 'size');
      const color = this.extractOption(v, 'color');
      const colorHex = this.extractOption(v, 'color_hex') || this.extractOption(v, 'color-hex');
      const thumbnailUrl = v.files?.find((f) => f.type === 'preview')?.preview_url
        || v.product?.image
        || null;

      return {
        variantId: v.id,
        name: v.name,
        size: size || undefined,
        color: color || undefined,
        colorHex: colorHex || undefined,
        thumbnailUrl: thumbnailUrl || undefined,
        inStock: v.availability_status !== 'out_of_stock',
        retailPriceCents: v.retail_price ? Math.round(parseFloat(v.retail_price) * 100) : undefined,
        printfulRetailPrice: v.retail_price || undefined,
      };
    });
  }

  private extractOption(variant: PrintfulSyncVariant, key: string): string | null {
    const opt = variant.options?.find((o) => o.id === key);
    return opt ? String(opt.value) : null;
  }

  // --- Row mapping ---

  private mapToShopProduct(row: JoinedShopProductRow): ShopProductGQL {
    return {
      id: row.id,
      printfulId: row.printful_id,
      name: row.name,
      description: row.description || undefined,
      thumbnailUrl: row.thumbnail_url || undefined,
      retailPriceCents: row.retail_price_cents || undefined,
      creditEligible: row.credit_eligible,
      variants: this.extractVariants(row.printful_data),
    };
  }

  private mapToAdminShopProduct(row: JoinedShopProductRow): AdminShopProductGQL {
    return {
      id: row.id,
      shopProductId: row.shop_product_id,
      printfulId: row.printful_id,
      name: row.name,
      description: row.description || undefined,
      thumbnailUrl: row.thumbnail_url || undefined,
      isVisible: row.is_visible,
      retailPriceCents: row.retail_price_cents || undefined,
      creditEligible: row.credit_eligible,
      sortOrder: row.sort_order,
      syncedAt: row.synced_at,
      variants: this.extractAdminVariants(row.printful_data),
    };
  }

  // --- Public queries ---

  @Query(() => [ShopProductGQL])
  async shopProducts(): Promise<ShopProductGQL[]> {
    // Check if cache is stale and trigger background refresh
    this.checkAndRefreshCache();

    const rows = await this.shopRepo.getVisibleProducts();
    return rows.map((row) => this.mapToShopProduct(row));
  }

  @Query(() => ShopProductGQL, { nullable: true })
  async shopProduct(
    @Arg('printfulId', () => Int) printfulId: number,
  ): Promise<ShopProductGQL | null> {
    const row = await this.shopRepo.getVisibleProductByPrintfulId(printfulId);
    if (!row) return null;
    return this.mapToShopProduct(row);
  }

  // --- Admin queries ---

  @Query(() => [AdminShopProductGQL])
  async adminShopProducts(
    @Ctx() context: Context,
  ): Promise<AdminShopProductGQL[]> {
    await this.requireAdmin(context);
    const rows = await this.shopRepo.getAllProductsWithCuration();
    return rows.map((row) => this.mapToAdminShopProduct(row));
  }

  // --- Admin mutations ---

  @Mutation(() => SyncResultGQL)
  async syncPrintfulProducts(
    @Ctx() context: Context,
  ): Promise<SyncResultGQL> {
    await this.requireAdmin(context);

    logger.info('Admin triggered Printful product sync');

    const catalog = await this.printfulService.fetchFullCatalog();

    let synced = 0;
    const printfulIds: number[] = [];

    for (const detail of catalog) {
      await this.shopRepo.upsertPrintfulProduct(detail);
      printfulIds.push(detail.sync_product.id);
      synced++;
    }

    const removed = await this.shopRepo.removeProductsNotIn(printfulIds);

    logger.info(`Sync complete: ${synced} synced, ${removed} removed`);

    return {
      synced,
      removed,
      syncedAt: new Date(),
    };
  }

  @Mutation(() => AdminShopProductGQL)
  async updateShopProductCuration(
    @Arg('shopProductId') shopProductId: string,
    @Arg('input') input: UpdateShopProductCurationInput,
    @Ctx() context: Context,
  ): Promise<AdminShopProductGQL> {
    await this.requireAdmin(context);

    await this.shopRepo.updateCuration(shopProductId, {
      is_visible: input.isVisible,
      retail_price_cents: input.retailPriceCents,
      credit_eligible: input.creditEligible,
      sort_order: input.sortOrder,
    });

    // Re-fetch the full joined row to return
    const rows = await this.shopRepo.getAllProductsWithCuration();
    const updated = rows.find((r) => r.shop_product_id === shopProductId);

    if (!updated) {
      throw new GraphQLError('Shop product not found', {
        extensions: { code: 'NOT_FOUND' },
      });
    }

    return this.mapToAdminShopProduct(updated);
  }

  // --- Cache management ---

  private async checkAndRefreshCache(): Promise<void> {
    try {
      const lastSync = await this.shopRepo.getLastSyncTime();
      if (!lastSync) return; // No products synced yet — admin needs to trigger first sync

      const age = Date.now() - lastSync.getTime();
      if (age > CACHE_STALE_MS) {
        logger.info('Product cache is stale, triggering background refresh');
        // Fire and forget — don't await
        this.refreshCache().catch((err) => {
          logger.error('Background cache refresh failed:', err);
        });
      }
    } catch (error) {
      logger.error('Cache staleness check failed:', error);
    }
  }

  private async refreshCache(): Promise<void> {
    const catalog = await this.printfulService.fetchFullCatalog();
    const printfulIds: number[] = [];

    for (const detail of catalog) {
      await this.shopRepo.upsertPrintfulProduct(detail);
      printfulIds.push(detail.sync_product.id);
    }

    await this.shopRepo.removeProductsNotIn(printfulIds);
    logger.info(`Background cache refresh complete: ${catalog.length} products`);
  }
}
