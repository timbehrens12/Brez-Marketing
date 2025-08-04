# Fix for Meta Campaign Budgets View

This README explains the issue with the `meta_campaign_budgets` view that caused the Supabase project to crash and how to fix it.

## Problem

According to Supabase support:

> "Your project was failing to restore because the backup sql file had a view defined on a table with the same name. This view definition and any references to it were commented out from the backup file to ensure the project is restored successfully."

Specifically, there was a recursive definition where:
1. A table named `meta_campaign_budgets` existed
2. A view was also created with the same name `meta_campaign_budgets`
3. The view was trying to select from itself, causing a recursive definition that Postgres couldn't handle

## Solution

The fix script `fix-meta-campaign-budgets-view.sql` resolves this issue by:

1. Checking if both a view and a table with the name `meta_campaign_budgets` exist
2. If both exist, dropping the view and creating a new view with a different name (`meta_campaign_budgets_view`)
3. Updating any dependent functions to use the new view name
4. If only one exists (either view or table), ensuring it's correctly defined without recursion

## How to Use

1. Connect to your Supabase database using the SQL editor in the Supabase dashboard
2. Copy and paste the contents of `fix-meta-campaign-budgets-view.sql` into the SQL editor
3. Run the script
4. Check the logs to see what actions were taken (look for NOTICE messages)

## Verification

After running the script, you can verify that the issue is fixed by:

```sql
-- Check if the view exists with the correct name
SELECT * FROM pg_views WHERE viewname = 'meta_campaign_budgets_view';

-- Test that the get_campaign_budgets function works correctly
SELECT * FROM get_campaign_budgets('your-brand-uuid-here') LIMIT 5;
```

## Preventative Measures

To avoid this issue in the future:
1. Never create a view with the same name as an existing table
2. Use clear naming conventions (e.g., add a `_view` suffix to view names)
3. Always test database changes in a development environment before applying to production

## Restore Process

If you need to restore your database again:
1. Run this fix script immediately after restoration
2. Verify all functions are working correctly
3. If any issues persist, contact Supabase support 