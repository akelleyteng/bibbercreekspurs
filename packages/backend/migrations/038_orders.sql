-- Phase 2: Orders, order items for cart/checkout/payment flow

CREATE TYPE order_status AS ENUM (
  'PENDING_PAYMENT',
  'PAID',
  'SUBMITTED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'FAILED'
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code VARCHAR(20) UNIQUE NOT NULL,
  paypal_order_id VARCHAR(255),
  printful_order_id BIGINT,
  status order_status NOT NULL DEFAULT 'PENDING_PAYMENT',

  -- Buyer info (no auth required for guest checkout)
  buyer_email VARCHAR(255) NOT NULL,
  buyer_name VARCHAR(255) NOT NULL,

  -- Shipping address
  shipping_name VARCHAR(255) NOT NULL,
  shipping_address1 VARCHAR(500) NOT NULL,
  shipping_address2 VARCHAR(500),
  shipping_city VARCHAR(255) NOT NULL,
  shipping_state VARCHAR(100) NOT NULL,
  shipping_zip VARCHAR(20) NOT NULL,
  shipping_country VARCHAR(10) NOT NULL DEFAULT 'US',

  -- Totals (cents)
  subtotal_cents INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL,

  -- Tracking
  tracking_number VARCHAR(255),
  tracking_url TEXT,
  carrier VARCHAR(100),

  -- Optional: linked club member
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  printful_variant_id INTEGER NOT NULL,
  printful_product_id INTEGER NOT NULL,
  product_name VARCHAR(500) NOT NULL,
  variant_name VARCHAR(500) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_confirmation_code ON orders(confirmation_code);
CREATE INDEX IF NOT EXISTS idx_orders_paypal_order_id ON orders(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_printful_order_id ON orders(printful_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_email ON orders(buyer_email);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
