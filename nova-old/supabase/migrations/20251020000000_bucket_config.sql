ALTER TABLE content 
ADD COLUMN IF NOT EXISTS bucket_config JSONB DEFAULT NULL;

-- Add comment to document the structure
COMMENT ON COLUMN content.bucket_config IS 'Configuration for bucket-level item generation. Structure: {
  "generateItem": {
    "enabled": boolean,
    "templateId": string (UUID),
    "fieldName": string,
    "fieldValue": string (optional, defaults to bucket name)
  }
}';

-- Create an index for faster queries on bucket_config
CREATE INDEX IF NOT EXISTS idx_content_bucket_config 
ON content USING gin (bucket_config);

-- Optional: Add a check constraint to ensure bucket_config only exists on bucket types
ALTER TABLE content 
ADD CONSTRAINT check_bucket_config_only_on_buckets 
CHECK (
  bucket_config IS NULL OR type = 'bucket'
);