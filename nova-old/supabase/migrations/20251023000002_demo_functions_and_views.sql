-- Nova Dashboard - Database Functions and Views
-- Migration 003: Helper functions, views, and stored procedures

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to get active feeds by category
CREATE OR REPLACE FUNCTION get_active_feeds_by_category(p_category TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  type TEXT,
  configuration JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.name, f.type, f.configuration, f.created_at
  FROM feeds f
  WHERE f.category = p_category
    AND f.active = true
  ORDER BY f.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update stock prices in bulk
CREATE OR REPLACE FUNCTION upsert_stock_prices(p_stocks JSONB)
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_stock JSONB;
BEGIN
  FOR v_stock IN SELECT * FROM jsonb_array_elements(p_stocks)
  LOOP
    INSERT INTO alpaca_stocks (
      symbol,
      name,
      type,
      price,
      change_1d,
      change_1d_pct,
      change_1y_pct,
      year_high,
      year_low,
      chart_1y,
      rating,
      last_update
    )
    VALUES (
      v_stock->>'symbol',
      v_stock->>'name',
      v_stock->>'type',
      (v_stock->>'price')::DECIMAL,
      (v_stock->>'change_1d')::DECIMAL,
      (v_stock->>'change_1d_pct')::DECIMAL,
      (v_stock->>'change_1y_pct')::DECIMAL,
      (v_stock->>'year_high')::DECIMAL,
      (v_stock->>'year_low')::DECIMAL,
      v_stock->'chart_1y',
      v_stock->'rating',
      NOW()
    )
    ON CONFLICT (symbol)
    DO UPDATE SET
      name = EXCLUDED.name,
      type = EXCLUDED.type,
      price = EXCLUDED.price,
      change_1d = EXCLUDED.change_1d,
      change_1d_pct = EXCLUDED.change_1d_pct,
      change_1y_pct = EXCLUDED.change_1y_pct,
      year_high = EXCLUDED.year_high,
      year_low = EXCLUDED.year_low,
      chart_1y = EXCLUDED.chart_1y,
      rating = EXCLUDED.rating,
      last_update = NOW();
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Function to record agent run
CREATE OR REPLACE FUNCTION record_agent_run(
  p_agent_id UUID,
  p_status TEXT,
  p_duration_ms INT DEFAULT NULL,
  p_logs JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_results JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_run_id UUID;
BEGIN
  INSERT INTO agent_runs (
    agent_id,
    status,
    completed_at,
    duration_ms,
    logs,
    error_message,
    results
  )
  VALUES (
    p_agent_id,
    p_status,
    CASE WHEN p_status IN ('COMPLETED', 'FAILED') THEN NOW() ELSE NULL END,
    p_duration_ms,
    p_logs,
    p_error_message,
    p_results
  )
  RETURNING id INTO v_run_id;
  
  -- Update agent statistics
  UPDATE agents
  SET
    last_run = NOW(),
    run_count = run_count + 1,
    error_count = CASE WHEN p_status = 'FAILED' THEN error_count + 1 ELSE error_count END
  WHERE id = p_agent_id;
  
  RETURN v_run_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'feeds', jsonb_build_object(
      'total', COUNT(*),
      'active', COUNT(*) FILTER (WHERE active = true)
    ),
    'stocks', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM alpaca_stocks),
      'gainers', (SELECT COUNT(*) FROM alpaca_stocks WHERE change_1d_pct > 0),
      'losers', (SELECT COUNT(*) FROM alpaca_stocks WHERE change_1d_pct < 0)
    ),
    'sports', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM sports_events),
      'live', (SELECT COUNT(*) FROM sports_events WHERE status = 'LIVE')
    ),
    'weather', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM weather_locations)
    ),
    'news', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM news_articles),
      'today', (SELECT COUNT(*) FROM news_articles WHERE published_at > NOW() - INTERVAL '24 hours')
    ),
    'agents', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM agents),
      'active', (SELECT COUNT(*) FROM agents WHERE status = 'ACTIVE')
    ),
    'users', jsonb_build_object(
      'total', (SELECT COUNT(*) FROM users),
      'active', (SELECT COUNT(*) FROM users WHERE status = 'ACTIVE')
    )
  ) INTO v_stats
  FROM feeds;
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

-- Function to clean old agent runs (keep last 1000 per agent)
CREATE OR REPLACE FUNCTION cleanup_old_agent_runs()
RETURNS INT AS $$
DECLARE
  v_deleted INT;
BEGIN
  WITH runs_to_keep AS (
    SELECT id
    FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY agent_id ORDER BY started_at DESC) as rn
      FROM agent_runs
    ) ranked
    WHERE rn <= 1000
  )
  DELETE FROM agent_runs
  WHERE id NOT IN (SELECT id FROM runs_to_keep);
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- VIEWS
-- ============================================================

-- View: Active feeds summary
CREATE OR REPLACE VIEW v_active_feeds AS
SELECT
  id,
  name,
  type,
  category,
  CASE
    WHEN type = 'REST API' THEN configuration->>'apiUrl'
    WHEN type = 'Database' THEN configuration->>'host'
    WHEN type = 'File' THEN configuration->>'filePath'
    WHEN type = 'Webhook' THEN configuration->>'webhookUrl'
  END as endpoint,
  created_at,
  updated_at
FROM feeds
WHERE active = true;

-- View: Stock market summary
CREATE OR REPLACE VIEW v_stock_summary AS
SELECT
  type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE change_1d_pct > 0) as gainers,
  COUNT(*) FILTER (WHERE change_1d_pct < 0) as losers,
  COUNT(*) FILTER (WHERE change_1d_pct = 0) as unchanged,
  AVG(change_1d_pct) as avg_change_pct,
  MAX(change_1d_pct) as max_change_pct,
  MIN(change_1d_pct) as min_change_pct
FROM alpaca_stocks
GROUP BY type;

-- View: Sports events today
CREATE OR REPLACE VIEW v_sports_today AS
SELECT
  sport,
  status,
  COUNT(*) as event_count
FROM sports_events
WHERE DATE(start_time) = CURRENT_DATE
GROUP BY sport, status;

-- View: Active agents summary
CREATE OR REPLACE VIEW v_active_agents AS
SELECT
  a.id,
  a.name,
  a.agent_type,
  a.status,
  a.schedule,
  a.last_run,
  a.next_run,
  a.run_count,
  a.error_count,
  COALESCE(recent_runs.success_rate, 0) as recent_success_rate
FROM agents a
LEFT JOIN (
  SELECT
    agent_id,
    (COUNT(*) FILTER (WHERE status = 'COMPLETED')::FLOAT / COUNT(*)) * 100 as success_rate
  FROM agent_runs
  WHERE started_at > NOW() - INTERVAL '24 hours'
  GROUP BY agent_id
) recent_runs ON a.id = recent_runs.agent_id
WHERE a.status = 'ACTIVE';

-- View: User activity summary
CREATE OR REPLACE VIEW v_user_activity AS
SELECT
  role,
  status,
  COUNT(*) as user_count,
  COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '7 days') as active_last_7_days,
  COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '30 days') as active_last_30_days
FROM users
GROUP BY role, status;

-- ============================================================
-- SCHEDULED CLEANUP JOB (using pg_cron if available)
-- ============================================================
-- Note: This requires the pg_cron extension to be enabled
-- Uncomment if pg_cron is available:
/*
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule cleanup job to run daily at 2 AM
SELECT cron.schedule('cleanup-old-agent-runs', '0 2 * * *', 'SELECT cleanup_old_agent_runs()');

-- Schedule to delete old news articles (older than 90 days)
SELECT cron.schedule(
  'cleanup-old-news',
  '0 3 * * *',
  'DELETE FROM news_articles WHERE published_at < NOW() - INTERVAL ''90 days'''
);
*/

-- ============================================================
-- PERFORMANCE MONITORING
-- ============================================================

-- Function to get slow queries (requires pg_stat_statements extension)
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE (
  table_name TEXT,
  row_count BIGINT,
  total_size TEXT,
  table_size TEXT,
  indexes_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || tablename AS table_name,
    n_live_tup AS row_count,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
  FROM pg_stat_user_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON FUNCTION get_active_feeds_by_category IS 'Returns all active feeds for a specific category';
COMMENT ON FUNCTION upsert_stock_prices IS 'Bulk upsert stock prices from JSONB array';
COMMENT ON FUNCTION record_agent_run IS 'Records an agent run and updates agent statistics';
COMMENT ON FUNCTION get_dashboard_stats IS 'Returns comprehensive dashboard statistics';
COMMENT ON FUNCTION cleanup_old_agent_runs IS 'Removes old agent run records, keeping last 1000 per agent';
COMMENT ON FUNCTION get_table_stats IS 'Returns size and row count statistics for all tables';
