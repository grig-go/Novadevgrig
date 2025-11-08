ALTER TABLE public.api_endpoints
  ADD COLUMN IF NOT EXISTS sample_data JSONB;