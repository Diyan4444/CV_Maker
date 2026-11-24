-- Migration 0009: Foreign Key from public.profiles to auth.users with ON DELETE CASCADE
-- Ensures complete, atomic cascade deletion of user profile and all 13 dependent tables
-- when an auth user is deleted from auth.users.

-- Clean up historical orphaned profile rows that do not exist in auth.users
DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- Add foreign key constraint from public.profiles(id) to auth.users(id) with ON DELETE CASCADE
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_auth_users_id_fk'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_auth_users_id_fk
      FOREIGN KEY (id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;
