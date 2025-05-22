# Meta API Rate Limit Fix

This directory contains database migrations and code changes to address Meta API rate limiting issues affecting the overview widgets.

## The Problem

The Meta API has strict rate limits (80004 error code) which were causing the overview widgets to show zero values even when campaign data was available. When the API returns a rate limit error, the application was failing to gracefully handle this.

## The Solution

We've implemented the following improvements:

1. **Exponential Backoff and Retry Logic**: Added a robust retry mechanism for Meta API calls that uses exponential backoff.

2. **Cached Data Fallback**: When rate limited, the application now falls back to cached data instead of showing zeros.

3. **Rate Limit Tracking**: New database table `meta_sync_history` to track sync operations and detect rate limit patterns.

4. **Improved Error Handling**: API endpoints now return more graceful errors when rate limited.

## Applying Migrations

To apply the database migrations:

```bash
# Apply the Meta sync history table migration
npm run migrate:meta-sync

# Or apply any migration file
npm run migrate -- <migration-file.sql>
```

## Rate Limit Prevention Tips

1. **Space out API calls**: Avoid making multiple Meta API calls in rapid succession.

2. **Limit refresh frequency**: Don't refresh data more than once per hour.

3. **Use date range wisely**: Keep date ranges short to reduce the amount of data transferred.

4. **Check sync history**: Monitor the `meta_sync_history` table to identify patterns of rate limiting.

## Troubleshooting

If you continue experiencing rate limit issues:

1. Check the Meta Business Manager for any account restrictions
2. Verify the access token has the correct permissions
3. Consider implementing a "dark period" where no API calls are made (e.g., overnight)
4. Upgrade to a higher Meta Marketing API tier if available

## File Changes

The following files were modified:

1. `lib/services/meta-service.ts` - Added retry logic with exponential backoff
2. `app/api/meta/resync/route.ts` - Improved rate limit handling and cached data usage
3. `app/api/metrics/meta/route.ts` - Added cached data fallback for rate limits
4. `app/api/metrics/meta/single/clicks/route.ts` - Example of individual metric endpoint with improved rate limit handling 