-- ─────────────────────────────────────────────────────────────────────────────
-- auto_confirm_staff.sql
--
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor → New Query).
--
-- What this does:
--   When ANY new user is inserted into auth.users, check their email:
--     • @st.rmu.edu.gh  → do nothing (Supabase OTP flow handles confirmation)
--     • everything else → auto-confirm immediately (staff/admin accounts
--       created by the admin panel log in right away with their temp password)
--
-- This is safe because:
--   - Students must still verify via the 8-digit OTP email
--   - Staff are created by admins with a generated temp password + welcome email
--   - Admins use a hardcoded email list in AuthContext, bypassing this entirely
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1 – Function
CREATE OR REPLACE FUNCTION auth.auto_confirm_non_student_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  -- Only auto-confirm if the email is NOT a student email
  IF NEW.email IS NOT NULL
     AND NEW.email NOT ILIKE '%@st.rmu.edu.gh' THEN

    NEW.email_confirmed_at  = NOW();
    NEW.confirmation_token  = '';
    NEW.confirmation_sent_at = NOW();

  END IF;

  RETURN NEW;
END;
$$;

-- Step 2 – Trigger (drop first so re-running this file is idempotent)
DROP TRIGGER IF EXISTS trg_auto_confirm_non_student ON auth.users;

CREATE TRIGGER trg_auto_confirm_non_student
  BEFORE INSERT
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.auto_confirm_non_student_email();


-- ─────────────────────────────────────────────────────────────────────────────
-- Verification query (run separately to check it worked):
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT tgname, tgenabled
-- FROM   pg_trigger
-- WHERE  tgname = 'trg_auto_confirm_non_student';
