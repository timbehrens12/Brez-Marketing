-- Create GDPR requests table for Shopify compliance
CREATE TABLE IF NOT EXISTS public.gdpr_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('customer_data_request', 'customer_data_erasure', 'shop_data_erasure')),
    shop_domain TEXT NOT NULL,
    shop_id TEXT,
    customer_id TEXT,
    request_data JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'completed', 'failed')),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_shop_domain ON public.gdpr_requests(shop_domain);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_type ON public.gdpr_requests(type);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_status ON public.gdpr_requests(status);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_customer_id ON public.gdpr_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_created_at ON public.gdpr_requests(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_gdpr_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gdpr_requests_updated_at_trigger
    BEFORE UPDATE ON public.gdpr_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_gdpr_requests_updated_at();

-- Add RLS policies
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role can manage GDPR requests" ON public.gdpr_requests
    FOR ALL USING (auth.role() = 'service_role');

-- Add comment for documentation
COMMENT ON TABLE public.gdpr_requests IS 'Tracks GDPR compliance requests from Shopify webhooks (customer data requests, erasures, etc.)';
COMMENT ON COLUMN public.gdpr_requests.type IS 'Type of GDPR request (customer_data_request, customer_data_erasure, shop_data_erasure)';
COMMENT ON COLUMN public.gdpr_requests.shop_domain IS 'Shopify shop domain that made the request';
COMMENT ON COLUMN public.gdpr_requests.customer_id IS 'Customer ID for customer-specific requests';
COMMENT ON COLUMN public.gdpr_requests.request_data IS 'Full webhook payload from Shopify';
COMMENT ON COLUMN public.gdpr_requests.status IS 'Processing status of the request';
