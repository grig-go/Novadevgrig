-- Migration to add widget configuration support to content table
-- AND make widgets shared amongst all users

ALTER TABLE content DROP CONSTRAINT IF EXISTS content_type_check;

ALTER TABLE content 
ADD CONSTRAINT content_type_check 
CHECK (type IN ('bucket', 'bucketFolder', 'widget', 'item', 'itemFolder'));

-- Add config column to content table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content'
        AND column_name = 'config'
    ) THEN
        ALTER TABLE content ADD COLUMN config JSONB;
        COMMENT ON COLUMN content.config IS 'JSON configuration for widget settings and RCP presets';
    END IF;
END $$;

-- Add widget_type column to content table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content'
        AND column_name = 'widget_type'
    ) THEN
        ALTER TABLE content ADD COLUMN widget_type VARCHAR(50);
        COMMENT ON COLUMN content.widget_type IS 'Type of widget (unreal, viz, etc.)';
    END IF;
END $$;

-- Add connection_settings column to content table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content'
        AND column_name = 'connection_settings'
    ) THEN
        ALTER TABLE content ADD COLUMN connection_settings JSONB;
        COMMENT ON COLUMN content.connection_settings IS 'Connection settings for UE5/Viz Engine';
    END IF;
END $$;

-- Add rcp_presets column to content table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content'
        AND column_name = 'rcp_presets'
    ) THEN
        ALTER TABLE content ADD COLUMN rcp_presets JSONB;
        COMMENT ON COLUMN content.rcp_presets IS 'Selected RCP presets configuration';
    END IF;
END $$;

-- Add rcp_fields column to content table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content'
        AND column_name = 'rcp_fields'
    ) THEN
        ALTER TABLE content ADD COLUMN rcp_fields JSONB;
        COMMENT ON COLUMN content.rcp_fields IS 'All fields from selected RCP presets';
    END IF;
END $$;

-- CRITICAL: Ensure user_id column allows NULL values for shared widgets
DO $$
BEGIN
    -- Check if user_id column exists and alter it to allow NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content'
        AND column_name = 'user_id'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE content ALTER COLUMN user_id DROP NOT NULL;
        RAISE NOTICE 'user_id column now allows NULL values for shared widgets';
    END IF;
END $$;

-- Add foreign key constraint to users table if it doesn't exist
-- This creates the 'content_user_id_fkey' relationship for referential integrity
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'content_user_id_fkey'
        AND table_name = 'content'
    ) THEN
        ALTER TABLE content
        ADD CONSTRAINT content_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES auth.users(id)
        ON DELETE SET NULL;
        RAISE NOTICE 'Foreign key constraint content_user_id_fkey created';
    END IF;
END $$;

-- Set existing widgets to have NULL user_id to make them shared
-- (Optional: comment out if you want to keep existing widgets user-specific)
UPDATE content
SET user_id = NULL
WHERE type = 'widget';

-- Create index on widget_type for better query performance
CREATE INDEX IF NOT EXISTS idx_content_widget_type ON content(widget_type);

-- Create index on config for JSON queries
CREATE INDEX IF NOT EXISTS idx_content_config ON content USING GIN(config);

-- Create index on type for better filtering performance
CREATE INDEX IF NOT EXISTS idx_content_type ON content(type);

-- ============================================================================
-- RLS POLICIES FOR SHARED WIDGETS
-- ============================================================================

-- Drop existing widget-specific policies if they exist
DROP POLICY IF EXISTS "All users can read widgets" ON content;
DROP POLICY IF EXISTS "All users can insert widgets" ON content;
DROP POLICY IF EXISTS "All users can update widgets" ON content;
DROP POLICY IF EXISTS "All users can delete widgets" ON content;

-- Enable RLS on content table if not already enabled
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

-- SELECT: All authenticated users can read widgets, or their own content
CREATE POLICY "Users can read content and widgets" ON content
  FOR SELECT
  USING (
    type = 'widget'
    OR auth.uid() = user_id
  );

-- INSERT: Users can insert widgets with null user_id, or content with their user_id
CREATE POLICY "Users can insert content and widgets" ON content
  FOR INSERT
  WITH CHECK (
    (type = 'widget' AND user_id IS NULL)
    OR auth.uid() = user_id
  );

-- UPDATE: All authenticated users can update widgets, or their own content
CREATE POLICY "Users can update content and widgets" ON content
  FOR UPDATE
  USING (
    type = 'widget'
    OR auth.uid() = user_id
  )
  WITH CHECK (
    type = 'widget'
    OR auth.uid() = user_id
  );

-- DELETE: All authenticated users can delete widgets, or their own content
CREATE POLICY "Users can delete content and widgets" ON content
  FOR DELETE
  USING (
    type = 'widget'
    OR auth.uid() = user_id
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    -- Verify RLS is enabled
    IF EXISTS (
        SELECT 1 FROM pg_class
        WHERE relname = 'content'
        AND relrowsecurity = true
    ) THEN
        RAISE NOTICE '✓ RLS is enabled on content table';
    ELSE
        RAISE WARNING '✗ RLS is NOT enabled on content table!';
    END IF;

    -- Verify user_id allows NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'content'
        AND column_name = 'user_id'
        AND is_nullable = 'YES'
    ) THEN
        RAISE NOTICE '✓ user_id column allows NULL values';
    ELSE
        RAISE WARNING '✗ user_id column does NOT allow NULL values!';
    END IF;

    -- Count widget records
    DECLARE
        widget_count INTEGER;
        shared_widget_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO widget_count FROM content WHERE type = 'widget';
        SELECT COUNT(*) INTO shared_widget_count FROM content WHERE type = 'widget' AND user_id IS NULL;

        RAISE NOTICE '✓ Total widgets: %, Shared widgets (user_id IS NULL): %', widget_count, shared_widget_count;
    END;
END $$;

-- Show current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'content'
ORDER BY policyname;
