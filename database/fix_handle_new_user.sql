-- ─────────────────────────────────────────────────────────────────────────────
-- fix_handle_new_user.sql
--
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor → New Query → Run).
--
-- Problem:
--   Staff accounts appear in auth.users but NOT in public.users because:
--   1. The old handle_new_user trigger only read full_name + role from metadata
--   2. The app-side upsert after signUp silently fails — RLS blocks it because
--      auth.uid() = admin_uuid ≠ new_staff_uuid
--
-- Fix:
--   Update handle_new_user (SECURITY DEFINER, runs as postgres superuser) to
--   read ALL fields from raw_user_meta_data and insert the full profile row.
--   No RLS issues because SECURITY DEFINER bypasses row-level policies.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Student self-registration: email not confirmed yet (OTP pending).
  -- Skip now — handle_user_confirmed trigger will create the row after OTP.
  IF NEW.email IS NOT NULL AND NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admin-created accounts (staff/admin) are auto-confirmed by the
  -- trg_auto_confirm_non_student trigger BEFORE this INSERT fires,
  -- so email_confirmed_at IS NOT NULL here — create the full profile row.
  INSERT INTO public.users (
    id,
    email,
    full_name,
    display_name,
    role,
    department,
    staff_id,
    position,
    phone,
    avatar_url,
    student_id,
    index_number,
    programme
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name',    ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name',
             NEW.raw_user_meta_data->>'full_name',    ''),
    COALESCE(NEW.raw_user_meta_data->>'role',         'student'),
    NEW.raw_user_meta_data->>'department',
    NEW.raw_user_meta_data->>'staff_id',
    NEW.raw_user_meta_data->>'position',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'student_id',
    NEW.raw_user_meta_data->>'index_number',
    NEW.raw_user_meta_data->>'programme'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name    = EXCLUDED.full_name,
    display_name = EXCLUDED.display_name,
    role         = EXCLUDED.role,
    department   = EXCLUDED.department,
    staff_id     = EXCLUDED.staff_id,
    position     = EXCLUDED.position,
    phone        = EXCLUDED.phone,
    avatar_url   = EXCLUDED.avatar_url,
    student_id   = EXCLUDED.student_id,
    index_number = EXCLUDED.index_number,
    programme    = EXCLUDED.programme,
    updated_at   = NOW();

  RETURN NEW;
END;
$$;

-- The trigger itself stays the same — just the function body changed above.
-- If it doesn't exist yet, create it:
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
