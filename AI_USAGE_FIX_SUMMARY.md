# AI Usage Tracking Fix Summary

## Issues Fixed

### 1. Database Constraint Error - "brand_report" Not Allowed
**Problem**: The `ai_usage_tracking` table had a check constraint that didn't include `'brand_report'` as a valid feature type, causing inserts to fail with error code 23514.

**Solution**: Updated the database constraint to include `'brand_report'`:
```sql
ALTER TABLE public.ai_usage_tracking 
DROP CONSTRAINT IF EXISTS ai_usage_tracking_feature_type_check;

ALTER TABLE public.ai_usage_tracking 
ADD CONSTRAINT ai_usage_tracking_feature_type_check 
CHECK (feature_type IN (
    'campaign_recommendations',
    'health_report',
    'ai_consultant_chat',
    'marketing_analysis',
    'creative_analysis',
    'brand_analysis',
    'task_generation',
    'campaign_analysis',
    'smart_response',
    'enhanced_campaign_analysis',
    'creative_generation',
    'lead_gen_enrichment',
    'lead_gen_ecommerce',
    'outreach_messages',
    'brand_report'  -- ✅ ADDED
));
```

### 2. Chatbot Double-Counting Messages
**Problem**: The AI Marketing Consultant was recording usage twice per message:
1. Once in `ai_feature_usage` table via `recordAgencyModeUsage()`
2. Again in `ai_usage_tracking` table via `aiUsageService.recordUsage()`

This caused each chat message to count as 2 uses instead of 1.

**Solution**: Removed the redundant call to `aiUsageService.recordUsage()` in `app/api/ai/marketing-consultant/route.ts` (lines 533-542).

**Why this is correct**:
- The `checkCombinedUsage()` function checks the `ai_feature_usage` table for daily limits
- Therefore, we only need to record in `ai_feature_usage` (via `recordAgencyModeUsage`)
- The `ai_usage_logs` table is still being used for centralized logging (not counting)

## Files Modified

1. **Database**: `ai_usage_tracking` table constraint updated
2. **Code**: `app/api/ai/marketing-consultant/route.ts` - Removed duplicate usage recording

## Testing Recommendations

1. **Test brand_report feature**: Verify that brand report generation no longer throws constraint errors
2. **Test chatbot usage counting**: Send a few messages and verify each message only counts as 1 use (not 2)
3. **Check remaining uses display**: Verify the UI correctly shows remaining daily chat uses

## Tables Used for Usage Tracking

- `ai_feature_usage`: Used for daily/monthly limits checking (especially for chatbot)
- `ai_usage_tracking`: Used for dashboard counters and feature-specific tracking
- `ai_usage_logs`: Used for centralized logging/analytics (not for limit checking)

## Additional Notes

The constraint now includes all valid feature types:
- `campaign_recommendations`
- `health_report`
- `ai_consultant_chat`
- `marketing_analysis`
- `creative_analysis`
- `brand_analysis`
- `task_generation`
- `campaign_analysis`
- `smart_response`
- `enhanced_campaign_analysis`
- `creative_generation`
- `lead_gen_enrichment`
- `lead_gen_ecommerce`
- `outreach_messages`
- `brand_report` ✅ NEW

