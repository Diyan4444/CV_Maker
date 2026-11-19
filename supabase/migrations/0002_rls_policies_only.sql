-- ==============================================================================
-- Supabase Row-Level Security (RLS) & Policies ONLY
-- MUST BE APPLIED AFTER: drizzle/migrations/0000_boring_prowler.sql
-- ==============================================================================

-- 1. Enable RLS on all 14 tables created by Drizzle migration
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.education ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop any prior policies to ensure clean idempotent run
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can manage own master profile" ON public.master_profiles;
DROP POLICY IF EXISTS "Users can manage own education" ON public.education;
DROP POLICY IF EXISTS "Users can manage own experiences" ON public.experiences;
DROP POLICY IF EXISTS "Users can manage own projects" ON public.projects;
DROP POLICY IF EXISTS "Users can manage own skills" ON public.skills;
DROP POLICY IF EXISTS "Users can manage own publications" ON public.publications;
DROP POLICY IF EXISTS "Users can manage own achievements" ON public.achievements;
DROP POLICY IF EXISTS "Users can manage own certifications" ON public.certifications;
DROP POLICY IF EXISTS "Users can manage own custom sections" ON public.custom_sections;
DROP POLICY IF EXISTS "Users can manage own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can manage own document sections" ON public.document_sections;
DROP POLICY IF EXISTS "Users can manage own website" ON public.websites;
DROP POLICY IF EXISTS "Users can view own AI usage logs" ON public.ai_usage_logs;

-- 3. Profiles: Authenticated users manage only their own row
CREATE POLICY "Users can manage own profile" ON public.profiles
  FOR ALL TO authenticated USING (auth.uid() = id);

-- 4. Master Profiles: Authenticated users manage only their own row
CREATE POLICY "Users can manage own master profile" ON public.master_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 5. Child Profile Tables: Authenticated users manage only rows joined to their own profile
CREATE POLICY "Users can manage own education" ON public.education
  FOR ALL TO authenticated USING (profile_id IN (SELECT id FROM public.master_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own experiences" ON public.experiences
  FOR ALL TO authenticated USING (profile_id IN (SELECT id FROM public.master_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own projects" ON public.projects
  FOR ALL TO authenticated USING (profile_id IN (SELECT id FROM public.master_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own skills" ON public.skills
  FOR ALL TO authenticated USING (profile_id IN (SELECT id FROM public.master_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own publications" ON public.publications
  FOR ALL TO authenticated USING (profile_id IN (SELECT id FROM public.master_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own achievements" ON public.achievements
  FOR ALL TO authenticated USING (profile_id IN (SELECT id FROM public.master_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own certifications" ON public.certifications
  FOR ALL TO authenticated USING (profile_id IN (SELECT id FROM public.master_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage own custom sections" ON public.custom_sections
  FOR ALL TO authenticated USING (profile_id IN (SELECT id FROM public.master_profiles WHERE user_id = auth.uid()));

-- 6. Documents & Document Sections: Authenticated users manage only their own documents
CREATE POLICY "Users can manage own documents" ON public.documents
  FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own document sections" ON public.document_sections
  FOR ALL TO authenticated USING (document_id IN (SELECT id FROM public.documents WHERE user_id = auth.uid()));

-- 7. Websites: Users manage only their own website configuration
CREATE POLICY "Users can manage own website" ON public.websites
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- 8. AI Usage Logs: Users view only their own logs
CREATE POLICY "Users can view own AI usage logs" ON public.ai_usage_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 9. Trigger on auth.users for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- TABLE USAGE & RESTRICTED PRIVILEGES FOR ROLES
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO postgres, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- Revoke default broad grants
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon;

-- Explicitly grant only specific CRUD privileges needed
GRANT SELECT, INSERT, UPDATE, DELETE ON 
  public.profiles,
  public.master_profiles,
  public.education,
  public.experiences,
  public.projects,
  public.skills,
  public.publications,
  public.achievements,
  public.certifications,
  public.custom_sections,
  public.documents,
  public.document_sections,
  public.websites
TO authenticated;

-- ai_usage_logs is strictly read-only for authenticated (writes performed server-side via service_role)
GRANT SELECT ON public.ai_usage_logs TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Prevent future tables from granting broad access
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
