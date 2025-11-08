-- Migration 006: News Provider Configurations
-- Creates table for managing news API providers (NewsAPI, NewsData, etc.)

-- Create news_provider_configs table
CREATE TABLE IF NOT EXISTS public.news_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  enabled BOOLEAN DEFAULT true,
  page_size INTEGER DEFAULT 20,
  default_query TEXT,
  country TEXT,
  language TEXT,
  category TEXT DEFAULT 'news',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
DROP TRIGGER IF EXISTS update_news_provider_configs_updated_at ON public.news_provider_configs;
CREATE TRIGGER update_news_provider_configs_updated_at
  BEFORE UPDATE ON public.news_provider_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default providers
INSERT INTO public.news_provider_configs (provider, enabled, page_size, country, language, category)
VALUES 
  ('newsapi', true, 20, 'us', 'en', 'news'),
  ('newsdata', true, 20, 'us', 'en', 'news')
ON CONFLICT (provider) DO NOTHING;

-- Enable RLS
ALTER TABLE public.news_provider_configs ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
DROP POLICY IF EXISTS "Allow public read access to news provider configs" ON public.news_provider_configs;
CREATE POLICY "Allow public read access to news provider configs"
  ON public.news_provider_configs
  FOR SELECT
  TO public
  USING (true);

-- Create policy to allow authenticated users to update
DROP POLICY IF EXISTS "Allow authenticated users to update news provider configs" ON public.news_provider_configs;
CREATE POLICY "Allow authenticated users to update news provider configs"
  ON public.news_provider_configs
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.news_provider_configs TO anon, authenticated;
GRANT UPDATE ON public.news_provider_configs TO authenticated;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_news_provider_configs_enabled 
  ON public.news_provider_configs(enabled);

COMMENT ON TABLE public.news_provider_configs IS 'Configuration for news API providers (NewsAPI, NewsData, etc.)';
COMMENT ON COLUMN public.news_provider_configs.provider IS 'Provider identifier (newsapi, newsdata, etc.)';
COMMENT ON COLUMN public.news_provider_configs.enabled IS 'Whether this provider is active';
COMMENT ON COLUMN public.news_provider_configs.page_size IS 'Default number of articles to fetch per request';
COMMENT ON COLUMN public.news_provider_configs.default_query IS 'Default search query for this provider';
COMMENT ON COLUMN public.news_provider_configs.country IS 'Default country filter (us, gb, etc.)';
COMMENT ON COLUMN public.news_provider_configs.language IS 'Default language filter (en, es, etc.)';
COMMENT ON COLUMN public.news_provider_configs.category IS 'Category tag for filtering (news, sports, etc.)';
