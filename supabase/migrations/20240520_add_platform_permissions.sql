-- Add can_manage_platforms permission field to brand_access table
ALTER TABLE public.brand_access 
ADD COLUMN IF NOT EXISTS can_manage_platforms BOOLEAN DEFAULT false;

-- Update existing records to have default permission based on role
UPDATE public.brand_access 
SET can_manage_platforms = CASE 
  WHEN role = 'admin' THEN true
  WHEN role = 'media_buyer' THEN false
  WHEN role = 'viewer' THEN false
  ELSE false
END
WHERE can_manage_platforms IS NULL;

-- Add comment to explain the field
COMMENT ON COLUMN public.brand_access.can_manage_platforms IS 'Whether the user can connect/disconnect platforms for this brand';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_brand_access_platform_permissions ON public.brand_access(brand_id, can_manage_platforms);

-- Add can_manage_platforms field to brand_share_links table as well
ALTER TABLE public.brand_share_links 
ADD COLUMN IF NOT EXISTS can_manage_platforms BOOLEAN DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN public.brand_share_links.can_manage_platforms IS 'Whether the share link grants platform management permissions'; 