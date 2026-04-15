-- Printful product cache: stores full API response for each synced product
CREATE TABLE IF NOT EXISTS printful_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  printful_id BIGINT UNIQUE NOT NULL,
  external_id VARCHAR(255),
  name VARCHAR(500) NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  printful_data JSONB NOT NULL,
  synced_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Product curation layer: admin controls for shop visibility and pricing
CREATE TABLE IF NOT EXISTS shop_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  printful_product_id UUID NOT NULL REFERENCES printful_products(id) ON DELETE CASCADE,
  is_visible BOOLEAN NOT NULL DEFAULT FALSE,
  retail_price_cents INTEGER,
  credit_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(printful_product_id)
);

CREATE INDEX IF NOT EXISTS idx_printful_products_printful_id ON printful_products(printful_id);
CREATE INDEX IF NOT EXISTS idx_shop_products_visible ON shop_products(is_visible) WHERE is_visible = TRUE;
CREATE INDEX IF NOT EXISTS idx_shop_products_printful_product_id ON shop_products(printful_product_id);
