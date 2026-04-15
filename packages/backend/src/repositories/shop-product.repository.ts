import db from '../models/database';
import { logger } from '../utils/logger';
import { PrintfulSyncProductDetail } from '../services/printful.service';

// --- Row types ---

export interface PrintfulProductRow {
  id: string;
  printful_id: number;
  external_id: string | null;
  name: string;
  description: string | null;
  thumbnail_url: string | null;
  printful_data: any; // JSONB — full Printful API response
  synced_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ShopProductRow {
  id: string;
  printful_product_id: string;
  is_visible: boolean;
  retail_price_cents: number | null;
  credit_eligible: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface JoinedShopProductRow extends PrintfulProductRow {
  shop_product_id: string;
  is_visible: boolean;
  retail_price_cents: number | null;
  credit_eligible: boolean;
  sort_order: number;
}

// --- Repository ---

const JOINED_SELECT = `
  SELECT pp.id, pp.printful_id, pp.external_id, pp.name, pp.description,
         pp.thumbnail_url, pp.printful_data, pp.synced_at,
         pp.created_at, pp.updated_at,
         sp.id AS shop_product_id, sp.is_visible, sp.retail_price_cents,
         sp.credit_eligible, sp.sort_order
  FROM printful_products pp
  LEFT JOIN shop_products sp ON sp.printful_product_id = pp.id`;

export class ShopProductRepository {
  // --- Cache management ---

  async upsertPrintfulProduct(detail: PrintfulSyncProductDetail): Promise<PrintfulProductRow> {
    const { sync_product, sync_variants } = detail;

    // Extract description from the first variant's product info or leave null
    const description = sync_variants.length > 0
      ? (sync_variants[0].product?.name || null)
      : null;

    const result = await db.query<{ id: string }>(
      `INSERT INTO printful_products (printful_id, external_id, name, description, thumbnail_url, printful_data, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (printful_id) DO UPDATE SET
         external_id = EXCLUDED.external_id,
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         thumbnail_url = EXCLUDED.thumbnail_url,
         printful_data = EXCLUDED.printful_data,
         synced_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [
        sync_product.id,
        sync_product.external_id,
        sync_product.name,
        description,
        sync_product.thumbnail_url,
        JSON.stringify(detail),
      ]
    );

    const printfulProductId = result.rows[0].id;

    // Auto-create shop_products row if it doesn't exist (default hidden)
    await db.query(
      `INSERT INTO shop_products (printful_product_id)
       VALUES ($1)
       ON CONFLICT (printful_product_id) DO NOTHING`,
      [printfulProductId]
    );

    logger.info(`Upserted Printful product ${sync_product.id}: ${sync_product.name}`);
    return (await this.findPrintfulProductById(printfulProductId))!;
  }

  async findPrintfulProductById(id: string): Promise<PrintfulProductRow | null> {
    const result = await db.query<PrintfulProductRow>(
      `SELECT * FROM printful_products WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async getLastSyncTime(): Promise<Date | null> {
    const result = await db.query<{ latest: Date | null }>(
      `SELECT MAX(synced_at) AS latest FROM printful_products`
    );
    return result.rows[0]?.latest || null;
  }

  async getAllPrintfulProducts(): Promise<PrintfulProductRow[]> {
    const result = await db.query<PrintfulProductRow>(
      `SELECT * FROM printful_products ORDER BY name ASC`
    );
    return result.rows;
  }

  // --- Curation ---

  async updateCuration(
    shopProductId: string,
    data: {
      is_visible?: boolean;
      retail_price_cents?: number | null;
      credit_eligible?: boolean;
      sort_order?: number;
    }
  ): Promise<ShopProductRow | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.is_visible !== undefined) {
      updates.push(`is_visible = $${paramIndex}`);
      values.push(data.is_visible);
      paramIndex++;
    }
    if (data.retail_price_cents !== undefined) {
      updates.push(`retail_price_cents = $${paramIndex}`);
      values.push(data.retail_price_cents);
      paramIndex++;
    }
    if (data.credit_eligible !== undefined) {
      updates.push(`credit_eligible = $${paramIndex}`);
      values.push(data.credit_eligible);
      paramIndex++;
    }
    if (data.sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex}`);
      values.push(data.sort_order);
      paramIndex++;
    }

    if (updates.length === 0) return this.findShopProductById(shopProductId);

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(shopProductId);

    await db.query(
      `UPDATE shop_products SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );

    return this.findShopProductById(shopProductId);
  }

  async findShopProductById(id: string): Promise<ShopProductRow | null> {
    const result = await db.query<ShopProductRow>(
      `SELECT * FROM shop_products WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  // --- Joined queries ---

  async getVisibleProducts(): Promise<JoinedShopProductRow[]> {
    const result = await db.query<JoinedShopProductRow>(
      `${JOINED_SELECT}
       WHERE sp.is_visible = TRUE
       ORDER BY sp.sort_order ASC, pp.name ASC`
    );
    return result.rows;
  }

  async getVisibleProductByPrintfulId(printfulId: number): Promise<JoinedShopProductRow | null> {
    const result = await db.query<JoinedShopProductRow>(
      `${JOINED_SELECT}
       WHERE pp.printful_id = $1 AND sp.is_visible = TRUE`,
      [printfulId]
    );
    return result.rows[0] || null;
  }

  async getProductByPrintfulId(printfulId: number): Promise<JoinedShopProductRow | null> {
    const result = await db.query<JoinedShopProductRow>(
      `${JOINED_SELECT}
       WHERE pp.printful_id = $1`,
      [printfulId]
    );
    return result.rows[0] || null;
  }

  async getAllProductsWithCuration(): Promise<JoinedShopProductRow[]> {
    const result = await db.query<JoinedShopProductRow>(
      `${JOINED_SELECT}
       ORDER BY sp.sort_order ASC, pp.name ASC`
    );
    return result.rows;
  }

  /**
   * Remove cached products that no longer exist in Printful.
   * Called after a sync to clean up deleted products.
   */
  async removeProductsNotIn(printfulIds: number[]): Promise<number> {
    if (printfulIds.length === 0) return 0;

    const placeholders = printfulIds.map((_, i) => `$${i + 1}`).join(', ');
    const result = await db.query(
      `DELETE FROM printful_products WHERE printful_id NOT IN (${placeholders})`,
      printfulIds
    );

    const removed = result.rowCount ?? 0;
    if (removed > 0) {
      logger.info(`Removed ${removed} products no longer in Printful`);
    }
    return removed;
  }
}
