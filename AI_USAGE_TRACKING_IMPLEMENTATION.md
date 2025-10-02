# AI Usage Tracking Implementation Guide

## Overview
This system provides **database-backed** AI usage tracking for all AI features across the platform. This enables tier-based billing, quota enforcement, usage analytics, and cost attribution.

## Architecture

### Database Tables
1. **`ai_usage_logs`**: Records every AI API call with metadata
2. **`ai_usage_tracking`**: Manages daily limits, cooldowns, and quotas per brand

### Key Service
**`lib/services/ai-usage-service.ts`**: Central service for all AI usage tracking

## Features Added

### 1. Brand Analysis (Brand Health Synopsis)
- **Endpoint**: `/api/ai/generate-analysis`
- **Type**: `brand_analysis`
- **Limit**: 50/day
- **Status**: ✅ Implemented

### 2. Task Generation
- **Endpoint**: `/api/tasks/generate`
- **Type**: `task_generation`
- **Limit**: 20/day
- **Status**: ⏳ Pending

### 3. Campaign Analysis
- **Endpoint**: `/api/ai/campaign-analysis`
- **Type**: `campaign_analysis`
- **Limit**: 30/day
- **Status**: ⏳ Pending

### 4. Smart Response
- **Endpoint**: `/api/ai/smart-response`
- **Type**: `smart_response`
- **Limit**: 50/day
- **Status**: ⏳ Pending

### 5. Enhanced Campaign Analysis
- **Endpoint**: `/api/ai/enhanced-campaign-analysis`
- **Type**: `enhanced_campaign_analysis`
- **Limit**: 30/day
- **Status**: ⏳ Pending

### 6. Creative Generation
- **Endpoint**: `/api/ai/generate-creative` (already tracked)
- **Type**: `creative_generation`
- **Limit**: 20/day
- **Status**: ✅ Already implemented

### 7. Lead Gen Enrichment
- **Endpoint**: `/api/leads/generate-real`
- **Type**: `lead_gen_enrichment`
- **Limit**: 100/day
- **Status**: ⏳ Pending

### 8. E-commerce Lead Gen
- **Endpoint**: `/api/leads/generate-ecommerce`
- **Type**: `lead_gen_ecommerce`
- **Limit**: 50/day
- **Status**: ⏳ Pending

### 9. Outreach Messages
- **Endpoint**: `/api/outreach/generate-message`
- **Type**: `outreach_messages`
- **Limit**: 100/day
- **Status**: ⏳ Pending

### 10. Marketing Assistant (Campaign Recommendations)
- **Endpoint**: `/api/ai/campaign-recommendations` (already tracked)
- **Type**: `campaign_recommendations`
- **Limit**: Weekly (24hr cooldown)
- **Status**: ✅ Already implemented

### 11. AI Marketing Consultant
- **Endpoint**: `/api/ai/marketing-consultant` (already tracked)
- **Type**: `ai_consultant_chat`
- **Limit**: 15/day
- **Status**: ✅ Already implemented

### 12. Brand Report Generator
- **Endpoint**: `/api/ai/generate-report` (already tracked)
- **Type**: `health_report`
- **Limit**: 3/day
- **Status**: ✅ Already implemented

## Implementation Pattern

### Step 1: Import the service
```typescript
import { aiUsageService } from '@/lib/services/ai-usage-service';
```

### Step 2: Check usage before AI call (Optional but recommended for UX)
```typescript
const usageStatus = await aiUsageService.checkUsageStatus(
  brandId, 
  userId, 
  'feature_type'
);

if (!usageStatus.canUse) {
  return NextResponse.json({ 
    error: usageStatus.reason,
    cooldownUntil: usageStatus.cooldownUntil 
  }, { status: 429 });
}
```

### Step 3: Record usage after successful AI call
```typescript
await aiUsageService.recordUsage(brandId, userId, 'feature_type', {
  // Optional metadata for analytics
  model: 'gpt-5-nano',
  tokens: response.usage?.total_tokens,
  cost: estimatedCost,
  // ... any other relevant data
});
```

## Complete Example

```typescript
import { auth } from "@clerk/nextjs";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { aiUsageService } from '@/lib/services/ai-usage-service';

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { brandId, prompt } = await req.json();

    // Optional: Check usage before processing
    const usageStatus = await aiUsageService.checkUsageStatus(
      brandId, 
      userId, 
      'smart_response'
    );

    if (!usageStatus.canUse) {
      return NextResponse.json({ 
        error: usageStatus.reason,
        remainingUses: usageStatus.remainingUses
      }, { status: 429 });
    }

    // Make OpenAI API call
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-5-mini",
      messages: [{ role: "user", content: prompt }]
    });

    const result = response.choices[0]?.message?.content;

    // Record usage after success
    await aiUsageService.recordUsage(brandId, userId, 'smart_response', {
      model: 'gpt-5-mini',
      tokens: response.usage?.total_tokens,
      promptLength: prompt.length,
      responseLength: result?.length
    });

    return NextResponse.json({ result });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

## Tier-Based Billing Integration

### Current Limits (can be adjusted per tier)
```typescript
const TIER_LIMITS = {
  FREE: {
    brand_analysis: 10,      // 10/day
    creative_generation: 5,   // 5/day
    lead_gen_enrichment: 20,  // 20/day
    outreach_messages: 20     // 20/day
  },
  BEGINNER: {
    brand_analysis: 50,       // 50/day
    creative_generation: 20,  // 20/day
    lead_gen_enrichment: 100, // 100/day
    outreach_messages: 100    // 100/day
  },
  PRO: {
    brand_analysis: 200,      // 200/day
    creative_generation: 100, // 100/day
    lead_gen_enrichment: 500, // 500/day
    outreach_messages: 500    // 500/day
  },
  ENTERPRISE: {
    // Unlimited or very high limits
    brand_analysis: 999999,
    creative_generation: 999999,
    lead_gen_enrichment: 999999,
    outreach_messages: 999999
  }
};
```

### Future Enhancement: Dynamic Limits
To implement tier-based limits, modify `ai-usage-service.ts`:

```typescript
async checkUsageStatus(
  brandId: string, 
  userId: string, 
  featureType: AIFeatureType
): Promise<AIUsageStatus> {
  // Fetch user's tier from database
  const { data: subscription } = await this.supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .single();

  const tier = subscription?.tier || 'FREE';
  const limits = TIER_LIMITS[tier];
  
  // Use tier-specific limit instead of global limit
  const dailyLimit = limits[featureType];
  
  // ... rest of logic
}
```

## Analytics Queries

### Total AI Usage by Feature
```sql
SELECT 
  endpoint as feature_type,
  COUNT(*) as usage_count,
  COUNT(DISTINCT brand_id) as unique_brands,
  COUNT(DISTINCT user_id) as unique_users
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY endpoint
ORDER BY usage_count DESC;
```

### Daily Usage Trends
```sql
SELECT 
  DATE(created_at) as date,
  endpoint as feature_type,
  COUNT(*) as usage_count
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), endpoint
ORDER BY date DESC, usage_count DESC;
```

### User-Level Cost Attribution (if storing token/cost data)
```sql
SELECT 
  user_id,
  endpoint,
  SUM((metadata->>'tokens')::int) as total_tokens,
  SUM((metadata->>'cost')::numeric) as total_cost
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND metadata ? 'tokens'
GROUP BY user_id, endpoint
ORDER BY total_cost DESC;
```

## Benefits

### ✅ Enforceable Limits
- Prevents abuse by enforcing daily/weekly quotas
- Backend validation (can't bypass by clearing localStorage)

### ✅ Tier-Based Pricing
- Free: 10 reports/day
- Pro: 100 reports/day
- Enterprise: Unlimited

### ✅ Usage Analytics
- "Pro users average 45 AI calls/day"
- "Creative generation is our most popular feature"

### ✅ Cost Attribution
- "Enterprise customer cost us $234 in AI this month"
- Calculate per-user profitability

### ✅ Audit Trail
- "User X generated 50 reports on Jan 15"
- Compliance and debugging

## Next Steps

1. **Add tracking to remaining endpoints** (see list above)
2. **Create subscription/tier table** if not exists
3. **Update AI service to read tier limits from database**
4. **Build admin dashboard** to view usage analytics
5. **Implement usage-based alerts** (e.g., "90% of quota used")
6. **Add cost tracking** by storing OpenAI token counts

## Database Schema Reference

### ai_usage_logs
```sql
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,  -- e.g. 'brand_analysis', 'smart_response'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ai_usage_tracking
```sql
CREATE TABLE ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  user_id TEXT NOT NULL,
  feature_type TEXT NOT NULL CHECK (feature_type IN (...)),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  usage_count INTEGER DEFAULT 1,
  daily_usage_count INTEGER DEFAULT 1,
  daily_usage_date DATE DEFAULT CURRENT_DATE,
  cooldown_until TIMESTAMPTZ,
  previous_recommendations JSONB,
  tracking_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Important Notes

- ✅ Brand Health Reports, Marketing Assistant, AI Consultant, and Creative Generation **already have tracking**
- ⏳ Still need tracking: Task Gen, Campaign Analysis, Smart Response, Enhanced Analysis, Lead Gen, Outreach
- 📊 All tracked features go to `ai_usage_logs` (for billing) and `ai_usage_tracking` (for quotas)
- 🔒 RLS is enabled on both tables for security
- 💰 Current limits are placeholder values - adjust based on your pricing tiers

