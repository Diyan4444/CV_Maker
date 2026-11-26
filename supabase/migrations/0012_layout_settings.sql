-- Migration 0012: Add layout_settings jsonb column to documents with 2KB byte limit
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS layout_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_layout_settings_bytes_check;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_layout_settings_bytes_check
  CHECK (octet_length(layout_settings::text) <= 2048);
