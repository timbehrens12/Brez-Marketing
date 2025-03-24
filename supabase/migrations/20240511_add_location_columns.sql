-- Add location columns to shopify_customers table
ALTER TABLE IF EXISTS shopify_customers 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state_province TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_shopify_customers_city ON shopify_customers(city);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_state_province ON shopify_customers(state_province);
CREATE INDEX IF NOT EXISTS idx_shopify_customers_country ON shopify_customers(country);

-- Update existing records to extract location data from default_address
UPDATE shopify_customers
SET 
  city = default_address->>'city',
  state_province = default_address->>'province',
  country = default_address->>'country'
WHERE default_address IS NOT NULL; 