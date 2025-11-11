# Nova Dashboard Development Guidelines

## Project Overview

Nova Dashboard is a comprehensive interface for viewing and editing AP Election data, Finance data, Sports data, Weather data, and News data. The application uses a clean, professional design with summary statistics and inline editing capabilities.

## Architecture

### Technology Stack
- **Framework**: React + TypeScript
- **Styling**: Tailwind CSS v4.0
- **UI Components**: ShadCN UI
- **Icons**: Lucide React
- **Charts**: Recharts
- **State Management**: React hooks
- **Backend**: Supabase (PostgreSQL database, Edge Functions)
- **Real-time Data**: Alpaca Markets API (stocks)

### Directory Structure

```
/
├── App.tsx                 # Main application component
├── COMPONENT_LIBRARY.md    # Component library documentation
├── components/             # React components
│   ├── shared/            # Reusable shared components
│   ├── ui/                # ShadCN UI components
│   └── figma/             # Figma integration components
├── data/                  # Mock data for development
├── types/                 # TypeScript type definitions
├── styles/                # Global styles
├── scripts/               # Utility scripts
├── supabase/              # Supabase backend
│   ├── functions/server/  # Edge Functions
│   └── migrations/        # Database migrations
├── utils/                 # Utility functions
└── guidelines/            # This file
```

## Component Library & Design System

Nova uses a comprehensive component library and design system for consistency and reusability.

**Design System Documentation:**
- **[DESIGN_LIBRARY.md](/DESIGN_LIBRARY.md)** - Complete design system (colors, typography, components, patterns)
- **[DESIGN_QUICK_REFERENCE.md](/DESIGN_QUICK_REFERENCE.md)** - Quick reference cheat sheet
- **[COLOR_PALETTE.md](/COLOR_PALETTE.md)** - Complete color reference with hex values
- **[COMPONENT_LIBRARY.md](/COMPONENT_LIBRARY.md)** - Complete component catalog

**For Reskinning:**
1. Start with [DESIGN_QUICK_REFERENCE.md](/DESIGN_QUICK_REFERENCE.md)
2. Modify colors in `/styles/globals.css`
3. Reference [COLOR_PALETTE.md](/COLOR_PALETTE.md) for color values

## Development Standards

### TypeScript

- All components must be TypeScript
- Define proper interfaces for props
- Export types for reusability
- Use type inference where appropriate

Example:
```tsx
interface MyComponentProps {
  title: string;
  count: number;
  onUpdate?: (value: number) => void;
}

export function MyComponent({ title, count, onUpdate }: MyComponentProps) {
  // Component logic
}
```

### Styling

- Use Tailwind CSS utility classes
- **IMPORTANT**: Do not use font size, weight, or line-height classes unless specifically requested
  - ❌ Avoid: `text-2xl`, `font-bold`, `leading-tight`
  - ✅ Use default typography from `globals.css`
- Support dark mode with `dark:` variants
- Use design tokens from `globals.css`

### Component Standards

1. **Naming**: PascalCase for components, camelCase for utilities
2. **File Organization**: One component per file
3. **Props**: Destructure props in function signature
4. **Exports**: Use named exports
5. **Documentation**: Add JSDoc comments for complex props

### Override Pattern

Many components support the `FieldOverride<T>` pattern for tracking changes:

```tsx
type FieldOverride<T> = {
  value: T;
  original?: T;
};

// Usage
const votes: FieldOverride<number> = {
  value: 50000,
  original: 48500  // Original from data provider
};

// Check if overridden
const isOverridden = votes.original !== undefined;
```

Components supporting overrides:
- InlineEditField
- InlineNumberEdit
- RaceCard
- SecurityCard
- SportsCard

### Inline Editing

Use inline edit components for data modification:

```tsx
<InlineEditField
  value={data.name}
  displayValue="Current Name"
  onSave={(newValue) => updateName(newValue)}
  onRevert={() => revertName()}
/>
```

### Override Indicators

Show amber Database icon for overridden fields:

```tsx
<OverrideIndicator
  isOverridden={hasOverride}
  onRevert={() => revertToOriginal()}
/>
```

## Dashboard Patterns

### Dashboard Structure

All dashboards follow this pattern:

1. **Filters Section**: Search, filters, and data controls
2. **Summary Section** (optional): High-level statistics
3. **Tabs**: Different views (e.g., "Summary", "All Races")
4. **Cards Grid**: Data display in cards
5. **AI Insights** (optional): AI-powered analysis

Example structure:
```tsx
export function MyDashboard() {
  return (
    <div className="p-6 space-y-6">
      <MyFilters {...filterProps} />
      <Tabs>
        <TabsList>...</TabsList>
        <TabsContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {items.map(item => <MyCard key={item.id} {...item} />)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### Data Provider Cards

All dashboards include a "Data Providers" section with clickable cards that navigate to the Data Feeds page with the appropriate category pre-selected.

```tsx
<Card 
  className="cursor-pointer hover:border-primary transition-colors"
  onClick={() => onNavigate('feeds', category)}
>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Database className="w-5 h-5" />
      Data Provider Name
    </CardTitle>
  </CardHeader>
</Card>
```

### AI Insights

Each dashboard can include AI-powered insights:
- Predictions
- Trends
- Recommendations
- Confidence scores

See individual AIInsights components for implementation.

## Shared Components

### Creating Shared Components

When creating components for reuse across projects:

1. Place in `/components/shared/`
2. Add version tracking
3. Create comprehensive documentation
4. Provide usage examples
5. Follow the SharedTopMenuBar pattern

See `/components/shared/` for examples.

### Using Shared Components

```tsx
import { SharedTopMenuBar } from './components/shared/SharedTopMenuBar';

// Use with configuration
<SharedTopMenuBar
  branding={brandingConfig}
  menus={menusConfig}
/>
```

**Documentation**: Check `/components/shared/SYNC_GUIDE.md` for multi-project usage.

## Data Management

### Database (Supabase)

Nova Dashboard uses Supabase as the backend database and API layer.

**Quick Start:**
- 📖 **[Quick Start Guide](/supabase/QUICK_START.md)** - Get set up in 5 minutes
- 🔧 **[Setup Instructions](/supabase/SETUP_INSTRUCTIONS.md)** - Detailed setup guide
- 📊 **[Migration Details](/supabase/migrations/README.md)** - Technical documentation

**Database Tables:**
- `feeds` - Data feed configurations (REST API, Database, File, Webhook)
- `alpaca_stocks` - Stock data from Alpaca Markets API
- `elections` - Election race data with candidates and results
- `finance_securities` - Financial securities (stocks, ETFs, indices, crypto)
- `sports_leagues` - Sports leagues/competitions (id: BIGINT)
- `sports_teams` - Sports teams with stats and enrichment (migration 013, league_id: BIGINT FK)
- `sports_events` - Sports events across multiple leagues
- `weather_locations` - Weather location monitoring
- `weather_current` - Current weather conditions
- `weather_air_quality` - Air quality index and pollutants
- `weather_hourly_forecast` - Hourly forecasts (up to 240 hours)
- `weather_daily_forecast` - Daily forecasts (up to 14 days)
- `weather_alerts` - Weather warnings and alerts
- `news_provider_configs` - News provider configurations (NewsAPI, NewsData)
- `news_articles` - News articles from various sources
- `agents` - Agentic feed automation
- `agent_runs` - Agent execution history
- `users` - Application users with roles
- `groups` - User groups for permissions

**KV Store (Key-Value Storage):**
- ~~`sports_team:*`~~ - ❌ **DEPRECATED** - Use `sports_teams` database table (migration 013)
- ~~`sports_league:*`~~ - ❌ **DEPRECATED** - Use `sports_leagues` database table

**Sports API Endpoints:**
- `GET /sports-data/teams` - List all teams from database
- `GET /sports-data/games` - List all games (placeholder - returns empty array)
- `GET /sports-data/venues` - List all venues (placeholder - returns empty array)
- `GET /sports-data/tournaments` - List all leagues/tournaments from database
- `GET /sports-teams` - List all teams (alternative endpoint)
- `POST /sports/add-team` - Add single team to database
- `POST /sports/add-league` - Bulk import teams for a league
- `POST /sports/remove-league` - Remove all teams from a league
- `DELETE /sports-teams/:id` - Delete team by ID
- ~~`weather_location:*`~~ - ❌ **DEPRECATED** - Use `weather_locations` database table (migration 011)
- ~~`weather_provider:*`~~ - ❌ **DEPRECATED** - Use `data_providers` database table (migration 008)
- ~~`sports_provider:*`~~ - ❌ **DEPRECATED** - Use `data_providers` database table (migration 008)
- ~~`news_provider:*`~~ - ❌ **DEPRECATED** - Use `data_providers` database table (migration 008)
- ~~`provider_api_key:*`~~ - ❌ **DEPRECATED** - Use `data_providers` database table (migration 008)
- ~~`provider_api_secret:*`~~ - ❌ **DEPRECATED** - Use `data_providers` database table (migration 008)
- ~~`stock:*`~~ - ❌ **DEPRECATED** - Use `alpaca_stocks` database table
- ~~`crypto:*`~~ - ❌ **DEPRECATED** - Use `cryptocurrencies` database table
- ~~`stock_custom_names`~~ - ❌ **DEPRECATED** - Use `custom_name` column in database

**⚠️ IMPORTANT: Storage Architecture:**
- **ALL Data Providers**: ✅ **MIGRATED** to **database table** (`data_providers`) with public view (`data_providers_public`)
  - ✅ **COMPLETE**: Unified table for Weather, Sports, News, Finance providers (migration 008)
  - ✅ **UI CONNECTED**: Data Feeds page now reads from `data_providers_public` view
  - ✅ **RPC MIGRATION**: All dashboards now use `get_provider_details` RPC for secure credential access
    - **Weather Dashboard**: ✅ Updated (see `/WEATHER_DATABASE_RECONNECTION_COMPLETE.md`)
    - **Finance Dashboard**: ✅ Updated (provider cards + debug panel - see `/FINANCE_PROVIDER_RPC_MIGRATION.md`)
    - **Finance Debug Panel**: ✅ Updated (see `/FINANCE_DEBUG_PANEL_RPC_UPDATE.md`)
    - **CryptoSearch Component**: ✅ Updated (see `/CRYPTO_SEARCH_RPC_UPDATE.md`)
    - **Data Feeds Page**: ✅ Updated (Edit & Debug buttons use RPC)
  - ✅ **MIGRATED**: AI providers use `ai_providers` table (migration 007)
  - Benefits: Schema validation, RLS security, proper CRUD, no 404 errors
  - Public view automatically masks `api_key` and `api_secret` (secure by design)
  - **Read-only UI**: Data Feeds page displays providers (add/edit via Supabase SQL Editor)
  - **🚀 START HERE**: `/PROVIDERS_TABLE_START_HERE.md` - Main entry point
  - **⚡ Quick Setup**: `/QUICK_FIX_PROVIDERS_TABLE.md` - 30-second SQL
  - **📋 Copy Data**: `/COPY_PROVIDERS_ONE_CLICK.js` - One-click browser script
  - **📚 Full Guide**: `/DATA_PROVIDERS_TABLE_MIGRATION.md` - Complete migration
  - **🎨 Visual**: `/PROVIDERS_MIGRATION_VISUAL_SUMMARY.md` - Diagrams & flow
  - **🎯 Quick Card**: `/PROVIDERS_MIGRATION_QUICK_CARD.md` - Command reference
  - **🔧 404 Fix**: `/FIX_DATA_FEEDS_404.md` - If table doesn't exist yet
- **Weather data caching**: Uses database tables (for weather readings, not provider configs)
- **Migration Notes**: 
  - Old KV store endpoints (`/data-providers`) are deprecated
  - New endpoint uses Supabase REST API: `/rest/v1/data_providers_public`
  - Secure credential access: `/rest/v1/rpc/get_provider_details` (migration 010)
  - To add providers: Use SQL INSERT or browser console script
  - See `/DO_THIS_NOW_PROVIDERS.md` for quick setup

**Custom Field Overrides:**
- Weather Location: ✅ **MIGRATED** to `weather_locations` database table (migration 011)
  - `custom_name` column stores user-defined location name overrides
  - ⚠️ **IMPORTANT**: WeatherDashboard MUST use `useWeatherData` hook to process overrides
  - Hook converts `custom_name` → `FieldOverride<string>` object for proper display
  - See `/WEATHER_OVERRIDES_DATABASE_COMPLETE.md` for migration details
  - ❌ **Weather data field overrides** (temperature, humidity, summary, etc.) have been **removed**
  - ❌ `custom_admin1` and `custom_country` overrides have been **removed**
- Finance: `custom_name` stored in database `alpaca_stocks` table (separate field pattern)

**Running Migrations:**

⚠️ **CRITICAL**: Weather storage tables must be created manually!

**🔥 QUICK FIX (2 min)**: 
1. See `/FIX_WEATHER_NOW.md` - Simple 3-step guide
2. Copy SQL from `/CREATE_WEATHER_TABLES.sql`
3. Paste in Supabase SQL Editor and click Run

**Detailed docs**: `/WEATHER_TABLES_FIX.md`

```sql
-- In Supabase SQL Editor, run in order:
\i supabase/migrations/001_initial_setup.sql
\i supabase/migrations/002_seed_data.sql
\i supabase/migrations/003_functions_and_views.sql
\i supabase/migrations/004_weather_storage.sql
\i supabase/migrations/011_weather_locations_custom_name.sql

-- Verify setup:
\i supabase/migrations/VERIFY_MIGRATIONS.sql
```

**If weather data isn't storing**: 
- Tables empty and show "Unrestricted"? See `/FIX_UNRESTRICTED_TABLES_NOW.md` (30-second fix)
- Tables don't exist? See `/WEATHER_TABLES_FIX.md`
- Complete RLS guide: `/WEATHER_RLS_FIX_GUIDE.md`

**Weather locations now in database table**:
- ✅ **[WEATHER_OVERRIDES_DATABASE_COMPLETE.md](/WEATHER_OVERRIDES_DATABASE_COMPLETE.md)** - ⭐ **LATEST: Locations migrated to database**
- ⚡ **[QUICK_FIX_WEATHER_LOCATIONS_DB.sql](/QUICK_FIX_WEATHER_LOCATIONS_DB.sql)** - 30-second setup SQL
- 📚 **[WEATHER_LOCATIONS_MIGRATION.md](/WEATHER_LOCATIONS_MIGRATION.md)** - Complete migration guide
- **Migration 011**: Added `custom_name` column to `weather_locations` table
- **Benefits**: Schema validation, RLS security, CASCADE delete, duplicate prevention
- **Custom names**: Stored in `custom_name` column (not KV store)

**If weather location delete doesn't work**:
- ⚡ **[WEATHER_DELETE_30_SECOND_FIX.md](/WEATHER_DELETE_30_SECOND_FIX.md)** - Quick fix (copy/paste SQL)
- 🔍 **[WEATHER_DELETE_COMPLETE_DIAGNOSIS.md](/WEATHER_DELETE_COMPLETE_DIAGNOSIS.md)** - Complete diagnosis & fix
- 📚 **[WEATHER_DELETE_ROOT_CAUSE_FOUND.md](/WEATHER_DELETE_ROOT_CAUSE_FOUND.md)** - Root cause analysis
- 🔧 **[WEATHER_DELETE_DUPLICATE_ENDPOINT_FIX.md](/WEATHER_DELETE_DUPLICATE_ENDPOINT_FIX.md)** - ✅ Fixed duplicate endpoint (UI delete now works)

**Important Files:**
- `/supabase/migrations/` - SQL migration files
- `/supabase/functions/make-server-cbef71cf/` - Edge Function (Hono server: server_index.tsx, kv_store.tsx)
- `/utils/supabase/info.tsx` - Supabase credentials
- `/utils/supabase/kv_store.tsx` - Key-value store utilities

### Mock Data (Development)

Mock data for local development (in `/data/`):
- `mockElectionData.ts`
- `mockFinanceData.ts`
- `mockSportsData.ts`
- `mockWeatherData.ts`
- `mockNewsData.ts`
- `mockFeedsData.ts`
- `mockAgentsData.ts`
- `mockUsersData.ts`

### Type Definitions

All data types are defined in `/types/`:
- `election.ts`
- `finance.ts`
- `sports.ts`
- `weather.ts`
- `news.ts`
- `feeds.ts` - **Includes `RestApiConfig` with `apiKey` and `apiSecret` fields**
- `agents.ts`
- `users.ts`
- `ai.ts` - **AI provider types for text and image generation APIs**

Always import and use these types for type safety.

### API Integration

**Alpaca Markets & CoinGecko** (Finance Data):
- **Storage**: ✅ **MIGRATED** to database tables (`alpaca_stocks` and `cryptocurrencies`)
  - ~~KV Store~~ - ❌ **DEPRECATED** (old `stock:*` and `crypto:*` keys no longer used)
  - **Database Tables**:
    - `alpaca_stocks` - Stocks, ETFs, indices (UNIQUE constraint on `symbol`)
    - `cryptocurrencies` - Crypto currencies (UNIQUE constraint on `cg_id`)
  - **Schema**: NUMERIC types for precision, JSONB for flexibility, RLS security
  - **Custom Names**: Stored in `custom_name` column (not separate KV key)
- **Alpaca Markets** (Stocks, ETFs, Indices):
  - **Credentials**: Stored in `data_providers` table (id: `finance_provider:alpaca`)
    - ⚡ **Quick Setup**: `/SET_ALPACA_CREDENTIALS.sql` or `/QUICK_FIX_FINANCE_CREDENTIALS.md`
    - Paper Trading API Key: `PKOSFDGF5FUEN3AUWIIZ6B3TVB`
    - Paper Trading API Secret: `UeEvRxjcjV8LADoiXeinnk2aSL41EPT8sr5ZGbjW`
  - Real-time stock prices from Alpaca Markets API
  - Search stocks via `/stocks/search`
  - Add via `/stocks/add`, refresh via `/stocks/refresh`
  - Delete via `/stocks/:symbol`, custom name via `/stocks/:symbol/custom-name`
- **CoinGecko** (Cryptocurrency):
  - **Credentials**: Stored in `data_providers` table (id: `finance_provider:coingecko`)
  - API Key: `CG-Us9jV37RzC7EVUb6BJiMVaF1`
  - Real-time crypto prices from CoinGecko API v3
  - Search crypto via `/crypto/search`
  - Add via `/crypto/add`, refresh via `/crypto/refresh`
  - Delete via `/crypto/:id`, custom name via `/crypto/:id/custom-name`
  - **CryptoSearch Component**: ✅ Uses secure RPC `get_provider_details` to verify provider before search
    - ⚡ **[CRYPTO_SEARCH_RPC_UPDATE.md](/CRYPTO_SEARCH_RPC_UPDATE.md)** - Complete technical documentation
    - ⚡ **[QUICK_FIX_CRYPTO_SEARCH_RPC.md](/QUICK_FIX_CRYPTO_SEARCH_RPC.md)** - 30-second quick reference
    - Validates CoinGecko provider configuration on dialog open
    - Shows status indicators (configured/not configured)
    - Disables search if provider not active or missing API key
- **Components**: `FinanceDashboard`, `SecuritySearch`, `SecurityCard`
- **Data Flow**: Backend database → API endpoints → FinanceDashboard → Display cards
- **Auto-refresh**: Manual refresh via "Refresh" button (fetches latest from backend)
- **Backend Endpoints** (all use database):
  - GET `/stocks` - Fetch all stocks from `alpaca_stocks` table
  - GET `/crypto` - Fetch all cryptos from `cryptocurrencies` table
  - GET `/stocks/custom-names/all` - Fetch custom names from database
  - POST `/stocks/add` - Insert into database (with duplicate check)
  - POST `/crypto/add` - Insert into database (with duplicate check)
  - POST `/stocks/refresh` - Update prices in database from Alpaca API
  - POST `/crypto/refresh` - Update prices in database from CoinGecko API
  - DELETE `/stocks/:symbol` - Delete from `alpaca_stocks` table
  - DELETE `/crypto/:id` - Delete from `cryptocurrencies` table
  - POST `/stocks/:symbol/custom-name` - Update `custom_name` column
  - POST `/crypto/:id/custom-name` - Update `custom_name` column
- **Backend Connection** (Current Architecture):
  - ✅ **[FINANCE_BACKEND_CONNECTION_COMPLETE.md](/FINANCE_BACKEND_CONNECTION_COMPLETE.md)** - Backend integration complete
  - ✅ **[FINANCE_PROVIDER_RPC_MIGRATION.md](/FINANCE_PROVIDER_RPC_MIGRATION.md)** - ⭐ **NEW: Updated to use secure RPC function**
  - ⚡ **[QUICK_FIX_FINANCE_PROVIDERS_RPC.md](/QUICK_FIX_FINANCE_PROVIDERS_RPC.md)** - Quick reference for RPC migration
  - ⚡ **[QUICK_FIX_FINANCE_CREDENTIALS.md](/QUICK_FIX_FINANCE_CREDENTIALS.md)** - 30-second credential setup
  - 🔧 **[FIX_FINANCE_ERRORS_NOW.md](/FIX_FINANCE_ERRORS_NOW.md)** - Fix common errors
  - 🔑 **[SET_ALPACA_CREDENTIALS.sql](/SET_ALPACA_CREDENTIALS.sql)** - SQL to set credentials in data_providers table
- **Migration Documentation**:
  - ⭐ **[FINANCE_FRESH_START.md](/FINANCE_FRESH_START.md)** - Delete old KV data + add stocks via UI (5 min)
  - 🗑️ **[DELETE_OLD_FINANCE_KV_DATA.sql](/DELETE_OLD_FINANCE_KV_DATA.sql)** - SQL to clean up old KV data
  - 📚 **[FINANCE_DATABASE_MIGRATION_COMPLETE_VERIFIED.md](/FINANCE_DATABASE_MIGRATION_COMPLETE_VERIFIED.md)** - Complete migration guide
  - 📊 **[FINANCE_MIGRATION_SUMMARY.md](/FINANCE_MIGRATION_SUMMARY.md)** - Migration overview
  - ⚡ **[FIX_BLANK_FINANCE_CARDS_NOW.md](/FIX_BLANK_FINANCE_CARDS_NOW.md)** - Fix blank cards (data migration)
  - 🔧 **[FINANCE_30_SECOND_FIX.sql](/FINANCE_30_SECOND_FIX.sql)** - SQL to populate database
- **Troubleshooting**: 
  - **Credentials Error**: 🚀 **[START_HERE_ALPACA_CREDENTIALS.md](/START_HERE_ALPACA_CREDENTIALS.md)** - ⭐ **START HERE** for credentials fix
  - **Credentials Missing**: ⚡ **[QUICK_FIX_FINANCE_CREDENTIALS.md](/QUICK_FIX_FINANCE_CREDENTIALS.md)** - 30-second SQL fix
  - **Credentials Visual**: 🎨 **[ALPACA_CREDENTIALS_VISUAL_FIX.md](/ALPACA_CREDENTIALS_VISUAL_FIX.md)** - Visual guide with diagrams
  - **Credentials Check**: 🔍 **[CHECK_ALPACA_CREDENTIALS_NOW.sql](/CHECK_ALPACA_CREDENTIALS_NOW.sql)** - Diagnostic SQL
  - **Browser Diagnostic**: 🔍 **[CHECK_FINANCE_CREDENTIALS_BROWSER.js](/CHECK_FINANCE_CREDENTIALS_BROWSER.js)** - Console diagnostic
  - **Complete Fix**: 📚 **[FIX_ALPACA_CREDENTIALS_NOW.md](/FIX_ALPACA_CREDENTIALS_NOW.md)** - Complete troubleshooting guide
  - **Stock Type Constraint**: ⭐ **[/ALPACA_DEPLOYMENT_CHECK_START_HERE.md](/ALPACA_DEPLOYMENT_CHECK_START_HERE.md)** - Current deployment status & fixes
  - **Stock Type Error**: `/STOCK_TYPE_ERROR_COMPLETE_FIX.md` and `/EMERGENCY_FIX_STOCK_TYPES_NOW.sql` - Type constraint errors
  - **Deployment Status**: `/ALPACA_STATUS_NOW.md` and `/ALPACA_DEPLOYMENT_STATUS_DASHBOARD.md` - Check backend deployment
  - **Blank Cards**: `/FIX_BLANK_FINANCE_CARDS_NOW.md` - Database tables empty (need to add data)
  - **General**: `/FINANCE_DASHBOARD_FIX_COMPLETE.md` and `/QUICK_FIX_FINANCE_DASHBOARD.md`
  - **Crypto Symbol**: `/CRYPTO_SYMBOL_ERROR_QUICK_CARD.md` and `/CRYPTO_SYMBOL_FIX_COMPLETE.md`
- **Quick Start** (New Setup):
  1. Set credentials: Run `/SET_ALPACA_CREDENTIALS.sql` in Supabase SQL Editor
  2. Refresh dashboard: Click "Refresh" button in Finance Dashboard
  3. Add stocks: Click "+ Add Security / Index" for each symbol
  4. Add crypto: Click "+ Add Crypto" for bitcoin
  5. Set custom names: Click edit icon on cards
  6. Refresh prices: Click "Refresh" button to update from API

**AI Providers** (Claude, OpenAI, Gemini, etc.):
- Configurable AI API providers for text and image generation
- Supports multiple provider types: Claude, OpenAI, Gemini, Mistral, Cohere, Stability AI, etc.
- **Storage**: Database table (`ai_providers`) with SERVICE_ROLE_KEY access
  - ✅ **MIGRATED** from KV store to database (see `/AI_KV_TO_DATABASE_MIGRATION.md`)
  - ✅ **ADD/DELETE FIX**: Added missing POST `/reveal` endpoint (see `/AI_ADD_DELETE_FIX_COMPLETE.md`)
  - Benefits: Schema validation, secure credential storage, full CRUD operations
- Component: `AIConnectionsDashboard`
- Access via Tools menu → AI Connections
- Types: `/types/ai.ts`
- **API Endpoints**:
  - `GET /ai-providers` - List all providers (credentials masked)
  - `POST /ai-providers` - Create new provider
  - `PUT /ai-providers/:id` - Update existing provider
  - `DELETE /ai-providers/:id` - Delete provider
  - `POST /ai-providers/:id/reveal` - Reveal unmasked credentials
- Default providers pre-configured:
  - **Claude (Anthropic)** - Text generation
  - **OpenAI (GPT)** - Multimodal (text, vision)
  - **Google Gemini** - Multimodal (text, image, video)
- **Troubleshooting**: If add/delete fails, see `/QUICK_FIX_AI_ADD_DELETE.md`

**Weather Data** (WeatherAPI.com):
- **Database Architecture**: All weather data now stored in database tables ✅ **FULLY MIGRATED**
- **Provider Config**: Stored in `data_providers` table (migration 008) ✅ **RECONNECTED**
- **Locations**: ✅ **MIGRATED** to `weather_locations` database table (migration 011)
  - Custom names stored in `custom_name` column
  - RLS security, CASCADE delete, schema validation
  - UNIQUE constraint on (lat, lon) prevents duplicates
- **Weather Data**: Fetched fresh from provider, automatically **UPSERTED** to database tables (latest only)
- **Storage Strategy**: **UPSERT pattern** - Only latest data per location (no historical time-series)
  - ✅ One row per location in `weather_current` and `weather_air_quality`
  - ✅ Stable location IDs for external app consumption
  - ✅ Auto-replaces on each fetch (no duplicates, no retention policy needed)
- **Database tables**: `weather_locations`, `weather_current` (1 row/location), `weather_air_quality` (1 row/location), `weather_hourly_forecast` (48h), `weather_daily_forecast` (14d), `weather_alerts`
- **Benefits**: Clean database, stable IDs, no retention management, fast queries, no KV dependency
- **UPSERT Implementation**: See `/WEATHER_UPSERT_STRATEGY.md` for details
- **Cascade Delete**: Foreign keys have `ON DELETE CASCADE` for automatic child deletion (see `/WEATHER_CASCADE_DELETE_FIX.md`)
- **Duplicate Coordinates**: UPSERT uses `onConflict: "lat,lon"` to handle re-adding same location (see `/WEATHER_DUPLICATE_COORDINATES_FIX.md`)
- **Documentation**: 
  - `/WEATHER_DOCUMENTATION_INDEX.md` - 📚 **Complete weather docs index (40+ guides)**
  - `/WEATHER_HYBRID_ARCHITECTURE.md` - ✨ **Hybrid architecture explained**
  - `/WEATHER_HYBRID_VERIFICATION.md` - Testing and verification guide
  - `/WEATHER_DATABASE_RECONNECTION_COMPLETE.md` - 🔌 **Provider reconnection to database (migration 008)**
  - `/QUICK_FIX_WEATHER_DATABASE.md` - ⚡ **30-second database reconnection guide**
  - `/QUICK_FIX_WEATHER_UNDEFINED_LOCATIONS.md` - ⚡ **Fix "undefined" location errors**
  - `/DIAGNOSE_WEATHER_LOCATIONS_NOW.js` - 🔍 **Diagnostic script for invalid locations**
  - `/CREATE_WEATHER_TABLES.sql` - Quick table creation
  - `/WEATHER_TABLES_FIX.md` - Detailed setup instructions
  - `/WEATHER_404_FIX_COMPLETE.md` - 🔧 **Fixed 404 errors from backend startup failure**
  - `/QUICK_FIX_WEATHER_404.md` - ⚡ **30-second 404 fix overview**
- **Component**: `WeatherDashboard`
- **API Endpoints**:
  - `GET /weather-data` - Fetch all locations from database with fresh weather (auto-caches)
  - `GET /weather-locations` - List all active locations from database
  - `POST /weather-locations` - Add location to database (UPSERT)
  - `PUT /weather-locations/:id` - Update custom_name in database
  - `DELETE /weather-locations/:id` - Remove location from database (CASCADE)
- **Troubleshooting**: If getting 404 errors, see `/WEATHER_404_FIX_COMPLETE.md` - likely server startup issue

**News Data** (NewsAPI, NewsData):
- **Architecture**: Supabase Edge Function merges all enabled news providers
- **Provider Configs**: Stored in **KV store** with prefix `news_provider:*` (consistent with weather/sports/AI)
- **Supported Providers**: NewsAPI, NewsData (extensible for future providers)
- **Edge Function**: `news-feed` - Merges results from all enabled providers
- **⚠️ CRITICAL - Endpoint Structure**:
  - `news-feed` is a **SEPARATE** Edge Function (NOT part of make-server-cbef71cf)
  - ✅ **CORRECT**: `/functions/v1/news-feed` (direct Edge Function)
  - ❌ **WRONG**: `/functions/v1/make-server-cbef71cf/news-feed` (old/broken)
  - **Auth Required**: Must include `Authorization: Bearer {anonKey}` + `apikey: {anonKey}` headers
  - **Fix Applied**: See `/NEWS_DASHBOARD_401_FIX.md` and `/QUICK_FIX_NEWS_401.md`
- **API Endpoints**:
  - `GET /make-server-cbef71cf/news-providers` - List all news providers from KV store (Hono server)
  - `GET /news-feed` - Fetch aggregated articles from all enabled providers (separate Edge Function)
- **Components**: 
  - `NewsDashboard` - Main news interface with live data
  - `useNewsProviders` hook - Loads enabled provider configurations from KV store
  - `useNewsFeed` hook - Fetches unified articles from all enabled providers (✅ FIXED - correct URL + auth)
- **Features**:
  - Multi-provider aggregation (automatic merging)
  - Real-time article fetching
  - Configurable filters (country, language, query, limits)
  - Per-provider article counts
  - Provider-specific configuration (pageSize, country, language, isActive)
- **API Parameters** (for `/news-feed`):
  - `q` - Search query
  - `country` - Country filter (e.g., 'us', 'gb')
  - `language` - Language filter (e.g., 'en', 'es')
  - `perProviderLimit` - Max articles per provider (default: 20)
  - `totalLimit` - Max total articles across all providers (default: 100)
- **Usage**: Dashboard automatically uses ALL enabled providers (`isActive: true`) - no manual provider selection needed
- **Troubleshooting**: If getting 401 errors, see `/QUICK_FIX_NEWS_401.md` - likely missing auth headers or wrong URL

**Data Feeds (Data Providers)**:
- ✅ **FULLY OPERATIONAL**: Connected to `data_providers` database table (migration 008)
- **Current Status**: 7 providers seeded (1 Weather, 2 Sports, 2 News, 2 Finance)
- **Page Features**: Display-only view with category filtering and status indicators
  - Shows all providers from `data_providers_public` view (credentials masked for security)
  - Category filtering: All, Weather, Sports, News, Finance
  - Status badges: ✅ Active, ⚠️ Not Configured, ❌ Disabled
  - API key status: ✓ Configured vs ✗ Not Set
  - Edit and Debug buttons for provider management
- **Provider Management**: Add/edit providers via UI dialogs or SQL
  - Edit dialog fetches unmasked credentials for updates
  - Debug panel shows full provider configuration
  - Add new providers through the Add Provider button
- Component: `FeedsDashboardWithSupabase` (fully functional)
- **🚀 Quick Start**:
  - ⭐ **[DATA_PROVIDERS_START_HERE.md](/DATA_PROVIDERS_START_HERE.md)** - Main entry point
  - ⚡ **[DATA_PROVIDERS_READY_SUMMARY.md](/DATA_PROVIDERS_READY_SUMMARY.md)** - Quick status overview
  - 📊 **[DATA_PROVIDERS_CURRENT_STATUS.md](/DATA_PROVIDERS_CURRENT_STATUS.md)** - Complete status report
  - 📋 **[DATA_PROVIDERS_PAGE_UPDATE_GUIDE.md](/DATA_PROVIDERS_PAGE_UPDATE_GUIDE.md)** - Update & verification guide
- **Verification Tools**:
  - 🔍 **[CHECK_PROVIDERS_CURRENT_STATE.js](/CHECK_PROVIDERS_CURRENT_STATE.js)** - Browser console checker
  - 📊 **[CHECK_PROVIDERS_STATUS.sql](/CHECK_PROVIDERS_STATUS.sql)** - SQL verification queries
  - 🌐 **[CHECK_PROVIDERS_UI.html](/CHECK_PROVIDERS_UI.html)** - Standalone HTML checker
  - ✅ **[VERIFY_PROVIDERS_COMPLETE.js](/VERIFY_PROVIDERS_COMPLETE.js)** - Complete verification script
- **Migration Docs** (if needed):
  - 📚 **[DATA_FEEDS_MIGRATION_COMPLETE.md](/DATA_FEEDS_MIGRATION_COMPLETE.md)** - Complete migration guide
  - 📊 **[DATA_FEEDS_BEFORE_AFTER.md](/DATA_FEEDS_BEFORE_AFTER.md)** - Before/after comparison
  - ⚡ **[DATA_FEEDS_QUICK_REFERENCE.md](/DATA_FEEDS_QUICK_REFERENCE.md)** - Quick reference card
- **Troubleshooting**:
  - 🔧 **[QUICK_FIX_PROVIDERS_TABLE.md](/QUICK_FIX_PROVIDERS_TABLE.md)** - 30-second setup SQL
  - 🔧 **[FIX_DATA_FEEDS_404.md](/FIX_DATA_FEEDS_404.md)** - If table doesn't exist
  - 🔧 **[PROVIDER_STATUS_QUICK_FIX.md](/PROVIDER_STATUS_QUICK_FIX.md)** - Fix "Not Configured" status
  - 📋 **[DO_THIS_NOW_PROVIDERS.md](/DO_THIS_NOW_PROVIDERS.md)** - Initial setup instructions
  - 📋 **[DATA_PROVIDERS_STATUS_CHECK.md](/DATA_PROVIDERS_STATUS_CHECK.md)** - Status checking guide

**Sports Data Providers**:
- Provider-agnostic sports data system supporting multiple providers:
  - **Sportsradar** - Comprehensive sports data (ID prefix: `sr:`)
  - **SportMonks** - Football/soccer data (ID prefix: `sm_`) ✨ NEW
- Each sport (soccer, basketball, etc.) requires its own API key
- Users can multi-select available leagues and tournaments within each sport
- Stored in KV store with prefix `sports_provider:*`, `sports_team:*`, etc.
- Documentation: **[SPORTMONKS_INTEGRATION.md](/SPORTMONKS_INTEGRATION.md)**
- **ID Format**: All IDs use Sportsradar format (e.g., `sr:competition:8`, `sr:team:123`)
  - Use `normalizeSrId()` helper to prevent malformed IDs like `sr-sr:competition:8`
  - **Season Resolution Flow**: 
    1. Fetch `/tournaments/{id}/seasons.json` to get season_id (use /tournaments/ for both competition and tournament IDs)
    2. **PREFERRED:** Use `/seasons/{season_id}/competitors.json` to get teams (direct array)
    3. **FALLBACK:** Use `/seasons/{season_id}/info.json` to get teams (nested in season.competitors)
    4. **WRONG:** NOT `/seasons/{season_id}/standings.json` (only works after games are played)
- Components: `SportsDashboard`, `SportsAddActions`, `SportsLeagueTestPanel`
- Testing: Sports Dashboard → Debug button → League Testing tab
- **Debug Feature**: Test panel shows resolved `season_id` for API debugging
  - Example: `Season ID: sr:season:105353` → Used in `/seasons/{season_id}/competitors.json`
  - Enables manual API verification via curl with exact season_id
- **Standalone Test Scripts**: Quick API testing without full application
  - `node scripts/test-sportsradar-seasons.js` - Find available seasons
  - `node scripts/test-sportsradar-competitors.js` - Test team fetching
  - See `/scripts/SPORTSRADAR_TESTING.md` for complete guide
- **SportMonks Provider Integration**:
  - 🚀 **[SPORTMONKS_FIXES_START_HERE.md](/SPORTMONKS_FIXES_START_HERE.md)** - ⭐ **START HERE: Latest fixes overview**
  - 📚 **[SPORTMONKS_V3_DOCUMENTATION_INDEX.md](/SPORTMONKS_V3_DOCUMENTATION_INDEX.md)** - Complete documentation index
  - ⚡ **[SPORTMONKS_QUICK_START.md](/SPORTMONKS_QUICK_START.md)** - 5-minute setup guide
  - 🔧 **[SPORTMONKS_V3_API_FIX.md](/SPORTMONKS_V3_API_FIX.md)** - ✅ **LATEST: Fixed v3 API nested URL trap**
  - 🎨 **[SPORTMONKS_V3_VISUAL_GUIDE.md](/SPORTMONKS_V3_VISUAL_GUIDE.md)** - Visual diagrams and examples
  - 🔍 **[SPORTMONKS_V3_QUICK_CHECK.md](/SPORTMONKS_V3_QUICK_CHECK.md)** - Verification checklist
  - 📝 **[SPORTMONKS_SEASONS_V3_FIX_SUMMARY.md](/SPORTMONKS_SEASONS_V3_FIX_SUMMARY.md)** - Quick fix summary
  - 📋 **[SPORTMONKS_QUICK_REFERENCE.md](/SPORTMONKS_QUICK_REFERENCE.md)** - Printable API reference
  - 📖 **[SPORTMONKS_INTEGRATION.md](/SPORTMONKS_INTEGRATION.md)** - Complete technical documentation
  - 🛠️ **[SPORTMONKS_IMPLEMENTATION_SUMMARY.md](/SPORTMONKS_IMPLEMENTATION_SUMMARY.md)** - Implementation details
  - ⚖️ **[SPORTS_PROVIDERS_COMPARISON.md](/SPORTS_PROVIDERS_COMPARISON.md)** - SportMonks vs Sportsradar
  - 🎯 **[SPORTMONKS_ADD_ALL_TEAMS_GUIDE.md](/SPORTMONKS_ADD_ALL_TEAMS_GUIDE.md)** - ✨ **NEW: Bulk import teams feature (complete guide)**
  - ⚡ **[SPORTMONKS_ADD_ALL_TEAMS_QUICK_REFERENCE.md](/SPORTMONKS_ADD_ALL_TEAMS_QUICK_REFERENCE.md)** - Quick reference card
  - 🎨 **[SPORTMONKS_ADD_ALL_TEAMS_VISUAL_GUIDE.md](/SPORTMONKS_ADD_ALL_TEAMS_VISUAL_GUIDE.md)** - Visual UI walkthrough
  - 🔧 **[SPORTMONKS_IMAGES_FIX_SUMMARY.md](/SPORTMONKS_IMAGES_FIX_SUMMARY.md)** - ✅ Fixed 'images' include 404 error
  - 📘 **[SPORTMONKS_API_CORRECT_USAGE.md](/SPORTMONKS_API_CORRECT_USAGE.md)** - Correct API usage patterns
  - ⚡ **[QUICK_FIX_SPORTMONKS_IMAGES.md](/QUICK_FIX_SPORTMONKS_IMAGES.md)** - 30-second fix reference
  - ⭐ **[SPORTMONKS_STATS_FIX_COMPLETE.md](/SPORTMONKS_STATS_FIX_COMPLETE.md)** - ✅ **LATEST: Robust stats fetching (6 endpoint fallbacks)**
  - ⚡ **[QUICK_FIX_SPORTMONKS_STATS.md](/QUICK_FIX_SPORTMONKS_STATS.md)** - Stats fix quick reference
- **⚠️ IMPORTANT - Error Prevention**:
  - ⚡ **[QUICK_FIX_SPORTS_NO_PROVIDER.md](/QUICK_FIX_SPORTS_NO_PROVIDER.md)** - ✅ **LATEST: Fixed "Error fetching data" when no provider configured**
  - 📚 **[SPORTS_NO_PROVIDER_FIX.md](/SPORTS_NO_PROVIDER_FIX.md)** - Complete fix details and UX improvements
  - **Issue**: UI was calling sports endpoints even when no provider configured/active
  - **Fix**: Check for active provider before making API calls, show helpful setup messages
  - **Symptom**: 501 errors in console, "Error fetching sports data" with no guidance
  - **Solution**: Dashboard now shows "No Active Sports Provider" with clear setup instructions
- **Sportsradar Provider Documentation**:
  - **[SPORTS_LEAGUE_TEST_QUICKSTART.md](/SPORTS_LEAGUE_TEST_QUICKSTART.md)** - 5-minute quick start
  - **[SPORTS_LEAGUE_TESTING_GUIDE.md](/SPORTS_LEAGUE_TESTING_GUIDE.md)** - Complete testing guide
  - **[SPORTS_TESTING_SYSTEM.md](/SPORTS_TESTING_SYSTEM.md)** - System overview
  - **[SPORTSRADAR_INTEGRATION_COMPLETE.md](/SPORTSRADAR_INTEGRATION_COMPLETE.md)** - Sportsradar setup
  - **[SPORTS_PROVIDER_QUICKSTART.md](/SPORTS_PROVIDER_QUICKSTART.md)** - Provider setup
  - **[SPORTS_404_FIX_COMPLETE.md](/SPORTS_404_FIX_COMPLETE.md)** - Season resolution fix (sync function)
  - **[SPORTS_ADD_LEAGUE_SEASON_INFO_FIX.md](/SPORTS_ADD_LEAGUE_SEASON_INFO_FIX.md)** - Season Info fix (add-league endpoint)
  - **[SPORTS_ID_NORMALIZATION_COMPLETE.md](/SPORTS_ID_NORMALIZATION_COMPLETE.md)** - ID normalization fix
  - **[SPORTS_SEASON_ID_DEBUG_ENHANCEMENT.md](/SPORTS_SEASON_ID_DEBUG_ENHANCEMENT.md)** - Season ID debug feature
  - **[SPORTS_COMPETITORS_API_FIX.md](/SPORTS_COMPETITORS_API_FIX.md)** - Competitors API implementation
  - **[SPORTSRADAR_TEST_SCRIPTS.md](/SPORTSRADAR_TEST_SCRIPTS.md)** - Standalone test scripts quick reference
  - **[SPORTS_ZERO_TEAMS_QUICK_FIX.md](/SPORTS_ZERO_TEAMS_QUICK_FIX.md)** - 30-second diagnosis for zero teams
  - **[SPORTS_ZERO_TEAMS_TROUBLESHOOTING.md](/SPORTS_ZERO_TEAMS_TROUBLESHOOTING.md)** - Complete zero teams debugging guide
  - **[SPORTS_PARSING_FIX_COMPLETE.md](/SPORTS_PARSING_FIX_COMPLETE.md)** - Enhanced parsing implementation details
  - **[SPORTS_SEASON_COMPETITORS_FIX.md](/SPORTS_SEASON_COMPETITORS_FIX.md)** - season_competitors response structure fix
  - **[SPORTS_PROFILE_ENRICHMENT.md](/SPORTS_PROFILE_ENRICHMENT.md)** - Team profile enrichment (logos, venue, manager)
  - **[SPORTS_TEAM_CARD_PAYLOAD.md](/SPORTS_TEAM_CARD_PAYLOAD.md)** - Complete team card payload reference and field mapping
  - **[SPORTS_TEAM_CARD_UPGRADE.md](/SPORTS_TEAM_CARD_UPGRADE.md)** - Team card upgrade with stats and enriched display
  - **[SPORTS_TEAM_COLORS_EXTRACTION.md](/SPORTS_TEAM_COLORS_EXTRACTION.md)** - Automatic team logo and color extraction from Sportsradar
  - **[SPORTS_TEAM_BRANDING_VISUAL_GUIDE.md](/SPORTS_TEAM_BRANDING_VISUAL_GUIDE.md)** - Visual design guide for team colors usage
  - **[SPORTS_COLORS_LOGO_ENHANCEMENT.md](/SPORTS_COLORS_LOGO_ENHANCEMENT.md)** - Color & logo enhancement summary
  - **[SPORTS_TEAM_BRANDING_FIX.md](/SPORTS_TEAM_BRANDING_FIX.md)** - ✨ **Logo & color display fix with Wikipedia fallback**
  - **[SPORTS_BRANDING_QUICK_CHECK.md](/SPORTS_BRANDING_QUICK_CHECK.md)** - Quick visual verification guide
  - **[TEAM_BRANDING_FIXES_APPLIED.md](/TEAM_BRANDING_FIXES_APPLIED.md)** - 🔧 **LATEST: Manual color mapping & Form (L5) fix**
  - **[FIX_TEAM_BRANDING_ISSUES.md](/FIX_TEAM_BRANDING_ISSUES.md)** - Root cause analysis
  - **[STANDINGS_FEATURE_COMPLETE.md](/STANDINGS_FEATURE_COMPLETE.md)** - ⭐ **NEW: League standings view with team cards**
  - **[STANDINGS_QUICK_START.md](/STANDINGS_QUICK_START.md)** - Quick start guide (30 seconds)
  - **[STANDINGS_VISUAL_GUIDE.md](/STANDINGS_VISUAL_GUIDE.md)** - Visual reference guide
  - **[STANDINGS_API_FIX_COMPLETE.md](/STANDINGS_API_FIX_COMPLETE.md)** - Fixed "No teams found" error with direct season discovery
  - **[STANDINGS_PROVIDER_FIX.md](/STANDINGS_PROVIDER_FIX.md)** - ✅ **Fixed "No active Sportsradar provider found" error**
  - **[STANDINGS_DISPLAY_FIX.md](/STANDINGS_DISPLAY_FIX.md)** - ✅ **LATEST: Fixed standings not displaying (uncommented working code)**
  - **[QUICK_FIX_STANDINGS_DISPLAY.md](/QUICK_FIX_STANDINGS_DISPLAY.md)** - ⚡ **30-second standings display fix**
  - **[SPORTS_AUTH_ERROR_FIX.md](/SPORTS_AUTH_ERROR_FIX.md)** - 🔒 **Authentication errors (403 Forbidden) - API key validation & troubleshooting**
  - **[SPORTS_PROVIDER_DEBUG_FEATURE.md](/SPORTS_PROVIDER_DEBUG_FEATURE.md)** - 🔍 **Debug feature for diagnosing provider issues (stale data, wrong leagues)**
  - **[SPORTS_STALE_DATA_FIX_SUMMARY.md](/SPORTS_STALE_DATA_FIX_SUMMARY.md)** - ⚡ **Quick fix summary for stale data issues**
  - **[SPORTS_DEBUG_ERROR_FIX.md](/SPORTS_DEBUG_ERROR_FIX.md)** - 🐛 **Fixed "Failed to fetch" error in debug dialog (duplicate sleep function)**
  - **[DUPLICATE_SLEEP_FIX.md](/DUPLICATE_SLEEP_FIX.md)** - 🔧 **CRITICAL: Fixed duplicate sleep() causing server crash and all fetch errors**
  - **[SPORTS_MISSING_SLEEP_FIX.md](/SPORTS_MISSING_SLEEP_FIX.md)** - 🚨 **CRITICAL: Fixed missing sleep() function breaking all sports endpoints**
  - **[DUPLICATE_SLEEP_DECLARATION_FIX.md](/DUPLICATE_SLEEP_DECLARATION_FIX.md)** - 🔧 **CRITICAL: Removed duplicate sleep() declaration - backend now boots**
  - **[SPORTS_PROVIDER_AGNOSTIC_FIX.md](/SPORTS_PROVIDER_AGNOSTIC_FIX.md)** - ✅ **Fixed provider detection to work with SportMonks, not just Sportsradar**
  - **[SPORTS_CORS_AND_CAPABILITY_FIX.md](/SPORTS_CORS_AND_CAPABILITY_FIX.md)** - 🔧 **Fixed CORS preflight errors + provider capability system (501 for unsupported features)**
  - **[SPORTS_CORS_FIX_VERIFICATION.md](/SPORTS_CORS_FIX_VERIFICATION.md)** - ⚡ **30-second verification guide for CORS and capability fixes**
  - **[QUICK_FIX_CORS_CAPABILITY.md](/QUICK_FIX_CORS_CAPABILITY.md)** - ⚡ **Ultra-quick reference card**
  - **[SPORTMONKS_STANDINGS_FIX_COMPLETE.md](/SPORTMONKS_STANDINGS_FIX_COMPLETE.md)** - ✅ **LATEST: Fixed SportMonks standings support (capability flag & duplicate endpoint)**
  - **[QUICK_FIX_SPORTMONKS_STANDINGS.md](/QUICK_FIX_SPORTMONKS_STANDINGS.md)** - ⚡ **30-second SportMonks standings fix reference**

## Navigation

### Routes

Main navigation views:
- `home` - Main dashboard selector
- `elections` - Election monitoring
- `finance` - Financial markets
- `sports` - Sports events
- `weather` - Weather monitoring
- `news` - News aggregation
- `agents` - Agentic feeds
- `feeds` - Data feeds management
- `ai-connections` - AI API provider management
- `users-groups` - User management

### Navigation Pattern

```tsx
function MyComponent({ onNavigate }: { onNavigate: (view: string) => void }) {
  return (
    <Button onClick={() => onNavigate('elections')}>
      View Elections
    </Button>
  );
}
```

## Color Schemes

### Party Colors (Elections)
- Democrat (DEM): Blue (`bg-blue-100`, `text-blue-700`, `border-blue-300`)
- Republican (REP): Red (`bg-red-100`, `text-red-700`, `border-red-300`)
- Independent (IND): Purple (`bg-purple-100`, `text-purple-700`, `border-purple-300`)

### Status Colors
- Success/Positive: Green (`bg-green-100`, `text-green-700`)
- Warning: Yellow/Amber (`bg-yellow-100`, `text-yellow-700`)
- Error/Negative: Red (`bg-red-100`, `text-red-700`)
- Info: Blue (`bg-blue-100`, `text-blue-700`)
- Neutral: Gray (`bg-gray-100`, `text-gray-700`)

### Override Indicator
- Overridden fields: Amber (`text-amber-600`)
- Database icon for data provider indication

## Accessibility

- Use semantic HTML
- Include ARIA labels for icons and buttons
- Support keyboard navigation
- Maintain sufficient color contrast
- Provide focus indicators

Example:
```tsx
<button
  onClick={handleClick}
  aria-label="Edit race details"
  className="focus:ring-2 focus:ring-primary"
>
  <Edit className="w-4 h-4" />
</button>
```

## Performance

- Lazy load components when possible
- Use React.memo for expensive renders
- Implement virtual scrolling for long lists
- Optimize images (use appropriate sizes)
- Minimize re-renders with proper dependency arrays

## Testing Checklist

Before committing:
- [ ] TypeScript compiles without errors
- [ ] No console warnings or errors
- [ ] Component renders correctly
- [ ] Dark mode works
- [ ] Responsive layout works
- [ ] Inline editing functions properly
- [ ] Override indicators work
- [ ] Navigation works
- [ ] All interactive elements are accessible

## Common Patterns

### Conditional Rendering

```tsx
{isOverridden && <OverrideIndicator onRevert={handleRevert} />}
```

### List Rendering

```tsx
{items.map((item) => (
  <Card key={item.id}>
    {/* Card content */}
  </Card>
))}
```

### Event Handlers

```tsx
const handleSave = (newValue: string) => {
  // Update logic
};

const handleRevert = () => {
  // Revert logic
};
```

### State Management

```tsx
const [isEditing, setIsEditing] = useState(false);
const [value, setValue] = useState<FieldOverride<string>>(initialValue);
```

### Sticky Pagination Pattern

**Universal pagination that survives re-renders, data refreshes, and page reloads:**

1. **Use the `useLocalStorage` hook** to persist page state:

```tsx
import { useLocalStorage } from "../utils/useLocalStorage";

// In your component:
const [currentPage, setCurrentPage] = useLocalStorage("my-dashboard-page", 1);
const itemsPerPage = 9;
```

2. **Memoize pagination calculations** to prevent unnecessary recalculations:

```tsx
const { totalPages, paginatedItems } = useMemo(() => {
  const total = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginated = filteredItems.slice(startIndex, endIndex);
  
  return { totalPages: total, paginatedItems: paginated };
}, [filteredItems, currentPage, itemsPerPage]);
```

3. **Handle page resets properly** - only reset when items are added/deleted, not on data refresh:

```tsx
const previousCountRef = useRef<number>(0);

useEffect(() => {
  setFilteredItems(items);
  
  // Reset to page 1 only when count changes (add/delete)
  const currentCount = items.length;
  if (currentCount !== previousCountRef.current) {
    setCurrentPage(1);
    previousCountRef.current = currentCount;
  }
  
  // Ensure page doesn't exceed total pages (after deletion)
  const totalPages = Math.ceil(currentCount / itemsPerPage);
  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(totalPages);
  }
}, [items, currentPage, itemsPerPage, setCurrentPage]);
```

4. **Reset to page 1 on filter changes**:

```tsx
onFilterChange={(filtered) => {
  setFilteredItems(filtered);
  setCurrentPage(1); // User expects to see first page of filtered results
}}
```

**Benefits:**
- ✅ Pagination persists across re-renders and data refreshes
- ✅ Page survives browser refresh (localStorage)
- ✅ No jumping back to page 1 when data updates
- ✅ Handles edge cases (deletions, empty results)
- ✅ Performance optimized with memoization

**Example:** See `/components/WeatherDashboard.tsx` for full implementation.

---

### Server-Side Pagination (Offset/Limit)

**For APIs that fetch data per page with offset/limit parameters:**

1. **Use `useLocalStorage` for page and pageSize state:**

```tsx
import { useLocalStorage } from "../utils/useLocalStorage";

const [page, setPage] = useLocalStorage('my-dashboard-page', 1);
const [pageSize, setPageSize] = useLocalStorage('my-dashboard-pagesize', 25);
const [rows, setRows] = useState([]);
const [total, setTotal] = useState(0);
```

2. **Fetch data in useEffect with abort controller** (prevents race conditions):

```tsx
useEffect(() => {
  let alive = true;
  
  (async () => {
    const { rows, total } = await fetchRows({ page, pageSize });
    
    if (!alive) return; // Component unmounted, ignore result
    
    setRows(rows);
    setTotal(total);
    
    // ⚠️ CRITICAL: DO NOT call setPage(1) here!
    // Instead, clamp page if it's now out of range:
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (page > maxPage) {
      setPage(maxPage);
    }
  })();
  
  return () => { alive = false; };
}, [page, pageSize]);
```

3. **Page change handler:**

```tsx
const handlePageChange = (newPage: number) => {
  setPage(newPage);
  // Data will auto-fetch via useEffect dependency
};
```

**Key Differences from Client-Side:**
- ✅ **DO** use abort controller to prevent race conditions
- ✅ **DO** clamp page to maxPage if out of bounds
- ❌ **DON'T** reset to page 1 in the fetcher
- ❌ **DON'T** fetch all data at once (defeats purpose of server pagination)
- ⚠️ **CAREFUL** with dependencies - infinite loops possible

**When to Use:**
- Large datasets (10,000+ items)
- Slow queries that benefit from LIMIT/OFFSET
- APIs that only support paginated responses
- Real-time data that updates frequently

**Example API Call:**
```tsx
async function fetchRows({ page, pageSize }: { page: number; pageSize: number }) {
  const offset = (page - 1) * pageSize;
  const response = await fetch(
    `https://api.example.com/data?offset=${offset}&limit=${pageSize}`
  );
  const data = await response.json();
  return {
    rows: data.items,
    total: data.total_count
  };
}
```

---

### Anti-Snapback Wrapper (Advanced)

**When pagination STILL snaps back to page 1 despite localStorage:**

This happens when:
- Parent component keeps pushing default props (e.g., `page={1}`)
- Component remounts frequently
- Race conditions between user actions and data fetches
- Multiple sources try to control pagination state

**Use the `useStickyPagination` hook** - it guards against external resets:

```tsx
import { useStickyPagination } from "../utils/useStickyPagination";

export function MyDashboard() {
  const pagination = useStickyPagination('my-dashboard', 1, 25);
  const [items, setItems] = useState([]);
  
  // Fetch data when page/pageSize changes
  useEffect(() => {
    fetchData(pagination.page, pagination.pageSize).then(setItems);
  }, [pagination.page, pagination.pageSize]);
  
  return (
    <div>
      <MyTable
        page={pagination.page}
        pageSize={pagination.pageSize}
        onPageChange={pagination.onUserPageChange}
        onPageSizeChange={pagination.onUserPageSizeChange}
      />
    </div>
  );
}
```

**Key Features:**
- ✅ **Ignores external resets** - Blocks parent from resetting to page 1 within 400ms of user action
- ✅ **Tracks user intent** - Distinguishes user-driven changes from system suggestions
- ✅ **localStorage persistence** - Survives re-renders and page reloads
- ✅ **Drop-in replacement** - Works with any existing pagination UI

**When to Use:**
- Standard sticky pagination still snaps back
- Parent component controls pagination props
- Debugging shows external resets to page 1
- Component remounts clear state

**Advanced: External Page Suggestions**
If your data fetcher wants to suggest a page (e.g., clamp after deletion):

```tsx
useEffect(() => {
  fetchData(pagination.page, pagination.pageSize).then(({ items, total }) => {
    setItems(items);
    
    // Suggest clamping to max page (won't reset if user just changed page)
    const maxPage = Math.ceil(total / pagination.pageSize);
    if (pagination.page > maxPage && maxPage > 0) {
      pagination.onExternalPageSuggest(maxPage);
    }
  });
}, [pagination.page, pagination.pageSize]);
```

**Troubleshooting:**
- Adjust the 400ms window if needed (in `/utils/useStickyPagination.ts`)
- Use browser DevTools to track `localStorage` changes
- Check Network tab for duplicate fetches (indicates race condition)

---

### Remount Fix (Nuclear Option)

**When NOTHING works and component is remounting (not just re-rendering):**

Component remounts reset ALL state, even localStorage-backed state. This often happens due to:
- Dynamic `key` props (e.g., `<Table key={rows.length} />`)
- Figma Make layout/data panel regeneration
- Parent component remounting

**Step 1: Detect Remounting**

```tsx
import { useMountProbe } from "../utils/useMountProbe";

export function MyTable() {
  useMountProbe("MyTable"); // Check console for MOUNT → UNMOUNT → MOUNT
  // Your code...
}
```

If you see `UNMOUNT → MOUNT` after clicking Next, component is remounting.

**Step 2: Remove Dynamic Keys (Best Fix)**

```tsx
// ❌ BAD: Key changes = remount
<Table key={rows.length} />
<Table key={JSON.stringify(filters)} />

// ✅ GOOD: No key = no remount
<Table {...props} />
```

**Step 3: Use Hard Lock (If Can't Fix Remount)**

```tsx
import { usePageHardLock } from "../utils/usePageHardLock";

export function MyTable() {
  // Survives even remounts using layoutEffect + microtask
  const { page, setPage } = usePageHardLock("my-table", 1);
  
  return <Table page={page} onPageChange={setPage} />;
}
```

**With Page Size:**

```tsx
import { usePageHardLockWithSize } from "../utils/usePageHardLock";

const { page, pageSize, setPage, setPageSize } = usePageHardLockWithSize("table", 1, 25);

<Table
  page={page}
  pageSize={pageSize}
  onPageChange={setPage}
  onPageSizeChange={(size) => {
    setPageSize(size);
    setPage(1);
  }}
/>
```

**When to Use:**
- `useMountProbe` shows remount cycles
- Cannot remove dynamic key
- Cannot lift state outside remounting subtree
- Figma Make is regenerating the component

**How It Works:**
- Stores page in `useRef` (survives remount)
- Stores page in localStorage (survives everything)
- Uses `useLayoutEffect` to force page back after every render
- `queueMicrotask` waits for child defaults, then overrides

**Complete Guide:** See `/PAGINATION_REMOUNT_FIX.md` for full troubleshooting steps.

**Migration from useStickyPagination:**

```tsx
// Before
const pagination = useStickyPagination("table", 1, 25);

// After
const { page, pageSize, setPage, setPageSize } = usePageHardLockWithSize("table", 1, 25);

// Update usage:
// pagination.page → page
// pagination.onUserPageChange → setPage
```

## Protected Files

These files should not be modified:
- `/components/figma/ImageWithFallback.tsx`

## Resources

- **Component Library**: `/COMPONENT_LIBRARY.md`
- **Shared Components**: `/components/shared/SYNC_GUIDE.md`
- **ShadCN Docs**: https://ui.shadcn.com
- **Tailwind Docs**: https://tailwindcss.com
- **Lucide Icons**: https://lucide.dev

## Getting Help

1. Check the Component Library for existing solutions
2. Review similar components for patterns
3. Check type definitions for data structures
4. Look at mock data for expected formats
5. Review this guidelines document

---

**Remember**: Consistency is key. Follow established patterns, use the component library, and maintain code quality standards across the entire application.