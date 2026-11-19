-- Database-level constraints for security & data integrity
-- Enforces username format, length bounds, JSON payload limits, and reserved username restriction directly in PostgreSQL

-- 1. Username format & length constraint on websites
ALTER TABLE public.websites
  DROP CONSTRAINT IF EXISTS websites_username_format_check;

ALTER TABLE public.websites
  ADD CONSTRAINT websites_username_format_check
  CHECK (
    char_length(username) >= 3 AND
    char_length(username) <= 30 AND
    username ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'
  );

-- 2. Trigger function to prevent reserved usernames directly in PostgreSQL
CREATE OR REPLACE FUNCTION public.check_reserved_username()
RETURNS TRIGGER AS $$
DECLARE
  reserved_names TEXT[] := ARRAY[
    'admin', 'administrator', 'api', 'app', 'auth', 'blog', 'callback',
    'dashboard', 'docs', 'edit', 'editor', 'export', 'help', 'login',
    'logout', 'me', 'new', 'onboarding', 'privacy', 'profile', 'register',
    'resume', 'root', 'settings', 'signin', 'signout', 'signup', 'status',
    'support', 'terms', 'u', 'user', 'users', 'website'
  ];
BEGIN
  IF lower(NEW.username) = ANY(reserved_names) THEN
    RAISE EXCEPTION 'Username "%" is reserved and cannot be chosen.', NEW.username
      USING ERRCODE = '23514'; -- check_violation
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_check_reserved_username ON public.websites;
CREATE TRIGGER tr_check_reserved_username
  BEFORE INSERT OR UPDATE OF username ON public.websites
  FOR EACH ROW EXECUTE FUNCTION public.check_reserved_username();

-- 3. Length limits on user-controlled text and JSON fields
ALTER TABLE public.master_profiles
  DROP CONSTRAINT IF EXISTS master_profiles_headline_len_check;
ALTER TABLE public.master_profiles
  ADD CONSTRAINT master_profiles_headline_len_check
  CHECK (char_length(headline) <= 300);

ALTER TABLE public.master_profiles
  DROP CONSTRAINT IF EXISTS master_profiles_summary_len_check;
ALTER TABLE public.master_profiles
  ADD CONSTRAINT master_profiles_summary_len_check
  CHECK (char_length(summary) <= 4000);

-- Length limits on contactInfo and socialLinks JSON payloads (max 8KB each)
ALTER TABLE public.master_profiles
  DROP CONSTRAINT IF EXISTS master_profiles_contact_info_len_check;
ALTER TABLE public.master_profiles
  ADD CONSTRAINT master_profiles_contact_info_len_check
  CHECK (octet_length(contact_info::text) <= 8192);

ALTER TABLE public.master_profiles
  DROP CONSTRAINT IF EXISTS master_profiles_social_links_len_check;
ALTER TABLE public.master_profiles
  ADD CONSTRAINT master_profiles_social_links_len_check
  CHECK (octet_length(social_links::text) <= 8192);

-- Field length limits on websites custom text
ALTER TABLE public.websites
  DROP CONSTRAINT IF EXISTS websites_custom_headline_len_check;
ALTER TABLE public.websites
  ADD CONSTRAINT websites_custom_headline_len_check
  CHECK (custom_headline IS NULL OR char_length(custom_headline) <= 300);

ALTER TABLE public.websites
  DROP CONSTRAINT IF EXISTS websites_custom_bio_len_check;
ALTER TABLE public.websites
  ADD CONSTRAINT websites_custom_bio_len_check
  CHECK (custom_bio IS NULL OR char_length(custom_bio) <= 4000);

ALTER TABLE public.websites
  DROP CONSTRAINT IF EXISTS websites_field_visibility_len_check;
ALTER TABLE public.websites
  ADD CONSTRAINT websites_field_visibility_len_check
  CHECK (octet_length(field_visibility::text) <= 16384);
