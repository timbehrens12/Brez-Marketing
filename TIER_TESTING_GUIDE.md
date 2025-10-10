# Tier Testing Guide

## ✅ What's Been Implemented

### 1. **Tier-Based Usage Limits**
The `AIUsageService` now dynamically fetches usage limits from the database based on your subscription tier instead of using hardcoded "Beginner" limits.

**Features that use tier limits:**
- ✅ **AI Consultant Chat** - Daily limit varies by tier (5-100/day)
- ✅ **Creative Generation** - Monthly limit varies by tier (10-500/month)
- ✅ **Lead Generation** - Monthly limit varies by tier (0-5000/month)
- ✅ **Outreach Messages** - Monthly limit varies by tier (0-10000/month)

### 2. **Database Configuration**
All 5 tiers are configured in the database with their limits:

| Tier | Price | Brands | Leads/mo | Outreach/mo | AI Chats/day | Creatives/mo |
|------|-------|--------|----------|-------------|--------------|--------------|
| **DTC Owner** | $67 | 1 | 0 | 0 | 5 | 10 |
| **Beginner** | $97 | 1 | 100 | 250 | 10 | 25 |
| **Growing** | $397 | 5 | 300 | 750 | 25 | 75 |
| **Scaling** | $997 | 15 | 1,000 | 2,500 | 50 | 200 |
| **Agency** | $2,997 | Unlimited | 5,000 | 10,000 | 100 | 500 |

### 3. **Weekly vs Monthly Billing**
- ✅ Weekly billing charges **10% more** than monthly
- ✅ Weekly billing provides the **same monthly usage limits** as monthly billing
- ✅ Example: Beginner Weekly = $107/week, still gets 100 leads/month, 250 outreach/month, etc.

### 4. **Monthly Resets**
These features now reset on the **1st of each month**:
- ✅ Creative Generation
- ✅ Lead Generation
- ✅ Outreach Messages

---

## 🧪 How to Test

### Step 1: Access the Test Dashboard
Navigate to: **`/test-tier`**

This page shows:
- Your current subscription tier and billing interval
- Your current usage limits
- Controls to change your tier for testing

### Step 2: Test Different Tiers

1. **Select a tier** (DTC Owner, Beginner, Growing, Scaling, or Agency)
2. **Select billing interval** (Weekly or Monthly)
3. **Click "Apply Tier Change"**
4. Your subscription will update immediately

### Step 3: Verify Usage Limits

After changing tiers, test these features to see limits in action:

#### **Lead Generator** (`/lead-generator`)
- Check the "Monthly Limit" display at the top
- Try to generate leads
- Verify it enforces your tier's monthly limit
- **DTC Owner tier should block lead generation** (0 leads/month)

#### **Creative Studio** (`/ad-creative-studio`)
- Check usage counter
- Try to generate creatives
- Verify monthly limit matches your tier

#### **Outreach Tool** (`/outreach-tool`)
- Check message limit display
- Try to send outreach messages
- Verify monthly limit matches your tier

#### **AI Marketing Consultant** (`/ai-marketing-consultant`)
- Check daily usage counter
- Try to send multiple messages
- Verify daily limit matches your tier
- **DTC Owner should have only 5/day, Agency should have 100/day**

### Step 4: Test Weekly vs Monthly Billing

1. **Set tier to "Beginner" with "Monthly" billing**
   - Note the price: $97/month
   - Check limits: 100 leads, 250 outreach, 25 creatives

2. **Change to "Weekly" billing** (keep Beginner tier)
   - Note the price: $107/week (10% more)
   - Check limits: **Should be the same** (100 leads, 250 outreach, 25 creatives)

3. **Verify in features:**
   - Lead Generator should still show 100/month limit
   - Creative Studio should still show 25/month limit
   - Outreach Tool should still show 250/month limit

### Step 5: Test Tier Upgrades/Downgrades

Try this progression to see limits change:

1. **DTC Owner** → Should block lead gen and outreach (0 limits)
2. **Beginner** → Should allow 100 leads, 250 outreach, 25 creatives
3. **Growing** → Should increase to 300 leads, 750 outreach, 75 creatives
4. **Scaling** → Should increase to 1,000 leads, 2,500 outreach, 200 creatives
5. **Agency** → Should increase to 5,000 leads, 10,000 outreach, 500 creatives

---

## 🔍 What to Look For

### ✅ Expected Behavior:
- Usage limits update immediately when you change tiers
- Features enforce the correct limits for your tier
- Weekly billing costs 10% more but provides same limits
- Monthly features reset on the 1st of each month
- Error messages clearly state when you've hit a limit

### ❌ Issues to Report:
- Limits don't update after changing tier
- Features still use hardcoded limits
- Weekly billing doesn't show correct pricing
- Monthly resets don't work (test on the 1st of next month)
- Error messages are confusing or incorrect

---

## 🛠️ Testing API Endpoints

You can also test via API:

### Get Current Subscription
```bash
GET /api/test/set-tier
```

### Set Tier
```bash
POST /api/test/set-tier
Content-Type: application/json

{
  "tier": "beginner",
  "billingInterval": "week"
}
```

Valid tiers: `dtc_owner`, `beginner`, `growing`, `scaling`, `agency`  
Valid intervals: `week`, `month`

---

## 📊 Database Verification

If you want to verify the database directly:

### Check Your Subscription
```sql
SELECT * FROM subscriptions WHERE user_id = 'YOUR_USER_ID';
```

### Check Your Tier Limits
```sql
SELECT * FROM tier_limits 
WHERE tier = (
  SELECT tier FROM subscriptions 
  WHERE user_id = 'YOUR_USER_ID' AND status = 'active'
  LIMIT 1
);
```

### Check Usage Tracking
```sql
SELECT * FROM ai_usage_tracking WHERE user_id = 'YOUR_USER_ID';
```

---

## 🚨 Important Notes

1. **This is TEST MODE** - No real payments are processed
2. **Subscription changes are instant** - No waiting period
3. **Usage resets manually** - You may need to clear usage data between tests
4. **Database changes persist** - Your test tier will remain until you change it
5. **Weekly billing** - Charges every 7 days but maintains monthly usage limits

---

## 🎯 Test Checklist

Use this checklist to ensure everything works:

- [ ] Can access `/test-tier` page
- [ ] Can see current subscription and limits
- [ ] Can change to DTC Owner tier
- [ ] DTC Owner blocks lead gen (0 limit)
- [ ] Can change to Beginner tier
- [ ] Beginner allows 100 leads/month
- [ ] Can change to Growing tier
- [ ] Growing allows 300 leads/month
- [ ] Can change to Scaling tier
- [ ] Scaling allows 1,000 leads/month
- [ ] Can change to Agency tier
- [ ] Agency allows 5,000 leads/month
- [ ] Weekly billing costs 10% more
- [ ] Weekly billing has same usage limits as monthly
- [ ] AI Consultant enforces daily limits
- [ ] Creative Studio enforces monthly limits
- [ ] Lead Generator enforces monthly limits
- [ ] Outreach Tool enforces monthly limits
- [ ] Error messages are clear when limits are hit
- [ ] Usage counters display correctly

---

## 🐛 Known Issues

None yet! Report any issues you find.

---

## 📝 Next Steps

After testing is complete:
1. Integrate with real payment processor (Stripe)
2. Add tier upgrade prompts when users hit limits
3. Add usage analytics dashboard
4. Implement tier-based feature gating (hide features not available in tier)
5. Add email notifications for usage warnings (80% of limit)

