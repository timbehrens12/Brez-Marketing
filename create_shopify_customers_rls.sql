-- Enable Row Level Security on the shopify_customers table
ALTER TABLE shopify_customers ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow all operations for authenticated users
CREATE POLICY "Allow all operations for authenticated users"
  ON shopify_customers
  USING (auth.role() = 'authenticated');

-- Create a policy for all operations (as a fallback)
CREATE POLICY "Allow all operations"
  ON shopify_customers
  FOR ALL
  USING (true);

-- Grant all privileges on the table to authenticated users
GRANT ALL ON shopify_customers TO authenticated;
GRANT ALL ON shopify_customers TO anon;
GRANT ALL ON shopify_customers TO service_role; 