# News Dashboard Edge Function - Deployment Guide

## ✅ Complete - Ready for Manual Deployment

Created: 2025-11-08

---

## 📁 **Edge Function Files Created**

### Location: `/supabase/functions/news_dashboard/`

**Single File**: `index.ts` (264 lines)
- Hono web server with all News routes
- Inline KV store functions
- CORS configuration
- Health check endpoint

---

## 🔌 **Edge Function Routes**

All routes are accessed via: `https://{projectId}.supabase.co/functions/v1/news_dashboard/{route}`

### Health Check
- `GET /health` - Health check endpoint

### News Articles
- `GET /news-articles` - Get all stored news articles
- `GET /news-articles/stored` - Get stored news articles (alias)
- `POST /news-articles` - Save news articles to KV store
- `DELETE /news-articles/:id` - Delete a specific article

### AI Insights
- `GET /news-ai-insights` - Get all saved AI insights
- `POST /news-ai-insights` - Save a new AI insight
- `DELETE /news-ai-insights/:id` - Delete a specific insight

### News Providers
- `GET /news-providers` - Get all news providers from data_providers table

---

## 🎯 **Frontend Files Updated**

All frontend files now point to the new `news_dashboard` edge function:

1. ✅ `/App.tsx` - News stats on homepage
2. ✅ `/components/NewsAIInsights.tsx` - AI insights loading/deletion
3. ✅ `/components/NewsAIInsightsDialog.tsx` - AI insights CRUD operations
4. ✅ `/components/NewsDashboard.tsx` - Main news dashboard
5. ✅ `/utils/useNewsProviders.ts` - News providers hook

---

## 📊 **Database Integration**

- **KV Table**: `kv_store_cbef71cf` (already exists)
- **KV Key Prefixes**:
  - `news_article:*` - Stored news articles
  - `news_ai_insight:*` - Saved AI insights
- **Data Providers Table**: `data_providers` (existing)

---

## 🚀 **Deployment Instructions**

### Step 1: Access Supabase Dashboard
Go to: https://supabase.com/dashboard/project/yoxindkcapdnimcrwhux/functions

### Step 2: Create New Edge Function
1. Click "New Edge Function"
2. Name it: `news_dashboard`
3. Click "Create Function"

### Step 3: Add Files

Copy the entire contents of `/supabase/functions/news_dashboard/index.ts` into the editor (264 lines)

### Step 4: Deploy
Click the **"Deploy"** button

### Step 5: Test
1. Go to News Dashboard in your app
2. Toggle to "Stored" mode
3. Click "Refresh Stored" - should load articles from KV store
4. Check browser console for logs

---

## ✅ **Verification Checklist**

After deployment, verify:

- [ ] Health check works: `GET /health` returns `{ status: "ok" }`
- [ ] News articles load in dashboard
- [ ] AI insights load correctly
- [ ] No console errors in browser
- [ ] News providers endpoint returns data

---

## 🔧 **Troubleshooting**

### If deployment fails:
1. Check that both `index.ts` and `server.ts` files are present
2. Verify no syntax errors in `server.ts`
3. Check Supabase function logs for errors

### If frontend shows errors:
1. Open browser console (F12)
2. Look for network errors
3. Check if edge function is deployed and running
4. Verify endpoint URLs are correct

---

## 📝 **Old vs New Endpoints**

| Old Endpoint | New Endpoint |
|-------------|--------------|
| `/functions/v1/make-server-cbef71cf/news-articles` | `/functions/v1/news_dashboard/news-articles` |
| `/functions/v1/make-server-cbef71cf/news-ai-insights` | `/functions/v1/news_dashboard/news-ai-insights` |
| `/functions/v1/make-server-cbef71cf/news-providers` | `/functions/v1/news_dashboard/news-providers` |

---

## ✨ **Benefits of Dedicated Edge Function**

1. **Isolated**: News functionality is separate from other dashboards
2. **Cleaner**: Easier to maintain and debug
3. **Scalable**: Can be deployed/updated independently
4. **Faster**: Smaller bundle size, faster cold starts

---

## 🎉 **You're Done!**

After manual deployment, the News Dashboard will be fully operational with its own dedicated edge function.