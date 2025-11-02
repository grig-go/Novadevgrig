# Nova Dashboard - Supabase Migrations

This directory contains SQL migration files for setting up the Nova Dashboard database schema in Supabase.

## Migration Files

Run migrations in numerical order (001, 002, 003, ..., 015).

### 001_initial_setup.sql
**Purpose**: Creates all core database tables and schema

**Tables Created**:
- `feeds` - Data feed configurations (REST API, Database, File, Webhook)
- `alpaca_stocks` - Alpaca Markets stock data with real-time pricing
- `elections` - Election race data with candidates and results
- `finance_securities` - Financial securities (stocks, ETFs, indices, crypto)
- `sports_events` - Sports events across multiple leagues
- `weather_locations` - Weather data for monitored locations
- `news_articles` - Aggregated news articles
- `agents` - Agentic feed configurations and automation
- `agent_runs` - Historical log of agent execution runs
- `users` - Application users with roles and permissions
- `groups` - User groups for permission management

**Features**:
- UUID primary keys
- JSONB columns for flexible configuration storage
- Timestamps with automatic `updated_at` triggers
- Indexes for performance optimization
- Row Level Security (RLS) enabled
- Check constraints for data validation

### 002_seed_data.sql
**Purpose**: Populates database with sample data for development and testing

**Data Seeded**:
- **Groups**: 4 sample groups (Administrators, Editors, Analysts, Viewers)
- **Users**: 4 sample users with different roles
- **Feeds**: 10 sample data feeds across all categories
  - Finance: Alpaca Markets, CoinGecko
  - Elections: AP Election Results, FiveThirtyEight
  - Sports: ESPN, TheOddsAPI
  - Weather: OpenWeatherMap, Weather.gov
  - News: NewsAPI, RSS Aggregator
- **Agents**: 5 sample agents for different automation tasks

### 003_functions_and_views.sql
**Purpose**: Creates database functions, views, and stored procedures

**Functions Created**:
- `get_active_feeds_by_category(category)` - Get active feeds for a category
- `upsert_stock_prices(stocks_json)` - Bulk update stock prices
- `record_agent_run(...)` - Log agent execution and update statistics
- `get_dashboard_stats()` - Get comprehensive dashboard statistics
- `cleanup_old_agent_runs()` - Maintenance function to clean old data
- `get_table_stats()` - Get table size and performance metrics

**Views Created**:
- `v_active_feeds` - Active feed summary
- `v_stock_summary` - Stock market statistics by type
- `v_election_summary` - Election status by race type
- `v_sports_today` - Today's sports events
- `v_active_agents` - Active agents with success rates
- `v_user_activity` - User activity statistics

### 015_news_articles_table.sql
**Purpose**: Creates news articles storage table for persisting fetched articles

**Table Created**:
- `news_articles` - Storage for news articles from all providers (NewsAPI, NewsData, etc.)

**Features**:
- Provider tracking (newsapi, newsdata)
- Article content (title, description, url, image)
- Source information (name, author)
- Metadata (language, country, category, keywords)
- Timestamps (published_at, fetched_at)
- UPSERT support via unique constraint on (provider, url)
- RLS with public read access
- Indexes on provider, published_at, language, country

**Backend Integration**:
- Articles auto-saved to database when fetched via `/make-server-cbef71cf/news-articles`
- Retrieve stored articles via `/make-server-cbef71cf/news-articles/stored`
- Frontend toggle between live (API) and stored (database) articles

## How to Run Migrations

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste each migration file in order (001, 002, 003)
4. Click **Run** for each migration

### Option 2: Supabase CLI
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

### Option 3: psql Command Line
```bash
# Connect to your Supabase database
psql postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres

# Run each migration
\i supabase/migrations/001_initial_setup.sql
\i supabase/migrations/002_seed_data.sql
\i supabase/migrations/003_functions_and_views.sql
```

## Database Schema Overview

### Key Design Decisions

1. **JSONB for Flexibility**: Configuration and dynamic data stored as JSONB
   - Allows flexible schema evolution
   - Supports different feed types without schema changes
   - Enables storing API keys, secrets, and custom configurations

2. **UUID Primary Keys**: All tables use UUIDs for better distribution and security

3. **Automatic Timestamps**: All tables have `created_at` and `updated_at` with triggers

4. **Row Level Security**: Enabled on all tables for fine-grained access control

5. **Indexes**: Strategic indexes on frequently queried columns

### Table Relationships

```
users ─┐
       ├─── (belongs to) ──> groups
       
agents ───> agent_runs (one-to-many)

feeds (standalone, categorized by type and category)

alpaca_stocks (standalone, real-time data)
elections (standalone, race data)
finance_securities (standalone, market data)
sports_events (standalone, event data)
weather_locations (standalone, location data)
news_articles (standalone, categorized)
```

## Security Considerations

### API Keys and Secrets
⚠️ **IMPORTANT**: The seed data includes placeholder text for API keys and secrets:
- `"STORED_SEPARATELY"` in the `configuration` JSONB fields
- These should be replaced with actual secure references or environment variables
- **DO NOT store actual API keys in the database in plaintext**

**Recommended Approach**:
1. Store API keys in Supabase Vault or environment variables
2. Reference them by key name in the configuration
3. Retrieve at runtime from secure storage

Example:
```json
{
  "apiUrl": "https://api.example.com",
  "apiKey": "${ALPACA_API_KEY}",  // Reference to vault
  "apiSecret": "${ALPACA_API_SECRET}"
}
```

### Row Level Security (RLS)
The migrations enable RLS on all tables with a basic policy:
```sql
CREATE POLICY "Allow all for authenticated users"
  ON table_name FOR ALL
  USING (auth.role() = 'authenticated');
```

**For Production**: Implement more granular policies based on:
- User roles (from `users.role`)
- Group memberships (from `users.groups`)
- Resource ownership
- Permission levels

Example production policy:
```sql
-- Allow users to read all feeds
CREATE POLICY "Users can read feeds"
  ON feeds FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can modify feeds
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

## Data Types and Constraints

### Feed Types
- `REST API` - HTTP API endpoints
- `Database` - Direct database connections
- `File` - File-based data sources
- `Webhook` - Webhook receivers

### Feed Categories
- `Elections` - Election and voting data
- `Finance` - Financial market data
- `Sports` - Sports events and scores
- `Weather` - Weather and climate data
- `News` - News articles and feeds

### User Roles
- `ADMIN` - Full system access
- `EDITOR` - Content editing capabilities
- `VIEWER` - Read-only access
- `ANALYST` - Read access with insights

### Agent Types
- `DATA_COLLECTOR` - Collects data from external sources
- `ANALYZER` - Analyzes and processes data
- `PREDICTOR` - Generates predictions using ML
- `NOTIFIER` - Sends notifications and alerts
- `CUSTOM` - Custom agent logic

## Maintenance

### Regular Cleanup Tasks

1. **Old Agent Runs**: Run cleanup function weekly
   ```sql
   SELECT cleanup_old_agent_runs();
   ```

2. **Old News Articles**: Delete articles older than 90 days
   ```sql
   DELETE FROM news_articles WHERE published_at < NOW() - INTERVAL '90 days';
   ```

3. **Vacuum and Analyze**: Optimize database performance
   ```sql
   VACUUM ANALYZE;
   ```

### Monitoring Queries

```sql
-- Check table sizes
SELECT * FROM get_table_stats();

-- Dashboard statistics
SELECT get_dashboard_stats();

-- Active feeds by category
SELECT * FROM v_active_feeds;

-- Stock market summary
SELECT * FROM v_stock_summary;

-- Agent success rates
SELECT * FROM v_active_agents;
```

## Troubleshooting

### Migration Fails

1. **Permission Errors**: Ensure you're connected as `postgres` user or have superuser privileges
2. **Extension Errors**: Some extensions may not be available in Supabase free tier
3. **Duplicate Key Errors**: If re-running migrations, use `ON CONFLICT DO NOTHING` clauses

### Performance Issues

1. **Slow Queries**: Check indexes with `EXPLAIN ANALYZE`
2. **Large Tables**: Consider partitioning for tables with >1M rows
3. **JSONB Performance**: Add GIN indexes for frequently queried JSONB columns:
   ```sql
   CREATE INDEX idx_feeds_config ON feeds USING GIN (configuration);
   ```

## Next Steps

After running migrations:

1. **Update Environment Variables**: Set your actual API keys
2. **Configure RLS Policies**: Implement production-grade security
3. **Test Functions**: Verify all functions work with your data
4. **Set Up Backups**: Configure automatic backups in Supabase
5. **Monitor Performance**: Use Supabase dashboard to monitor query performance

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL JSON Functions](https://www.postgresql.org/docs/current/functions-json.html)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Vault](https://supabase.com/docs/guides/database/vault)

---

**Need Help?** Check the Supabase documentation or create an issue in the project repository.
