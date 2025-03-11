# Product Performance Tables Setup Guide

This guide explains how to set up the product performance tracking tables in your database and addresses common issues you might encounter.

## Type Mismatch Error

If you encounter the following error when running the original `create_product_performance_tables.sql` script:

```
ERROR:  42883: operator does not exist: text = uuid
HINT:  No operator matches the given name and argument types. You might need to add explicit type casts.
```

This error occurs because of a type mismatch between columns in your database. Specifically, the script is trying to compare a text value with a UUID value, which PostgreSQL doesn't allow without explicit casting.

## Solution: Fixed Scripts

We've created fixed versions of the scripts that address this issue by changing the data types to be consistent:

1. **Table Creation Script**: `scripts/fix_product_performance_tables.sql`
   - Changed `connection_id` columns from UUID to TEXT type
   - Simplified RLS policies to avoid type casting issues

2. **Data Population Script**: `scripts/fix_populate_product_performance.sql`
   - Updated to work with the TEXT type for connection_id
   - Added explicit casting from UUID to TEXT where needed

3. **RLS Policies Script**: `scripts/fix_rls_policies.sql`
   - Created simplified RLS policies that avoid type casting
   - Added policies for both authenticated users and service roles

## Setup Instructions

Follow these steps to set up the product performance tracking system:

### Step 1: Create the Tables

Run the fixed table creation script:

```sql
\i scripts/fix_product_performance_tables.sql
```

This will create all the necessary tables with the correct data types and simple RLS policies.

### Step 2: Set Up RLS Policies (Optional)

If you want more detailed RLS policies, run:

```sql
\i scripts/fix_rls_policies.sql
```

This will set up more comprehensive RLS policies for the tables.

### Step 3: Populate with Sample Data

To populate the tables with sample data, run:

```sql
\i scripts/fix_populate_product_performance.sql
```

This will insert sample data for products, relationships, reviews, views, returns, and inventory turnover.

## Verifying the Setup

To verify that the tables were created correctly, run:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'product_%';
```

To verify that RLS is enabled, run:

```sql
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM 
  pg_tables 
WHERE 
  schemaname = 'public' 
  AND tablename IN (
    'product_views',
    'product_returns',
    'product_relationships',
    'inventory_turnover',
    'product_reviews',
    'product_performance_metrics'
  );
```

## Understanding the Data Model

The product performance tracking system consists of the following tables:

1. **product_performance_metrics**: Core metrics for each product
2. **product_relationships**: Relationships between products (cross-sells, upsells)
3. **product_reviews**: Customer reviews and ratings
4. **product_views**: Detailed tracking of product page views
5. **product_returns**: Information about returned products
6. **inventory_turnover**: Inventory movement and turnover rates

## Troubleshooting

### Other Type Mismatch Errors

If you encounter other type mismatch errors, check the data types of the columns involved. You may need to add explicit casts or modify the column types to ensure compatibility.

### RLS Policy Errors

If you encounter errors with RLS policies, try using the simplified policies in `fix_rls_policies.sql` which use `USING (true)` to allow all operations for authenticated users.

### Connection Issues

Make sure you have at least one Shopify connection in the `platform_connections` table before running the populate script, as it needs a valid connection ID to associate the data with. 