-- Migration 0005: Version column, extended CHECK constraints, and per-user row caps
-- 1. Version column for optimistic concurrency control
ALTER TABLE public.master_profiles 
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

ALTER TABLE public.documents 
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

ALTER TABLE public.websites 
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL;

-- 2. CHECK constraints on user-controlled text and JSON fields

-- Education
ALTER TABLE public.education
  DROP CONSTRAINT IF EXISTS education_institution_len_check,
  DROP CONSTRAINT IF EXISTS education_degree_len_check,
  DROP CONSTRAINT IF EXISTS education_field_of_study_len_check,
  DROP CONSTRAINT IF EXISTS education_location_len_check,
  DROP CONSTRAINT IF EXISTS education_grade_value_len_check,
  DROP CONSTRAINT IF EXISTS education_highlights_check;

ALTER TABLE public.education
  ADD CONSTRAINT education_institution_len_check CHECK (char_length(institution) <= 255),
  ADD CONSTRAINT education_degree_len_check CHECK (char_length(degree) <= 200),
  ADD CONSTRAINT education_field_of_study_len_check CHECK (field_of_study IS NULL OR char_length(field_of_study) <= 200),
  ADD CONSTRAINT education_location_len_check CHECK (location IS NULL OR char_length(location) <= 150),
  ADD CONSTRAINT education_grade_value_len_check CHECK (grade_value IS NULL OR char_length(grade_value) <= 50),
  ADD CONSTRAINT education_highlights_check CHECK (
    highlights IS NULL OR (
      jsonb_typeof(highlights) = 'array' AND
      jsonb_array_length(highlights) <= 50 AND
      octet_length(highlights::text) <= 16384
    )
  );

-- Experiences
ALTER TABLE public.experiences
  DROP CONSTRAINT IF EXISTS experiences_org_len_check,
  DROP CONSTRAINT IF EXISTS experiences_role_len_check,
  DROP CONSTRAINT IF EXISTS experiences_location_len_check,
  DROP CONSTRAINT IF EXISTS experiences_bullets_check,
  DROP CONSTRAINT IF EXISTS experiences_technologies_check;

ALTER TABLE public.experiences
  ADD CONSTRAINT experiences_org_len_check CHECK (char_length(organization) <= 255),
  ADD CONSTRAINT experiences_role_len_check CHECK (char_length(role) <= 200),
  ADD CONSTRAINT experiences_location_len_check CHECK (location IS NULL OR char_length(location) <= 150),
  ADD CONSTRAINT experiences_bullets_check CHECK (
    bullets IS NULL OR (
      jsonb_typeof(bullets) = 'array' AND
      jsonb_array_length(bullets) <= 50 AND
      octet_length(bullets::text) <= 16384
    )
  ),
  ADD CONSTRAINT experiences_technologies_check CHECK (
    technologies IS NULL OR (
      jsonb_typeof(technologies) = 'array' AND
      jsonb_array_length(technologies) <= 50 AND
      octet_length(technologies::text) <= 8192
    )
  );

-- Projects
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_title_len_check,
  DROP CONSTRAINT IF EXISTS projects_role_len_check,
  DROP CONSTRAINT IF EXISTS projects_url_len_check,
  DROP CONSTRAINT IF EXISTS projects_repo_url_len_check,
  DROP CONSTRAINT IF EXISTS projects_bullets_check,
  DROP CONSTRAINT IF EXISTS projects_tools_used_check;

ALTER TABLE public.projects
  ADD CONSTRAINT projects_title_len_check CHECK (char_length(title) <= 255),
  ADD CONSTRAINT projects_role_len_check CHECK (role IS NULL OR char_length(role) <= 200),
  ADD CONSTRAINT projects_url_len_check CHECK (url IS NULL OR char_length(url) <= 500),
  ADD CONSTRAINT projects_repo_url_len_check CHECK (repo_url IS NULL OR char_length(repo_url) <= 500),
  ADD CONSTRAINT projects_bullets_check CHECK (
    bullets IS NULL OR (
      jsonb_typeof(bullets) = 'array' AND
      jsonb_array_length(bullets) <= 50 AND
      octet_length(bullets::text) <= 16384
    )
  ),
  ADD CONSTRAINT projects_tools_used_check CHECK (
    tools_used IS NULL OR (
      jsonb_typeof(tools_used) = 'array' AND
      jsonb_array_length(tools_used) <= 50 AND
      octet_length(tools_used::text) <= 8192
    )
  );

-- Skills
ALTER TABLE public.skills
  DROP CONSTRAINT IF EXISTS skills_category_len_check,
  DROP CONSTRAINT IF EXISTS skills_items_check;

ALTER TABLE public.skills
  ADD CONSTRAINT skills_category_len_check CHECK (char_length(category) <= 100),
  ADD CONSTRAINT skills_items_check CHECK (
    items IS NULL OR (
      jsonb_typeof(items) = 'array' AND
      jsonb_array_length(items) <= 50 AND
      octet_length(items::text) <= 16384
    )
  );

-- Publications
ALTER TABLE public.publications
  DROP CONSTRAINT IF EXISTS publications_title_len_check,
  DROP CONSTRAINT IF EXISTS publications_venue_len_check,
  DROP CONSTRAINT IF EXISTS publications_doi_len_check,
  DROP CONSTRAINT IF EXISTS publications_summary_len_check,
  DROP CONSTRAINT IF EXISTS publications_authors_check;

ALTER TABLE public.publications
  ADD CONSTRAINT publications_title_len_check CHECK (char_length(title) <= 300),
  ADD CONSTRAINT publications_venue_len_check CHECK (venue IS NULL OR char_length(venue) <= 255),
  ADD CONSTRAINT publications_doi_len_check CHECK (doi_or_url IS NULL OR char_length(doi_or_url) <= 500),
  ADD CONSTRAINT publications_summary_len_check CHECK (summary IS NULL OR char_length(summary) <= 4000),
  ADD CONSTRAINT publications_authors_check CHECK (
    authors IS NULL OR (
      jsonb_typeof(authors) = 'array' AND
      jsonb_array_length(authors) <= 50 AND
      octet_length(authors::text) <= 8192
    )
  );

-- Achievements
ALTER TABLE public.achievements
  DROP CONSTRAINT IF EXISTS achievements_title_len_check,
  DROP CONSTRAINT IF EXISTS achievements_issuer_len_check,
  DROP CONSTRAINT IF EXISTS achievements_description_len_check;

ALTER TABLE public.achievements
  ADD CONSTRAINT achievements_title_len_check CHECK (char_length(title) <= 255),
  ADD CONSTRAINT achievements_issuer_len_check CHECK (issuer_or_org IS NULL OR char_length(issuer_or_org) <= 200),
  ADD CONSTRAINT achievements_description_len_check CHECK (description IS NULL OR char_length(description) <= 4000);

-- Certifications
ALTER TABLE public.certifications
  DROP CONSTRAINT IF EXISTS certifications_name_len_check,
  DROP CONSTRAINT IF EXISTS certifications_issuer_len_check,
  DROP CONSTRAINT IF EXISTS certifications_url_len_check;

ALTER TABLE public.certifications
  ADD CONSTRAINT certifications_name_len_check CHECK (char_length(name) <= 255),
  ADD CONSTRAINT certifications_issuer_len_check CHECK (char_length(issuer) <= 200),
  ADD CONSTRAINT certifications_url_len_check CHECK (url IS NULL OR char_length(url) <= 500);

-- Custom Sections
ALTER TABLE public.custom_sections
  DROP CONSTRAINT IF EXISTS custom_sections_title_len_check,
  DROP CONSTRAINT IF EXISTS custom_sections_entries_check;

ALTER TABLE public.custom_sections
  ADD CONSTRAINT custom_sections_title_len_check CHECK (char_length(section_title) <= 150),
  ADD CONSTRAINT custom_sections_entries_check CHECK (
    entries IS NULL OR (
      jsonb_typeof(entries) = 'array' AND
      jsonb_array_length(entries) <= 50 AND
      octet_length(entries::text) <= 32768
    )
  );

-- Documents
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_title_len_check,
  DROP CONSTRAINT IF EXISTS documents_target_role_len_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_title_len_check CHECK (char_length(title) <= 200),
  ADD CONSTRAINT documents_target_role_len_check CHECK (target_role IS NULL OR char_length(target_role) <= 200);

-- Document Sections Content
ALTER TABLE public.document_sections
  DROP CONSTRAINT IF EXISTS document_sections_title_len_check,
  DROP CONSTRAINT IF EXISTS document_sections_content_size_check;

ALTER TABLE public.document_sections
  ADD CONSTRAINT document_sections_title_len_check CHECK (char_length(title) <= 150),
  ADD CONSTRAINT document_sections_content_size_check CHECK (octet_length(content::text) <= 65536);

-- 3. Row Cap Triggers with SET search_path = public and 1-line justifications

-- Documents Per-User Cap Function
CREATE OR REPLACE FUNCTION public.check_user_documents_cap()
RETURNS TRIGGER 
SET search_path = public
AS $$
-- Justification: Prevents denial-of-service document bloat while granting generous capacity for targeted resumes and academic CVs.
DECLARE
  doc_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO doc_count FROM public.documents WHERE user_id = NEW.user_id;
  IF doc_count >= 20 THEN
    RAISE EXCEPTION 'Document limit exceeded: maximum 20 documents allowed per user.'
      USING ERRCODE = '23514'; -- check_violation
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_user_documents_cap ON public.documents;
CREATE TRIGGER tr_check_user_documents_cap
  BEFORE INSERT ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.check_user_documents_cap();

-- Profile Child Rows Cap Function
CREATE OR REPLACE FUNCTION public.check_profile_child_cap()
RETURNS TRIGGER
SET search_path = public
AS $$
-- Justification: Bounds child record row counts per profile while comfortably supporting exhaustive academic CVs and career histories.
DECLARE
  child_count INTEGER;
  max_allowed INTEGER;
  tbl_name TEXT := TG_TABLE_NAME;
BEGIN
  IF tbl_name = 'education' THEN max_allowed := 30;
  ELSIF tbl_name = 'experiences' THEN max_allowed := 50;
  ELSIF tbl_name = 'projects' THEN max_allowed := 50;
  ELSIF tbl_name = 'skills' THEN max_allowed := 50;
  ELSIF tbl_name = 'publications' THEN max_allowed := 50;
  ELSIF tbl_name = 'achievements' THEN max_allowed := 50;
  ELSIF tbl_name = 'certifications' THEN max_allowed := 50;
  ELSIF tbl_name = 'custom_sections' THEN max_allowed := 20;
  ELSE max_allowed := 50;
  END IF;

  EXECUTE format('SELECT count(*) FROM public.%I WHERE profile_id = $1', tbl_name)
    INTO child_count
    USING NEW.profile_id;

  IF child_count >= max_allowed THEN
    RAISE EXCEPTION 'Row cap exceeded for %: maximum % entries allowed per profile.', tbl_name, max_allowed
      USING ERRCODE = '23514'; -- check_violation
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to all child tables
DROP TRIGGER IF EXISTS tr_check_cap_education ON public.education;
CREATE TRIGGER tr_check_cap_education BEFORE INSERT ON public.education FOR EACH ROW EXECUTE FUNCTION public.check_profile_child_cap();

DROP TRIGGER IF EXISTS tr_check_cap_experiences ON public.experiences;
CREATE TRIGGER tr_check_cap_experiences BEFORE INSERT ON public.experiences FOR EACH ROW EXECUTE FUNCTION public.check_profile_child_cap();

DROP TRIGGER IF EXISTS tr_check_cap_projects ON public.projects;
CREATE TRIGGER tr_check_cap_projects BEFORE INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.check_profile_child_cap();

DROP TRIGGER IF EXISTS tr_check_cap_skills ON public.skills;
CREATE TRIGGER tr_check_cap_skills BEFORE INSERT ON public.skills FOR EACH ROW EXECUTE FUNCTION public.check_profile_child_cap();

DROP TRIGGER IF EXISTS tr_check_cap_publications ON public.publications;
CREATE TRIGGER tr_check_cap_publications BEFORE INSERT ON public.publications FOR EACH ROW EXECUTE FUNCTION public.check_profile_child_cap();

DROP TRIGGER IF EXISTS tr_check_cap_achievements ON public.achievements;
CREATE TRIGGER tr_check_cap_achievements BEFORE INSERT ON public.achievements FOR EACH ROW EXECUTE FUNCTION public.check_profile_child_cap();

DROP TRIGGER IF EXISTS tr_check_cap_certifications ON public.certifications;
CREATE TRIGGER tr_check_cap_certifications BEFORE INSERT ON public.certifications FOR EACH ROW EXECUTE FUNCTION public.check_profile_child_cap();

DROP TRIGGER IF EXISTS tr_check_cap_custom_sections ON public.custom_sections;
CREATE TRIGGER tr_check_cap_custom_sections BEFORE INSERT ON public.custom_sections FOR EACH ROW EXECUTE FUNCTION public.check_profile_child_cap();
