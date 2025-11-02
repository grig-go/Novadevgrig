# Nova Dashboard - Supabase Quick Start (5 Minutes)

Get your database up and running in 5 minutes! ⚡

## Step 1: Create Supabase Project (2 min)

1. Go to https://app.supabase.com
2. Click **"New Project"**
3. Enter:
   - Name: `Nova Dashboard`
   - Database Password: *(create & save a strong password)*
   - Region: *(choose closest to you)*
4. Click **"Create new project"**
5. ☕ Wait 2-3 minutes

## Step 2: Get Your Credentials (30 sec)

1. In project dashboard → **Settings** → **API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...`

## Step 3: Update Your App (30 sec)

Edit `/utils/supabase/info.tsx`:

```typescript
export const projectId = "xxxxx"; // From URL above
export const publicAnonKey = "eyJhbGc..."; // Anon key
```

## Step 4: Run Migrations (2 min)

### In Supabase Dashboard:

1. Go to **SQL Editor**
2. Click **"New Query"**
3. Copy & paste **each file below** → click **Run**:

   **Migration 1:** `/supabase/migrations/001_initial_setup.sql`
   *(Creates all tables)*

   **Migration 2:** `/supabase/migrations/002_seed_data.sql`
   *(Adds sample data)*

   **Migration 3:** `/supabase/migrations/003_functions_and_views.sql`
   *(Creates helper functions)*

## Step 5: Verify Setup (30 sec)

Run this in SQL Editor:

```sql
-- Should show 11 tables
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- Should show sample data
SELECT get_dashboard_stats();
```

## ✅ You're Done!

Your database is ready! Now you can:

- ✅ Use the Finance Dashboard (add stocks via Alpaca)
- ✅ Manage Data Feeds
- ✅ View AI Insights
- ✅ Create Agents
- ✅ Manage Users & Groups

## Optional: Verify Everything

Run the full verification script:

```sql
\i supabase/migrations/VERIFY_MIGRATIONS.sql
```

## Next: Add Alpaca API Key

Update your Alpaca feed with real credentials:

```sql
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

## Troubleshooting

**Can't connect?**
- Check `projectId` and `publicAnonKey` in `/utils/supabase/info.tsx`
- Refresh your app

**Tables not created?**
- Re-run migration 001 in SQL Editor
- Check for error messages

**Need help?**
- Read: `/supabase/SETUP_INSTRUCTIONS.md` (detailed guide)
- Check: `/supabase/migrations/README.md` (technical details)

---

**🎉 Happy coding!** Your Nova Dashboard is powered by Supabase.
