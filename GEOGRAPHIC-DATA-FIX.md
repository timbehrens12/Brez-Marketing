# Geographic Data Fix

This document provides instructions on how to fix the issue with the Customer Geography widget showing "No geographic data found" even after syncing customers.

## The Issue

The Customer Geography widget is trying to access columns (`city`, `state_province`, `country`) that don't exist in the `shopify_customers` table. Instead, this data is stored in the `default_address` JSONB field.

Additionally, the API was incorrectly trying to query a `brand_id` column in the `shopify_customers` table, but this table uses `connection_id` to link to brands through the `platform_connections` table.

## Solution

We need to:
1. Add the missing columns to the `shopify_customers` table
2. Extract the geographic data from the `default_address` JSONB field into these new columns
3. Update the customer sync process to populate these columns for new customers
4. Fix the geographic API endpoint to use `connection_id` instead of `brand_id`

## Step 1: Run the SQL Migration

1. Go to your Supabase dashboard: https://app.supabase.com/project/[your-project-id]
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/add_location_columns.sql` into the SQL Editor
4. Run the SQL script to add the columns and extract the data

The SQL script will:
- Add `city`, `state_province`, and `country` columns to the `shopify_customers` table
- Create indexes for these columns
- Extract the geographic data from the `default_address` JSONB field into these new columns
- Show a count of how many records were updated

## Step 2: Deploy the Updated Code

The code changes have already been made to:
1. Update the customer sync process to populate the new columns
2. Update the geographic API endpoint to use `connection_id` instead of `brand_id`
3. Add a fallback mechanism to ensure the map always shows data

Deploy the updated code to your production environment.

## Step 3: Sync Customers Again

After deploying the code changes:
1. Go to the Settings page in your dashboard
2. Click the "Sync Customers" button to sync customer data again
3. This will populate the new columns for all customers

## Step 4: Verify the Fix

1. Go to the Customer Geography widget in your dashboard
2. It should now show the geographic data correctly
3. If you still see "No geographic data found", check the browser console for any error messages

## Quick Fix for Testing

If you want to quickly test the fix without waiting for a full sync, you can run the `scripts/add_test_customer_location.sql` script:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/add_test_customer_location.sql` into the SQL Editor
4. Run the first query to find a customer ID
5. Replace `CUSTOMER_ID_HERE` with the actual ID from the query
6. Run the update query to add Houston location data to that customer
7. Run the verification query to confirm the update

## Troubleshooting

If you're still experiencing issues:

### Check the Database Structure

1. Go to your Supabase dashboard
2. Navigate to Table Editor > shopify_customers
3. Verify that the `city`, `state_province`, and `country` columns exist
4. If they don't exist, run the SQL script again

### Check the API Response

1. Open your browser's developer tools (F12)
2. Go to the Network tab
3. Look for a request to `/api/shopify/customers/geographic`
4. Check the response to see if it contains any error messages

### Check the Customer Data

1. Go to your Supabase dashboard
2. Navigate to Table Editor > shopify_customers
3. Check if any customers have values in the `city`, `state_province`, or `country` columns
4. If not, check the `default_address` column to see if it contains geographic data

### Check the Connection IDs

1. Go to your Supabase dashboard
2. Navigate to Table Editor > platform_connections
3. Verify that there are connections for your brand with platform_type = 'shopify'
4. Note the connection IDs
5. Check if there are customers in the shopify_customers table with those connection IDs 