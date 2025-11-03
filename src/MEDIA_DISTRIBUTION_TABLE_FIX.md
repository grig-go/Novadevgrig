# Media Distribution Table Fix

## Problem
The `media_distribution` table either doesn't exist or is missing the `media_asset_id` column.

## Solution: Run this SQL in Supabase SQL Editor

```sql
-- =====================================================
-- Step 1: Check if tables exist
-- =====================================================
SELECT 
  table_name 
FROM 
  information_schema.tables 
WHERE 
  table_schema = 'public' 
  AND table_name IN ('media_assets', 'systems', 'media_distribution');

-- =====================================================
-- Step 2: Create media_assets table if it doesn't exist
-- =====================================================
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_name TEXT,
  description TEXT,
  file_url TEXT,
  thumbnail_url TEXT,
  storage_path TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio', '3d', 'other')),
  ai_model_used TEXT,
  generation_prompt TEXT,
  generation_metadata JSONB,
  created_by TEXT NOT NULL DEFAULT 'user',
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Step 3: Create systems table if it doesn't exist
-- =====================================================
CREATE TABLE IF NOT EXISTS systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  system_type TEXT NOT NULL,
  description TEXT,
  ip_address TEXT,
  port INTEGER,
  channel TEXT,
  connection_info JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Step 4: Create media_distribution table
-- =====================================================
CREATE TABLE IF NOT EXISTS media_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'error')),
  last_sync TIMESTAMPTZ,
  sync_error TEXT,
  sync_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(media_asset_id, system_id)
);

-- =====================================================
-- Step 5: Create indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_media_assets_media_type ON media_assets(media_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON media_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_distribution_asset ON media_distribution(media_asset_id);
CREATE INDEX IF NOT EXISTS idx_media_distribution_system ON media_distribution(system_id);
CREATE INDEX IF NOT EXISTS idx_media_distribution_status ON media_distribution(status);

-- =====================================================
-- Step 6: Verify tables were created
-- =====================================================
SELECT 
  table_name,
  column_name,
  data_type
FROM 
  information_schema.columns
WHERE 
  table_name = 'media_distribution'
ORDER BY 
  ordinal_position;
```

## Quick Fix (Copy & Paste this entire block)

```sql
-- Create all three tables with correct schema
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_name TEXT,
  description TEXT,
  file_url TEXT,
  thumbnail_url TEXT,
  storage_path TEXT,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio', '3d', 'other')),
  ai_model_used TEXT,
  generation_prompt TEXT,
  generation_metadata JSONB,
  created_by TEXT NOT NULL DEFAULT 'user',
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  system_type TEXT NOT NULL,
  description TEXT,
  ip_address TEXT,
  port INTEGER,
  channel TEXT,
  connection_info JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'error')),
  last_sync TIMESTAMPTZ,
  sync_error TEXT,
  sync_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(media_asset_id, system_id)
);

CREATE INDEX IF NOT EXISTS idx_media_distribution_asset ON media_distribution(media_asset_id);
CREATE INDEX IF NOT EXISTS idx_media_distribution_system ON media_distribution(system_id);
```

## After Running

1. Refresh your app
2. Open a media asset
3. The distribution table should now load successfully
4. You should be able to assign systems

## Add Sample Systems (Optional)

```sql
INSERT INTO systems (name, system_type, description, ip_address, port, channel) VALUES
  ('Unreal Stage A', 'unreal', 'Unreal Engine production stage', '192.168.1.100', 7777, 'stage_a'),
  ('Pixara Node 3', 'pixara', 'Pixara render node', '192.168.1.101', 8080, 'render_node3'),
  ('Sports Production', 'broadcast', 'Sports production server', '192.168.1.102', 9000, 'sports_a')
ON CONFLICT (name) DO NOTHING;
```
