-- Migration 012: Update Provider Settings RPC Function
-- Creates a function to update provider settings (used by Edit Provider dialog)

DROP FUNCTION IF EXISTS public.update_provider_settings_by_id(TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT);

CREATE OR REPLACE FUNCTION public.update_provider_settings_by_id(
  p_id TEXT,
  p_is_active BOOLEAN,
  p_allow_api_key BOOLEAN DEFAULT true,
  p_api_key TEXT DEFAULT NULL,
  p_api_secret TEXT DEFAULT NULL,
  p_base_url TEXT DEFAULT NULL,
  p_api_version TEXT DEFAULT NULL,
  p_config_patch JSONB DEFAULT NULL,
  p_dashboard TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Update provider with COALESCE logic (NULL means keep current value)
  UPDATE data_providers
  SET
    is_active = p_is_active,
    api_key = CASE 
      WHEN p_allow_api_key AND p_api_key IS NOT NULL THEN p_api_key
      ELSE api_key
    END,
    api_secret = CASE 
      WHEN p_allow_api_key AND p_api_secret IS NOT NULL THEN p_api_secret
      ELSE api_secret
    END,
    base_url = COALESCE(p_base_url, base_url),
    api_version = COALESCE(p_api_version, api_version),
    config = CASE 
      WHEN p_config_patch IS NOT NULL THEN config || p_config_patch
      ELSE config
    END,
    updated_at = NOW()
  WHERE id = p_id;

  -- Return success with updated provider
  SELECT jsonb_build_object(
    'success', true,
    'id', id,
    'updated_at', updated_at
  ) INTO v_result
  FROM data_providers
  WHERE id = p_id;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Provider not found: %', p_id;
  END IF;

  RETURN v_result;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_provider_settings_by_id(TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_provider_settings_by_id(TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) TO anon;

COMMENT ON FUNCTION public.update_provider_settings_by_id(TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT) IS 
  'Updates provider settings. NULL values keep current DB values (COALESCE). '
  'p_config_patch is merged with existing config using || operator. '
  'Used by Edit Provider dialog.';

-- ============================================================================
-- Create sportsmonks_leagues RPC function (optional helper)
-- Note: Frontend should use GET /make-server-cbef71cf/sports/sportmonks/soccer/leagues
-- This RPC just checks if provider is configured
-- ============================================================================

DROP FUNCTION IF EXISTS public.sportsmonks_leagues(TEXT);

CREATE OR REPLACE FUNCTION public.sportsmonks_leagues(
  p_dashboard TEXT DEFAULT 'nova'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_provider_id TEXT;
  v_provider RECORD;
BEGIN
  -- Get active SportMonks provider
  SELECT id INTO v_provider_id
  FROM data_providers
  WHERE type = 'sportmonks'
    AND category = 'sports'
    AND is_active = true
  LIMIT 1;

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'No active SportMonks provider configured';
  END IF;

  -- Get provider details including API key
  SELECT * INTO v_provider
  FROM data_providers
  WHERE id = v_provider_id;

  IF v_provider.api_key IS NULL OR v_provider.api_key = '' THEN
    RAISE EXCEPTION 'SportMonks API key not configured';
  END IF;

  -- Return provider status (frontend should call backend endpoint for actual leagues)
  RETURN jsonb_build_object(
    'ready', true,
    'provider_id', v_provider.id,
    'provider_name', v_provider.name,
    'message', 'SportMonks provider is configured and active. Use backend endpoint to fetch leagues.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sportsmonks_leagues(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sportsmonks_leagues(TEXT) TO anon;

COMMENT ON FUNCTION public.sportsmonks_leagues(TEXT) IS 
  'Checks if SportMonks provider is configured and active. '
  'Frontend should call GET /make-server-cbef71cf/sports/sportmonks/soccer/leagues for actual leagues.';
