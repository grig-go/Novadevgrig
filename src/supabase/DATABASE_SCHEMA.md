# Nova Dashboard - Database Schema Reference

Visual reference for the complete database structure.

## Table Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                     NOVA DASHBOARD SCHEMA                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│    USERS     │
├──────────────┤
│ id (PK)      │◄────┐
│ email        │     │
│ name         │     │
│ role         │     │  References
│ status       │     │  groups via
│ groups[]     │─────┤  ARRAY field
│ permissions  │     │
│ last_login   │     │
└──────────────┘     │
                     │
                     ▼
               ┌──────────────┐
               │    GROUPS    │
               ├──────────────┤
               │ id (PK)      │
               │ name         │
               │ description  │
               │ permissions  │
               │ member_count │
               └──────────────┘

┌──────────────┐
│    AGENTS    │
├──────────────┤
│ id (PK)      │◄────┐
│ name         │     │
│ agent_type   │     │  One-to-Many
│ status       │     │
│ schedule     │     │
│ configuration│     │
│ last_run     │     │
│ next_run     │     │
└──────────────┘     │
                     │
                     │
                     ▼
               ┌──────────────────┐
               │   AGENT_RUNS     │
               ├──────────────────┤
               │ id (PK)          │
               │ agent_id (FK)    │
               │ status           │
               │ started_at       │
               │ completed_at     │
               │ duration_ms      │
               │ logs             │
               │ error_message    │
               │ results          │
               └──────────────────┘

┌────────────────────┐
│       FEEDS        │
├────────────────────┤
│ id (PK)            │
│ name               │
│ type               │  ← REST API, Database, File, Webhook
│ category           │  ← Elections, Finance, Sports, Weather, News
│ active             │
│ configuration      │  ← JSONB with apiKey, apiSecret
└────────────────────┘

┌────────────────────────┐
│    ALPACA_STOCKS       │
├────────────────────────┤
│ symbol (PK)            │
│ name                   │
│ type                   │  ← EQUITY, ETF, INDEX, CRYPTO
│ price                  │
│ change_1d              │
│ change_1d_pct          │
│ change_1y_pct          │
│ year_high              │
│ year_low               │
│ chart_1y               │  ← JSONB
│ rating                 │  ← JSONB
│ custom_name            │  ← User override
│ last_update            │
└────────────────────────┘

┌────────────────────────┐
│      ELECTIONS         │
├────────────────────────┤
│ id (PK)                │
│ race_id                │
│ race_type              │  ← PRESIDENT, SENATE, HOUSE, etc.
│ state                  │
│ district               │
│ office                 │
│ incumbent_party        │
│ status                 │  ← UPCOMING, ACTIVE, CALLED, CERTIFIED
│ precincts_reporting    │
│ precincts_total        │
│ votes_total            │
│ candidates             │  ← JSONB array
│ prediction             │  ← JSONB
│ configuration          │  ← JSONB
└────────────────────────┘

┌────────────────────────┐
│  FINANCE_SECURITIES    │
├────────────────────────┤
│ id (PK)                │
│ unique_key             │
│ symbol                 │
│ cg_id                  │
│ name                   │
│ type                   │  ← EQUITY, ETF, INDEX, CRYPTO
│ exchange               │
│ snapshot               │  ← JSONB (price, change, etc.)
│ news                   │  ← JSONB
│ configuration          │  ← JSONB
└────────────────────────┘

┌────────────────────────┐
│     SPORTS_EVENTS      │
├────────────────────────┤
│ id (PK)                │
│ event_id               │
│ sport                  │  ← NFL, NBA, MLB, NHL, etc.
│ league                 │
│ event_type             │
│ status                 │  ← SCHEDULED, LIVE, FINAL, etc.
│ start_time             │
│ venue                  │  ← JSONB
│ teams                  │  ← JSONB
│ score                  │  ← JSONB
│ prediction             │  ← JSONB
│ configuration          │  ← JSONB
└────────────────────────┘

┌────────────────────────┐
│   WEATHER_LOCATIONS    │
├────────────────────────┤
│ id (PK)                │
│ location_id            │
│ city                   │
│ state                  │
│ country                │
│ coordinates            │  ← JSONB
│ current_weather        │  ← JSONB
│ forecast               │  ← JSONB
│ alerts                 │  ← JSONB
│ configuration          │  ← JSONB
└────────────────────────┘

┌────────────────────────┐
│    NEWS_ARTICLES       │
├────────────────────────┤
│ id (PK)                │
│ article_id             │
│ title                  │
│ description            │
│ content                │
│ source                 │
│ author                 │
│ url                    │
│ image_url              │
│ published_at           │
│ category               │  ← Elections, Finance, Sports, etc.
│ sentiment              │  ← JSONB
│ entities               │  ← JSONB
│ configuration          │  ← JSONB
└────────────────────────┘
```

## Data Types Legend

| Type | Description | Example |
|------|-------------|---------|
| UUID | Universally Unique Identifier | `550e8400-e29b-41d4-a716-446655440000` |
| TEXT | Variable-length text | `"Alpaca Markets API"` |
| JSONB | Binary JSON (indexed, queryable) | `{"apiKey": "xxx", "apiSecret": "yyy"}` |
| DECIMAL | Precise decimal numbers | `123.4567` |
| INT | Integer | `42` |
| BIGINT | Large integer | `9223372036854775807` |
| BOOLEAN | True/false | `true` |
| TIMESTAMPTZ | Timestamp with timezone | `2024-01-15 14:30:00+00` |
| TEXT[] | Array of text | `["Administrators", "Editors"]` |

## JSONB Structure Examples

### Feeds Configuration (REST API)
```json
{
  "apiUrl": "https://data.alpaca.markets/v2/stocks",
  "httpMethod": "GET",
  "dataPath": "bars",
  "apiKey": "PKOSFDGF5FUEN3AUWIIZ6B3TVB",
  "apiSecret": "UeEvRxjcjV8LADoiXeinnk2aSL41EPT8sr5ZGbjWnnM"
}
```

### Feeds Configuration (Database)
```json
{
  "host": "db.example.com",
  "port": "5432",
  "databaseName": "production",
  "query": "SELECT * FROM stocks WHERE active = true"
}
```

### Feeds Configuration (Webhook)
```json
{
  "webhookUrl": "https://example.com/webhook",
  "secret": "whsec_abc123xyz"
}
```

### Stock Chart Data
```json
[
  {"t": "2024-01-01T00:00:00Z", "c": 150.25},
  {"t": "2024-01-02T00:00:00Z", "c": 151.50},
  {"t": "2024-01-03T00:00:00Z", "c": 149.75}
]
```

### Election Candidates
```json
[
  {
    "id": "cand-001",
    "name": "John Smith",
    "party": "DEM",
    "votes": 1250000,
    "percentage": 52.3,
    "image": "https://..."
  },
  {
    "id": "cand-002",
    "name": "Jane Doe",
    "party": "REP",
    "votes": 1140000,
    "percentage": 47.7,
    "image": "https://..."
  }
]
```

## Indexes Reference

### Performance Indexes
```sql
-- Feeds
idx_feeds_category          ON feeds(category)
idx_feeds_type             ON feeds(type)
idx_feeds_active           ON feeds(active)

-- Alpaca Stocks
idx_alpaca_stocks_type     ON alpaca_stocks(type)
idx_alpaca_stocks_name     ON alpaca_stocks(name)

-- Elections
idx_elections_race_type    ON elections(race_type)
idx_elections_state        ON elections(state)
idx_elections_status       ON elections(status)

-- Finance Securities
idx_finance_securities_type    ON finance_securities(type)
idx_finance_securities_symbol  ON finance_securities(symbol)

-- Sports Events
idx_sports_events_sport        ON sports_events(sport)
idx_sports_events_status       ON sports_events(status)
idx_sports_events_start_time   ON sports_events(start_time)

-- Weather Locations
idx_weather_locations_city     ON weather_locations(city)
idx_weather_locations_state    ON weather_locations(state)

-- News Articles
idx_news_articles_category     ON news_articles(category)
idx_news_articles_source       ON news_articles(source)
idx_news_articles_published_at ON news_articles(published_at)

-- Agents
idx_agents_status              ON agents(status)
idx_agents_type                ON agents(agent_type)

-- Agent Runs
idx_agent_runs_agent_id        ON agent_runs(agent_id)
idx_agent_runs_status          ON agent_runs(status)
idx_agent_runs_started_at      ON agent_runs(started_at)

-- Users
idx_users_email                ON users(email)
idx_users_role                 ON users(role)
idx_users_status               ON users(status)
```

## Views Reference

### v_active_feeds
```sql
SELECT id, name, type, category, endpoint, created_at, updated_at
FROM feeds
WHERE active = true
```

### v_stock_summary
```sql
SELECT 
  type,
  COUNT(*) as total_count,
  COUNT(*) FILTER (WHERE change_1d_pct > 0) as gainers,
  COUNT(*) FILTER (WHERE change_1d_pct < 0) as losers,
  AVG(change_1d_pct) as avg_change_pct
FROM alpaca_stocks
GROUP BY type
```

### v_election_summary
```sql
SELECT 
  race_type,
  status,
  COUNT(*) as race_count,
  SUM(votes_total) as total_votes,
  AVG(precincts_reporting / precincts_total * 100) as avg_reporting_pct
FROM elections
GROUP BY race_type, status
```

### v_sports_today
```sql
SELECT sport, status, COUNT(*) as event_count
FROM sports_events
WHERE DATE(start_time) = CURRENT_DATE
GROUP BY sport, status
```

### v_active_agents
```sql
SELECT 
  a.id, a.name, a.agent_type, a.status, 
  a.last_run, a.next_run, a.run_count,
  recent_success_rate
FROM agents a
LEFT JOIN (recent run statistics)
WHERE a.status = 'ACTIVE'
```

### v_user_activity
```sql
SELECT 
  role, status,
  COUNT(*) as user_count,
  COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '7 days') as active_last_7_days
FROM users
GROUP BY role, status
```

## Functions Reference

### Data Operations
```sql
-- Get active feeds for a category
get_active_feeds_by_category(p_category TEXT)
  RETURNS TABLE (id, name, type, configuration, created_at)

-- Bulk upsert stock prices
upsert_stock_prices(p_stocks JSONB)
  RETURNS INT  -- Number of stocks updated

-- Record agent execution
record_agent_run(p_agent_id UUID, p_status TEXT, p_duration_ms INT, ...)
  RETURNS UUID  -- Run ID
```

### Analytics
```sql
-- Get comprehensive dashboard statistics
get_dashboard_stats()
  RETURNS JSONB  -- Complete stats object

-- Get table size and performance metrics
get_table_stats()
  RETURNS TABLE (table_name, row_count, total_size, table_size, indexes_size)
```

### Maintenance
```sql
-- Clean up old agent run records
cleanup_old_agent_runs()
  RETURNS INT  -- Number of records deleted
```

## Row Level Security Policies

### Current Policy (Basic)
```sql
-- All tables have this policy
CREATE POLICY "Allow all for authenticated users"
  ON table_name FOR ALL
  USING (auth.role() = 'authenticated');
```

### Recommended Production Policies

#### Feeds (Example)
```sql
-- Users can read all feeds
CREATE POLICY "Users can read feeds"
  ON feeds FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can create/update/delete feeds
CREATE POLICY "Admins can modify feeds"
  ON feeds FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'ADMIN'
    )
  );
```

#### Stocks (Example)
```sql
-- Everyone can read stocks
CREATE POLICY "Public read access"
  ON alpaca_stocks FOR SELECT
  USING (true);

-- Only authenticated users can update
CREATE POLICY "Authenticated can update"
  ON alpaca_stocks FOR UPDATE
  USING (auth.role() = 'authenticated');
```

## Size Estimates

### Expected Row Counts (Production)

| Table | Expected Rows | Notes |
|-------|---------------|-------|
| feeds | 50-200 | Manageable, rarely changes |
| alpaca_stocks | 500-5,000 | User watchlists |
| elections | 1,000-5,000 | Per election cycle |
| finance_securities | 1,000-10,000 | Multiple asset types |
| sports_events | 10,000-50,000 | Historical + upcoming |
| weather_locations | 100-1,000 | User locations |
| news_articles | 100,000-1M | Archive old articles |
| agents | 10-100 | Limited by design |
| agent_runs | 10,000-100,000 | Cleanup regularly |
| users | 100-10,000 | Depends on scale |
| groups | 5-50 | Organizational structure |

### Storage Considerations

- **JSONB Columns**: Index with GIN if frequently queried
- **Time-Series Data**: Consider partitioning for tables like `news_articles`, `sports_events`
- **Large Binary Data**: Use Supabase Storage, not database
- **Cleanup Strategy**: Archive or delete old `agent_runs`, `news_articles` older than 90 days

---

**Quick Reference Card**

```
Tables: 11 core tables
Functions: 7 helper functions
Views: 6 optimized views
Indexes: 25+ performance indexes
Policies: RLS enabled on all tables
Triggers: Auto-updated timestamps
```
