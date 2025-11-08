-- ============================================================================
-- WEATHER LOCATIONS CUSTOM NAME MIGRATION
-- ============================================================================
-- Add custom_name column to weather_locations table for user-defined overrides
-- ============================================================================

-- Add custom_name column to weather_locations
ALTER TABLE weather_locations 
ADD COLUMN IF NOT EXISTS custom_name TEXT;

-- Create index for custom_name queries
CREATE INDEX IF NOT EXISTS idx_weather_locations_custom_name 
ON weather_locations(custom_name) 
WHERE custom_name IS NOT NULL;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✓ Added custom_name column to weather_locations table';
    RAISE NOTICE '✓ Created index for custom_name column';
    RAISE NOTICE '✓ Custom names will now be stored in database instead of KV store';
END $$;
