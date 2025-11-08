-- Migration 015: News Articles Storage Table
-- Creates table for storing fetched news articles from all providers

DROP TABLE IF EXISTS news_articles CASCADE;

-- Create news_articles table
CREATE TABLE IF NOT EXISTS news_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Provider information
  provider TEXT NOT NULL, -- newsapi, newsdata, etc.
  provider_article_id TEXT, -- Original ID from provider (if available)
  
  -- Article content
  title TEXT NOT NULL,
  description TEXT,
  content TEXT,
  url TEXT NOT NULL,
  image_url TEXT,
  
  -- Source information
  source_name TEXT,
  source_id TEXT,
  author TEXT,
  
  -- Metadata
  published_at TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  language TEXT,
  country TEXT,
  category TEXT,
  keywords TEXT[], -- Array of keywords/tags
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_news_articles_provider ON news_articles(provider);
CREATE INDEX IF NOT EXISTS idx_news_articles_published_at ON news_articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_fetched_at ON news_articles(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_language ON news_articles(language);
CREATE INDEX IF NOT EXISTS idx_news_articles_country ON news_articles(country);
CREATE INDEX IF NOT EXISTS idx_news_articles_category ON news_articles(category);

-- Create unique constraint on provider + URL to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_news_articles_provider_url 
  ON news_articles(provider, url);

-- Enable RLS
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

-- Public read access (anon key can read all articles)
CREATE POLICY "Public read access to news articles"
  ON news_articles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Service role can insert/update/delete
CREATE POLICY "Service role full access to news articles"
  ON news_articles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_news_articles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER news_articles_updated_at
  BEFORE UPDATE ON news_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_news_articles_updated_at();

-- Add comment
COMMENT ON TABLE news_articles IS 'Storage for news articles fetched from external providers (NewsAPI, NewsData, etc.)';
