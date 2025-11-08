-- Migration 010: Data Providers Status RPC Functions
-- Creates functions to list data providers with status information for the Data Providers page
-- These functions return provider details with masked API keys/secrets and configuration status

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.list_providers_with_status_all();
DROP FUNCTION IF EXISTS public.list_providers_with_status_category(TEXT);
DROP FUNCTION IF EXISTS public.get_provider_details(TEXT);

-- Create function to list all data providers with status
CREATE OR REPLACE FUNCTION public.list_providers_with_status_all()
RETURNS TABLE (
  id TEXT,
  name TEXT,
  type TEXT,
  category TEXT,
  is_active BOOLEAN,
  api_key_configured BOOLEAN,
  api_key_len INTEGER,
  api_secret_configured BOOLEAN,
  api_secret_len INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.id::TEXT,
    dp.name::TEXT,
    dp.type::TEXT,
    dp.category::TEXT,
    dp.is_active,
    (dp.api_key IS NOT NULL AND dp.api_key != '') as api_key_configured,
    CASE 
      WHEN dp.api_key IS NOT NULL AND dp.api_key != '' THEN LENGTH(dp.api_key)
      ELSE 0
    END as api_key_len,
    (dp.api_secret IS NOT NULL AND dp.api_secret != '') as api_secret_configured,
    CASE 
      WHEN dp.api_secret IS NOT NULL AND dp.api_secret != '' THEN LENGTH(dp.api_secret)
      ELSE 0
    END as api_secret_len
  FROM data_providers dp
  ORDER BY dp.category, dp.name;
END;
$$;

-- Create function to list data providers by category with status
CREATE OR REPLACE FUNCTION public.list_providers_with_status_category(p_category TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  type TEXT,
  category TEXT,
  is_active BOOLEAN,
  api_key_configured BOOLEAN,
  api_key_len INTEGER,
  api_secret_configured BOOLEAN,
  api_secret_len INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.id::TEXT,
    dp.name::TEXT,
    dp.type::TEXT,
    dp.category::TEXT,
    dp.is_active,
    (dp.api_key IS NOT NULL AND dp.api_key != '') as api_key_configured,
    CASE 
      WHEN dp.api_key IS NOT NULL AND dp.api_key != '' THEN LENGTH(dp.api_key)
      ELSE 0
    END as api_key_len,
    (dp.api_secret IS NOT NULL AND dp.api_secret != '') as api_secret_configured,
    CASE 
      WHEN dp.api_secret IS NOT NULL AND dp.api_secret != '' THEN LENGTH(dp.api_secret)
      ELSE 0
    END as api_secret_len
  FROM data_providers dp
  WHERE dp.category = p_category
  ORDER BY dp.name;
END;
$$;

-- Create function to get single provider with full details (including unmasked credentials)
CREATE OR REPLACE FUNCTION public.get_provider_details(p_id TEXT)
RETURNS TABLE (
  id TEXT,
  name TEXT,
  type TEXT,
  category TEXT,
  is_active BOOLEAN,
  api_key TEXT,
  api_secret TEXT,
  base_url TEXT,
  config JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.id::TEXT,
    dp.name::TEXT,
    dp.type::TEXT,
    dp.category::TEXT,
    dp.is_active,
    dp.api_key::TEXT,
    dp.api_secret::TEXT,
    dp.base_url::TEXT,
    dp.config,
    dp.created_at,
    dp.updated_at
  FROM data_providers dp
  WHERE dp.id = p_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.list_providers_with_status_all() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_providers_with_status_all() TO anon;
GRANT EXECUTE ON FUNCTION public.list_providers_with_status_category(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_providers_with_status_category(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_provider_details(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_details(TEXT) TO anon;

-- Add comments
COMMENT ON FUNCTION public.list_providers_with_status_all() IS 
  'Returns all data providers with status information (id, name, type, category, is_active, api_key_configured, api_key_len, api_secret_configured, api_secret_len). '
  'Does not expose actual API keys or secrets for security. Used by the Data Providers page.';

COMMENT ON FUNCTION public.list_providers_with_status_category(TEXT) IS 
  'Returns data providers filtered by category with status information (id, name, type, category, is_active, api_key_configured, api_key_len, api_secret_configured, api_secret_len). '
  'Does not expose actual API keys or secrets for security. Used by the Data Providers page for category filtering.';

COMMENT ON FUNCTION public.get_provider_details(TEXT) IS 
  'Returns full details for a single provider including unmasked API key and secret. '
  'SECURITY SENSITIVE: Only use for edit/debug dialogs. Provider ID must be supplied. Used by Edit and Debug buttons.';
