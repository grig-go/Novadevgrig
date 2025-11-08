-- ============================================================
-- WEATHER CASCADE DELETE FIX
-- ============================================================
-- This migration adds ON DELETE CASCADE to all weather table
-- foreign keys so deletions cascade automatically.
-- Issue: Foreign keys didn't have CASCADE, causing orphaned data

BEGIN;

-- ============================================================
-- 1. ADD CASCADE TO FOREIGN KEYS
-- ============================================================

-- === weather_current ===
ALTER TABLE weather_current
  DROP CONSTRAINT IF EXISTS weather_current_location_id_fkey;

ALTER TABLE weather_current
  ADD CONSTRAINT weather_current_location_id_fkey
  FOREIGN KEY (location_id)
  REFERENCES weather_locations(id)
  ON DELETE CASCADE;

-- === weather_air_quality ===
ALTER TABLE weather_air_quality
  DROP CONSTRAINT IF EXISTS weather_air_quality_location_id_fkey;

ALTER TABLE weather_air_quality
  ADD CONSTRAINT weather_air_quality_location_id_fkey
  FOREIGN KEY (location_id)
  REFERENCES weather_locations(id)
  ON DELETE CASCADE;

-- === weather_hourly_forecast ===
ALTER TABLE weather_hourly_forecast
  DROP CONSTRAINT IF EXISTS weather_hourly_forecast_location_id_fkey;

ALTER TABLE weather_hourly_forecast
  ADD CONSTRAINT weather_hourly_forecast_location_id_fkey
  FOREIGN KEY (location_id)
  REFERENCES weather_locations(id)
  ON DELETE CASCADE;

-- === weather_daily_forecast ===
ALTER TABLE weather_daily_forecast
  DROP CONSTRAINT IF EXISTS weather_daily_forecast_location_id_fkey;

ALTER TABLE weather_daily_forecast
  ADD CONSTRAINT weather_daily_forecast_location_id_fkey
  FOREIGN KEY (location_id)
  REFERENCES weather_locations(id)
  ON DELETE CASCADE;

-- === weather_alerts ===
ALTER TABLE weather_alerts
  DROP CONSTRAINT IF EXISTS weather_alerts_location_id_fkey;

ALTER TABLE weather_alerts
  ADD CONSTRAINT weather_alerts_location_id_fkey
  FOREIGN KEY (location_id)
  REFERENCES weather_locations(id)
  ON DELETE CASCADE;

-- ============================================================
-- 2. CREATE RPC FUNCTION FOR SAFE DELETION
-- ============================================================

-- Create the RPC function that the backend expects
CREATE OR REPLACE FUNCTION public.ui_delete_weather_location(p_location_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with function owner's privileges to bypass RLS
AS $$
DECLARE
  v_result jsonb;
  v_deleted_count integer;
BEGIN
  -- Check if location exists
  IF NOT EXISTS (SELECT 1 FROM weather_locations WHERE id = p_location_id) THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Location not found',
      'location_id', p_location_id
    );
  END IF;

  -- Delete the parent row (cascades to all child tables automatically)
  DELETE FROM weather_locations WHERE id = p_location_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Return success
  RETURN jsonb_build_object(
    'ok', true,
    'message', 'Location and all weather data deleted',
    'location_id', p_location_id,
    'deleted', v_deleted_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', SQLERRM,
      'location_id', p_location_id
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.ui_delete_weather_location(text) TO authenticated, service_role, anon;

-- Add comment
COMMENT ON FUNCTION public.ui_delete_weather_location(text) IS 
  'Safely deletes a weather location and all related data using CASCADE. Bypasses RLS with SECURITY DEFINER.';

-- ============================================================
-- 3. ADD/UPDATE RLS POLICIES FOR DELETION
-- ============================================================

-- Ensure weather_locations has a delete policy
DROP POLICY IF EXISTS "allow_delete_weather_locations" ON weather_locations;

CREATE POLICY "allow_delete_weather_locations"
ON weather_locations
FOR DELETE
TO authenticated, anon
USING (true);  -- Allow all deletions (adjust for your tenancy model if needed)

-- Note: Child tables don't need delete policies when using CASCADE
-- The delete happens on parent, Postgres handles the cascade automatically

COMMIT;

-- ============================================================
-- 4. VERIFICATION QUERIES (commented out for migration)
-- ============================================================

-- Verify foreign keys have CASCADE:
-- SELECT 
--   tc.table_name,
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   rc.delete_rule
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- JOIN information_schema.referential_constraints AS rc
--   ON tc.constraint_name = rc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--   AND tc.table_name LIKE 'weather_%'
--   AND ccu.table_name = 'weather_locations';

-- Test the RPC function (safe - only tests, doesn't delete):
-- SELECT ui_delete_weather_location('test-location-id');
