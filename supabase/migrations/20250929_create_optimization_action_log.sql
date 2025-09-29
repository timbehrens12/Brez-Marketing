-- Create table for logging optimization actions
CREATE TABLE IF NOT EXISTS public.optimization_action_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id text NOT NULL,
    brand_id text NOT NULL,
    campaign_id text NOT NULL,
    action_type text NOT NULL,
    action_details jsonb NOT NULL,
    recommendation_id uuid REFERENCES public.ai_campaign_recommendations(id),
    status text NOT NULL DEFAULT 'pending',
    applied_at timestamp with time zone,
    reverted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_optimization_action_log_user_id ON public.optimization_action_log(user_id);
CREATE INDEX idx_optimization_action_log_brand_id ON public.optimization_action_log(brand_id);
CREATE INDEX idx_optimization_action_log_campaign_id ON public.optimization_action_log(campaign_id);
CREATE INDEX idx_optimization_action_log_status ON public.optimization_action_log(status);
CREATE INDEX idx_optimization_action_log_created_at ON public.optimization_action_log(created_at);

-- Add RLS policies
ALTER TABLE public.optimization_action_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for users to see their own actions
CREATE POLICY "Users can view their own optimization actions" ON public.optimization_action_log
    FOR SELECT USING (auth.uid()::text = user_id);

-- Create RLS policy for users to insert their own actions
CREATE POLICY "Users can create their own optimization actions" ON public.optimization_action_log
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Create RLS policy for users to update their own actions
CREATE POLICY "Users can update their own optimization actions" ON public.optimization_action_log
    FOR UPDATE USING (auth.uid()::text = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_optimization_action_log_updated_at 
    BEFORE UPDATE ON public.optimization_action_log 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
