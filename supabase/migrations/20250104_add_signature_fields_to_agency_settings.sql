-- Add signature fields to agency_settings table
ALTER TABLE agency_settings 
ADD COLUMN signature_name TEXT,
ADD COLUMN signature_image TEXT; 