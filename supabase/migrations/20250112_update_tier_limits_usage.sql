-- Update tier limits to reflect new monthly usage numbers
-- Weekly billing automatically divides these by 4

-- DTC Owner: Update creative generation
UPDATE tier_limits 
SET 
  creative_gen_monthly = 12,
  updated_at = now()
WHERE tier = 'dtc_owner';

-- Beginner: Update outreach and creative generation
UPDATE tier_limits 
SET 
  outreach_messages_monthly = 240,
  creative_gen_monthly = 24,
  updated_at = now()
WHERE tier = 'beginner';

-- Growing: Update outreach and creative generation
UPDATE tier_limits 
SET 
  outreach_messages_monthly = 700,
  creative_gen_monthly = 80,
  updated_at = now()
WHERE tier = 'growing';

-- Multi-Brand (scaling): Update all usage limits
UPDATE tier_limits 
SET 
  lead_gen_monthly = 800,
  outreach_messages_monthly = 2000,
  creative_gen_monthly = 160,
  updated_at = now()
WHERE tier = 'scaling';

-- Enterprise (agency): Update lead generation and outreach
UPDATE tier_limits 
SET 
  lead_gen_monthly = 2400,
  outreach_messages_monthly = 7200,
  updated_at = now()
WHERE tier = 'agency';

