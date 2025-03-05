# Shopify Inventory Setup

This document provides instructions on how to set up the Shopify inventory feature.

## Issue: Inventory Widgets Show 0s

If your inventory widgets are showing 0s and the `shopify_inventory` table is empty, follow these steps to fix the issue:

### Step 1: Create the Shopify Inventory Table

#### Option A: Complete Setup (Recommended)
1. Go to your Supabase dashboard: https://app.supabase.com/project/dyqzzhgozwimkftmqcf
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/fix-inventory-table.sql` into the SQL Editor
4. Run the SQL script to create the table and set up permissions

If you encounter an error with Option A, try Option B:

#### Option B: Simple Setup (Fallback)
1. Go to your Supabase dashboard: https://app.supabase.com/project/dyqzzhgozwimkftmqcf
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/simple-inventory-table.sql` into the SQL Editor
4. Run the SQL script to create the table and set up permissions

If you still encounter errors, try Option C:

#### Option C: Minimal Setup (Last Resort)
1. Go to your Supabase dashboard: https://app.supabase.com/project/dyqzzhgozwimkftmqcf
2. Navigate to the SQL Editor
3. Copy and paste the contents of `scripts/minimal-inventory-table.sql` into the SQL Editor
4. Run the SQL script to create the table with minimal constraints

### Step 2: Sync Inventory Data

1. In your dashboard, go to the Shopify tab
2. Click the "Sync Inventory" button to manually sync inventory data from Shopify
3. Check the browser console for any error messages (F12 > Console)

### Step 3: Verify Data in Supabase

1. Go to your Supabase dashboard
2. Navigate to Table Editor > shopify_inventory
3. Verify that data has been synced from Shopify

## Troubleshooting

If you're still experiencing issues:

### Database Structure Issues

If you see errors like:
- `ERROR: 42703: column "connection_id" does not exist`
- `ERROR: 42883: operator does not exist: text = uuid`

These indicate issues with the database structure. Try the following:

1. Use Option B (Simple Setup) from Step 1 above
2. If that doesn't work, use Option C (Minimal Setup)
3. If you're still having issues, check if the `platform_connections` table exists in your database
4. If it exists, check its structure to ensure it has an `id` column with the correct data type

### Check API Version

The Shopify API version in the sync code might be incorrect. We've updated it to use `2023-04` instead of `2024-01`. If you're still having issues, try changing the API version in `app/api/shopify/inventory/sync/route.ts`:

```typescript
let url = `https://${connection.shop}/admin/api/2023-04/products.json?limit=250&fields=id,title,variants`
```

Try different API versions like `2023-07` or `2023-10` if needed.

### Check Shopify Access Token

Ensure your Shopify access token has the necessary permissions to access inventory data. You might need to reconnect your Shopify store to refresh the token.

### Enable Debug Logging

We've added detailed logging to help diagnose issues. Check your browser console and server logs for more information.

## Contact Support

If you're still experiencing issues, please contact support with the following information:
- Screenshots of any error messages
- Browser console logs
- Server logs (if available)
- Supabase table structure 