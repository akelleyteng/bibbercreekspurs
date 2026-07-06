import type { PoolClient } from 'pg';
import db from '../models/database';
import { logger } from '../utils/logger';

export interface CatalogColor {
  name: string;
  hex?: string;
}

export interface CatalogProductRow {
  id: string;
  item_type: string;
  name: string;
  brand_style: string | null;
  description: string | null;
  image_url: string | null;
  blank_cost_cents: number;
  colors: CatalogColor[];
  sizes: string[];
  is_visible: boolean;
  credit_eligible: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface CatalogDecorationRow {
  id: string;
  product_id: string;
  decoration_type: string;
  label: string;
  placement_options: string[];
  price_cents: number;
  requires_text: boolean;
  sort_order: number;
}

export interface CatalogProductWithDecorations extends CatalogProductRow {
  decorations: CatalogDecorationRow[];
}

export interface CatalogDecorationData {
  decorationType: string;
  label: string;
  placementOptions?: string[];
  priceCents?: number;
  requiresText?: boolean;
  sortOrder?: number;
}

export interface CreateCatalogProductData {
  itemType: string;
  name: string;
  brandStyle?: string;
  description?: string;
  imageUrl?: string;
  blankCostCents?: number;
  colors?: CatalogColor[];
  sizes?: string[];
  isVisible?: boolean;
  creditEligible?: boolean;
  sortOrder?: number;
  decorations?: CatalogDecorationData[];
}

export interface UpdateCatalogProductData {
  itemType?: string;
  name?: string;
  brandStyle?: string;
  description?: string;
  imageUrl?: string;
  blankCostCents?: number;
  colors?: CatalogColor[];
  sizes?: string[];
  isVisible?: boolean;
  creditEligible?: boolean;
  sortOrder?: number;
  // When provided (even empty), replaces the product's decorations wholesale.
  decorations?: CatalogDecorationData[];
}

const PRODUCT_COLUMNS = `id, item_type, name, brand_style, description, image_url,
  blank_cost_cents, colors, sizes, is_visible, credit_eligible, sort_order, created_at, updated_at`;

export class CatalogRepository {
  /** All products (admin) or only visible ones (public), each with its decorations. */
  async findProducts(visibleOnly: boolean): Promise<CatalogProductWithDecorations[]> {
    const result = await db.query<CatalogProductRow>(
      `SELECT ${PRODUCT_COLUMNS} FROM catalog_products
       ${visibleOnly ? 'WHERE is_visible = TRUE' : ''}
       ORDER BY sort_order ASC, created_at ASC`
    );
    const products = result.rows;
    if (products.length === 0) return [];

    const ids = products.map((p) => p.id);
    const decorations = await db.query<CatalogDecorationRow>(
      `SELECT id, product_id, decoration_type, label, placement_options, price_cents,
              requires_text, sort_order
       FROM catalog_decorations
       WHERE product_id = ANY($1)
       ORDER BY sort_order ASC, created_at ASC`,
      [ids]
    );

    const byProduct = new Map<string, CatalogDecorationRow[]>();
    for (const d of decorations.rows) {
      (byProduct.get(d.product_id) ?? byProduct.set(d.product_id, []).get(d.product_id)!).push(d);
    }
    return products.map((p) => ({ ...p, decorations: byProduct.get(p.id) ?? [] }));
  }

  async findById(id: string): Promise<CatalogProductWithDecorations | null> {
    const result = await db.query<CatalogProductRow>(
      `SELECT ${PRODUCT_COLUMNS} FROM catalog_products WHERE id = $1`,
      [id]
    );
    const product = result.rows[0];
    if (!product) return null;

    const decorations = await db.query<CatalogDecorationRow>(
      `SELECT id, product_id, decoration_type, label, placement_options, price_cents,
              requires_text, sort_order
       FROM catalog_decorations WHERE product_id = $1
       ORDER BY sort_order ASC, created_at ASC`,
      [id]
    );
    return { ...product, decorations: decorations.rows };
  }

  async create(data: CreateCatalogProductData): Promise<CatalogProductWithDecorations> {
    const id = await db.transaction(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO catalog_products
           (item_type, name, brand_style, description, image_url, blank_cost_cents,
            colors, sizes, is_visible, credit_eligible, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11)
         RETURNING id`,
        [
          data.itemType,
          data.name,
          data.brandStyle ?? null,
          data.description ?? null,
          data.imageUrl ?? null,
          data.blankCostCents ?? 0,
          JSON.stringify(data.colors ?? []),
          JSON.stringify(data.sizes ?? []),
          data.isVisible ?? false,
          data.creditEligible ?? false,
          data.sortOrder ?? 0,
        ]
      );
      const newId = inserted.rows[0].id;
      await this.insertDecorations(client, newId, data.decorations ?? []);
      return newId;
    });

    logger.info(`Catalog product created: ${id}`);
    return (await this.findById(id))!;
  }

  async update(id: string, data: UpdateCatalogProductData): Promise<CatalogProductWithDecorations | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    await db.transaction(async (client) => {
      const sets: string[] = [];
      const values: any[] = [];
      let idx = 1;
      const set = (col: string, val: any, cast = '') => {
        sets.push(`${col} = $${idx}${cast}`);
        values.push(val);
        idx++;
      };

      if (data.itemType !== undefined) set('item_type', data.itemType);
      if (data.name !== undefined) set('name', data.name);
      if (data.brandStyle !== undefined) set('brand_style', data.brandStyle);
      if (data.description !== undefined) set('description', data.description);
      if (data.imageUrl !== undefined) set('image_url', data.imageUrl);
      if (data.blankCostCents !== undefined) set('blank_cost_cents', data.blankCostCents);
      if (data.colors !== undefined) set('colors', JSON.stringify(data.colors), '::jsonb');
      if (data.sizes !== undefined) set('sizes', JSON.stringify(data.sizes), '::jsonb');
      if (data.isVisible !== undefined) set('is_visible', data.isVisible);
      if (data.creditEligible !== undefined) set('credit_eligible', data.creditEligible);
      if (data.sortOrder !== undefined) set('sort_order', data.sortOrder);

      if (sets.length > 0) {
        sets.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        await client.query(
          `UPDATE catalog_products SET ${sets.join(', ')} WHERE id = $${idx}`,
          values
        );
      }

      // Passing decorations (even []) replaces them wholesale.
      if (data.decorations !== undefined) {
        await client.query('DELETE FROM catalog_decorations WHERE product_id = $1', [id]);
        await this.insertDecorations(client, id, data.decorations);
      }
    });

    logger.info(`Catalog product updated: ${id}`);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.query('DELETE FROM catalog_products WHERE id = $1', [id]);
    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) logger.info(`Catalog product deleted: ${id}`);
    return deleted;
  }

  private async insertDecorations(
    client: PoolClient,
    productId: string,
    decorations: CatalogDecorationData[]
  ): Promise<void> {
    for (let i = 0; i < decorations.length; i++) {
      const d = decorations[i];
      await client.query(
        `INSERT INTO catalog_decorations
           (product_id, decoration_type, label, placement_options, price_cents, requires_text, sort_order)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)`,
        [
          productId,
          d.decorationType,
          d.label,
          JSON.stringify(d.placementOptions ?? []),
          d.priceCents ?? 0,
          d.requiresText ?? false,
          d.sortOrder ?? i,
        ]
      );
    }
  }
}
