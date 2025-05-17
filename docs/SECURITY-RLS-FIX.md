# Row Level Security (RLS) Fix

## Issue

Supabase has detected that several tables in your database do not have Row Level Security (RLS) enabled. This is a security concern because it means that any authenticated user could potentially access all data in these tables without restrictions.

The following tables are affected:
- `public.brands`
- `public.shopify_orders`
- `public.meta_data_tracking`
- `public.platform_connections`

## What is Row Level Security?

Row Level Security (RLS) is a feature that allows you to control which rows in a table a user can access. It's an important security feature that helps protect your data from unauthorized access.

When RLS is enabled, you can create policies that determine which rows a user can see or modify. Without RLS, any user with access to the table can see all rows.

## How to Fix

### Option 1: Using the Supabase Dashboard

1. Log in to your Supabase dashboard
2. Navigate to the "Table Editor" section
3. For each affected table:
   - Click on the table name
   - Go to the "Policies" tab
   - Click "Enable RLS"
   - Create a policy that allows authenticated users to access the data

### Option 2: Using SQL (Recommended)

We've created a SQL script that will enable RLS on all affected tables and create appropriate policies. To run this script:

1. Log in to your Supabase dashboard
2. Navigate to the "SQL Editor" section
3. Open the file `scripts/enable_rls.sql` from your project
4. Run the script

The script will:
- Enable RLS on all affected tables
- Create policies that allow authenticated users to access the data
- Verify that RLS is enabled on all tables

```sql
-- Example of what the script does:
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users on brands"
  ON public.brands
  USING (auth.role() = 'authenticated');
```

## Verifying the Fix

After running the script, you can verify that RLS is enabled by:

1. Checking the Supabase dashboard for each table
2. Running the following SQL query:

```sql
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM 
  pg_tables 
WHERE 
  schemaname = 'public' AND 
  tablename IN ('brands', 'shopify_orders', 'meta_data_tracking', 'platform_connections');
```

All tables should show `rowsecurity = true`.

## Troubleshooting

If you encounter issues after enabling RLS (such as your application not being able to access data), you may need to adjust your policies. The script includes commented-out fallback policies that are more permissive. You can uncomment and run these if needed, but be aware that they provide less security.

## Additional Security Considerations

While enabling RLS is an important step, consider these additional security measures:

1. **Granular Policies**: Create more specific policies based on user roles or data ownership
2. **JWT Claims**: Use JWT claims to further restrict access based on user attributes
3. **Regular Audits**: Regularly audit your RLS policies to ensure they're working as expected

For more information, see the [Supabase documentation on Row Level Security](https://supabase.com/docs/guides/auth/row-level-security). 