-- Create table for brand-specific guardrails
CREATE TABLE IF NOT EXISTS public.brand_guardrails (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    brand_id text NOT NULL UNIQUE,
    user_id text NOT NULL,
    settings jsonb NOT NULL DEFAULT '{
        "minROAS": 2.0,
        "maxCAC": 50,
        "maxCPA": 30,
        "budgetLimits": {
            "dailyMax": 500,
            "monthlyMax": 15000
        },
        "riskTolerance": "medium",
        "autoApprovalThreshold": 100,
        "requireApprovalAbove": 1000
    }'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_brand_guardrails_brand_id ON public.brand_guardrails(brand_id);
CREATE INDEX idx_brand_guardrails_user_id ON public.brand_guardrails(user_id);

-- Add RLS policies
ALTER TABLE public.brand_guardrails ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users to see their own guardrails
CREATE POLICY "Users can view their own brand guardrails" ON public.brand_guardrails
    FOR SELECT USING (auth.uid()::text = user_id);

-- Create RLS policy for users to manage their own guardrails
CREATE POLICY "Users can manage their own brand guardrails" ON public.brand_guardrails
    FOR ALL USING (auth.uid()::text = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_brand_guardrails_updated_at 
    BEFORE UPDATE ON public.brand_guardrails 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
