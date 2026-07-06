-- Seed the custom catalog with the club's apparel line, from Alpine Apparel's
-- March quote (at-cost pricing). Admins can edit/hide/delete these in the
-- Catalog admin tab afterward. Runs once (tracked by the migration runner).

INSERT INTO catalog_products (item_type, name, brand_style, blank_cost_cents, colors, sizes, is_visible, credit_eligible, sort_order) VALUES
  ('Tee', 'Club T-Shirt', 'Bella 3001CVC', 500,
   '[{"name":"Army Green","hex":"#4b5320"},{"name":"Black","hex":"#000000"}]'::jsonb,
   '["Youth S","Youth M","Youth L","Adult S","Adult M","Adult L","Adult XL"]'::jsonb, TRUE, TRUE, 1),
  ('Tank', 'Club Tank', 'Gildan 64200L', 450,
   '[{"name":"Black","hex":"#000000"}]'::jsonb,
   '["Adult S","Adult M","Adult L","Adult XL"]'::jsonb, TRUE, TRUE, 2),
  ('Crew', 'Club Crew Sweatshirt', 'Gildan SF000', 1025,
   '[{"name":"Black","hex":"#000000"}]'::jsonb,
   '["Youth S","Youth M","Youth L","Adult S","Adult M","Adult L","Adult XL"]'::jsonb, TRUE, TRUE, 3),
  ('Hoodie', 'Club Hoodie', 'Gildan SF500', 1250,
   '[{"name":"Black","hex":"#000000"}]'::jsonb,
   '["Youth S","Youth M","Youth L","Adult S","Adult M","Adult L","Adult XL"]'::jsonb, TRUE, TRUE, 4),
  ('Sweatpants', 'Club Sweatpants', 'Gildan 18100', 900,
   '[{"name":"Black","hex":"#000000"}]'::jsonb,
   '["Youth S","Youth M","Youth L","Adult S","Adult M","Adult L","Adult XL"]'::jsonb, TRUE, TRUE, 5);

-- Front logo + back name for shirts/fleece (front print $6, name $5)
INSERT INTO catalog_decorations (product_id, decoration_type, label, placement_options, price_cents, requires_text, sort_order)
SELECT id, 'front_logo', 'Front Logo', '["full_front","left_chest"]'::jsonb, 600, FALSE, 0
FROM catalog_products WHERE name IN ('Club T-Shirt', 'Club Tank', 'Club Crew Sweatshirt', 'Club Hoodie');

INSERT INTO catalog_decorations (product_id, decoration_type, label, placement_options, price_cents, requires_text, sort_order)
SELECT id, 'back_name', 'Name on Back', '[]'::jsonb, 500, TRUE, 1
FROM catalog_products WHERE name IN ('Club T-Shirt', 'Club Tank', 'Club Crew Sweatshirt', 'Club Hoodie');

-- Sweatpants: leg logo ($7) + leg name ($4)
INSERT INTO catalog_decorations (product_id, decoration_type, label, placement_options, price_cents, requires_text, sort_order)
SELECT id, 'leg_logo', 'Leg Logo', '["left_leg","right_leg"]'::jsonb, 700, FALSE, 0
FROM catalog_products WHERE name = 'Club Sweatpants';

INSERT INTO catalog_decorations (product_id, decoration_type, label, placement_options, price_cents, requires_text, sort_order)
SELECT id, 'leg_name', 'Leg Name', '["left_leg","right_leg"]'::jsonb, 400, TRUE, 1
FROM catalog_products WHERE name = 'Club Sweatpants';
