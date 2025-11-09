-- =====================================================
-- Add Location Fields to Media Assets
-- =====================================================
-- This migration adds optional geo-location fields to the media_assets table
-- Run this SQL in the Supabase SQL Editor

-- Add latitude column (nullable, allows decimal precision for accurate coordinates)
ALTER TABLE media_assets 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 6);

-- Add longitude column (nullable, allows decimal precision for accurate coordinates)
ALTER TABLE media_assets 
ADD COLUMN IF NOT EXISTS longitude DECIMAL(10, 6);

-- Add comments to document the columns
COMMENT ON COLUMN media_assets.latitude IS 'Latitude coordinate where media was captured/created (optional, -90 to 90)';
COMMENT ON COLUMN media_assets.longitude IS 'Longitude coordinate where media was captured/created (optional, -180 to 180)';

-- Create a composite index for geo-spatial queries
-- This is useful if you plan to query media by location
CREATE INDEX IF NOT EXISTS idx_media_assets_location 
ON media_assets(latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Add constraints to ensure valid latitude range
ALTER TABLE media_assets 
ADD CONSTRAINT IF NOT EXISTS check_latitude_range 
CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

-- Add constraints to ensure valid longitude range
ALTER TABLE media_assets 
ADD CONSTRAINT IF NOT EXISTS check_longitude_range 
CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- =====================================================
-- DONE!
-- =====================================================
-- The media_assets table now supports optional location data
-- - Latitude and longitude fields are nullable
-- - Values are validated to be within valid geographic ranges
-- - A composite index is created for efficient location-based queries
