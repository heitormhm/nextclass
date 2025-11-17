-- Create annotation-images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'annotation-images',
  'annotation-images',
  true,
  5242880, -- 5MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload their own images
CREATE POLICY "Users can upload annotation images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'annotation-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Anyone can view images (public bucket)
CREATE POLICY "Public access to annotation images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'annotation-images');

-- Policy: Users can delete their own images
CREATE POLICY "Users can delete their own annotation images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'annotation-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);