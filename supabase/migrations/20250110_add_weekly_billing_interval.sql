-- Add 'week' as a valid billing interval option
-- This allows users to pay weekly while maintaining the same monthly usage limits

-- Update the billing_interval check constraint to include 'week'
ALTER TABLE subscriptions 
  DROP CONSTRAINT IF EXISTS subscriptions_billing_interval_check;

ALTER TABLE subscriptions 
  ADD CONSTRAINT subscriptions_billing_interval_check 
  CHECK (billing_interval IN ('week', 'month', 'year'));

-- Add comment explaining the weekly billing model
COMMENT ON COLUMN subscriptions.billing_interval IS 
  'Billing frequency: week (10% premium, same monthly limits), month (standard), or year (deprecated). Weekly billing charges users every 7 days but maintains the same monthly usage limits as monthly billing.';

-- Note: tier_limits table already stores monthly limits, which apply regardless of billing interval
-- Weekly billing is purely a payment convenience feature with a 10% premium

