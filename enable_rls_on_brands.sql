-- Enable Row Level Security on the brands table
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Verify that the policies are correctly set up
-- The error message mentioned these policies:
-- "Users can delete their own brands"
-- "Users can insert their own brands"
-- "Users can update their own brands"
-- "Users can view their own brands"

-- You can verify the policies with:
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'brands';

-- If you need to recreate the policies, here are the commands:
-- (Uncomment if needed)

/*
-- Policy for viewing (SELECT)
DROP POLICY IF EXISTS "Users can view their own brands" ON public.brands;
CREATE POLICY "Users can view their own brands" 
ON public.brands 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for inserting (INSERT)
DROP POLICY IF EXISTS "Users can insert their own brands" ON public.brands;
CREATE POLICY "Users can insert their own brands" 
ON public.brands 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy for updating (UPDATE)
DROP POLICY IF EXISTS "Users can update their own brands" ON public.brands;
CREATE POLICY "Users can update their own brands" 
ON public.brands 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy for deleting (DELETE)
DROP POLICY IF EXISTS "Users can delete their own brands" ON public.brands;
CREATE POLICY "Users can delete their own brands" 
ON public.brands 
FOR DELETE 
USING (auth.uid() = user_id);
*/ 