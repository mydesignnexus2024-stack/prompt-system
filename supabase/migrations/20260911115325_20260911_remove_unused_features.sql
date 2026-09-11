/*
# Remove unused feature tables and functions

## Purpose
Strip the database down to only the tables needed for:
- Authentication (email_otps, user_profiles, audit_log, rate_limits)
- Prompt submission (community_submissions)
- Prompt display (prompts, media_files, notify_signups)

All tables, functions, and triggers for courses, certificates, projects,
file shares, notion pages, password vault, todos, and related features are dropped.

## Tables Dropped
- course_certificates, course_enrollments, course_lessons, course_notes,
  course_sections, course_shares, courses, lesson_progress
- file_shares, folders, notion_pages, password_vault, project_files, projects, todos

## Functions Dropped
- create_default_projects, get_course_progress, increment_course_share_view,
  increment_share_view, issue_certificate_if_complete,
  update_notion_pages_updated_at, update_password_vault_updated_at

## Triggers Dropped
- notion_pages_updated_at, password_vault_updated_at

## Constraints Dropped
- prompts_project_id_fkey (so projects can be dropped; prompts.project_id becomes orphaned but harmless)

## Tables Kept
- prompts, media_files, community_submissions, user_profiles,
  email_otps, notify_signups, audit_log, rate_limits

## Important Notes
1. prompts.project_id FK to projects is dropped first so projects can be deleted.
2. The prompts table itself is kept (it stores prompt data for the explore page).
3. user_profiles is kept (used by AppShell for avatar/display name).
4. email_otps is kept (used by the OTP auth flow).
5. audit_log and rate_limits are kept (used by edge functions for security).
*/

-- 1. Drop the FK from prompts to projects so we can drop projects
ALTER TABLE prompts DROP CONSTRAINT IF EXISTS prompts_project_id_fkey;

-- 2. Drop triggers on tables being dropped
DROP TRIGGER IF EXISTS notion_pages_updated_at ON notion_pages;
DROP TRIGGER IF EXISTS password_vault_updated_at ON password_vault;

-- 3. Drop functions that are no longer used
DROP FUNCTION IF EXISTS create_default_projects() CASCADE;
DROP FUNCTION IF EXISTS get_course_progress(p_course_id uuid, p_user_id uuid) CASCADE;
DROP FUNCTION IF EXISTS increment_course_share_view(p_share_id uuid) CASCADE;
DROP FUNCTION IF EXISTS increment_share_view(p_share_id uuid) CASCADE;
DROP FUNCTION IF EXISTS issue_certificate_if_complete(p_lesson_id uuid, p_user_id uuid) CASCADE;
DROP FUNCTION IF EXISTS update_notion_pages_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_password_vault_updated_at() CASCADE;

-- 4. Drop child tables first (respecting FK dependencies)
DROP TABLE IF EXISTS lesson_progress CASCADE;
DROP TABLE IF EXISTS course_notes CASCADE;
DROP TABLE IF EXISTS course_lessons CASCADE;
DROP TABLE IF EXISTS course_sections CASCADE;
DROP TABLE IF EXISTS course_certificates CASCADE;
DROP TABLE IF EXISTS course_enrollments CASCADE;
DROP TABLE IF EXISTS course_shares CASCADE;
DROP TABLE IF EXISTS courses CASCADE;

DROP TABLE IF EXISTS file_shares CASCADE;
DROP TABLE IF EXISTS project_files CASCADE;
DROP TABLE IF EXISTS folders CASCADE;
DROP TABLE IF EXISTS notion_pages CASCADE;
DROP TABLE IF EXISTS password_vault CASCADE;
DROP TABLE IF EXISTS todos CASCADE;

-- 5. Drop parent table last
DROP TABLE IF EXISTS projects CASCADE;
