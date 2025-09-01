-- Add Houston location to a customer for testing
-- First, find a customer to update
SELECT id, customer_id, first_name, last_name, default_address
FROM public.shopify_customers
LIMIT 1;

-- Then, update that customer with Houston location data
-- Replace 'CUSTOMER_ID_HERE' with the actual ID from the query above
UPDATE public.shopify_customers
SET 
  city = 'Houston',
  state_province = 'Texas',
  country = 'United States'
WHERE id = 'CUSTOMER_ID_HERE';

-- Verify the update
SELECT id, customer_id, first_name, last_name, city, state_province, country
FROM public.shopify_customers
WHERE city = 'Houston'; 