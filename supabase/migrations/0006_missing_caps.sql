-- Migration 0006: Missing CHECK constraints for master_profiles JSON fields and websites fields
-- Ensures idempotent addition of 8KB / 16KB payload caps and 300 / 4000 char caps

-- 1. master_profiles: contact_info (8KB) & social_links (8KB)
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

-- 2. websites: custom_headline (300), custom_bio (4000), field_visibility (16KB)
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
