# Media Library Schema Fix

## Problem
The database schema was missing required columns (`ip_address`, `port`, `channel`) in the `systems` table, causing distribution queries to fail.

## Solution
Updated the schema in `/supabase/migrations/media_library_schema.sql` to include these columns.

## Migration Required

You need to run this SQL in your Supabase SQL Editor to add the missing columns:

```sql
-- Add missing columns to systems table
ALTER TABLE systems 
ADD COLUMN IF NOT EXISTS ip_address TEXT,
ADD COLUMN IF NOT EXISTS port INTEGER,
ADD COLUMN IF NOT EXISTS channel TEXT;
```

## Steps to Fix

1. **Go to Supabase Dashboard** → SQL Editor
2. **Run the migration SQL** above
3. **Refresh your app** and try selecting a media asset again

## Verify

After running the migration:
- The distribution table should load without errors
- You should be able to assign systems to media assets
- The distribution table should show: System, IP Address, Path, Status, Last Sync, Actions

## Optional: Add Sample Systems

If you want to add some test systems with the new columns:

```sql
INSERT INTO systems (name, system_type, description, ip_address, port, channel) VALUES
  ('Unreal Stage A', 'unreal', 'Unreal Engine production stage', '192.168.1.100', 7777, 'stage_a'),
  ('Pixara Node 3', 'pixara', 'Pixara render node', '192.168.1.101', 8080, 'render_node3'),
  ('Sports Production A', 'broadcast', 'Sports production server', '192.168.1.102', 9000, 'sports_a')
ON CONFLICT (name) DO NOTHING;
```
