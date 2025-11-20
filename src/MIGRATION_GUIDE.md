# Supabase Config Migration Guide

## Current Status

The codebase has been partially migrated to support environment variables for Supabase configuration.

### ✅ Completed
- Created `/utils/supabase/config.ts` - Central configuration with environment variable support
- Updated `/utils/supabase/client.tsx` - Uses new config system
- Created helper functions for building URLs

### ⚠️ Remaining Work

**30 files** still import and use `projectId` and `publicAnonKey` directly from `info.tsx`.

These files need to be updated to use the new helper functions from `/utils/supabase/config.ts`.

## Migration Steps

### Option 1: Automatic (Recommended)

Run the migration script:
```bash
# TODO: Create migration script
npm run migrate:supabase-config
```

### Option 2: Manual

For each file that imports `projectId` and `publicAnonKey`, follow these steps:

#### Before:
```typescript
import { projectId, publicAnonKey } from "../utils/supabase/info";

// Using in fetch
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/news_dashboard`,
  {
    headers: {
      Authorization: `Bearer ${publicAnonKey}`,
    }
  }
);
```

#### After:
```typescript
import { getEdgeFunctionUrl, getSupabaseHeaders } from "../utils/supabase/config";

// Using helper functions
const response = await fetch(
  getEdgeFunctionUrl('news_dashboard'),
  {
    headers: getSupabaseHeaders()
  }
);
```

## Helper Functions Reference

### `getSupabaseUrl()`
Returns the base Supabase URL with env var support.

```typescript
const url = getSupabaseUrl();
// Returns: "https://project-id.supabase.co" or env var value
```

### `getSupabaseAnonKey()`
Returns the anon key with env var support.

```typescript
const key = getSupabaseAnonKey();
// Returns: "eyJ..." or env var value
```

### `getProjectId()`
Returns the project ID (extracted from URL or fallback).

```typescript
const id = getProjectId();
// Returns: "project-id"
```

### `getEdgeFunctionUrl(path)`
Builds a full URL for edge functions.

```typescript
// Before
const url = `https://${projectId}.supabase.co/functions/v1/news_dashboard`;

// After
const url = getEdgeFunctionUrl('news_dashboard');
```

### `getRestUrl(path)`
Builds a full URL for REST API endpoints.

```typescript
// Before
const url = `https://${projectId}.supabase.co/rest/v1/media_assets`;

// After
const url = getRestUrl('media_assets');
```

### `getSupabaseHeaders(additionalHeaders?)`
Returns standard Supabase headers with Authorization.

```typescript
// Before
const headers = {
  Authorization: `Bearer ${publicAnonKey}`,
  'Content-Type': 'application/json',
};

// After
const headers = getSupabaseHeaders();

// With additional headers
const headers = getSupabaseHeaders({
  'X-Custom-Header': 'value'
});
```

## Files to Migrate

<details>
<summary>30 files need updating (click to expand)</summary>

1. `/App.tsx`
2. `/components/AIConnectionsDashboard.tsx`
3. `/components/AlpacaConfigCard.tsx`
4. `/components/AlpacaDebugPanel.tsx`
5. `/components/BackendHealthCheck.tsx`
6. `/components/CryptoCard.tsx`
7. `/components/CryptoSearch.tsx`
8. `/components/FeedsDashboardWithSupabase.tsx`
9. `/components/FinanceAIInsights.tsx`
10. `/components/FinanceDashboard.tsx`
11. `/components/NewsAIInsights.tsx`
12. `/components/NewsAIInsightsDialog.tsx`
13. `/components/NewsDashboard.tsx`
14. `/components/NewsDebugPanel.tsx`
15. `/components/SportsAddActions.tsx`
16. `/components/SportsAIInsights.tsx`
17. `/components/SportsDashboard.tsx`
18. `/components/SportsDebugPanel.tsx`
19. `/components/SportsLeagueTestPanel.tsx`
20. `/components/SportsradarConfigCard.tsx`
21. `/components/SportsSearch.tsx`
22. `/components/StandingsTable.tsx`
23. `/components/StockSearch.tsx`
24. `/components/WeatherAIInsights.tsx`
25. `/components/WeatherAPIConfigCard.tsx`
26. `/components/WeatherBackendDataDialog.tsx`
27. `/components/WeatherCard.tsx`
28. `/components/WeatherDashboard.tsx`
29. `/components/WeatherDataViewer.tsx`
30. `/components/WeatherFilters.tsx`

</details>

## Testing After Migration

1. **Without .env.local** - Should use hardcoded values:
   ```bash
   rm .env.local
   npm run dev
   ```
   Check console for: `usingEnvVars: false`

2. **With .env.local** - Should use environment variables:
   ```bash
   echo "VITE_SUPABASE_URL=http://localhost:54321" > .env.local
   echo "VITE_SUPABASE_ANON_KEY=your-key" >> .env.local
   npm run dev
   ```
   Check console for: `usingEnvVars: true, mode: "LOCAL"`

3. **Test all dashboards** to ensure API calls work correctly

## Benefits After Migration

- ✅ Single source of truth for Supabase configuration
- ✅ Easy switching between local and remote Supabase
- ✅ No code changes needed to change environment
- ✅ Better support for multiple environments (dev, staging, prod)
- ✅ Cleaner code with helper functions

## Why Not Do It Now?

Migrating 30 files with many fetch calls (100+ instances) is a significant change that could introduce bugs. This should be done:
- When you have time to test thoroughly
- In a separate PR/commit for easy rollback
- Or gradually, file by file

The current setup **works fine** - it uses `info.tsx` as the single source, which is already good practice. The new system adds environment variable support on top of it.

## Current Behavior

Right now:
- ✅ Supabase client uses env vars (via `/utils/supabase/client.tsx`)
- ⚠️ Direct fetch calls still use hardcoded `projectId` from `info.tsx`
- ⚠️ This means: Client SDK calls can use local Supabase, but fetch calls will still go to hardcoded project

If you're only using the Supabase client (not direct fetch), you're already good!

If you need all calls to support env vars, proceed with the migration.
