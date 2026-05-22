-- =============================================================================
-- triggers_final.sql — Run this ONCE in Supabase SQL Editor.
-- Replaces all previous trigger versions (verify_before_save, fix_handle_new_user).
--
-- Key fix: every trigger body is wrapped in BEGIN...EXCEPTION so that a
-- profile-insert failure can NEVER block OTP verification or account creation.
-- =============================================================================

-- ── 1. Drop all existing triggers first (clean slate) ────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created   ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_confirmed  ON auth.users;
DROP TRIGGER IF EXISTS trg_auto_confirm_non_student ON auth.users;


-- ── 2. Auto-confirm staff / admin emails (BEFORE INSERT) ─────────────────────
--    Non-student emails skip OTP verification entirely.
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


-- ── 3. Handle new auth user (AFTER INSERT) ───────────────────────────────────
--    • Anonymous users  → skip (no email, no profile needed)
--    • Student signup   → skip (email_confirmed_at IS NULL, wait for OTP)
--    • Staff / admin    → auto-confirmed above, create full profile now
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  -- Skip anonymous sign-ins
  IF NEW.email IS NULL THEN RETURN NEW; END IF;

  -- Skip students awaiting OTP
  IF NEW.email_confirmed_at IS NULL THEN RETURN NEW; END IF;

  -- Staff / admin: create full profile (wrapped so a failure never blocks login)
  BEGIN
    INSERT INTO public.users (
      id, email, full_name, display_name, role,
      department, staff_id, position, phone, avatar_url,
      student_id, index_number, programme
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name',    ''),
      COALESCE(NEW.raw_user_meta_data->>'display_name',
               NEW.raw_user_meta_data->>'full_name',    ''),
      COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
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
      updated_at   = NOW();
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] profile insert failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ── 4. Handle student OTP confirmation (AFTER UPDATE) ────────────────────────
--    Fires when verifyOtp() stamps email_confirmed_at on the auth.users row.
--    Wrapped in EXCEPTION so a profile-insert error NEVER returns
--    "Error confirming user" to the app.
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
      phone, avatar_url
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
      NEW.raw_user_meta_data->>'avatar_url'
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
    RAISE WARNING '[handle_user_confirmed] profile insert failed for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_confirmed();
