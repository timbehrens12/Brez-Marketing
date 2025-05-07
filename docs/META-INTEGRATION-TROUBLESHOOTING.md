# Meta Integration Troubleshooting Guide

This guide provides detailed steps for troubleshooting issues with Meta (Facebook/Instagram) data integration in the Marketing Dashboard.

## Common Issues

### 1. No Meta Data Appearing in Dashboard

#### Possible Causes:

1. **Missing Database Table**: The `meta_ad_insights` table doesn't exist in your database
2. **No Active Campaigns**: Only draft campaigns in your Meta account
3. **New Campaign**: Recently created campaigns may take 24-48 hours to report data
4. **Connection Issues**: Invalid or expired access token
5. **Insufficient Campaign Activity**: Campaigns with no impressions or clicks won't show data

#### Troubleshooting Steps:

1. **Run the Diagnostic Endpoint**:
   - Navigate to `/api/meta/diagnose` in your browser
   - Check the response for connection status and any error messages

2. **Verify Database Table**:
   - Open your Supabase dashboard
   - Check if the `meta_ad_insights` table exists
   - If not, run the SQL script from `scripts/create-meta-tables.sql`

3. **Check Campaign Status in Meta Ads Manager**:
   - Log in to [Meta Ads Manager](https://business.facebook.com/adsmanager/)
   - Verify you have at least one active (not draft) campaign
   - Check if campaigns have any impressions or clicks

4. **Manually Refresh Meta Data**:
   - Go to the Meta tab in your dashboard
   - Click the "Refresh Meta Data" button
   - Watch for any error messages in the toast notifications

### 2. Campaign Names Not Appearing

#### Possible Causes:

1. **Sync Timing Issue**: Campaign data hasn't been properly synced
2. **Storage Issue**: Campaigns are fetched but not correctly stored
3. **Display Issue**: Data exists but isn't being displayed correctly

#### Troubleshooting Steps:

1. **Check Raw Data**:
   ```sql
   SELECT * FROM meta_ad_insights 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```
   - Run this in your Supabase SQL editor
   - Check if campaign names are stored in the database

2. **Force a Fresh Sync**:
   - Go to the Meta tab and click "Refresh Meta Data"
   - This will clear existing data and pull fresh data from Meta

3. **Check Network Requests**:
   - Open browser developer tools (F12) and go to the Network tab
   - Look for requests to `/api/meta/sync` and check their responses

### 3. Data Not Updating

#### Possible Causes:

1. **Caching Issues**: Browser or server-side caching
2. **Sync Schedule**: Automatic syncs may be scheduled infrequently
3. **Meta Data Delay**: Meta's reporting API typically has a 24-hour delay

#### Troubleshooting Steps:

1. **Force Browser Refresh**:
   - Use Ctrl+F5 (Windows) or Cmd+Shift+R (Mac) to bypass cache

2. **Check Last Sync Time**:
   ```sql
   SELECT MAX(created_at) FROM meta_ad_insights;
   ```
   - Run this in your Supabase SQL editor to see when data was last updated

3. **Manually Trigger Sync**:
   - Use the "Refresh Meta Data" button on the Meta tab

## Advanced Troubleshooting

### 1. Testing with Meta Test Accounts

Meta Business Manager allows you to create test ad accounts for development purposes:

1. Go to Business Settings in your Meta Business Manager
2. Navigate to Ad Accounts → Add → Create a Test Account
3. Create a simple campaign in the test account
4. Use this account for testing without spending real money

### 2. Checking API Responses Directly

You can test the Meta Marketing API directly:

1. Get your access token from your dashboard settings
2. Use a tool like Postman or curl to make requests:

```bash
curl -G \
  -d "fields=name,objective" \
  -d "access_token=YOUR_ACCESS_TOKEN" \
  "https://graph.facebook.com/v18.0/act_YOUR_AD_ACCOUNT_ID/campaigns"
```

### 3. Database Verification

Run these queries in your Supabase SQL editor to verify data:

```sql
-- Check if platform connection exists
SELECT * FROM platform_connections 
WHERE platform_name = 'meta' AND is_active = true;

-- Check if any data exists in the insights table
SELECT COUNT(*) FROM meta_ad_insights;

-- Check for specific campaign data
SELECT campaign_id, campaign_name, SUM(impressions) as total_impressions, SUM(clicks) as total_clicks
FROM meta_ad_insights
GROUP BY campaign_id, campaign_name;
```

### 4. Logging and Debugging

To enable more detailed logging:

1. Set `DEBUG=true` in your `.env.local` file
2. Restart the development server
3. Check console logs for detailed error messages related to Meta API calls

## Still Having Issues?

If you've tried all the steps above and are still experiencing problems:

1. Check the Meta Marketing API [status page](https://developers.facebook.com/status/dashboard/) for any outages
2. Review the [Meta Marketing API documentation](https://developers.facebook.com/docs/marketing-apis/) for any recent changes
3. Open an issue in the repository with detailed information about your problem and the steps you've already taken 