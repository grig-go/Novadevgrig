-- Migration 009: AI Providers Status RPC Function
-- Creates a function to list AI providers with status information for the AI Settings panel
-- This function returns provider details with masked API keys and configuration status

-- Drop function if it exists
DROP FUNCTION IF EXISTS public.list_providers_with_status();

-- Create function to list providers with status
CREATE OR REPLACE FUNCTION public.list_providers_with_status()
RETURNS TABLE (
  id TEXT,
  name TEXT,
  type TEXT,
  category TEXT,
  is_active BOOLEAN,
  api_key_configured BOOLEAN,
  api_key_len INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.id::TEXT,
    ap.name::TEXT,
    ap.provider_name::TEXT as type,
    'ai'::TEXT as category,
    ap.enabled as is_active,
    (ap.api_key IS NOT NULL AND ap.api_key != '') as api_key_configured,
    CASE 
      WHEN ap.api_key IS NOT NULL THEN LENGTH(ap.api_key)
      ELSE 0
    END as api_key_len
  FROM ai_providers ap
  ORDER BY ap.name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.list_providers_with_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_providers_with_status() TO anon;

-- Add comment
COMMENT ON FUNCTION public.list_providers_with_status() IS
'Returns AI providers with status information (id, name, type, category, is_active, api_key_configured, api_key_len). '
'Does not expose actual API keys for security. Used by the AI Settings panel.';