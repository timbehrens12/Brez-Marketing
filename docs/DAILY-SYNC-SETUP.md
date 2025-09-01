# Daily Automated Sync Setup

This document explains how to set up the daily automated sync feature that will sync data for all brands automatically every day at 11:59 PM.

## Overview

The daily sync feature solves the problem where dashboard data only updates when users manually visit the dashboard. With this feature enabled:

- ✅ Data syncs automatically every day
- ✅ No missing data when users don't visit the dashboard
- ✅ Accurate comparisons and reports
- ✅ Works for all connected brands (Meta + Shopify)

## Required Environment Variables

Add these environment variables to your `.env.local` file:

```env
# Cron Job Security - Generate a secure random string
CRON_SECRET=your-secure-random-secret-here

# App URL for internal API calls (required for cron jobs)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### How to generate CRON_SECRET:
```bash
# Use any of these methods to generate a secure secret:
openssl rand -hex 32
# or
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# or
pwgen -s 64 1
```

## Database Migration

Run the database migration to create the sync logs table:

```sql
-- This migration is in: supabase/migrations/20250101_create_sync_logs_table.sql
-- It will be applied automatically on next Supabase deployment
```

Or run it manually in your Supabase SQL editor.

## Vercel Deployment

The cron job is configured in `vercel.json` to run daily at 11:59 PM UTC:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-sync",
      "schedule": "59 23 * * *"
    }
  ]
}
```

### Deploy to activate:
```bash
vercel --prod
```

## Manual Testing

You can manually trigger the sync for testing:

```bash
# Test the endpoint manually
curl -X POST "https://yourdomain.com/api/cron/daily-sync" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Or visit: `https://yourdomain.com/api/cron/daily-sync` in your browser (will require auth header)

## What Gets Synced

For each brand with active connections:

### Meta (Facebook/Instagram Ads)
- ✅ Ad insights data (last 7 days)
- ✅ Campaign performance metrics
- ✅ Ad spend, impressions, clicks, conversions
- ✅ ROAS, CTR, CPC data

### Shopify
- ✅ Order data and sales metrics
- ✅ Inventory levels and product data
- ✅ Customer information
- ✅ Revenue and conversion data

## Monitoring

### Check Sync Logs
You can monitor sync results in the `sync_logs` table:

```sql
SELECT 
  sync_type,
  brands_processed,
  created_at,
  results
FROM sync_logs 
WHERE sync_type = 'daily_automated'
ORDER BY created_at DESC
LIMIT 10;
```

### Vercel Function Logs
- Go to Vercel Dashboard → Your Project → Functions
- Click on the cron function to see execution logs
- Check for errors or successful completions

## Troubleshooting

### Common Issues:

1. **"Unauthorized" errors**
   - Check that `CRON_SECRET` is set correctly
   - Verify the Authorization header format

2. **"No brands found" message**
   - Verify brands have active platform connections
   - Check the `platform_connections` table

3. **Rate limiting errors**
   - Meta API has rate limits - the sync includes delays
   - Errors are logged but don't stop the entire process

4. **Timeout issues**
   - Each brand gets a 3-second delay to avoid overwhelming APIs
   - Large numbers of brands may take time but should complete

### Debug Mode:
Check the Vercel function logs for detailed output including:
- Which brands are being processed
- Success/failure status for each platform
- Record counts and error messages

## Configuration Options

### Change Sync Time
Edit the schedule in `vercel.json`:
```json
"schedule": "0 12 * * *"  // Run at noon UTC instead
```

### Sync More Historical Data
The Meta sync pulls 7 days by default. To change this, modify the `days` parameter in:
`app/api/cron/daily-sync/route.ts` line ~67

### Skip Certain Platforms
You can modify the sync logic to skip Meta or Shopify by commenting out the relevant sections in the daily sync endpoint.

## Success Criteria

After setup, you should see:
1. ✅ Daily entries in the `sync_logs` table
2. ✅ Fresh data in dashboard without manual visits
3. ✅ Accurate day-over-day comparisons
4. ✅ Zero "no data" states for connected brands

The sync runs at 11:59 PM UTC daily, ensuring data is ready for users the next day regardless of whether they visited the dashboard. 