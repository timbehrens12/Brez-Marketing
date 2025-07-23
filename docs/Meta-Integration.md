# Meta Integration with Date Range Filtering

This document outlines the implementation of the Meta (Facebook/Instagram) integration with date range filtering capabilities.

## Overview

The Meta integration connects to the Facebook Marketing API to retrieve campaign data and displays it in the dashboard. The integration now supports filtering campaign data by date range, allowing users to view performance metrics for specific time periods.

## Architecture

The implementation consists of several components:

1. **Database Schema**: A new table `meta_campaign_daily_stats` stores daily campaign metrics
2. **Campaign Sync Process**: Updates campaign data and stores daily metrics
3. **API Endpoints**: Retrieves campaign data filtered by date range
4. **UI Components**: Display campaign data with date range filtering controls

## Database Schema

The `meta_campaign_daily_stats` table stores daily metrics for each campaign:

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

## Campaign Sync Process

The campaign sync process has been enhanced to:

1. Fetch campaign details from the Meta API
2. Retrieve daily insights for each campaign (last 90 days)
3. Calculate metrics for each day including spend, impressions, CTR, CPC, and ROAS
4. Store daily metrics in the `meta_campaign_daily_stats` table

## API Endpoints

Two main API endpoints handle campaign data:

1. `/api/meta/campaigns/sync` - Syncs campaign data and daily stats
2. `/api/meta/campaigns/date-range` - Retrieves campaign data for a specific date range

The date-range endpoint accepts the following parameters:
- `brandId` (required): The brand ID
- `fromDate` (required): Start date in YYYY-MM-DD format
- `toDate` (required): End date in YYYY-MM-DD format
- `status` (optional): Filter by campaign status
- `limit` (optional): Maximum number of campaigns to return
- `sortBy` (optional): Field to sort by
- `sortOrder` (optional): Sort order (asc/desc)

## UI Components

The UI has been updated to support date range filtering:

1. **MetaTab**: Now includes date range picker and fetches data using the new API
2. **CampaignWidget**: Displays campaign metrics based on the selected date range

## Implementation Details

### Fetching Campaign Insights

The `fetchCampaignInsights` helper function retrieves daily insights from the Meta API:

```javascript
async function fetchCampaignInsights(accessToken, campaignId, startDateStr, endDateStr) {
  console.log(`Fetching insights for campaign ${campaignId} from ${startDateStr} to ${endDateStr}`);
  try {
    const insightsUrl = `https://graph.facebook.com/v19.0/${campaignId}/insights?fields=impressions,reach,clicks,spend,inline_link_clicks,objective,cost_per_inline_link_click,conversion_values,conversions&time_range[since]=${startDateStr}&time_range[until]=${endDateStr}&time_increment=1&access_token=${accessToken}`;
    
    const response = await fetch(insightsUrl);
    const data = await response.json();
    
    if (data.error) {
      console.error(`Error fetching insights for campaign ${campaignId}:`, data.error);
      return [];
    }
    
    return data.data || [];
  } catch (error) {
    console.error(`Failed to fetch insights for campaign ${campaignId}:`, error);
    return [];
  }
}
```

### Calculating Metrics

The sync process calculates daily metrics for each campaign:

1. Spend, impressions, clicks, reach, and conversions are retrieved directly from the API
2. CTR (Click-Through Rate) is calculated as clicks / impressions
3. CPC (Cost Per Click) is calculated as spend / clicks
4. Cost per conversion is calculated as spend / conversions
5. ROAS (Return on Ad Spend) is calculated as conversion value / spend

### Data Aggregation

The date-range API aggregates metrics across the specified date range:

```javascript
const aggregatedCampaigns = await supabase
  .from('meta_campaign_daily_stats')
  .select(`
    campaign_id,
    brand_id,
    SUM(spend) as total_spend,
    SUM(impressions) as total_impressions,
    SUM(clicks) as total_clicks,
    SUM(reach) as total_reach,
    SUM(conversions) as total_conversions
  `)
  .eq('brand_id', brandId)
  .gte('date', fromDate)
  .lte('date', toDate)
  .groupBy('campaign_id, brand_id');
```

## Usage

To use date range filtering:

1. Select a date range using the date picker in the MetaTab
2. The dashboard will fetch campaign data for the selected date range
3. Metrics will be aggregated for the selected period
4. Trends will be calculated by comparing with the previous period of equal length

## Future Improvements

Planned enhancements for the date range filtering:
- Add preset periods (last 7 days, last 30 days, etc.)
- Implement campaign comparison between different date ranges
- Add visualization for daily performance trends 