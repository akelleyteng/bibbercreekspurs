-- Phase A4: order collection for the custom catalog. Login-gated; no online
-- payment yet (Phase B) — orders default to "pay at pickup" / unpaid. Items ship
-- to the club in a bulk batch (A5), so no shipping address. Separate from the
-- legacy Printful `orders` table.

CREATE TYPE catalog_order_status AS ENUM (
  'PENDING',        -- collected, awaiting a bulk batch
  'SUBMITTED',      -- included in a batch sent to the vendor
  'IN_PRODUCTION',
  'RECEIVED',       -- back from the vendor
  'DISTRIBUTED',    -- handed out
  'CANCELLED'
);

CREATE TYPE catalog_payment_status AS ENUM ('UNPAID', 'PAID', 'CREDITED');

CREATE TABLE IF NOT EXISTS catalog_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  confirmation_code VARCHAR(20) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  buyer_name VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255) NOT NULL,
  status catalog_order_status NOT NULL DEFAULT 'PENDING',
  payment_status catalog_payment_status NOT NULL DEFAULT 'UNPAID',
  payment_method VARCHAR(20) NOT NULL DEFAULT 'at_pickup', -- 'paypal' | 'at_pickup'
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  batch_id UUID, -- set when included in a vendor batch (A5)
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS catalog_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES catalog_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES catalog_products(id) ON DELETE SET NULL,
  -- snapshot of the configuration at order time (stable if the catalog changes)
  product_name VARCHAR(255) NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  color VARCHAR(60),
  size VARCHAR(60),
  decorations JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{ "label","text","placement","priceCents" }]
  unit_price_cents INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_catalog_orders_user ON catalog_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_catalog_orders_status ON catalog_orders(status);
CREATE INDEX IF NOT EXISTS idx_catalog_orders_batch ON catalog_orders(batch_id);
CREATE INDEX IF NOT EXISTS idx_catalog_orders_confirmation ON catalog_orders(confirmation_code);
CREATE INDEX IF NOT EXISTS idx_catalog_order_items_order ON catalog_order_items(order_id);

CREATE TRIGGER update_catalog_orders_updated_at BEFORE UPDATE ON catalog_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
