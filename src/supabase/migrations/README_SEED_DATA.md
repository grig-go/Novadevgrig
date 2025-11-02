# Seed Data Documentation

## Overview

The seed data file `016_seed_data_extracted.sql` contains production data extracted from the Supabase database for the following tables:

## Tables Included

### Weather Tables (from 004_weather_storage.sql)
1. **weather_locations** - Weather monitoring locations (13 records)
2. **weather_current** - Current weather conditions (11 records)
3. **weather_air_quality** - Air quality data and AQI (11 records)
4. **weather_hourly_forecast** - Hourly forecasts up to 10 days (792 records)
5. **weather_daily_forecast** - Daily forecasts up to 14 days (55 records)
6. **weather_alerts** - Active weather alerts and warnings (16 records)

### Provider Configuration Tables
7. **news_provider_configs** - News API provider configurations (2 records)
8. **ai_providers** - AI provider configurations (3 records)
9. **data_providers** - Unified data provider configurations (7 records)

### Sports Tables
10. **sports_leagues** - Sports leagues and competitions (4 records)
11. **sports_teams** - Sports teams data (30 records)

### News Tables
12. **news_articles** - News articles fetched from providers (19 records)

**Total: 963 records across 12 tables**

## Usage

### Running the Seed File

```bash
# Using psql
psql -h your-host -U your-user -d your-database -f src/supabase/migrations/016_seed_data_extracted.sql

# Using Supabase CLI
supabase db push
```

### Re-generating the Seed File

If you need to regenerate the seed file with updated data:

```bash
npx tsx src/supabase/scripts/extract_seed_data.ts
```

## Important Notes

### Upsert Strategy

All INSERT statements use `ON CONFLICT (id) DO UPDATE SET` to:
- Insert new records if they don't exist
- Update existing records if they do exist (based on primary key)
- Preserve `created_at` timestamps
- Update `updated_at` timestamps

### Primary Keys

Each table uses the following primary key for upsert:
- **weather_locations**: `id` (TEXT)
- **weather_current**: `id` (SERIAL)
- **weather_air_quality**: `id` (SERIAL)
- **weather_hourly_forecast**: `id` (SERIAL)
- **weather_daily_forecast**: `id` (SERIAL)
- **weather_alerts**: `id` (TEXT)
- **news_provider_configs**: `id` (UUID)
- **ai_providers**: `id` (TEXT)
- **data_providers**: `id` (TEXT)
- **sports_leagues**: `id` (BIGINT)
- **sports_teams**: `id` (TEXT)
- **news_articles**: `id` (UUID)

### Data Integrity

- All JSONB fields are properly formatted
- Text arrays use PostgreSQL array syntax
- Timestamps include timezone information
- NULL values are preserved where appropriate

## Migration Order

This seed file should be run **after** the following migrations:

1. `003_functions_and_views.sql` - Database functions and views
2. `004_weather_storage.sql` - Weather tables
3. `006_news_providers.sql` - News provider configs table
4. `007_ai_providers_table.sql` - AI providers table
5. `008_unified_data_providers.sql` - Unified data providers table
6. `013_sports_teams_table.sql` - Sports teams table
7. `014_sports_leagues_table.sql` - Sports leagues table
8. `015_news_articles_table.sql` - News articles table

## Data Statistics

- **Weather data**: 898 records total
  - Locations: 13
  - Current conditions: 11
  - Air quality: 11
  - Hourly forecasts: 792
  - Daily forecasts: 55
  - Active alerts: 16
- **Provider configs**: 12 records (news, AI, unified providers)
- **Sports data**: 34 records (leagues + teams)
- **News articles**: 19 records

**Grand Total: 963 records**

## Maintenance

To keep the seed data up to date:

1. Run the extraction script periodically
2. Review the generated SQL file
3. Commit changes to version control
4. Apply to other environments as needed

## Security Notes

⚠️ **WARNING**: This seed file may contain sensitive data:
- API keys are not included (those must be set separately)
- News article content may be copyrighted
- Only use this seed file in development/staging environments
- Review and sanitize before sharing publicly
