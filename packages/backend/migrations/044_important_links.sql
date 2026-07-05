-- Important external links shown on the "Important Docs & Links" page.
-- Admin-managed pointers to resources like the Colorado 4-H Rule Book, Record Book,
-- Fair information, Leveling guides, show schedules, etc. Grouped by category.
CREATE TABLE IF NOT EXISTS important_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  url VARCHAR(1000) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  order_index INT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_important_links_is_active ON important_links(is_active);
CREATE INDEX IF NOT EXISTS idx_important_links_order_index ON important_links(order_index);

CREATE TRIGGER update_important_links_updated_at BEFORE UPDATE ON important_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
