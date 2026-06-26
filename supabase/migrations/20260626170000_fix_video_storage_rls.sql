-- ============================================================
-- Fix: Replace storage RLS policies for video-project-images
-- The original policies used storage.foldername(name) which may
-- not be available in all Supabase versions.
-- Using name LIKE (auth.uid()::text || '/%') instead.
-- ============================================================

-- Drop old policies (if they exist)
DROP POLICY IF EXISTS "Users can read own project images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own project images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own project images" ON storage.objects;

-- SELECT: users can read files in their own folder
CREATE POLICY "Users can read own project images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'video-project-images'
    AND name LIKE (auth.uid()::text || '/%')
  );

-- INSERT: users can upload to their own folder
CREATE POLICY "Users can upload own project images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'video-project-images'
    AND name LIKE (auth.uid()::text || '/%')
  );

-- DELETE: users can delete files from their own folder
CREATE POLICY "Users can delete own project images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'video-project-images'
    AND name LIKE (auth.uid()::text || '/%')
  );
