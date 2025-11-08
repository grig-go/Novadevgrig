-- Migration: Create AI Providers Table
-- Description: Dedicated table for AI API provider configurations (text, image, video)
-- Replaces: KV store pattern (ai_provider:*) with proper database table

-- ============================================================================
-- CREATE ai_providers TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider_name TEXT NOT NULL, -- claude, openai, gemini, etc.
  type TEXT NOT NULL, -- text, image, video, multimodal
  description TEXT,
  api_key TEXT NOT NULL, -- Encrypted in production, plain for prototyping
  api_secret TEXT, -- Optional, for providers requiring secret
  endpoint TEXT, -- Custom endpoint URL
  model TEXT, -- Selected model ID
  available_models JSONB DEFAULT '[]'::jsonb, -- Array of available models
  enabled BOOLEAN DEFAULT true,
  rate_limit_per_minute INTEGER DEFAULT 60,
  max_tokens INTEGER DEFAULT 4096,
  temperature NUMERIC(3,2) DEFAULT 0.7,
  top_p NUMERIC(3,2) DEFAULT 1.0,
  dashboard_assignments JSONB DEFAULT '[]'::jsonb, -- Array of dashboard assignments
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_ai_providers_enabled ON public.ai_providers(enabled);
CREATE INDEX IF NOT EXISTS idx_ai_providers_provider_name ON public.ai_providers(provider_name);
CREATE INDEX IF NOT EXISTS idx_ai_providers_type ON public.ai_providers(type);

-- Composite index for dashboard lookups
CREATE INDEX IF NOT EXISTS idx_ai_providers_dashboard_assignments 
  ON public.ai_providers USING GIN (dashboard_assignments);

-- ============================================================================
-- UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_ai_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_providers_updated_at_trigger
BEFORE UPDATE ON public.ai_providers
FOR EACH ROW
EXECUTE FUNCTION update_ai_providers_updated_at();

-- ============================================================================
-- PUBLIC VIEW (No Secrets - Safe for Frontend)
-- ============================================================================

-- Create public view that excludes api_key and api_secret
-- This view can be safely queried by frontend without exposing credentials
CREATE OR REPLACE VIEW public.ai_providers_public AS
SELECT 
  id,
  name,
  provider_name,
  type,
  description,
  endpoint,
  model,
  available_models,
  enabled,
  rate_limit_per_minute,
  max_tokens,
  temperature,
  top_p,
  dashboard_assignments,
  created_at,
  updated_at
FROM public.ai_providers;
-- ⚠️ IMPORTANT: api_key and api_secret are intentionally excluded

COMMENT ON VIEW public.ai_providers_public IS 'Public view of AI providers without sensitive credentials';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for authenticated users (prototyping)
-- TODO: In production, restrict to admin users only
CREATE POLICY "Allow all operations for authenticated users"
  ON public.ai_providers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow service role full access (for server-side operations)
CREATE POLICY "Allow service role full access"
  ON public.ai_providers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Allow anon users to read from public view (safe - no secrets)
-- Note: Views inherit RLS from underlying table, but we add explicit grant
GRANT SELECT ON public.ai_providers_public TO anon;
GRANT SELECT ON public.ai_providers_public TO authenticated;

-- ============================================================================
-- MIGRATION HELPER FUNCTION (Optional - for manual KV → Table migration)
-- ============================================================================

-- This function can be used to migrate existing KV store data to the table
-- Run manually if needed: SELECT migrate_ai_providers_from_kv();

CREATE OR REPLACE FUNCTION migrate_ai_providers_from_kv()
RETURNS TABLE (
  migrated_count INTEGER,
  skipped_count INTEGER,
  errors TEXT[]
) AS $$
DECLARE
  kv_records RECORD;
  migrated INTEGER := 0;
  skipped INTEGER := 0;
  error_list TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Note: This is a placeholder function structure
  -- Actual KV → Table migration would need to be implemented based on KV store structure
  -- For now, this serves as documentation
  
  RAISE NOTICE 'KV → Table migration function is a placeholder';
  RAISE NOTICE 'Manual migration steps:';
  RAISE NOTICE '1. Export KV data with prefix "ai_provider:"';
  RAISE NOTICE '2. Transform to match ai_providers table schema';
  RAISE NOTICE '3. INSERT into ai_providers table';
  
  RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, ARRAY['Not implemented - see function comments']::TEXT[];
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SEED DATA (Default providers - optional)
-- ============================================================================

-- Insert default Claude provider (if not exists)
INSERT INTO public.ai_providers (
  id,
  name,
  provider_name,
  type,
  description,
  api_key,
  endpoint,
  model,
  enabled,
  dashboard_assignments
) VALUES (
  'claude-default',
  'Claude (Production)',
  'claude',
  'text',
  'Anthropic Claude AI for text generation',
  'sk-ant-placeholder-key', -- Replace with actual key or leave for user to configure
  'https://api.anthropic.com/v1/messages',
  'claude-3-5-sonnet-20241022',
  true,
  '[]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Insert default OpenAI provider (if not exists)
INSERT INTO public.ai_providers (
  id,
  name,
  provider_name,
  type,
  description,
  api_key,
  endpoint,
  model,
  enabled,
  dashboard_assignments
) VALUES (
  'openai-default',
  'OpenAI (Production)',
  'openai',
  'multimodal',
  'OpenAI GPT for text, vision, and image generation',
  'sk-placeholder-key', -- Replace with actual key or leave for user to configure
  'https://api.openai.com/v1',
  'gpt-4o',
  true,
  '[]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Insert default Gemini provider (if not exists)
INSERT INTO public.ai_providers (
  id,
  name,
  provider_name,
  type,
  description,
  api_key,
  endpoint,
  model,
  enabled,
  dashboard_assignments
) VALUES (
  'gemini-default',
  'Google Gemini (Production)',
  'gemini',
  'multimodal',
  'Google Gemini for text, image, and video generation',
  'placeholder-key', -- Replace with actual key or leave for user to configure
  'https://generativelanguage.googleapis.com/v1beta',
  'gemini-2.0-flash-exp',
  true,
  '[]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify table creation
-- SELECT COUNT(*) as total_providers, 
--        COUNT(*) FILTER (WHERE enabled = true) as enabled_providers,
--        COUNT(*) FILTER (WHERE enabled = false) as disabled_providers
-- FROM public.ai_providers;

-- View all providers with masked keys
-- SELECT 
--   id,
--   name,
--   provider_name,
--   type,
--   LEFT(api_key, 4) || '...' || RIGHT(api_key, 4) as api_key_masked,
--   enabled,
--   dashboard_assignments,
--   created_at
-- FROM public.ai_providers
-- ORDER BY created_at DESC;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.ai_providers IS 'AI API provider configurations for text, image, and video generation';
COMMENT ON COLUMN public.ai_providers.id IS 'Unique provider identifier (e.g., claude-default)';
COMMENT ON COLUMN public.ai_providers.provider_name IS 'Provider type: claude, openai, gemini, mistral, etc.';
COMMENT ON COLUMN public.ai_providers.type IS 'Capability type: text, image, video, multimodal';
COMMENT ON COLUMN public.ai_providers.dashboard_assignments IS 'Array of dashboard assignments with provider roles';
COMMENT ON COLUMN public.ai_providers.available_models IS 'Array of models fetched from provider API';
