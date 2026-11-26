-- Migration 0010: Remove public website side (owner decision, 2026-11)
--
-- PRODUCTION RELEASE ORDER (Zero-Downtime Drop Protocol):
--   1. Apply any additive migrations first.
--   2. Deploy application code that no longer reads/writes public.websites.
--   3. ONLY AFTER the code deploy is live, apply this migration (0010) to drop
--      tr_check_reserved_username, check_reserved_username(), and public.websites.

DROP TRIGGER IF EXISTS tr_check_reserved_username ON public.websites;
DROP FUNCTION IF EXISTS public.check_reserved_username();
DROP POLICY IF EXISTS "Users can manage own website" ON public.websites;
DROP TABLE IF EXISTS public.websites CASCADE;
