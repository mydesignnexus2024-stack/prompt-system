/*
# Create community_submissions table

## Purpose
Allows any visitor (anonymous or authenticated) to submit a video master prompt
or image master prompt for review. A trusted admin reviews each submission and
can approve it (making it visible on Explore) or reject it.

## New Tables
- `community_submissions`
  - `id` (uuid, primary key)
  - `submitter_name` (text, required) — display name the visitor enters
  - `submitter_email` (text, optional) — for follow-up contact
  - `prompt_type` (text) — 'video' or 'image'
  - `platform` (text) — e.g. 'Veo 3', 'Midjourney', etc.
  - `title` (text, required)
  - `prompt_text` (text, required)
  - `notes` (text, optional)
  - `tags` (text[])
  - `media_path` (text, optional) — storage path for an uploaded file
  - `media_type` (text, optional) — 'image' or 'video'
  - `status` (text) — 'pending' | 'approved' | 'rejected', default 'pending'
  - `reviewer_notes` (text, optional)
  - `created_at` (timestamptz)

## Security
- RLS enabled.
- Anon + authenticated can INSERT (public submission).
- Only authenticated users can SELECT/UPDATE/DELETE (admin review).
*/

CREATE TABLE IF NOT EXISTS community_submissions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitter_name  text NOT NULL,
  submitter_email text,
  prompt_type     text NOT NULL CHECK (prompt_type IN ('video', 'image')),
  platform        text NOT NULL,
  title           text NOT NULL,
  prompt_text     text NOT NULL,
  notes           text,
  tags            text[] NOT NULL DEFAULT '{}',
  media_path      text,
  media_type      text CHECK (media_type IN ('image', 'video')),
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_notes  text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE community_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit
DROP POLICY IF EXISTS "public_insert_submissions" ON community_submissions;
CREATE POLICY "public_insert_submissions" ON community_submissions
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated (admin) can read submissions
DROP POLICY IF EXISTS "admin_select_submissions" ON community_submissions;
CREATE POLICY "admin_select_submissions" ON community_submissions
  FOR SELECT TO authenticated
  USING (true);

-- Only authenticated (admin) can update status / reviewer_notes
DROP POLICY IF EXISTS "admin_update_submissions" ON community_submissions;
CREATE POLICY "admin_update_submissions" ON community_submissions
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Only authenticated (admin) can delete
DROP POLICY IF EXISTS "admin_delete_submissions" ON community_submissions;
CREATE POLICY "admin_delete_submissions" ON community_submissions
  FOR DELETE TO authenticated
  USING (true);

-- Storage bucket for submission media (public bucket so uploaded files can be served)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'submission-media',
  'submission-media',
  true,
  104857600,  -- 100 MB
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anon to upload to submission-media
DROP POLICY IF EXISTS "anon_upload_submission_media" ON storage.objects;
CREATE POLICY "anon_upload_submission_media" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'submission-media');

-- Anyone can read (public bucket)
DROP POLICY IF EXISTS "public_read_submission_media" ON storage.objects;
CREATE POLICY "public_read_submission_media" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'submission-media');

-- Authenticated can delete (admin cleanup)
DROP POLICY IF EXISTS "admin_delete_submission_media" ON storage.objects;
CREATE POLICY "admin_delete_submission_media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'submission-media');
