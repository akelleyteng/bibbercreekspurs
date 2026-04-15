import db from '../models/database';
import { logger } from '../utils/logger';
import { randomBytes } from 'crypto';

// --- Row types ---

export interface OrderRow {
  id: string;
  confirmation_code: string;
  paypal_order_id: string | null;
  printful_order_id: number | null;
  status: string;
  buyer_email: string;
  buyer_name: string;
  shipping_name: string;
  shipping_address1: string;
  shipping_address2: string | null;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  printful_variant_id: number;
  printful_product_id: number;
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_price_cents: number;
  created_at: Date;
}

export interface OrderWithItemsRow extends OrderRow {
  items: OrderItemRow[];
}

export interface CreateOrderData {
  confirmation_code: string;
  buyer_email: string;
  buyer_name: string;
  shipping_name: string;
  shipping_address1: string;
  shipping_address2?: string;
  shipping_city: string;
  shipping_state: string;
  shipping_zip: string;
  shipping_country: string;
  subtotal_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  user_id?: string;
}

export interface OrderItemData {
  printful_variant_id: number;
  printful_product_id: number;
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_price_cents: number;
}

export interface TrackingData {
  tracking_number: string;
  tracking_url?: string;
  carrier?: string;
}

// --- Repository ---

export class OrderRepository {
  async createOrder(data: CreateOrderData): Promise<OrderRow> {
    const result = await db.query<OrderRow>(
      `INSERT INTO orders (
        confirmation_code, buyer_email, buyer_name,
        shipping_name, shipping_address1, shipping_address2,
        shipping_city, shipping_state, shipping_zip, shipping_country,
        subtotal_cents, shipping_cents, tax_cents, total_cents,
        user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        data.confirmation_code,
        data.buyer_email,
        data.buyer_name,
        data.shipping_name,
        data.shipping_address1,
        data.shipping_address2 || null,
        data.shipping_city,
        data.shipping_state,
        data.shipping_zip,
        data.shipping_country,
        data.subtotal_cents,
        data.shipping_cents,
        data.tax_cents,
        data.total_cents,
        data.user_id || null,
      ],
    );

    logger.info(`Created order ${data.confirmation_code}`);
    return result.rows[0];
  }

  async createOrderItems(
    orderId: string,
    items: OrderItemData[],
  ): Promise<void> {
    for (const item of items) {
      await db.query(
        `INSERT INTO order_items (
          order_id, printful_variant_id, printful_product_id,
          product_name, variant_name, quantity, unit_price_cents
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          orderId,
          item.printful_variant_id,
          item.printful_product_id,
          item.product_name,
          item.variant_name,
          item.quantity,
          item.unit_price_cents,
        ],
      );
    }
  }

  async findByConfirmationCode(
    code: string,
  ): Promise<OrderWithItemsRow | null> {
    const orderResult = await db.query<OrderRow>(
      `SELECT * FROM orders WHERE confirmation_code = $1`,
      [code],
    );

    if (orderResult.rows.length === 0) return null;

    const order = orderResult.rows[0];
    const itemsResult = await db.query<OrderItemRow>(
      `SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC`,
      [order.id],
    );

    return { ...order, items: itemsResult.rows };
  }

  async findByPayPalOrderId(paypalOrderId: string): Promise<OrderRow | null> {
    const result = await db.query<OrderRow>(
      `SELECT * FROM orders WHERE paypal_order_id = $1`,
      [paypalOrderId],
    );
    return result.rows[0] || null;
  }

  async findById(id: string): Promise<OrderWithItemsRow | null> {
    const orderResult = await db.query<OrderRow>(
      `SELECT * FROM orders WHERE id = $1`,
      [id],
    );

    if (orderResult.rows.length === 0) return null;

    const order = orderResult.rows[0];
    const itemsResult = await db.query<OrderItemRow>(
      `SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC`,
      [order.id],
    );

    return { ...order, items: itemsResult.rows };
  }

  async updateStatus(orderId: string, status: string): Promise<void> {
    await db.query(
      `UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, orderId],
    );
  }

  async updatePayPalOrderId(
    orderId: string,
    paypalOrderId: string,
  ): Promise<void> {
    await db.query(
      `UPDATE orders SET paypal_order_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [paypalOrderId, orderId],
    );
  }

  async updatePrintfulOrderId(
    orderId: string,
    printfulOrderId: number,
  ): Promise<void> {
    await db.query(
      `UPDATE orders SET printful_order_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [printfulOrderId, orderId],
    );
  }

  async updateTracking(orderId: string, tracking: TrackingData): Promise<void> {
    await db.query(
      `UPDATE orders SET
        tracking_number = $1,
        tracking_url = $2,
        carrier = $3,
        status = 'SHIPPED',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4`,
      [
        tracking.tracking_number,
        tracking.tracking_url || null,
        tracking.carrier || null,
        orderId,
      ],
    );
  }

  async getAdminOrders(
    limit: number = 20,
    offset: number = 0,
  ): Promise<OrderWithItemsRow[]> {
    const orderResult = await db.query<OrderRow>(
      `SELECT * FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset],
    );

    const orders: OrderWithItemsRow[] = [];
    for (const order of orderResult.rows) {
      const itemsResult = await db.query<OrderItemRow>(
        `SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC`,
        [order.id],
      );
      orders.push({ ...order, items: itemsResult.rows });
    }

    return orders;
  }

  async getAdminOrderCount(): Promise<number> {
    const result = await db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM orders`,
    );
    return parseInt(result.rows[0].count, 10);
  }

  generateConfirmationCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/1/0 to avoid confusion
    const bytes = randomBytes(6);
    let code = 'BCS-';
    for (let i = 0; i < 6; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }
}
