# Demographics Sync Timeout Fix

## Problem
The `/api/meta/demographics/sync` endpoint was timing out after 15 seconds because it was doing heavy work synchronously instead of just enqueueing jobs.

## Root Cause
1. **Heavy synchronous work**: The endpoint called `startComprehensiveSync()` which created hundreds of jobs with individual database queries
2. **Sequential database operations**: Each job creation involved a SELECT to check existence + INSERT/UPDATE
3. **No proper queueing**: Jobs were created in the request thread instead of background processing

## Solution
Redesigned the sync endpoint to be **enqueue-only**:

### 1. Fast Enqueue Pattern
- **Before**: Creates hundreds of jobs synchronously (15+ seconds)
- **After**: Creates single "trigger" job (< 500ms) that spawns other jobs in background

### 2. Batch Operations
- **Before**: Individual database queries for each job (N * 2 queries)
- **After**: Single batch upsert operation (1 query)

### 3. Two-Phase Processing
1. **Phase 1** (Enqueue): Creates lightweight trigger job, returns 202 immediately
2. **Phase 2** (Background): Trigger job creates all actual sync jobs via worker

## Files Changed

### `/app/api/meta/demographics/sync/route.ts`
- Made `start_full_sync` action enqueue-only
- Creates single trigger job instead of hundreds of sync jobs
- Returns 202 status in < 500ms
- Added better logging

### `/app/api/meta/demographics/process-jobs/route.ts`
- Added support for processing trigger jobs
- Calls `processTriggerJob()` for special trigger jobs

### `/lib/services/metaDemographicsService.ts`
- Added `processTriggerJob()` method
- Optimized `queueJobs()` to use batch upserts
- Removed individual existence checks

## Testing

### Test Endpoint
```bash
curl -X POST https://www.brezmarketingdashboard.com/api/test/demographics-enqueue \
  -H "Content-Type: application/json" \
  -d '{"brandId": "your-brand-id"}'
```

### Expected Results
- Response time: < 2 seconds (ideally < 500ms)
- Status: 202 (Accepted)
- Response: `{"success": true, "queued": true, "jobKey": "..."}`

### Logs to Look For
```
[Demographics Sync] Starting enqueue-only sync for brand 1a30f34b...
[Demographics Sync] ✅ Enqueued trigger job meta_demographics_sync:1a30f34b:1726502823000
[Demographics Trigger] Starting job processing for brand 1a30f34b...
[Demographics Processor] Processing trigger job meta_demographics_sync:1a30f34b:1726502823000
[Demographics Service] Batch creating 120 jobs
[Demographics Service] ✅ Batch created 120 jobs
```

## Environment Setup Needed

The fix also requires proper Redis/queue setup in production:

1. **Set Redis environment variables** in Vercel:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

2. **Ensure cron/worker targets production**:
   - Cron jobs should call `https://www.brezmarketingdashboard.com/api/cron/process-queue`
   - Not preview domains like `*.vercel.app`

3. **Set CRON_SECRET** in production environment

## Benefits
- ✅ No more 15-second timeouts
- ✅ Fast UI response (< 500ms)
- ✅ Proper background processing
- ✅ Better error handling and logging
- ✅ Scalable architecture for high job volumes
