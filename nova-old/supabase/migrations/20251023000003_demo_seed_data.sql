-- Nova Dashboard - Seed Data
-- Migration 002: Sample data for development and testing

-- ============================================================
-- SEED SAMPLE GROUPS
-- ============================================================
INSERT INTO groups (id, name, description, permissions, member_count)
VALUES
  (
    gen_random_uuid(),
    'Administrators',
    'Full system access and management',
    '{"elections": "write", "finance": "write", "sports": "write", "weather": "write", "news": "write", "feeds": "write", "agents": "write", "users": "write"}'::jsonb,
    2
  ),
  (
    gen_random_uuid(),
    'Editors',
    'Can edit content but not manage users',
    '{"elections": "write", "finance": "write", "sports": "write", "weather": "write", "news": "write", "feeds": "read", "agents": "read", "users": "read"}'::jsonb,
    5
  ),
  (
    gen_random_uuid(),
    'Analysts',
    'Read access with AI insights',
    '{"elections": "read", "finance": "read", "sports": "read", "weather": "read", "news": "read", "feeds": "read", "agents": "read", "users": "none"}'::jsonb,
    8
  ),
  (
    gen_random_uuid(),
    'Viewers',
    'Basic read-only access',
    '{"elections": "read", "finance": "read", "sports": "read", "weather": "read", "news": "read", "feeds": "none", "agents": "none", "users": "none"}'::jsonb,
    12
  )
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- SEED SAMPLE USERS
-- ============================================================
INSERT INTO users (id, email, name, role, status, groups, permissions, last_login)
VALUES
  (
    gen_random_uuid(),
    'admin@novadashboard.com',
    'System Administrator',
    'ADMIN',
    'ACTIVE',
    ARRAY['Administrators'],
    '{"all": "write"}'::jsonb,
    NOW() - INTERVAL '2 hours'
  ),
  (
    gen_random_uuid(),
    'editor@novadashboard.com',
    'Content Editor',
    'EDITOR',
    'ACTIVE',
    ARRAY['Editors'],
    '{"content": "write"}'::jsonb,
    NOW() - INTERVAL '1 day'
  ),
  (
    gen_random_uuid(),
    'analyst@novadashboard.com',
    'Data Analyst',
    'ANALYST',
    'ACTIVE',
    ARRAY['Analysts'],
    '{"reports": "read", "insights": "read"}'::jsonb,
    NOW() - INTERVAL '3 hours'
  ),
  (
    gen_random_uuid(),
    'viewer@novadashboard.com',
    'Guest Viewer',
    'VIEWER',
    'ACTIVE',
    ARRAY['Viewers'],
    '{"dashboards": "read"}'::jsonb,
    NOW() - INTERVAL '5 days'
  )
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- SEED SAMPLE DATA FEEDS
-- ============================================================
INSERT INTO feeds (id, name, type, category, active, configuration)
VALUES
  -- Finance Feeds
  (
    gen_random_uuid(),
    'Alpaca Markets API',
    'REST API',
    'Finance',
    true,
    '{"apiUrl": "https://data.alpaca.markets/v2", "httpMethod": "GET", "dataPath": "stocks", "apiKey": "STORED_SEPARATELY", "apiSecret": "STORED_SEPARATELY"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'CoinGecko Crypto Prices',
    'REST API',
    'Finance',
    true,
    '{"apiUrl": "https://api.coingecko.com/api/v3/simple/price", "httpMethod": "GET", "dataPath": "data"}'::jsonb
  ),
  
  -- Election Feeds
  (
    gen_random_uuid(),
    'AP Election Results',
    'REST API',
    'Elections',
    true,
    '{"apiUrl": "https://api.ap.org/v3/elections", "httpMethod": "GET", "dataPath": "races", "apiKey": "STORED_SEPARATELY"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'FiveThirtyEight Predictions',
    'REST API',
    'Elections',
    false,
    '{"apiUrl": "https://projects.fivethirtyeight.com/polls-api", "httpMethod": "GET", "dataPath": "data"}'::jsonb
  ),
  
  -- Sports Feeds
  (
    gen_random_uuid(),
    'ESPN Sports API',
    'REST API',
    'Sports',
    true,
    '{"apiUrl": "https://site.api.espn.com/apis/site/v2/sports", "httpMethod": "GET", "dataPath": "events"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'TheOddsAPI',
    'REST API',
    'Sports',
    true,
    '{"apiUrl": "https://api.the-odds-api.com/v4/sports", "httpMethod": "GET", "dataPath": "data", "apiKey": "STORED_SEPARATELY"}'::jsonb
  ),
  
  -- Weather Feeds
  (
    gen_random_uuid(),
    'OpenWeatherMap',
    'REST API',
    'Weather',
    true,
    '{"apiUrl": "https://api.openweathermap.org/data/2.5/weather", "httpMethod": "GET", "dataPath": "data", "apiKey": "STORED_SEPARATELY"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'Weather.gov Alerts',
    'REST API',
    'Weather',
    true,
    '{"apiUrl": "https://api.weather.gov/alerts/active", "httpMethod": "GET", "dataPath": "features"}'::jsonb
  ),
  
  -- News Feeds
  (
    gen_random_uuid(),
    'NewsAPI',
    'REST API',
    'News',
    true,
    '{"apiUrl": "https://newsapi.org/v2/top-headlines", "httpMethod": "GET", "dataPath": "articles", "apiKey": "STORED_SEPARATELY"}'::jsonb
  ),
  (
    gen_random_uuid(),
    'RSS Feed Aggregator',
    'Webhook',
    'News',
    true,
    '{"webhookUrl": "https://example.com/rss-webhook", "secret": "STORED_SEPARATELY"}'::jsonb
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- SEED SAMPLE AGENTS
-- ============================================================
INSERT INTO agents (id, name, description, agent_type, status, schedule, configuration, last_run, next_run, run_count)
VALUES
  (
    gen_random_uuid(),
    'Stock Price Updater',
    'Fetches latest stock prices from Alpaca every 5 minutes during market hours',
    'DATA_COLLECTOR',
    'ACTIVE',
    '*/5 * * * *',
    '{"source": "alpaca", "symbols": ["AAPL", "GOOGL", "MSFT", "AMZN"], "marketHoursOnly": true}'::jsonb,
    NOW() - INTERVAL '5 minutes',
    NOW() + INTERVAL '5 minutes',
    1440
  ),
  (
    gen_random_uuid(),
    'Election Results Analyzer',
    'Analyzes election results and generates predictions',
    'ANALYZER',
    'PAUSED',
    '0 * * * *',
    '{"dataSource": "ap", "generatePredictions": true, "confidenceThreshold": 0.75}'::jsonb,
    NOW() - INTERVAL '2 hours',
    NOW() + INTERVAL '1 hour',
    24
  ),
  (
    gen_random_uuid(),
    'Sports Score Predictor',
    'ML-based sports score predictions',
    'PREDICTOR',
    'ACTIVE',
    '0 */6 * * *',
    '{"leagues": ["NFL", "NBA", "MLB"], "modelVersion": "v2.1", "factors": ["team_stats", "player_injuries", "historical_matchups"]}'::jsonb,
    NOW() - INTERVAL '3 hours',
    NOW() + INTERVAL '3 hours',
    120
  ),
  (
    gen_random_uuid(),
    'Weather Alert Notifier',
    'Sends notifications for severe weather alerts',
    'NOTIFIER',
    'ACTIVE',
    '*/15 * * * *',
    '{"channels": ["email", "slack"], "severityThreshold": "moderate", "locations": ["New York", "Los Angeles", "Chicago"]}'::jsonb,
    NOW() - INTERVAL '15 minutes',
    NOW() + INTERVAL '15 minutes',
    2880
  ),
  (
    gen_random_uuid(),
    'News Sentiment Analyzer',
    'Analyzes sentiment of news articles',
    'ANALYZER',
    'ACTIVE',
    '0 */2 * * *',
    '{"categories": ["Finance", "Elections", "Sports"], "sentimentModel": "bert-base", "entityExtraction": true}'::jsonb,
    NOW() - INTERVAL '1 hour',
    NOW() + INTERVAL '1 hour',
    360
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON TABLE feeds IS 'Note: API keys and secrets should be stored securely and referenced, not stored in plaintext';
COMMENT ON TABLE agents IS 'Schedule uses cron format: minute hour day month day-of-week';
