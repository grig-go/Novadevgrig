# Nova Dashboard - Supabase Setup Instructions

Quick guide to get your Supabase database up and running for Nova Dashboard.

## Prerequisites

- A Supabase account ([sign up here](https://supabase.com))
- A Supabase project created
- Your project's database credentials

## Step-by-Step Setup

### 1. Create Your Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **"New Project"**
3. Fill in:
   - **Name**: Nova Dashboard
   - **Database Password**: (create a strong password - save it!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"**
5. Wait 2-3 minutes for setup to complete

### 2. Get Your Project Credentials

1. In your project dashboard, click **Settings** (gear icon)
2. Navigate to **API** section
3. Copy these values (you'll need them):
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Project ID**: The `xxxxx` part
   - **anon/public key**: `eyJhbGc...` (public, safe to use in frontend)
   - **service_role key**: `eyJhbGc...` (secret! Never expose to frontend)

### 3. Update Your Application

Update `/utils/supabase/info.tsx`:

```typescript
export const projectId = "YOUR_PROJECT_ID_HERE";
export const publicAnonKey = "YOUR_ANON_KEY_HERE";
```

**⚠️ DO NOT commit the service_role key to your code!**

### 4. Run Database Migrations

#### Option A: Using Supabase Dashboard (Easiest)

1. In your Supabase project, go to **SQL Editor**
2. Click **"New Query"**
3. Copy the entire contents of `/supabase/migrations/001_initial_setup.sql`
4. Paste into the query editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Wait for success message ✅

7. Repeat for:
   - `/supabase/migrations/002_seed_data.sql`
   - `/supabase/migrations/003_functions_and_views.sql`

#### Option B: Using Supabase CLI

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_ID

# Push migrations
supabase db push
```

### 5. Verify Setup

Run this query in SQL Editor to verify:

```sql
-- Check all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Get dashboard stats
SELECT get_dashboard_stats();
```

You should see:
- 11 tables (feeds, alpaca_stocks, elections, etc.)
- Sample data counts in the stats

### 6. Set Up API Keys (Important!)

The sample feeds include placeholder API keys. Update them:

```sql
-- Update Alpaca Markets API credentials
UPDATE feeds
SET configuration = jsonb_set(
  jsonb_set(
    configuration,
    '{apiKey}',
    '"PKOSFDGF5FUEN3AUWIIZ6B3TVB"'
  ),
  '{apiSecret}',
  '"UeEvRxjcjV8LADoiXeinnk2aSL41EPT8sr5ZGbjWnnM"'
)
WHERE name = 'Alpaca Markets API';
```

**Better approach**: Store in environment variables and reference them in your server code.

## Environment Variables Setup

Create a `.env.local` file in your project root:

```bash
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Alpaca Markets (Paper Trading)
ALPACA_API_KEY=PKOSFDGF5FUEN3AUWIIZ6B3TVB
ALPACA_API_SECRET=UeEvRxjcjV8LADoiXeinnk2aSL41EPT8sr5ZGbjWnnM
ALPACA_BASE_URL=https://paper-api.alpaca.markets

# Other APIs (add as needed)
NEWS_API_KEY=your_newsapi_key
OPENWEATHER_API_KEY=your_openweather_key
```

⚠️ **Add `.env.local` to `.gitignore`** to keep secrets safe!

## Testing Your Setup

### Test 1: Query the Database

```sql
-- Get all active feeds
SELECT * FROM v_active_feeds;

-- Get stock summary
SELECT * FROM v_stock_summary;

-- Get dashboard stats
SELECT get_dashboard_stats();
```

### Test 2: Test from Your App

In your browser console:
```javascript
// Test connection
console.log('Project ID:', projectId);
console.log('Anon Key:', publicAnonKey.substring(0, 20) + '...');
```

### Test 3: Add a Test Stock

Use the SecuritySearch component to add a test stock (e.g., "AAPL")

### Test 4: Check Feeds Dashboard

Navigate to the Feeds dashboard and verify you see the 10 sample feeds.

## Common Issues & Solutions

### Issue: "relation does not exist"
**Solution**: Migrations didn't run. Re-run migration files in SQL Editor.

### Issue: "permission denied"
**Solution**: Check your RLS policies. For testing, you can temporarily disable RLS:
```sql
ALTER TABLE feeds DISABLE ROW LEVEL SECURITY;
```
(Re-enable for production!)

### Issue: "duplicate key value violates unique constraint"
**Solution**: Seed data already exists. Skip seed migration or use `ON CONFLICT DO NOTHING`.

### Issue: Can't connect from app
**Solution**: 
1. Verify `projectId` and `publicAnonKey` in `/utils/supabase/info.tsx`
2. Check browser console for CORS errors
3. Verify project is active in Supabase dashboard

### Issue: API calls returning 401
**Solution**: Check your RLS policies allow the operation for authenticated users.

## Security Checklist

Before going to production:

- [ ] Enable Row Level Security on all tables
- [ ] Create role-based RLS policies
- [ ] Store API keys in Supabase Vault or environment variables
- [ ] Never commit `.env.local` to git
- [ ] Use `service_role` key only in backend/server code
- [ ] Set up database backups
- [ ] Enable 2FA on Supabase account
- [ ] Review and limit API rate limits
- [ ] Set up monitoring and alerts

## Next Steps

1. **Configure Data Feeds**: Update feed configurations with real API endpoints
2. **Set Up Agents**: Configure and activate automated data collection agents
3. **Add Users**: Create user accounts through your app or SQL
4. **Customize Permissions**: Implement role-based access control
5. **Monitor Performance**: Use Supabase dashboard to monitor queries

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Nova Dashboard Guidelines**: `/guidelines/Guidelines.md`
- **Migration Details**: `/supabase/migrations/README.md`
- **Supabase Discord**: https://discord.supabase.com

## Quick Reference

### Useful SQL Commands

```sql
-- View all tables
\dt

-- Describe a table
\d+ table_name

-- Count rows
SELECT COUNT(*) FROM feeds;

-- Reset a table (careful!)
TRUNCATE TABLE table_name CASCADE;

-- Get table sizes
SELECT * FROM get_table_stats();
```

### Useful Supabase CLI Commands

```bash
# Check status
supabase status

# Pull remote schema
supabase db pull

# Reset local database
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > types/supabase.ts
```

---

**You're all set! 🚀** Your Supabase database is ready for Nova Dashboard.
