-- Add metadata JSONB column to home_page_content for extra fields
-- (emoji icons for program areas, button text for CTA, etc.)
ALTER TABLE home_page_content ADD COLUMN IF NOT EXISTS metadata JSONB;
