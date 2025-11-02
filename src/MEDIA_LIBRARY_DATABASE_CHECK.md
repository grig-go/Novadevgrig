# Media Library - Database Setup Verification

## Quick Database Health Check

Run these queries in **Supabase Dashboard → SQL Editor** to verify your Media Library setup.

## ✅ Step 1: Check if Table Exists

```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'media_assets'
) AS table_exists;
```

**Expected Result:**
```
table_exists
------------
true
```

**If `false`:** Table doesn't exist. [Run the migration](#step-5-create-table)

---

## ✅ Step 2: Check Table Schema

```sql
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'media_assets'
ORDER BY ordinal_position;
```

**Expected Columns:**
- `id` (uuid)
- `name` (text)
- `file_name` (text)
- `description` (text)
- `file_url` (text)
- `thumbnail_url` (text)
- `storage_path` (text)
- `media_type` (text)
- `created_by` (text)
- `ai_model_used` (text)
- `tags` (jsonb)
- `metadata` (jsonb)
- `created_at` (timestamp)
- `updated_at` (timestamp)

---

## ✅ Step 3: Check for Sample Data

```sql
SELECT 
  id,
  name,
  media_type,
  created_by,
  created_at
FROM media_assets
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Result:**
- If you've uploaded files: Shows your media assets
- If fresh database: Empty result (0 rows)

---

## ✅ Step 4: Test Insert Permission

```sql
INSERT INTO media_assets (
  name,
  file_name,
  media_type,
  created_by,
  tags
) VALUES (
  'Test Asset',
  'test.jpg',
  'image',
  'system-test',
  '["test"]'::jsonb
)
RETURNING id, name, created_at;
```

**Expected Result:**
```
id                                    | name       | created_at
--------------------------------------|------------|------------------------
abc-123-def-456-789                   | Test Asset | 2024-11-02 10:30:00
```

**If Error:** Check permissions or table structure

**Cleanup after test:**
```sql
DELETE FROM media_assets WHERE created_by = 'system-test';
```

---

## ✅ Step 5: Create Table (If Missing)

**If table doesn't exist, run this migration:**

```sql
-- Drop existing tables if they exist (cascade to remove dependencies)
DROP TABLE IF EXISTS media_distribution CASCADE;
DROP TABLE IF EXISTS systems CASCADE;
DROP TABLE IF EXISTS media_assets CASCADE;

-- Create media_assets table
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  thumbnail_url TEXT,
  storage_path TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio', '3d', 'other')),
  created_by TEXT NOT NULL,
  ai_model_used TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create systems table for distribution tracking
CREATE TABLE systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  system_type TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create media_distribution table for tracking where media is synced
CREATE TABLE media_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('synced', 'pending', 'error')),
  last_sync TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(media_id, system_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_media_assets_type ON media_assets(media_type);
CREATE INDEX idx_media_assets_created_by ON media_assets(created_by);
CREATE INDEX idx_media_assets_created_at ON media_assets(created_at DESC);
CREATE INDEX idx_media_assets_tags ON media_assets USING GIN(tags);
CREATE INDEX idx_media_distribution_media_id ON media_distribution(media_id);
CREATE INDEX idx_media_distribution_system_id ON media_distribution(system_id);
CREATE INDEX idx_media_distribution_status ON media_distribution(status);

-- Enable Row Level Security (optional, service role bypasses this)
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_distribution ENABLE ROW LEVEL SECURITY;

-- Create policies (optional, mainly for direct client access)
CREATE POLICY "Allow all operations for service role" ON media_assets
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for service role" ON systems
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations for service role" ON media_distribution
  FOR ALL USING (true) WITH CHECK (true);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON media_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**After running:** [Go back to Step 1](#step-1-check-if-table-exists)

---

## ✅ Step 6: Check Storage Bucket

```sql
-- This won't work in SQL Editor, check via Supabase Dashboard
-- Navigate to: Storage → Buckets
-- Look for: make-8a536fc1-media
```

**Expected:**
- Bucket named `make-8a536fc1-media` exists
- Bucket is **private** (not public)
- Contains folders: `image/`, `video/`, `audio/`, `3d/`, `other/`

**If missing:** The edge function will create it automatically on first upload

---

## ✅ Step 7: Test Edge Function

### Test GET (List Media)
```bash
curl -X GET \
  'https://YOUR_PROJECT_ID.supabase.co/functions/v1/media-library' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

**Expected Response:**
```json
{
  "data": [],
  "count": 0
}
```

### Test POST (Upload - requires file)
This is better tested through the UI, but here's the format:
```bash
curl -X POST \
  'https://YOUR_PROJECT_ID.supabase.co/functions/v1/media-library' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -F 'file=@/path/to/image.jpg' \
  -F 'name=Test Upload' \
  -F 'media_type=image' \
  -F 'created_by=test-user' \
  -F 'tags=["test"]'
```

---

## 🔍 Common Issues & Fixes

### Issue 1: "relation 'media_assets' does not exist"
**Cause:** Table not created  
**Fix:** [Run Step 5 migration](#step-5-create-table)

### Issue 2: "column 'updated_at' does not exist"
**Cause:** Old schema without updated_at  
**Fix:** Add column:
```sql
ALTER TABLE media_assets ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
```

### Issue 3: "permission denied for table media_assets"
**Cause:** RLS blocking service role (shouldn't happen)  
**Fix:** Verify edge function uses `SUPABASE_SERVICE_ROLE_KEY`

### Issue 4: Empty results but files were uploaded
**Cause:** Files in storage but no database records  
**Fix:** Check edge function logs, may need to re-upload

### Issue 5: "bucket does not exist"
**Cause:** Storage bucket not created  
**Fix:** Upload a file through UI - edge function will create bucket automatically

---

## 📊 Health Check Summary

Run this comprehensive check:

```sql
-- Complete health check
SELECT 
  'media_assets table' AS check_name,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'media_assets'
  ) THEN '✅ Exists' ELSE '❌ Missing' END AS status
UNION ALL
SELECT 
  'systems table',
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'systems'
  ) THEN '✅ Exists' ELSE '❌ Missing' END
UNION ALL
SELECT 
  'media_distribution table',
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'media_distribution'
  ) THEN '✅ Exists' ELSE '❌ Missing' END
UNION ALL
SELECT 
  'Media assets count',
  COALESCE((SELECT COUNT(*)::text FROM media_assets), '0') || ' assets'
UNION ALL
SELECT 
  'Systems count',
  COALESCE((SELECT COUNT(*)::text FROM systems), '0') || ' systems'
UNION ALL
SELECT 
  'Updated_at column',
  CASE WHEN EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'media_assets' 
    AND column_name = 'updated_at'
  ) THEN '✅ Exists' ELSE '❌ Missing' END;
```

**Expected Output:**
```
check_name              | status
------------------------|------------
media_assets table      | ✅ Exists
systems table           | ✅ Exists
media_distribution table| ✅ Exists
Media assets count      | 0 assets (or your count)
Systems count           | 0 systems
Updated_at column       | ✅ Exists
```

---

## 🚀 Quick Fix Script

If everything is missing, run this all-in-one:

```sql
-- Complete Media Library Setup
BEGIN;

-- Drop and recreate tables
DROP TABLE IF EXISTS media_distribution CASCADE;
DROP TABLE IF EXISTS systems CASCADE;
DROP TABLE IF EXISTS media_assets CASCADE;

-- Create tables
CREATE TABLE media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  description TEXT,
  file_url TEXT,
  thumbnail_url TEXT,
  storage_path TEXT,
  media_type TEXT NOT NULL,
  created_by TEXT NOT NULL,
  ai_model_used TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  system_type TEXT NOT NULL,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE media_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  status TEXT NOT NULL,
  last_sync TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(media_id, system_id)
);

-- Create indexes
CREATE INDEX idx_media_assets_type ON media_assets(media_type);
CREATE INDEX idx_media_assets_created_by ON media_assets(created_by);
CREATE INDEX idx_media_assets_created_at ON media_assets(created_at DESC);

-- Create update trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON media_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Verify
SELECT 'Setup complete! ✅' AS message;
```

---

**Quick Links:**
- 📁 Migration File: `/supabase/migrations/media_library_schema.sql`
- 🔧 Edge Function: `/supabase/functions/media-library/index.ts`
- 🐛 Debug Guide: `/MEDIA_LIBRARY_UPDATE_ERROR_FIX.md`
