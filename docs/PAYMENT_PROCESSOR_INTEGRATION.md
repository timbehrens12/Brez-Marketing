# Payment Processor Integration Guide

## Overview
This document outlines the strategy for integrating a payment processor (e.g., Stripe, Whop, Square) and implementing tier-based access control for the Brez Marketing platform.

## Current State
- **No payment processor connected** - The platform currently has no payment integration
- **No subscription tracking** - No database tables exist for subscriptions, payments, or user tiers
- **Pricing page exists** - Shows 5 tiers: DTC Owner ($67), Beginner ($97), Growing ($397), Scaling ($997), Agency ($2,997)

## Recommended Payment Processor: Stripe

### Why Stripe?
1. **Industry Standard** - Most trusted and widely used
2. **Comprehensive API** - Excellent documentation and SDKs
3. **Built-in Subscription Management** - Handles recurring billing, invoicing, and payment retries
4. **Webhook Support** - Real-time updates on payment events
5. **Tax Automation** - Stripe Tax handles sales tax/VAT globally
6. **Customer Portal** - Built-in self-service portal for customers
7. **Easy Migration** - Can switch to other processors later if needed

### Alternative Options
- **Whop** - Good for digital products, less mature than Stripe
- **Square** - Better for physical retail, limited subscription features
- **Paddle** - Merchant of record (handles taxes), but takes higher fees

## Database Schema Design

### 1. Subscriptions Table
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES user_mappings(clerk_id),
  
  -- Stripe data
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  
  -- Tier information
  tier TEXT NOT NULL CHECK (tier IN ('dtc_owner', 'beginner', 'growing', 'scaling', 'agency')),
  tier_display_name TEXT NOT NULL,
  
  -- Pricing
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  billing_interval TEXT NOT NULL CHECK (billing_interval IN ('month', 'year')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused'
  )),
  
  -- Dates
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);
```

### 2. Tier Limits Table
```sql
CREATE TABLE tier_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL UNIQUE CHECK (tier IN ('dtc_owner', 'beginner', 'growing', 'scaling', 'agency')),
  
  -- Brand & Team Limits
  max_brands INTEGER NOT NULL,
  max_team_members INTEGER,
  
  -- Lead Generation Limits
  lead_gen_monthly INTEGER DEFAULT 0,
  outreach_messages_monthly INTEGER DEFAULT 0,
  
  -- AI Usage Limits
  ai_chats_daily INTEGER DEFAULT 0,
  creative_gen_monthly INTEGER DEFAULT 0,
  
  -- Features
  white_label BOOLEAN DEFAULT FALSE,
  custom_branding BOOLEAN DEFAULT FALSE,
  priority_support BOOLEAN DEFAULT FALSE,
  dedicated_account_manager BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  display_name TEXT NOT NULL,
  description TEXT,
  features JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tier limits
INSERT INTO tier_limits (tier, display_name, max_brands, max_team_members, lead_gen_monthly, outreach_messages_monthly, ai_chats_daily, creative_gen_monthly, white_label, features) VALUES
('dtc_owner', 'DTC Owner', 1, NULL, 0, 0, 5, 10, FALSE, '["Brand Analytics Dashboard", "Shopify & Meta Integration", "AI Campaign Optimization", "Weekly Marketing Analysis", "Performance Reports"]'::jsonb),
('beginner', 'Beginner', 1, NULL, 100, 250, 10, 25, TRUE, '["All DTC Owner Features", "Lead Generation (100/mo)", "Outreach CRM (250 emails/mo)", "White-Label Reports & Branding", "Contract Generator AI", "Enhanced Creative Studio (25/mo)"]'::jsonb),
('growing', 'Growing', 5, 1, 300, 750, 25, 75, TRUE, '["All Beginner Features", "Up to 5 Brands", "1 Team Member", "Lead Generation (300/mo)", "Outreach CRM (750 emails/mo)", "Enhanced Creative Studio (75/mo)", "Priority Support"]'::jsonb),
('scaling', 'Scaling', 15, 3, 1000, 2500, 50, 200, TRUE, '["All Growing Features", "Up to 15 Brands", "3 Team Members", "Lead Generation (1,000/mo)", "Outreach CRM (2,500 emails/mo)", "Enhanced Creative Studio (200/mo)", "Priority Support", "Dedicated Account Manager"]'::jsonb),
('agency', 'Agency', 9999, 10, 5000, 10000, 100, 500, TRUE, '["All Scaling Features", "Unlimited Brands", "10 Team Members", "Lead Generation (5,000/mo)", "Outreach CRM (10,000 emails/mo)", "Enhanced Creative Studio (500/mo)", "White-Label Everything", "Dedicated Account Manager", "Custom Integrations"]'::jsonb);
```

### 3. Payment History Table
```sql
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  
  -- Stripe data
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_invoice_id TEXT,
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded')),
  
  -- Metadata
  description TEXT,
  receipt_url TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX idx_payment_history_subscription_id ON payment_history(subscription_id);
CREATE INDEX idx_payment_history_status ON payment_history(status);
```

### 4. Usage Tracking Enhancement
The existing `ai_usage_tracking` table needs to be enhanced to check against tier limits:

```sql
-- Add tier_limit_exceeded column
ALTER TABLE ai_usage_tracking 
ADD COLUMN tier_limit_exceeded BOOLEAN DEFAULT FALSE;

-- Add function to check tier limits
CREATE OR REPLACE FUNCTION check_tier_limit(
  p_user_id TEXT,
  p_feature_type TEXT,
  p_usage_count INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_limit INTEGER;
BEGIN
  -- Get user's current tier
  SELECT s.tier INTO v_tier
  FROM subscriptions s
  WHERE s.user_id = p_user_id 
    AND s.status = 'active'
  ORDER BY s.created_at DESC
  LIMIT 1;
  
  -- If no subscription, return false (no access)
  IF v_tier IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get tier limit for feature
  CASE p_feature_type
    WHEN 'ai_consultant_chat' THEN
      SELECT ai_chats_daily INTO v_limit FROM tier_limits WHERE tier = v_tier;
    WHEN 'creative_generation' THEN
      SELECT creative_gen_monthly INTO v_limit FROM tier_limits WHERE tier = v_tier;
    WHEN 'lead_gen_enrichment', 'lead_gen_ecommerce' THEN
      SELECT lead_gen_monthly INTO v_limit FROM tier_limits WHERE tier = v_tier;
    WHEN 'outreach_messages' THEN
      SELECT outreach_messages_monthly INTO v_limit FROM tier_limits WHERE tier = v_tier;
    ELSE
      RETURN TRUE; -- No limit for this feature
  END CASE;
  
  -- Check if usage exceeds limit
  RETURN p_usage_count < v_limit;
END;
$$ LANGUAGE plpgsql;
```

## Implementation Steps

### Phase 1: Database Setup (Do This Now)
1. ✅ Create migration file: `supabase/migrations/YYYYMMDD_create_subscription_tables.sql`
2. ✅ Add the three tables above (subscriptions, tier_limits, payment_history)
3. ✅ Add tier limit checking function
4. ✅ Enable RLS on all new tables

### Phase 2: Stripe Setup (When Deal is Signed)
1. **Create Stripe Account**
   - Sign up at stripe.com
   - Complete business verification
   - Get API keys (test and live)

2. **Create Products in Stripe Dashboard**
   ```
   Product: DTC Owner
   - Price: $67/month (price_xxx)
   
   Product: Beginner
   - Price: $97/month (price_xxx)
   
   Product: Growing
   - Price: $397/month (price_xxx)
   
   Product: Scaling
   - Price: $997/month (price_xxx)
   
   Product: Agency
   - Price: $2,997/month (price_xxx)
   ```

3. **Store Stripe Price IDs**
   ```typescript
   // lib/stripe/config.ts
   export const STRIPE_PRICE_IDS = {
     dtc_owner: 'price_xxx', // Replace with actual Stripe price IDs
     beginner: 'price_xxx',
     growing: 'price_xxx',
     scaling: 'price_xxx',
     agency: 'price_xxx',
   }
   ```

### Phase 3: Backend Integration
1. **Install Stripe SDK**
   ```bash
   npm install stripe @stripe/stripe-js
   ```

2. **Create Stripe Client**
   ```typescript
   // lib/stripe/client.ts
   import Stripe from 'stripe'
   
   export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
     apiVersion: '2024-11-20.acacia',
   })
   ```

3. **Create Checkout Session API**
   ```typescript
   // app/api/stripe/create-checkout-session/route.ts
   import { stripe } from '@/lib/stripe/client'
   import { STRIPE_PRICE_IDS } from '@/lib/stripe/config'
   import { auth } from '@clerk/nextjs'
   
   export async function POST(req: Request) {
     const { userId } = auth()
     if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })
     
     const { tier } = await req.json()
     const priceId = STRIPE_PRICE_IDS[tier as keyof typeof STRIPE_PRICE_IDS]
     
     const session = await stripe.checkout.sessions.create({
       mode: 'subscription',
       payment_method_types: ['card'],
       line_items: [{ price: priceId, quantity: 1 }],
       success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
       cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
       client_reference_id: userId,
       metadata: { userId, tier },
     })
     
     return Response.json({ sessionId: session.id })
   }
   ```

4. **Create Webhook Handler**
   ```typescript
   // app/api/stripe/webhook/route.ts
   import { stripe } from '@/lib/stripe/client'
   import { supabase } from '@/lib/supabase'
   import { headers } from 'next/headers'
   
   export async function POST(req: Request) {
     const body = await req.text()
     const signature = headers().get('stripe-signature')!
     
     let event: Stripe.Event
     try {
       event = stripe.webhooks.constructEvent(
         body,
         signature,
         process.env.STRIPE_WEBHOOK_SECRET!
       )
     } catch (err) {
       return Response.json({ error: 'Webhook signature verification failed' }, { status: 400 })
     }
     
     switch (event.type) {
       case 'checkout.session.completed':
         await handleCheckoutCompleted(event.data.object)
         break
       case 'customer.subscription.updated':
         await handleSubscriptionUpdated(event.data.object)
         break
       case 'customer.subscription.deleted':
         await handleSubscriptionDeleted(event.data.object)
         break
       case 'invoice.payment_succeeded':
         await handlePaymentSucceeded(event.data.object)
         break
       case 'invoice.payment_failed':
         await handlePaymentFailed(event.data.object)
         break
     }
     
     return Response.json({ received: true })
   }
   
   async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
     const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
     
     await supabase.from('subscriptions').insert({
       user_id: session.client_reference_id,
       stripe_customer_id: session.customer as string,
       stripe_subscription_id: subscription.id,
       stripe_price_id: subscription.items.data[0].price.id,
       tier: session.metadata?.tier,
       tier_display_name: getTierDisplayName(session.metadata?.tier),
       amount: subscription.items.data[0].price.unit_amount! / 100,
       currency: subscription.currency,
       billing_interval: subscription.items.data[0].price.recurring?.interval || 'month',
       status: subscription.status,
       current_period_start: new Date(subscription.current_period_start * 1000),
       current_period_end: new Date(subscription.current_period_end * 1000),
     })
   }
   ```

### Phase 4: Frontend Integration
1. **Update Pricing Page**
   ```typescript
   // Add to pricing page buttons
   const handleSelectPlan = async (tier: string) => {
     const res = await fetch('/api/stripe/create-checkout-session', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ tier }),
     })
     const { sessionId } = await res.json()
     
     const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
     await stripe?.redirectToCheckout({ sessionId })
   }
   ```

2. **Create Subscription Management Page**
   ```typescript
   // app/settings/billing/page.tsx
   // Show current plan, usage, upgrade/downgrade options
   // Link to Stripe Customer Portal for payment methods
   ```

3. **Add Tier-Based Access Control**
   ```typescript
   // middleware/checkTierAccess.ts
   export async function checkTierAccess(userId: string, feature: string): Promise<boolean> {
     const { data: subscription } = await supabase
       .from('subscriptions')
       .select('tier')
       .eq('user_id', userId)
       .eq('status', 'active')
       .single()
     
     if (!subscription) return false
     
     const { data: limits } = await supabase
       .from('tier_limits')
       .select('*')
       .eq('tier', subscription.tier)
       .single()
     
     // Check feature access based on limits
     return checkFeatureAccess(limits, feature)
   }
   ```

### Phase 5: Testing
1. **Use Stripe Test Mode**
   - Test card: 4242 4242 4242 4242
   - Test all subscription flows
   - Test webhook events

2. **Test Scenarios**
   - ✅ New subscription creation
   - ✅ Successful payment
   - ✅ Failed payment
   - ✅ Subscription upgrade/downgrade
   - ✅ Subscription cancellation
   - ✅ Trial period (if applicable)
   - ✅ Tier limit enforcement

### Phase 6: Go Live
1. **Switch to Live Mode**
   - Use live API keys
   - Update webhook endpoints
   - Test with real payment

2. **Monitor**
   - Set up Stripe Dashboard alerts
   - Monitor webhook failures
   - Track failed payments

## Environment Variables Needed

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_xxx (or sk_live_xxx for production)
STRIPE_PUBLISHABLE_KEY=pk_test_xxx (or pk_live_xxx for production)
STRIPE_WEBHOOK_SECRET=whsec_xxx

# App
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Tier Access Control Examples

### Example 1: Check Brand Limit
```typescript
async function canAddBrand(userId: string): Promise<boolean> {
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()
  
  if (!subscription) return false
  
  const { data: limits } = await supabase
    .from('tier_limits')
    .select('max_brands')
    .eq('tier', subscription.tier)
    .single()
  
  const { count } = await supabase
    .from('brands')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  
  return (count || 0) < limits.max_brands
}
```

### Example 2: Check AI Usage Limit
```typescript
async function canUseAIChat(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]
  
  const { data: usage } = await supabase
    .from('ai_usage_tracking')
    .select('daily_usage_count')
    .eq('user_id', userId)
    .eq('feature_type', 'ai_consultant_chat')
    .eq('daily_usage_date', today)
    .single()
  
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('tier')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single()
  
  if (!subscription) return false
  
  const { data: limits } = await supabase
    .from('tier_limits')
    .select('ai_chats_daily')
    .eq('tier', subscription.tier)
    .single()
  
  return (usage?.daily_usage_count || 0) < limits.ai_chats_daily
}
```

## Migration Path

When you're ready to integrate:

1. **Day 1**: Run database migrations (Phase 1)
2. **Day 2**: Set up Stripe account and create products (Phase 2)
3. **Day 3-5**: Implement backend APIs (Phase 3)
4. **Day 6-7**: Update frontend (Phase 4)
5. **Day 8-9**: Testing in Stripe test mode (Phase 5)
6. **Day 10**: Go live (Phase 6)

## Cost Considerations

### Stripe Fees
- **2.9% + $0.30** per successful card charge
- **0.5%** additional for international cards
- **No monthly fees** for standard plan

### Example Monthly Costs (100 customers)
- DTC Owner ($67): $6,700 revenue → $224 in fees (3.3%)
- Beginner ($97): $9,700 revenue → $311 in fees (3.2%)
- Growing ($397): $39,700 revenue → $1,182 in fees (3.0%)

## Security Best Practices

1. **Never expose Stripe secret key** - Only use on server
2. **Verify webhook signatures** - Prevent fake events
3. **Use HTTPS only** - Required for Stripe
4. **Store minimal data** - Let Stripe handle sensitive info
5. **Implement RLS** - Protect subscription data in Supabase
6. **Log all events** - Track subscription changes

## Support & Documentation

- **Stripe Docs**: https://stripe.com/docs
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Stripe Support**: Available 24/7 via dashboard
- **Stripe Discord**: Active community support

## Next Steps

1. ✅ **Review this document** with your team
2. ✅ **Create database tables** (Phase 1) - Can do now
3. ⏳ **Wait for deal** - Don't create Stripe account until ready
4. ⏳ **Follow implementation steps** - When deal is signed
5. ⏳ **Test thoroughly** - Before going live
6. ⏳ **Launch** - Start accepting payments!

---

**Last Updated**: 2025-01-09
**Status**: Ready for implementation when deal is signed

