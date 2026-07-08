import crypto from 'crypto';
import db from '../models/database';
import { logger } from '../utils/logger';

export interface CatalogOrderDecoration {
  label: string;
  text?: string;
  placement?: string;
  priceCents: number;
}

export interface CatalogOrderItemRow {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  item_type: string;
  color: string | null;
  size: string | null;
  decorations: CatalogOrderDecoration[];
  unit_price_cents: number;
  quantity: number;
  created_at: Date;
}

export interface CatalogOrderRow {
  id: string;
  confirmation_code: string;
  user_id: string;
  buyer_name: string;
  buyer_email: string;
  status: string;
  payment_status: string;
  payment_method: string;
  subtotal_cents: number;
  notes: string | null;
  batch_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CatalogOrderWithItems extends CatalogOrderRow {
  items: CatalogOrderItemRow[];
}

export interface CreateCatalogOrderItem {
  productId?: string;
  productName: string;
  itemType: string;
  color?: string;
  size?: string;
  decorations: CatalogOrderDecoration[];
  unitPriceCents: number;
  quantity: number;
}

export interface CreateCatalogOrderData {
  userId: string;
  buyerName: string;
  buyerEmail: string;
  notes?: string;
  items: CreateCatalogOrderItem[];
}

// No ambiguous characters (no I/O/0/1).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ORDER_COLUMNS = `id, confirmation_code, user_id, buyer_name, buyer_email, status,
  payment_status, payment_method, subtotal_cents, notes, batch_id, created_at, updated_at`;

export class CatalogOrderRepository {
  private generateCode(): string {
    const bytes = crypto.randomBytes(6);
    let code = '';
    for (let i = 0; i < 6; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    return `BCS-${code}`;
  }

  private async uniqueCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = this.generateCode();
      const existing = await db.query('SELECT 1 FROM catalog_orders WHERE confirmation_code = $1', [code]);
      if (existing.rows.length === 0) return code;
    }
    // Extremely unlikely; fall back to a longer random suffix.
    return `BCS-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;
  }

  async createOrder(data: CreateCatalogOrderData): Promise<CatalogOrderWithItems> {
    const subtotalCents = data.items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0);
    const code = await this.uniqueCode();

    const orderId = await db.transaction(async (client) => {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO catalog_orders (confirmation_code, user_id, buyer_name, buyer_email, subtotal_cents, notes)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [code, data.userId, data.buyerName, data.buyerEmail, subtotalCents, data.notes ?? null]
      );
      const id = inserted.rows[0].id;
      for (const item of data.items) {
        await client.query(
          `INSERT INTO catalog_order_items
             (order_id, product_id, product_name, item_type, color, size, decorations, unit_price_cents, quantity)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)`,
          [
            id,
            item.productId ?? null,
            item.productName,
            item.itemType,
            item.color ?? null,
            item.size ?? null,
            JSON.stringify(item.decorations ?? []),
            item.unitPriceCents,
            item.quantity,
          ]
        );
      }
      return id;
    });

    logger.info(`Catalog order created: ${code} (${orderId})`);
    return (await this.findById(orderId))!;
  }

  private async attachItems(order: CatalogOrderRow): Promise<CatalogOrderWithItems> {
    const items = await db.query<CatalogOrderItemRow>(
      `SELECT id, order_id, product_id, product_name, item_type, color, size, decorations,
              unit_price_cents, quantity, created_at
       FROM catalog_order_items WHERE order_id = $1 ORDER BY created_at ASC`,
      [order.id]
    );
    return { ...order, items: items.rows };
  }

  async findById(id: string): Promise<CatalogOrderWithItems | null> {
    const result = await db.query<CatalogOrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM catalog_orders WHERE id = $1`,
      [id]
    );
    return result.rows[0] ? this.attachItems(result.rows[0]) : null;
  }

  async findByConfirmationCode(code: string): Promise<CatalogOrderWithItems | null> {
    const result = await db.query<CatalogOrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM catalog_orders WHERE confirmation_code = $1`,
      [code]
    );
    return result.rows[0] ? this.attachItems(result.rows[0]) : null;
  }

  /** Update an order's fulfillment and/or payment status (admin). */
  async updateStatus(
    id: string,
    updates: { status?: string; paymentStatus?: string }
  ): Promise<CatalogOrderWithItems | null> {
    const sets: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (updates.status !== undefined) {
      sets.push(`status = $${idx++}`);
      values.push(updates.status);
    }
    if (updates.paymentStatus !== undefined) {
      sets.push(`payment_status = $${idx++}`);
      values.push(updates.paymentStatus);
    }
    if (sets.length === 0) return this.findById(id);

    sets.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    const result = await db.query<CatalogOrderRow>(
      `UPDATE catalog_orders SET ${sets.join(', ')} WHERE id = $${idx} RETURNING ${ORDER_COLUMNS}`,
      values
    );
    if (result.rows.length === 0) return null;
    return this.attachItems(result.rows[0]);
  }

  /** All orders (admin), newest first, each with items. */
  async findAll(): Promise<CatalogOrderWithItems[]> {
    const result = await db.query<CatalogOrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM catalog_orders ORDER BY created_at DESC`
    );
    return Promise.all(result.rows.map((o) => this.attachItems(o)));
  }
}
