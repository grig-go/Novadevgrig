-- Create bucket (public is now handled differently)
INSERT INTO storage.buckets (id, name, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  10485760, -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']::text[]
);

-- Then set public access via policy
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'images' );

-- Simple policy: All authenticated users have full access
CREATE POLICY "Authenticated users full access to images"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'images')
WITH CHECK (bucket_id = 'images');

-- Optional: Allow public to view images (for sharing URLs)
CREATE POLICY "Public can view images"
ON storage.objects
FOR SELECT
TO anon, public
USING (bucket_id = 'images');