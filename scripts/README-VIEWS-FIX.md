# Meta Views Widget Fix

This document provides instructions to fix the Views widget in the Meta dashboard.

## Issue Overview

The Meta API no longer supports the `page_views` field in the insights API. We need to:
1. Use `reach` data from the Meta API to power our Views widget
2. Store the reach data in a dedicated `views` column in the database

## Fix Steps

### 1. Add the views column to the database

Run the following SQL in your database:

```sql
-- Add views column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'meta_ad_insights' 
    AND column_name = 'views'
  ) THEN
    -- Add views column if it doesn't exist
    ALTER TABLE public.meta_ad_insights ADD COLUMN views INTEGER DEFAULT 0;
    
    -- Update existing records to set views = reach
    UPDATE public.meta_ad_insights SET views = reach WHERE reach IS NOT NULL;
    
    RAISE NOTICE 'Views column added and populated from reach data';
  ELSE
    RAISE NOTICE 'Views column already exists';
  END IF;
END $$;
```

You can use your database management tool or run:
```bash
psql YOUR_DATABASE_URL -f scripts/add-views-column.sql
```

### 2. Update your code

We've already updated the following files:
- `lib/services/meta-service.ts`: Removed `page_views` from the API request and updated the enriched insights mapping
- `app/api/metrics/meta/single/views/route.ts`: Updated to use the `views` column
- `components/dashboard/platforms/tabs/MetaTab.tsx`: Updated to use the Views widget

### 3. Resync Meta data

1. Go to the Meta Fix Utility page: `/admin/meta-fix`
2. Enter your brand ID
3. Click "Force Resync" to pull fresh data

### 4. Verify the fix

1. Go to your Meta dashboard
2. Check that the Views widget now displays data correctly

## Additional Information

- The `views` column stores data from the `reach` field in the Meta API
- This approach is more reliable than using the deprecated `page_views` field
- The database update only needs to be run once per database 