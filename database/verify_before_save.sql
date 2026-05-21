-- =============================================================================
-- RMU CAMPUS MAP — Verify Before Save
-- Ensures student credentials are only written to public.users AFTER
-- their OTP has been verified and email_confirmed_at is set.
--
-- Paste this entire file into Supabase SQL Editor → Run
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Modify the INSERT trigger
--    Regular email signups: skip — profile created by the UPDATE trigger below
--    Anonymous (guest) users: still created immediately (no email to verify)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Regular signup with unconfirmed email → do nothing yet.
  -- The on_auth_user_confirmed trigger will create the profile once the OTP
  -- is verified and email_confirmed_at is stamped.
  IF NEW.email IS NOT NULL AND NEW.email_confirmed_at IS NULL THEN
    RETURN NEW;
  END IF;

  -- Anonymous / guest users (no email) → create profile immediately.
  INSERT INTO public.users (
    id, email, full_name, role, is_anonymous, created_at, updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'display_name',
      ''
    ),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    COALESCE((NEW.raw_user_meta_data->>'is_anonymous')::boolean, false),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE
    SET email      = EXCLUDED.email,
        updated_at = now();

  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- 2. New UPDATE trigger — fires when OTP is verified
--    Supabase sets email_confirmed_at when the student enters the correct
--    6-digit code.  That UPDATE on auth.users is what fires this trigger.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_user_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Only act when email_confirmed_at transitions NULL → timestamp
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN

    INSERT INTO public.users (
      id,
      email,
      full_name,
      display_name,
      role,
      department,
      programme,
      student_id,
      index_number,
      phone,
      avatar_url,
      is_anonymous,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
      COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        ''
      ),
      COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
      NEW.raw_user_meta_data->>'department',
      NEW.raw_user_meta_data->>'programme',
      NEW.raw_user_meta_data->>'student_id',
      NEW.raw_user_meta_data->>'index_number',
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'avatar_url',
      false,
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE
      SET email        = EXCLUDED.email,
          full_name    = EXCLUDED.full_name,
          display_name = EXCLUDED.display_name,
          role         = EXCLUDED.role,
          department   = EXCLUDED.department,
          programme    = EXCLUDED.programme,
          student_id   = EXCLUDED.student_id,
          index_number = EXCLUDED.index_number,
          phone        = EXCLUDED.phone,
          avatar_url   = EXCLUDED.avatar_url,
          updated_at   = now();

  END IF;
  RETURN NEW;
END;
$$;

-- Register the new trigger on auth.users UPDATE
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_confirmed();


-- ---------------------------------------------------------------------------
-- How it works end-to-end
-- ---------------------------------------------------------------------------
--
--  BEFORE this change:
--    signUp() → handle_new_user INSERT trigger fires immediately
--            → row created in public.users with partial data
--
--  AFTER this change:
--    signUp() → handle_new_user INSERT trigger fires
--             → sees email IS NOT NULL AND email_confirmed_at IS NULL
--             → returns early — NO row written to public.users
--
--    Student enters OTP → supabase.auth.verifyOtp() called
--             → Supabase UPDATEs auth.users, sets email_confirmed_at = now()
--             → on_auth_user_confirmed UPDATE trigger fires
--             → reads ALL metadata (full_name, department, programme, etc.)
--             → INSERT INTO public.users with complete student profile ✓
--
--  Guest / anonymous:
--    signInAnonymously() → no email → handle_new_user creates profile
--                          immediately (unchanged behaviour) ✓
-- ---------------------------------------------------------------------------
