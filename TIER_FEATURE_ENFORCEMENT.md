# Tier Feature Enforcement - Implementation Plan

## Current Status

### ✅ Already Implemented:
1. **Usage Limits** (AI chats, creative gen, lead gen, outreach) - WORKING
2. **Tier-based limit fetching** from database - WORKING
3. **Test infrastructure** (`/test-tier` page) - WORKING
4. **Database schema** with all tier limits - WORKING

### ❌ NOT YET Implemented:

## Features That Need Enforcement

### 1. **White Label / Custom Branding** 🔴 CRITICAL
**Who has it:** Beginner, Growing, Scaling, Agency  
**Who doesn't:** DTC Owner

**What needs to happen:**
- DTC Owner tier should be **FORCED** to use platform branding (Brez logo/name)
- DTC Owner should **NOT** be able to customize agency settings (logo, name, colors)
- Higher tiers can fully customize branding

**Where to enforce:**
- `/settings` page - Agency Settings section
- Brand Report generation - Use platform branding for DTC Owner
- Email templates - Use platform branding for DTC Owner
- Outreach emails - Use platform branding for DTC Owner

**Implementation:**
```typescript
// In agency settings page
const { data: tierLimits } = await getUserTierLimits(userId)
if (!tierLimits?.white_label) {
  // Lock agency logo/name fields
  // Show upgrade prompt
  // Force use of platform defaults
}
```

---

### 2. **Lead Generation Access** 🔴 CRITICAL
**Who has it:** Beginner (100), Growing (300), Scaling (1000), Agency (5000)  
**Who doesn't:** DTC Owner (0)

**What needs to happen:**
- DTC Owner should be **BLOCKED** from accessing `/lead-generator` page entirely
- Show upgrade prompt instead

**Where to enforce:**
- `/lead-generator` page - Block access at page level
- Sidebar navigation - Hide/lock Lead Generator link for DTC Owner
- API route `/api/leads/generate-real` - Block requests

**Implementation:**
```typescript
// In lead-generator page
const { data: tierLimits } = await getUserTierLimits(userId)
if (tierLimits?.lead_gen_monthly === 0) {
  return <UpgradePrompt feature="Lead Generation" currentTier="DTC Owner" recommendedTier="Beginner" />
}
```

---

### 3. **Outreach CRM Access** 🔴 CRITICAL
**Who has it:** Beginner (250), Growing (750), Scaling (2500), Agency (10000)  
**Who doesn't:** DTC Owner (0)

**What needs to happen:**
- DTC Owner should be **BLOCKED** from accessing `/outreach-tool` page entirely
- Show upgrade prompt instead

**Where to enforce:**
- `/outreach-tool` page - Block access at page level
- Sidebar navigation - Hide/lock Outreach Tool link for DTC Owner
- API route `/api/outreach/generate-message` - Block requests

---

### 4. **Team Members / Seats** 🟡 IMPORTANT
**Limits:**
- DTC Owner: 0 (solo only)
- Beginner: 0 (solo only)
- Growing: 1 additional seat
- Scaling: 3 additional seats
- Agency: 10 additional seats

**What needs to happen:**
- Block team member invitations if limit reached
- Show current usage vs limit
- Show upgrade prompt when trying to exceed

**Where to enforce:**
- `/settings` page - Team Management section
- API route `/api/agency-team` - Block invitations over limit
- Already has `canAddTeamMember()` function - just need to use it

**Implementation:**
```typescript
// Already exists in tier-access.ts
const { allowed, limit, current } = await canAddTeamMember(userId)
if (!allowed) {
  return <UpgradePrompt feature="Team Members" currentUsage={current} limit={limit} />
}
```

---

### 5. **Brand Connections** 🟡 IMPORTANT
**Limits:**
- DTC Owner: 1
- Beginner: 1
- Growing: 5
- Scaling: 15
- Agency: Unlimited (9999)

**What needs to happen:**
- Block brand creation if limit reached
- Show current usage vs limit
- Show upgrade prompt when trying to exceed

**Where to enforce:**
- Brand creation flow - Block if limit reached
- Already has `canAddBrand()` function - just need to use it

**Implementation:**
```typescript
// Already exists in tier-access.ts
const { allowed, limit, current } = await canAddBrand(userId)
if (!allowed) {
  return <UpgradePrompt feature="Brand Connections" currentUsage={current} limit={limit} />
}
```

---

### 6. **Priority Support Badge** 🟢 NICE TO HAVE
**Who has it:** Growing, Scaling, Agency  
**Who doesn't:** DTC Owner, Beginner

**What needs to happen:**
- Show "Priority Support" badge in settings for eligible tiers
- Prioritize support tickets from these tiers (backend)

---

### 7. **Dedicated Account Manager** 🟢 NICE TO HAVE
**Who has it:** Scaling, Agency  
**Who doesn't:** DTC Owner, Beginner, Growing

**What needs to happen:**
- Show account manager contact info for eligible tiers
- Display in settings or dashboard

---

## Implementation Priority

### Phase 1: CRITICAL (Must have before payment processor)
1. ✅ Usage limits (already done)
2. 🔴 White label enforcement (DTC Owner forced to use platform branding)
3. 🔴 Lead Generation blocking (DTC Owner can't access)
4. 🔴 Outreach CRM blocking (DTC Owner can't access)

### Phase 2: IMPORTANT (Should have before launch)
5. 🟡 Team member limits enforcement
6. 🟡 Brand connection limits enforcement
7. 🟡 Sidebar navigation updates (hide/lock features based on tier)

### Phase 3: NICE TO HAVE (Can add post-launch)
8. 🟢 Priority support badges
9. 🟢 Dedicated account manager display
10. 🟢 Tier comparison modal
11. 🟢 Usage analytics dashboard

---

## Files That Need Updates

### 1. Create Tier Enforcement Service
**File:** `lib/services/tier-enforcement-service.ts`
```typescript
export class TierEnforcementService {
  async canAccessFeature(userId: string, feature: string): Promise<boolean>
  async getUpgradePrompt(userId: string, feature: string): Promise<UpgradePromptData>
  async enforceWhiteLabel(userId: string): Promise<{ allowed: boolean; settings: any }>
}
```

### 2. Update Pages with Enforcement
- `app/lead-generator/page.tsx` - Add tier check
- `app/outreach-tool/page.tsx` - Add tier check
- `app/settings/page.tsx` - Lock white label for DTC Owner
- `app/brand-report/page.tsx` - Force platform branding for DTC Owner

### 3. Update Sidebar Navigation
- `components/Sidebar.tsx` - Show locks/badges on restricted features

### 4. Create Upgrade Prompt Component
**File:** `components/tier/UpgradePrompt.tsx`
```typescript
<UpgradePrompt
  feature="Lead Generation"
  currentTier="DTC Owner"
  recommendedTier="Beginner"
  reason="Lead Generation is not available on the DTC Owner plan"
/>
```

### 5. Update API Routes
- `app/api/leads/generate-real/route.ts` - Check tier before generating
- `app/api/outreach/generate-message/route.ts` - Check tier before sending
- `app/api/agency-settings/route.ts` - Enforce white label restrictions
- `app/api/agency-team/route.ts` - Enforce team member limits

---

## Testing Checklist

Once implemented, test each tier:

### DTC Owner ($67/mo):
- [ ] CANNOT access Lead Generator (blocked with upgrade prompt)
- [ ] CANNOT access Outreach Tool (blocked with upgrade prompt)
- [ ] CANNOT customize agency logo/name (locked, uses platform branding)
- [ ] CAN use Creative Studio (10/month limit)
- [ ] CAN use AI Chatbot (5/day limit)
- [ ] CAN connect 1 brand only
- [ ] CANNOT invite team members

### Beginner ($97/mo):
- [ ] CAN access Lead Generator (100/month limit)
- [ ] CAN access Outreach Tool (250/month limit)
- [ ] CAN customize agency logo/name (white label enabled)
- [ ] CAN use Creative Studio (25/month limit)
- [ ] CAN use AI Chatbot (10/day limit)
- [ ] CAN connect 1 brand only
- [ ] CANNOT invite team members

### Growing ($397/mo):
- [ ] CAN access Lead Generator (300/month limit)
- [ ] CAN access Outreach Tool (750/month limit)
- [ ] CAN customize agency logo/name (white label enabled)
- [ ] CAN use Creative Studio (75/month limit)
- [ ] CAN use AI Chatbot (25/day limit)
- [ ] CAN connect up to 5 brands
- [ ] CAN invite 1 team member
- [ ] Shows "Priority Support" badge

### Scaling ($997/mo):
- [ ] CAN access Lead Generator (1,000/month limit)
- [ ] CAN access Outreach Tool (2,500/month limit)
- [ ] CAN customize agency logo/name (white label enabled)
- [ ] CAN use Creative Studio (200/month limit)
- [ ] CAN use AI Chatbot (50/day limit)
- [ ] CAN connect up to 15 brands
- [ ] CAN invite 3 team members
- [ ] Shows "Priority Support" badge
- [ ] Shows "Dedicated Account Manager" info

### Agency ($2,997/mo):
- [ ] CAN access Lead Generator (5,000/month limit)
- [ ] CAN access Outreach Tool (10,000/month limit)
- [ ] CAN customize agency logo/name (white label enabled)
- [ ] CAN use Creative Studio (500/month limit)
- [ ] CAN use AI Chatbot (100/day limit)
- [ ] CAN connect unlimited brands
- [ ] CAN invite 10 team members
- [ ] Shows "Priority Support" badge
- [ ] Shows "Dedicated Account Manager" info

---

## Next Steps

1. **Build Phase 1 (Critical)** - White label + feature blocking
2. **Test all 5 tiers** - Verify enforcement works
3. **Build Phase 2 (Important)** - Team/brand limits
4. **Final testing** - Complete checklist above
5. **Connect payment processor** - Stripe integration
6. **Launch** 🚀

