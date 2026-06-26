-- ============================================================
-- Video IA Feature — Core Tables & Storage
-- Migration: 20260626120000_video_ia_tables
-- ============================================================

-- 1. video_projects
-- Stores each video-generation project with all its metadata,
-- script content, and prompt configuration.
-- ============================================================
CREATE TABLE public.video_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_name text,
  product_url text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft',
      'images_uploaded',
      'information_completed',
      'content_generated',
      'prompt_ready',
      'opened_in_gemini',
      'video_uploaded',
      'completed',
      'archived'
    )),
  style text,
  target_audience text,
  duration text,
  voice_type text,
  has_text boolean DEFAULT false,
  has_music boolean DEFAULT false,
  idea_title text,
  hook text,
  script text,
  voiceover text,
  screen_texts text,
  cta text,
  caption text,
  hashtags text,
  final_prompt text,
  benefits text,
  differentiators text,
  problem_solved text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- 2. video_project_images
-- Product images uploaded per project. Supports ordering and a
-- primary-image flag for thumbnail selection.
-- ============================================================
CREATE TABLE public.video_project_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.video_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text,
  mime_type text,
  file_size bigint,
  sort_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. video_prompt_versions
-- Optional prompt-version history so users can revisit or
-- roll back to a previous prompt / script / style.
-- ============================================================
CREATE TABLE public.video_prompt_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.video_projects(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  prompt text,
  script text,
  style text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Grants
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_projects TO authenticated;
GRANT ALL ON public.video_projects TO service_role;

GRANT SELECT, INSERT, DELETE ON public.video_project_images TO authenticated;
GRANT ALL ON public.video_project_images TO service_role;

GRANT SELECT, INSERT ON public.video_prompt_versions TO authenticated;
GRANT ALL ON public.video_prompt_versions TO service_role;

-- ============================================================
-- Row-Level Security
-- ============================================================
ALTER TABLE public.video_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_project_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_prompt_versions ENABLE ROW LEVEL SECURITY;

-- --- video_projects: owner-only access -----------------------
CREATE POLICY "Users can select own projects"
  ON public.video_projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON public.video_projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON public.video_projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON public.video_projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- --- video_project_images: owner-only access -----------------
CREATE POLICY "Users can select own images"
  ON public.video_project_images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own images"
  ON public.video_project_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own images"
  ON public.video_project_images FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- --- video_prompt_versions: access via project ownership -----
CREATE POLICY "Users can select prompt versions for own projects"
  ON public.video_prompt_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.video_projects
      WHERE video_projects.id = video_prompt_versions.project_id
        AND video_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert prompt versions for own projects"
  ON public.video_prompt_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.video_projects
      WHERE video_projects.id = video_prompt_versions.project_id
        AND video_projects.user_id = auth.uid()
    )
  );

-- ============================================================
-- Storage bucket: video-project-images (private)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-project-images',
  'video-project-images',
  false,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Storage RLS — users only see their own folder (first path segment = user_id)
CREATE POLICY "Users can read own project images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'video-project-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own project images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'video-project-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own project images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'video-project-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
