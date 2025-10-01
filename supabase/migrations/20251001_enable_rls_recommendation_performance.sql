-- Enable Row Level Security on recommendation_performance table
-- This addresses the security linter warning: rls_disabled_in_public

-- Enable RLS on the table
ALTER TABLE public.recommendation_performance ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read their own brand's recommendation performance
CREATE POLICY "Users can view recommendation performance for their brands"
ON public.recommendation_performance
FOR SELECT
TO authenticated
USING (
  brand_id IN (
    SELECT brand_id 
    FROM public.brands 
    WHERE user_id = auth.uid()
  )
);

-- Create policy to allow service role to do everything (for backend operations)
CREATE POLICY "Service role has full access to recommendation performance"
ON public.recommendation_performance
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Create policy to allow authenticated users to insert recommendation performance for their brands
CREATE POLICY "Users can insert recommendation performance for their brands"
ON public.recommendation_performance
FOR INSERT
TO authenticated
WITH CHECK (
  brand_id IN (
    SELECT brand_id 
    FROM public.brands 
    WHERE user_id = auth.uid()
  )
);

-- Create policy to allow authenticated users to update recommendation performance for their brands
CREATE POLICY "Users can update recommendation performance for their brands"
ON public.recommendation_performance
FOR UPDATE
TO authenticated
USING (
  brand_id IN (
    SELECT brand_id 
    FROM public.brands 
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  brand_id IN (
    SELECT brand_id 
    FROM public.brands 
    WHERE user_id = auth.uid()
  )
);

-- Create policy to allow authenticated users to delete recommendation performance for their brands
CREATE POLICY "Users can delete recommendation performance for their brands"
ON public.recommendation_performance
FOR DELETE
TO authenticated
USING (
  brand_id IN (
    SELECT brand_id 
    FROM public.brands 
    WHERE user_id = auth.uid()
  )
);

