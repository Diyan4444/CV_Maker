-- Migration 0001: Core Database Schema
-- Defines all core tables, unique constraints, and foreign key relationships.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Profiles (Keyed directly to Supabase auth.users.id)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY NOT NULL,
  email varchar(255) NOT NULL,
  full_name varchar(255) DEFAULT '',
  avatar_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Master Profiles (Normalized, single source of truth per user)
CREATE TABLE IF NOT EXISTS public.master_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  background_group varchar(100),
  specialization varchar(150),
  stage varchar(100),
  purposes jsonb DEFAULT '[]'::jsonb,
  headline varchar(300) DEFAULT '',
  summary text DEFAULT '',
  contact_info jsonb DEFAULT '{}'::jsonb,
  social_links jsonb DEFAULT '{}'::jsonb,
  schema_version varchar(20) DEFAULT '1.0.0' NOT NULL,
  version integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 3. Education
CREATE TABLE IF NOT EXISTS public.education (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  profile_id uuid NOT NULL,
  institution varchar(255) NOT NULL,
  degree varchar(200) NOT NULL,
  field_of_study varchar(200) DEFAULT '',
  start_date varchar(50),
  end_date varchar(50),
  is_current boolean DEFAULT false NOT NULL,
  grade_type varchar(50),
  grade_value varchar(50),
  location varchar(150),
  highlights jsonb DEFAULT '[]'::jsonb,
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 4. Experiences
CREATE TABLE IF NOT EXISTS public.experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  profile_id uuid NOT NULL,
  type varchar(50) NOT NULL,
  organization varchar(255) NOT NULL,
  role varchar(200) NOT NULL,
  location varchar(150),
  start_date varchar(50),
  end_date varchar(50),
  is_current boolean DEFAULT false NOT NULL,
  bullets jsonb DEFAULT '[]'::jsonb,
  technologies jsonb DEFAULT '[]'::jsonb,
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. Projects
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  profile_id uuid NOT NULL,
  title varchar(255) NOT NULL,
  role varchar(200) DEFAULT '',
  start_date varchar(50),
  end_date varchar(50),
  url varchar(500),
  repo_url varchar(500),
  bullets jsonb DEFAULT '[]'::jsonb,
  tools_used jsonb DEFAULT '[]'::jsonb,
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 6. Skills
CREATE TABLE IF NOT EXISTS public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  profile_id uuid NOT NULL,
  category varchar(100) NOT NULL,
  items jsonb DEFAULT '[]'::jsonb,
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 7. Publications
CREATE TABLE IF NOT EXISTS public.publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  profile_id uuid NOT NULL,
  title varchar(300) NOT NULL,
  authors jsonb DEFAULT '[]'::jsonb,
  venue varchar(255) DEFAULT '',
  publication_date varchar(50),
  doi_or_url varchar(500),
  summary text DEFAULT '',
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 8. Achievements
CREATE TABLE IF NOT EXISTS public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  profile_id uuid NOT NULL,
  title varchar(255) NOT NULL,
  issuer_or_org varchar(200),
  date varchar(50),
  description text DEFAULT '',
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 9. Certifications
CREATE TABLE IF NOT EXISTS public.certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  profile_id uuid NOT NULL,
  name varchar(255) NOT NULL,
  issuer varchar(200) NOT NULL,
  issue_date varchar(50),
  url varchar(500),
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 10. Custom Sections
CREATE TABLE IF NOT EXISTS public.custom_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  profile_id uuid NOT NULL,
  section_title varchar(150) NOT NULL,
  entries jsonb DEFAULT '[]'::jsonb,
  order_index integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 11. Documents
CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  title varchar(200) NOT NULL,
  type varchar(50) NOT NULL,
  template_id varchar(100) NOT NULL,
  accent_color varchar(20) DEFAULT '#1A1A1A' NOT NULL,
  target_role varchar(200),
  is_archived boolean DEFAULT false NOT NULL,
  schema_version varchar(20) DEFAULT '1.0.0' NOT NULL,
  version integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 12. Document Sections
CREATE TABLE IF NOT EXISTS public.document_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  document_id uuid NOT NULL,
  section_type varchar(100) NOT NULL,
  title varchar(150) NOT NULL,
  order_index integer DEFAULT 0 NOT NULL,
  is_visible boolean DEFAULT true NOT NULL,
  content jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 13. Websites
CREATE TABLE IF NOT EXISTS public.websites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  username varchar(50) NOT NULL,
  is_published boolean DEFAULT false NOT NULL,
  palette varchar(50) DEFAULT 'mist' NOT NULL,
  field_visibility jsonb DEFAULT '{"showEmail":false,"showPhone":false,"showLocation":false,"showSocialLinks":{},"showEducation":true,"showExperience":true,"showProjects":true,"showSkills":true,"showAchievements":false,"showCertifications":false,"showPublications":false,"showDownloadResume":false}'::jsonb NOT NULL,
  custom_headline varchar(300),
  custom_bio text,
  schema_version varchar(20) DEFAULT '1.0.0' NOT NULL,
  version integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 14. AI Usage Logs
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  action_type varchar(100) NOT NULL,
  prompt_tokens integer DEFAULT 0,
  completion_tokens integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Unique constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'master_profiles_user_id_unique') THEN
    ALTER TABLE public.master_profiles ADD CONSTRAINT master_profiles_user_id_unique UNIQUE(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'websites_user_id_unique') THEN
    ALTER TABLE public.websites ADD CONSTRAINT websites_user_id_unique UNIQUE(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'websites_username_unique') THEN
    ALTER TABLE public.websites ADD CONSTRAINT websites_username_unique UNIQUE(username);
  END IF;
END $$;

-- Foreign key constraints
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'master_profiles_user_id_profiles_id_fk') THEN
    ALTER TABLE public.master_profiles ADD CONSTRAINT master_profiles_user_id_profiles_id_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE cascade;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'education_profile_id_master_profiles_id_fk') THEN
    ALTER TABLE public.education ADD CONSTRAINT education_profile_id_master_profiles_id_fk FOREIGN KEY (profile_id) REFERENCES public.master_profiles(id) ON DELETE cascade;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'experiences_profile_id_master_profiles_id_fk') THEN
    ALTER TABLE public.experiences ADD CONSTRAINT experiences_profile_id_master_profiles_id_fk FOREIGN KEY (profile_id) REFERENCES public.master_profiles(id) ON DELETE cascade;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_profile_id_master_profiles_id_fk') THEN
    ALTER TABLE public.projects ADD CONSTRAINT projects_profile_id_master_profiles_id_fk FOREIGN KEY (profile_id) REFERENCES public.master_profiles(id) ON DELETE cascade;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'skills_profile_id_master_profiles_id_fk') THEN
    ALTER TABLE public.skills ADD CONSTRAINT skills_profile_id_master_profiles_id_fk FOREIGN KEY (profile_id) REFERENCES public.master_profiles(id) ON DELETE cascade;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'publications_profile_id_master_profiles_id_fk') THEN
    ALTER TABLE public.publications ADD CONSTRAINT publications_profile_id_master_profiles_id_fk FOREIGN KEY (profile_id) REFERENCES public.master_profiles(id) ON DELETE cascade;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'achievements_profile_id_master_profiles_id_fk') THEN
    ALTER TABLE public.achievements ADD CONSTRAINT achievements_profile_id_master_profiles_id_fk FOREIGN KEY (profile_id) REFERENCES public.master_profiles(id) ON DELETE cascade;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'certifications_profile_id_master_profiles_id_fk') THEN
    ALTER TABLE public.certifications ADD CONSTRAINT certifications_profile_id_master_profiles_id_fk FOREIGN KEY (profile_id) REFERENCES public.master_profiles(id) ON DELETE cascade;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'custom_sections_profile_id_master_profiles_id_fk') THEN
    ALTER TABLE public.custom_sections ADD CONSTRAINT custom_sections_profile_id_master_profiles_id_fk FOREIGN KEY (profile_id) REFERENCES public.master_profiles(id) ON DELETE cascade;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'documents_user_id_profiles_id_fk') THEN
    ALTER TABLE public.documents ADD CONSTRAINT documents_user_id_profiles_id_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE cascade;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_sections_document_id_documents_id_fk') THEN
    ALTER TABLE public.document_sections ADD CONSTRAINT document_sections_document_id_documents_id_fk FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE cascade;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'websites_user_id_profiles_id_fk') THEN
    ALTER TABLE public.websites ADD CONSTRAINT websites_user_id_profiles_id_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE cascade;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_usage_logs_user_id_profiles_id_fk') THEN
    ALTER TABLE public.ai_usage_logs ADD CONSTRAINT ai_usage_logs_user_id_profiles_id_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE cascade;
  END IF;
END $$;

-- Supabase Role Permissions & Schema Grants
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated, anon;
  END IF;
END $$;
