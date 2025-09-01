# Database Scripts

This directory contains SQL scripts for database schema modifications and data migrations.

## Recent Updates

### Meta Campaign Daily Stats (2025-03-31)

Added support for daily campaign metrics tracking to enable date-range filtering in the dashboard:

1. Created a new `meta_campaign_daily_stats` table to store campaign metrics per day
2. Updated the campaign sync process to store daily data for each campaign
3. Added a new API endpoint at `/api/meta/campaigns/date-range` to fetch campaign data for specific date ranges
4. Modified the MetaTab component to use the new date-range API when a date range is selected

The new implementation ensures that:
- Campaign performance metrics accurately reflect the selected date range
- Historical data is preserved for trend analysis
- The UI shows consistent data across all widgets based on the date selection

### How to Apply the Changes

Execute the `create_campaign_daily_stats.sql` script in the Supabase SQL Editor to create the new table:

```sql
CREATE TABLE IF NOT EXISTS meta_campaign_daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  campaign_id VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  spend DECIMAL(12,2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  ctr DECIMAL(10,4) DEFAULT 0,
  cpc DECIMAL(12,4) DEFAULT 0,
  cost_per_conversion DECIMAL(12,4) DEFAULT 0,
  roas DECIMAL(12,4) DEFAULT 0,
  last_refresh_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add a composite unique constraint to prevent duplicates
  UNIQUE(campaign_id, date)
);
```

Once the table is created, the next Meta campaign sync will automatically populate it with daily data. 