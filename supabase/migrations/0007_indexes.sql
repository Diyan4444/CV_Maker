-- ==============================================================================
-- 0007_indexes.sql: Performance & RLS Query Optimization Indexes
-- ==============================================================================

-- 1. Documents: foreign key & RLS filtering by user_id
CREATE INDEX IF NOT EXISTS idx_documents_user_id
  ON public.documents (user_id);

-- 2. Document Sections: ordering and retrieval by document_id and order_index
CREATE INDEX IF NOT EXISTS idx_document_sections_doc_order
  ON public.document_sections (document_id, order_index);

-- 3. Master Profile Child Tables: indexed by profile_id for RLS subqueries and profile loading
CREATE INDEX IF NOT EXISTS idx_education_profile_id
  ON public.education (profile_id);

CREATE INDEX IF NOT EXISTS idx_experiences_profile_id
  ON public.experiences (profile_id);

CREATE INDEX IF NOT EXISTS idx_projects_profile_id
  ON public.projects (profile_id);

CREATE INDEX IF NOT EXISTS idx_skills_profile_id
  ON public.skills (profile_id);

CREATE INDEX IF NOT EXISTS idx_publications_profile_id
  ON public.publications (profile_id);

CREATE INDEX IF NOT EXISTS idx_achievements_profile_id
  ON public.achievements (profile_id);

CREATE INDEX IF NOT EXISTS idx_certifications_profile_id
  ON public.certifications (profile_id);

CREATE INDEX IF NOT EXISTS idx_custom_sections_profile_id
  ON public.custom_sections (profile_id);

-- 4. Master Profiles: user_id lookup for RLS subqueries
CREATE INDEX IF NOT EXISTS idx_master_profiles_user_id
  ON public.master_profiles (user_id);

-- 5. Websites: user_id for management RLS and username for public slug lookup
CREATE INDEX IF NOT EXISTS idx_websites_user_id
  ON public.websites (user_id);

CREATE INDEX IF NOT EXISTS idx_websites_username
  ON public.websites (username);

-- 6. AI Usage Logs: user_id for quota checks and rate limiting
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id
  ON public.ai_usage_logs (user_id);


-- 7. Security Definer Function Hardening: explicit search_path prevents search_path hijacking
ALTER FUNCTION public.handle_new_user() SET search_path = public;


-- 8. Privilege Hardening: ensure anon has zero privileges, app_migrations is isolated, and ai_usage_logs is strictly read-only
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;
REVOKE ALL ON public.app_migrations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ai_usage_logs FROM authenticated;
