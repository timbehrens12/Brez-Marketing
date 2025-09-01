# Meta Connection Fix Guide

This guide provides instructions for fixing Meta connection issues that may cause the Meta tab to show zeros in the dashboard.

## The Issues

1. **Missing Ad Account ID**: The platform_connections table is missing the `ad_account_id` in the metadata field
2. **Rate Limiting**: Meta API has strict rate limits that can cause data to fail to load

## Solution Overview

We've implemented several fixes:

1. Added a "Fix Connection" button in the Meta tab to automatically update the connection metadata
2. Improved rate limiting handling with exponential backoff and retry logic
3. Added cached data fallback when rate limited
4. Created a script to update all Meta connections with missing ad_account_id

## How to Fix

### Method 1: Using the UI (Recommended)

1. Go to the dashboard and select the Meta tab
2. Click the "Fix Connection" button next to "Meta Data Overview"
3. Wait for the page to reload
4. Click the circular refresh button to reload the Meta data
5. The widgets and campaign data should now display correctly

### Method 2: Using the API

```bash
# Replace BRAND_ID with your actual brand ID
curl -X POST https://brezmarketingdashboard.com/api/meta/update-connection \
  -H "Content-Type: application/json" \
  -d '{"brandId":"BRAND_ID", "forceUpdate": true}'
```

### Method 3: Using the Node.js Script

Run the update-meta-connections script:

```bash
npm run update-meta-connections
```

## Technical Details

The implementation adds:

1. A new API endpoint `/api/meta/update-connection` for updating Meta connections
2. An `ensureAdAccountId` helper function in the meta-service.ts file
3. Auto-recovery in the campaign-status-check route
4. Improved error handling for rate limits

## Additional Tips

- Limit API requests by avoiding rapid refreshes
- Use the "Fix Connection" button if you see zeros in the Meta tab
- Wait at least 1 minute between refreshes to avoid hitting rate limits

## For Developers

- Review migrations/meta_sync_history.sql for the database changes
- See scripts/update_meta_connections.js for the batch update script
- All core fixes are in lib/services/meta-service.ts and app/api/meta/campaign-status-check/route.ts 