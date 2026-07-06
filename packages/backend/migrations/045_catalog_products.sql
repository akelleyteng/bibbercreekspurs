-- Phase A: custom screen-print catalog (Alpine Apparel).
-- The club maintains its own product templates (no vendor API). A product is a
-- garment blank + color/size options + optional priced decorations. Coexists with
-- the legacy Printful catalog (037) during the pivot; the shop will switch to this.

CREATE TABLE IF NOT EXISTS catalog_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type VARCHAR(50) NOT NULL,               -- Tee, Tank, Crew, Hoodie, Sweatpants, ...
  name VARCHAR(255) NOT NULL,                    -- display name, e.g. "Club Hoodie"
  brand_style VARCHAR(255),                      -- blank brand/style, e.g. "Gildan SF500"
  description TEXT,
  image_url TEXT,
  blank_cost_cents INTEGER NOT NULL DEFAULT 0,   -- vendor cost of the blank garment
  colors JSONB NOT NULL DEFAULT '[]'::jsonb,     -- [{ "name": "Black", "hex": "#000000" }]
  sizes JSONB NOT NULL DEFAULT '[]'::jsonb,      -- ["Youth S", "Adult M", ...]
  is_visible BOOLEAN NOT NULL DEFAULT FALSE,
  credit_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Optional, priced decoration options a shopper can add to a product
-- (front logo, name on back, sweatpants leg logo/name).
CREATE TABLE IF NOT EXISTS catalog_decorations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
  decoration_type VARCHAR(30) NOT NULL
    CHECK (decoration_type IN ('front_logo', 'back_name', 'leg_logo', 'leg_name')),
  label VARCHAR(255) NOT NULL,                   -- e.g. "Front Logo", "Name on Back"
  placement_options JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ["full_front", "left_chest"]
  price_cents INTEGER NOT NULL DEFAULT 0,
  requires_text BOOLEAN NOT NULL DEFAULT FALSE,  -- true for name personalization
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_catalog_products_visible ON catalog_products(is_visible) WHERE is_visible = TRUE;
CREATE INDEX IF NOT EXISTS idx_catalog_products_sort ON catalog_products(sort_order);
CREATE INDEX IF NOT EXISTS idx_catalog_decorations_product ON catalog_decorations(product_id);

CREATE TRIGGER update_catalog_products_updated_at BEFORE UPDATE ON catalog_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
