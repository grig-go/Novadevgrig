-- =====================================================
-- Media Library Database Schema
-- =====================================================
-- This file contains the database schema for the Media Library
-- Run this in the Supabase SQL Editor to create all required tables

-- =====================================================
-- 1. MEDIA ASSETS TABLE
-- =====================================================
-- Stores all media files (images, videos, audio, 3D models)
CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- File Information
  name TEXT NOT NULL,
  file_name TEXT,
  description TEXT,
  file_url TEXT,
  thumbnail_url TEXT,
  storage_path TEXT, -- Supabase storage path (bucket/path/to/file)
  
  -- Media Classification
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio', '3d', 'other')),
  
  -- AI Generation Metadata
  ai_model_used TEXT,
  generation_prompt TEXT,
  generation_metadata JSONB,
  
  -- Creator & Ownership
  created_by TEXT NOT NULL DEFAULT 'user',
  
  -- Tags & Search
  tags TEXT[] DEFAULT '{}',
  
  -- File Metadata (size, dimensions, etc.)
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_media_assets_media_type ON media_assets(media_type);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_by ON media_assets(created_by);
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON media_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_assets_tags ON media_assets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_media_assets_ai_model ON media_assets(ai_model_used) WHERE ai_model_used IS NOT NULL;

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_media_assets_search ON media_assets 
  USING GIN(to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '')));

-- =====================================================
-- 2. SYSTEMS TABLE (Optional)
-- =====================================================
-- Stores information about systems that media can be distributed to
-- (e.g., Unreal Engine, Pixara, Broadcast servers, etc.)
CREATE TABLE IF NOT EXISTS systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  system_type TEXT NOT NULL, -- 'unreal', 'pixara', 'broadcast', 'archive', 'cloud', etc.
  description TEXT,
  ip_address TEXT, -- IP address or hostname of the system
  port INTEGER, -- Port number for the system
  channel TEXT, -- Channel or mount point (e.g., 'channel1', 'graphics', etc.)
  connection_info JSONB, -- Additional connection details (paths, URLs, credentials, etc.)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 3. MEDIA DISTRIBUTION TABLE (Optional)
-- =====================================================
-- Tracks which media assets are distributed to which systems
CREATE TABLE IF NOT EXISTS media_distribution (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  media_asset_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  
  -- Distribution Details
  path TEXT NOT NULL, -- Path on the target system
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'synced', 'error')),
  
  -- Sync Information
  last_sync TIMESTAMPTZ,
  sync_error TEXT,
  sync_metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure unique distribution per asset-system pair
  UNIQUE(media_asset_id, system_id)
);

-- Indexes for distribution queries
CREATE INDEX IF NOT EXISTS idx_media_distribution_asset ON media_distribution(media_asset_id);
CREATE INDEX IF NOT EXISTS idx_media_distribution_system ON media_distribution(system_id);
CREATE INDEX IF NOT EXISTS idx_media_distribution_status ON media_distribution(status);

-- =====================================================
-- 4. TRIGGERS FOR AUTO-UPDATING updated_at
-- =====================================================
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to media_assets
DROP TRIGGER IF EXISTS update_media_assets_updated_at ON media_assets;
CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON media_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to systems
DROP TRIGGER IF EXISTS update_systems_updated_at ON systems;
CREATE TRIGGER update_systems_updated_at
  BEFORE UPDATE ON systems
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to media_distribution
DROP TRIGGER IF EXISTS update_media_distribution_updated_at ON media_distribution;
CREATE TRIGGER update_media_distribution_updated_at
  BEFORE UPDATE ON media_distribution
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS) - Optional
-- =====================================================
-- Uncomment these if you want to enable RLS for security
-- Note: This will require authentication setup

-- Enable RLS on all tables
-- ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE systems ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE media_distribution ENABLE ROW LEVEL SECURITY;

-- Example policies (adjust based on your auth setup)
-- Allow all authenticated users to read media_assets
-- CREATE POLICY "Allow authenticated read access" ON media_assets
--   FOR SELECT
--   USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Allow all authenticated users to insert media_assets
-- CREATE POLICY "Allow authenticated insert access" ON media_assets
--   FOR INSERT
--   WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Allow users to update their own media
-- CREATE POLICY "Allow users to update own media" ON media_assets
--   FOR UPDATE
--   USING (created_by = auth.email() OR auth.role() = 'service_role');

-- Allow users to delete their own media
-- CREATE POLICY "Allow users to delete own media" ON media_assets
--   FOR DELETE
--   USING (created_by = auth.email() OR auth.role() = 'service_role');

-- =====================================================
-- 6. SEED DATA (Optional - for testing)
-- =====================================================
-- Uncomment to add sample systems

-- INSERT INTO systems (name, system_type, description, ip_address, port, channel, connection_info) VALUES
--   ('Unreal Stage A', 'unreal', 'Unreal Engine production stage', '{"path": "D:\\Media\\Stadiums"}'),
--   ('Pixara Node 3', 'pixara', 'Pixara render node', '{"path": "/mnt/render/cache"}'),
--   ('Sports Production A', 'broadcast', 'Sports production server', '{"path": "/mnt/sports/portraits"}'),
--   ('Archive Server', 'archive', 'Network archive storage', '{"path": "\\\\nas01\\media\\athletes"}'),
--   ('Weather Graphics System', 'broadcast', 'Weather broadcast system', '{"path": "E:\\Broadcast\\Weather"}'),
--   ('Election Graphics Node', 'broadcast', 'Election graphics workstation', '{"path": "/var/media/elections"}'),
--   ('Backup Storage', 'archive', 'Backup archive system', '{"path": "Z:\\Archives\\Elections"}')
-- ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- DONE!
-- =====================================================
-- The Media Library tables are now ready to use.
-- You can now upload media through the Media Library UI.
