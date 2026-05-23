-- =============================================================================
-- triggers_final.sql — Run this ONCE in Supabase SQL Editor.
-- =============================================================================

-- ── 0. Ensure all columns exist in public.users ───────────────────────────────
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name  text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS staff_id      text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS position      text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS index_number  text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS programme     text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone         text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url    text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS student_id    text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_anonymous  boolean DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at    timestamptz DEFAULT now();


-- ── 1. Drop all existing triggers (clean slate) ──────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created         ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed       ON auth.users;
DROP TRIGGER IF EXISTS trg_auto_confirm_non_student ON auth.users;


-- ── 2. Auto-confirm non-student emails (BEFORE INSERT) ───────────────────────
CREATE OR REPLACE FUNCTION public.auto_confirm_non_student_email()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
BEGIN
  IF NEW.email IS NOT NULL
     AND NEW.email NOT ILIKE '%@st.rmu.edu.gh' THEN
    NEW.email_confirmed_at   = NOW();
    NEW.confirmation_token   = '';
    NEW.confirmation_sent_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_confirm_non_student
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_non_student_email();


-- ── 3. Handle new auth user INSERT ───────────────────────────────────────────
--    Anonymous  → skip
--    Student    → skip (wait for OTP confirmation)
--    Staff/Admin → auto-confirmed above, insert full profile now
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  -- Skip anonymous sign-ins (no email)
  IF NEW.email IS NULL THEN RETURN NEW; END IF;

  -- Skip students waiting for OTP
  IF NEW.email_confirmed_at IS NULL THEN RETURN NEW; END IF;

  -- Staff / admin: create full profile
  INSERT INTO public.users (
    id, email, full_name, display_name, role,
    department, staff_id, position, phone, avatar_url,
    student_id, index_number, programme,
    is_anonymous, created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name',    ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name',
             NEW.raw_user_meta_data->>'full_name',    ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    NEW.raw_user_meta_data->>'department',
    NEW.raw_user_meta_data->>'staff_id',
    NEW.raw_user_meta_data->>'position',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'student_id',
    NEW.raw_user_meta_data->>'index_number',
    NEW.raw_user_meta_data->>'programme',
    false,
    NOW(),
    NOW()
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
    updated_at   = NOW();

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ── 4. Handle student OTP confirmation (AFTER UPDATE) ────────────────────────
--    Fires when verifyOtp() stamps email_confirmed_at.
--    EXCEPTION block ensures a profile error never blocks OTP verification.
CREATE OR REPLACE FUNCTION public.handle_user_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  -- Only act on the NULL → timestamp transition
  IF OLD.email_confirmed_at IS NOT NULL THEN RETURN NEW; END IF;
  IF NEW.email_confirmed_at IS NULL     THEN RETURN NEW; END IF;

  BEGIN
    INSERT INTO public.users (
      id, email, full_name, display_name, role,
      department, programme, student_id, index_number,
      phone, avatar_url, is_anonymous, created_at, updated_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.email, ''),
      COALESCE(NEW.raw_user_meta_data->>'full_name',    ''),
      COALESCE(NEW.raw_user_meta_data->>'display_name',
               NEW.raw_user_meta_data->>'full_name',    ''),
      COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
      NEW.raw_user_meta_data->>'department',
      NEW.raw_user_meta_data->>'programme',
      NEW.raw_user_meta_data->>'student_id',
      NEW.raw_user_meta_data->>'index_number',
      NEW.raw_user_meta_data->>'phone',
      NEW.raw_user_meta_data->>'avatar_url',
      false,
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      email        = EXCLUDED.email,
      full_name    = EXCLUDED.full_name,
      display_name = EXCLUDED.display_name,
      role         = EXCLUDED.role,
      department   = EXCLUDED.department,
      programme    = EXCLUDED.programme,
      student_id   = EXCLUDED.student_id,
      index_number = EXCLUDED.index_number,
      phone        = EXCLUDED.phone,
      avatar_url   = EXCLUDED.avatar_url,
      updated_at   = NOW();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_user_confirmed] failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_confirmed();
