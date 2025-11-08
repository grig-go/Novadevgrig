# 📸 Nova Dashboard - Version 1.1 Snapshot
**Date**: November 7, 2024  
**Status**: Production Ready  
**Build**: V1.1 - Post Legacy Cleanup

---

## 🏗️ Architecture Overview

Multi-dashboard React + TypeScript application with Supabase backend integration, featuring real-time data management across multiple domains.

### Tech Stack
- **Frontend**: React, TypeScript, Tailwind CSS v4.0
- **UI Components**: shadcn/ui
- **Backend**: Supabase (PostgreSQL, Edge Functions, Storage, Auth)
- **State Management**: React hooks with custom data fetching
- **Build System**: Vite

---

## 📊 Active Dashboards (13 Total)

### Core Data Dashboards (6)

1. **Elections Dashboard** (`/components/ElectionDashboard.tsx`)
   - Route: `'election'`
   - Features: Races, candidates, parties tracking
   - Integration: Supabase + AI insights
   - Components: RaceCard, EditRaceDialog, EditCandidateDialog, EditPartyDialog

2. **Finance Dashboard** (`/components/FinanceDashboard.tsx`)
   - Route: `'finance'`
   - Features: Stocks, indices, crypto tracking with live prices
   - Integration: Alpaca API, CoinGecko API
   - Components: SecurityCard, FinanceCard, StockSearch, CryptoCard
   - Related: AlpacaConfigCard, AlpacaDebugPanel

3. **Sports Dashboard** (`/components/SportsDashboard.tsx`)
   - Route: `'sports'`
   - Features: Multi-league team/player/game tracking
   - Integration: Sportsradar API
   - Components: SportsCard, StandingsTable, SportsSearch
   - Related: SportsradarConfigCard, SportsDebugPanel

4. **Weather Dashboard** (`/components/WeatherDashboard.tsx`)
   - Route: `'weather'`
   - Features: Current conditions, forecasts, alerts, air quality
   - Integration: WeatherAPI
   - Components: WeatherCard, WeatherLocationSearch
   - Related: WeatherAPIConfigCard, WeatherBackendDataDialog, WeatherDataViewer

5. **News Dashboard** (`/components/NewsDashboard.tsx`)
   - Route: `'news'`
   - Features: Article aggregation, news clusters, AI insights
   - Integration: NewsAPI, NewsData.io
   - Components: NewsCard, NewsClustersList, NewsAIInsights
   - Related: NewsDebugPanel, NewsAIInsightsDialog
   - Tables: `news_articles`, `news_clusters`
   - Edge Functions: `clusters` (for news clustering)

6. **Agents Dashboard** (`/components/AgentsDashboard.tsx`)
   - Route: `'agents'`
   - Features: AI-powered content curation and automation
   - Components: AgentWizard

### Configuration & Management Dashboards (7)

7. **Home** (`'home'`)
   - Landing page with all dashboard cards
   - Real-time statistics for each dashboard

8. **Data Feeds** (`/components/FeedsDashboardWithSupabase.tsx`)
   - Route: `'feeds'`
   - Features: Data provider management (RSS, API, Database, File, Webhook)
   - Integration: Supabase data_providers_public table
   - Supports: Elections, Finance, Sports, Weather, News categories

9. **AI Connections** (`/components/AIConnectionsDashboard.tsx`)
   - Route: `'ai-connections'`
   - Features: AI provider management (OpenAI, Anthropic, Google Gemini, etc.)
   - Dashboard Assignments: Text/Image/Video provider assignments
   - Supabase: `ai_providers` table
   - Edge Function: `/make-server-cbef71cf/ai-providers`

10. **Media Library** (`/components/MediaLibrary.tsx`)
    - Route: `'media'`
    - Features: Upload/manage video, audio, images
    - Bulk operations: Select, delete, copy URLs
    - AI Image editing with revision prompts
    - Storage: Supabase `media` bucket (CRITICAL: Always use this bucket)
    - Components: VideoThumbnail, EditImageDialog

11. **Users & Groups** (`/components/UsersGroupsPage.tsx`)
    - Route: `'users-groups'`
    - Features: User management, groups, roles, permissions

12. **Channels** (`/components/ChannelsPage.tsx`)
    - Route: `'channels'`
    - Features: Content channel management

13. **Weather Data Viewer** (`/components/WeatherDataViewer.tsx`)
    - Route: `'weather-data'`
    - Features: Advanced weather data visualization

---

## 🗄️ Supabase Backend

### Edge Functions (Hono Server)
**Base URL**: `https://${projectId}.supabase.co/functions/v1/make-server-cbef71cf/`

#### Routes:
- `/ai-providers` - AI provider CRUD
- `/news-articles` - Fetch live news from providers
- `/news-articles/stored` - Fetch stored news from database
- `/clusters` - News clustering functionality
- `/media/*` - Media management endpoints
- Various data provider specific routes

### Storage Buckets
- `media` - **Primary media storage bucket** (videos, images, audio)
  - Private bucket with signed URLs
  - Video thumbnail generation
  - Image editing support

### Database Tables
- `kv_store_8a536fc1` - Key-value store (primary data storage)
- `data_providers_public` - Data provider configurations
- `ai_providers` - AI provider configurations
- `news_articles` - Stored news articles
- `news_clusters` - Clustered news articles

### RPC Functions
- `get_provider_details` - Fetch provider credentials securely

---

## 🔧 Custom Hooks

### Data Fetching Hooks
- `useWeatherData()` - Weather data fetching
- `useFinanceData()` - Finance data fetching
- `useSportsData()` - Sports data fetching
- `useNewsFeed()` - News feed fetching
- `useNewsProviders()` - News provider management
- `useClusters()` - News clusters data

---

## 🎨 UI Component Library (shadcn/ui)

**Location**: `/components/ui/`

Available components:
- accordion, alert, alert-dialog, aspect-ratio, avatar
- badge, breadcrumb, button
- calendar, card, carousel, chart, checkbox, collapsible, command, context-menu
- dialog, drawer, dropdown-menu
- form
- hover-card
- input, input-otp
- label
- menubar
- navigation-menu
- pagination, popover, progress
- radio-group, resizable
- scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch
- table, tabs, textarea, toggle, toggle-group, tooltip

---

## 📦 Key Dependencies

### Required Package Versions
- `react-hook-form@7.55.0` - Form handling
- `sonner@2.0.3` - Toast notifications
- `motion/react` - Animations (formerly Framer Motion)

### Recommended Libraries
- `lucide-react` - Icons
- `recharts` - Charts and graphs
- `react-slick` - Carousels
- `react-responsive-masonry` - Masonry grids
- `react-dnd` - Drag and drop
- `date-fns` - Date formatting

---

## 🔑 Environment Variables (Configured)

Pre-configured secrets:
- `AP_API_KEY`
- `ALPACA_API_KEY`
- `ALPACA_API_SECRET`
- `COINGECKO_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

---

## 🚀 Recent Features (V1.1)

### News Dashboard Enhancements
- ✅ Integrated News Clusters functionality (removed standalone ClustersDashboard)
- ✅ Live vs Stored article toggle
- ✅ Multi-provider support (NewsAPI, NewsData.io)
- ✅ AI-powered insights and chat
- ✅ Article storage and retrieval from database

### Media Library
- ✅ Bulk operations (select, delete, copy URLs)
- ✅ Video thumbnail generation
- ✅ AI image editing with revision prompts
- ✅ Signed URL system for secure media access
- ✅ Support for video, audio, and image files

### AI Connections
- ✅ Dashboard assignment system (text/image/video providers)
- ✅ Multi-provider support (OpenAI, Anthropic, Gemini, etc.)
- ✅ Model selection per provider
- ✅ Secure API key management

---

## 🗑️ Deleted Legacy Code (V1.1 Cleanup)

### Files Removed:
1. `/components/ClustersDashboard.tsx` - Integrated into NewsDashboard
2. `/components/FeedsDashboard.tsx` - Replaced by FeedsDashboardWithSupabase
3. `/components/CryptoDashboard.tsx` - Standalone, not integrated (redundant with Finance)
4. `/components/AlpacaStocksDashboard.tsx` - Standalone, not integrated (redundant with Finance)

**Reason**: These components were either:
- Replaced by newer Supabase-integrated versions
- Integrated into existing dashboards
- Standalone components never added to routing

---

## 📁 Project Structure

```
/
├── App.tsx                          # Main app router
├── components/
│   ├── ui/                          # shadcn components
│   ├── shared/                      # Shared components
│   ├── figma/                       # Figma-specific components
│   ├── *Dashboard.tsx               # 13 dashboard components
│   ├── *Card.tsx                    # Display cards
│   ├── *Filters.tsx                 # Filter components
│   ├── *Search.tsx                  # Search components
│   ├── *Dialog.tsx                  # Dialog components
│   └── TopMenuBar.tsx               # Navigation
├── utils/
│   ├── supabase/
│   │   └── info.tsx                 # Supabase config
│   └── use*.ts                      # Custom hooks
├── types/
│   ├── election.ts
│   ├── finance.ts
│   ├── sports.ts
│   ├── weather.ts
│   ├── news.ts
│   ├── feeds.ts
│   ├── agents.ts
│   └── ai.ts
├── data/
│   └── mock*.ts                     # Mock data for testing
├── styles/
│   └── globals.css                  # Tailwind v4.0 config
└── supabase/
    └── functions/
        └── server/
            ├── index.tsx            # Hono server
            └── kv_store.tsx         # KV utilities (PROTECTED)
```

---

## 🛡️ Protected Files (Do Not Modify)

- `/supabase/functions/server/kv_store.tsx`
- `/utils/supabase/info.tsx`
- `/components/figma/ImageWithFallback.tsx`

---

## 📝 Critical Rules

1. **Media Storage**: Always use `media` bucket for all media uploads
2. **Tailwind**: Do not add font-size, font-weight, or line-height classes (use globals.css defaults)
3. **Shadcn**: Never overwrite existing ui components
4. **Backend**: Server code only in `/supabase/functions/server/` (no subfolders)
5. **Types**: Update TypeScript types when adding new features

---

## 🎯 Known Issues / Future Enhancements

### To Investigate
- News Dashboard title border visibility issue (may be browser caching)

### Planned Features
- Additional AI model integrations
- Enhanced analytics across dashboards
- Advanced filtering and search
- Real-time collaboration features

---

## 📊 Statistics (V1.1)

- **Total Dashboards**: 13 active
- **Total Components**: 60+ files
- **Supabase Tables**: 4 main tables
- **Edge Function Routes**: 10+
- **API Integrations**: 8+ providers
- **UI Components**: 40+ shadcn components

---

**End of V1.1 Snapshot**
