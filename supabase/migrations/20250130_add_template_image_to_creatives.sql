-- Add template_image_url column to creatives table for template-based generation
ALTER TABLE creatives
ADD COLUMN IF NOT EXISTS template_image_url TEXT,
ADD COLUMN IF NOT EXISTS additional_notes TEXT;

-- Add comment to the new column
COMMENT ON COLUMN creatives.template_image_url IS 'URL of the template image used for generation';
COMMENT ON COLUMN creatives.additional_notes IS 'Additional customization notes provided by user';
