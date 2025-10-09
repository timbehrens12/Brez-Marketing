# Payment Processor Quick Start Guide

## ✅ What's Already Done

1. **Database Schema Created**
   - `subscriptions` table - Stores user subscription data
   - `tier_limits` table - Defines what each tier can access
   - `payment_history` table - Tracks all payments
   - Helper functions for checking tier limits

2. **Tier Limits Configured**
   - DTC Owner: 1 brand, 5 AI chats/day, 10 creatives/month
   - Beginner: 1 brand, 100 leads/month, 250 outreach/month, 10 AI chats/day, 25 creatives/month
   - Growing: 5 brands, 300 leads/month, 750 outreach/month, 25 AI chats/day, 75 creatives/month
   - Scaling: 15 brands, 1000 leads/month, 2500 outreach/month, 50 AI chats/day, 200 creatives/month
   - Agency: Unlimited brands, 5000 leads/month, 10000 outreach/month, 100 AI chats/day, 500 creatives/month

3. **Documentation Created**
   - Full integration guide in `docs/PAYMENT_PROCESSOR_INTEGRATION.md`
   - Step-by-step implementation plan
   - Code examples for all major functions

## 🚀 When You're Ready to Implement (After Deal is Signed)

### Step 1: Run Database Migration (5 minutes)
```bash
# Connect to your Supabase project
# Run the migration file
supabase db push
```

Or manually run the SQL file in Supabase dashboard:
- Go to SQL Editor
- Copy contents of `supabase/migrations/20250109_create_subscription_tables.sql`
- Execute

### Step 2: Create Stripe Account (15 minutes)
1. Go to https://stripe.com
2. Sign up with business email
3. Complete business verification
4. Get your API keys:
   - Test keys: `sk_test_...` and `pk_test_...`
   - Live keys: `sk_live_...` and `pk_live_...` (after verification)

### Step 3: Create Products in Stripe (10 minutes)
In Stripe Dashboard → Products → Add Product:

1. **DTC Owner**
   - Price: $67/month
   - Copy the Price ID (starts with `price_`)

2. **Beginner**
   - Price: $97/month
   - Copy the Price ID

3. **Growing**
   - Price: $397/month
   - Copy the Price ID

4. **Scaling**
   - Price: $997/month
   - Copy the Price ID

5. **Agency**
   - Price: $2,997/month
   - Copy the Price ID

### Step 4: Add Environment Variables (5 minutes)
Add to your `.env.local`:
```env
STRIPE_SECRET_KEY=sk_test_... # Your Stripe secret key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Your Stripe publishable key
STRIPE_WEBHOOK_SECRET=whsec_... # You'll get this in Step 6
```

### Step 5: Install Stripe SDK (2 minutes)
```bash
npm install stripe @stripe/stripe-js
```

### Step 6: Set Up Webhook (10 minutes)
1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. URL: `https://yourdomain.com/api/stripe/webhook`
4. Events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret (starts with `whsec_`)
6. Add to `.env.local` as `STRIPE_WEBHOOK_SECRET`

### Step 7: Create API Routes (30 minutes)
You'll need to create 2 API routes:

1. **Create Checkout Session**: `app/api/stripe/create-checkout-session/route.ts`
   - See full code in `docs/PAYMENT_PROCESSOR_INTEGRATION.md` (Phase 3, step 3)

2. **Webhook Handler**: `app/api/stripe/webhook/route.ts`
   - See full code in `docs/PAYMENT_PROCESSOR_INTEGRATION.md` (Phase 3, step 4)

### Step 8: Update Pricing Page (15 minutes)
Add click handlers to pricing page buttons:
```typescript
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

### Step 9: Add Tier Checking to Features (1-2 hours)
Wherever you have AI features, add tier checking:

```typescript
// Example: Before generating AI response
const canUse = await checkTierLimit(userId, 'ai_consultant_chat', currentUsageCount)
if (!canUse) {
  return { error: 'You have reached your tier limit. Please upgrade.' }
}
```

See examples in `docs/PAYMENT_PROCESSOR_INTEGRATION.md` (Tier Access Control Examples)

### Step 10: Test Everything (1-2 hours)
Use Stripe test mode:
- Test card: `4242 4242 4242 4242`
- Test all subscription flows
- Test webhook events
- Test tier limits

### Step 11: Go Live (30 minutes)
1. Switch to live Stripe keys
2. Update webhook endpoint to use live mode
3. Test with real payment (small amount)
4. Monitor Stripe Dashboard

## 📊 Total Time Estimate
- **Database setup**: 5 minutes ✅ (Already done!)
- **Stripe setup**: 40 minutes
- **Code implementation**: 2-3 hours
- **Testing**: 1-2 hours
- **Total**: ~4-6 hours of work

## 🆘 Need Help?

### Common Issues

**Issue**: Webhook not receiving events
- **Fix**: Check webhook URL is correct and accessible
- **Fix**: Verify webhook secret is correct
- **Fix**: Check Stripe Dashboard → Webhooks → Attempts

**Issue**: Subscription not showing in database
- **Fix**: Check webhook handler is working
- **Fix**: Check RLS policies allow service role to insert
- **Fix**: Check Supabase logs for errors

**Issue**: User can't access features after subscribing
- **Fix**: Verify subscription status is 'active'
- **Fix**: Check tier limits are configured correctly
- **Fix**: Verify tier checking logic is correct

### Resources
- **Stripe Docs**: https://stripe.com/docs
- **Stripe Support**: Available 24/7 in dashboard
- **Full Integration Guide**: `docs/PAYMENT_PROCESSOR_INTEGRATION.md`

## 💡 Pro Tips

1. **Start with Test Mode** - Don't use live keys until everything works
2. **Test Webhooks Locally** - Use Stripe CLI for local testing
3. **Monitor Everything** - Set up alerts in Stripe Dashboard
4. **Handle Failed Payments** - Implement retry logic and email notifications
5. **Offer Trials** - Consider 7-day free trial to reduce friction

## 🎯 Success Checklist

- [ ] Database migration completed
- [ ] Stripe account created and verified
- [ ] Products created in Stripe
- [ ] Environment variables added
- [ ] Stripe SDK installed
- [ ] Webhook endpoint created
- [ ] API routes implemented
- [ ] Pricing page updated
- [ ] Tier checking added to features
- [ ] Tested in test mode
- [ ] Switched to live mode
- [ ] First real payment received! 🎉

---

**Ready to start?** Follow the steps above when your deal is signed!

**Questions?** Refer to `docs/PAYMENT_PROCESSOR_INTEGRATION.md` for detailed explanations and code examples.

