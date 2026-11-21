-- ==============================================================================
-- 0008_drop_duplicate_indexes.sql: Drop redundant duplicate indexes
-- ==============================================================================
-- In 0007_indexes.sql, indexes were created on columns already covered by unique constraints:
-- 1. master_profiles(user_id) -> covered by unique index master_profiles_user_id_unique
-- 2. websites(user_id)        -> covered by unique index websites_user_id_unique
-- 3. websites(username)       -> covered by unique index websites_username_unique
--
-- This migration drops the redundant secondary indexes to eliminate duplicate index overhead.

DROP INDEX IF EXISTS public.idx_master_profiles_user_id;
DROP INDEX IF EXISTS public.idx_websites_user_id;
DROP INDEX IF EXISTS public.idx_websites_username;
