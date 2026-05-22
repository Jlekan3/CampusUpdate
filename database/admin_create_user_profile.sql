-- ─────────────────────────────────────────────────────────────────────────────
-- admin_create_user_profile.sql
--
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor → New Query → Run).
--
-- Why this exists:
--   When an admin creates a staff account, createUserWithAuthAndFirestore uses
--   the admin's session to upsert into public.users with id = new_staff_uuid.
--   RLS blocks this because auth.uid() = admin_uuid ≠ new_staff_uuid.
--   This SECURITY DEFINER function bypasses RLS so the admin can write any row.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.admin_create_user_profile(
  p_id           uuid,
  p_email        text,
  p_full_name    text,
  p_display_name text,
  p_role         text,
  p_department   text    DEFAULT NULL,
  p_staff_id     text    DEFAULT NULL,
  p_position     text    DEFAULT NULL,
  p_phone        text    DEFAULT NULL,
  p_avatar_url   text    DEFAULT NULL,
  p_student_id   text    DEFAULT NULL,
  p_index_number text    DEFAULT NULL,
  p_programme    text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id, email, full_name, display_name, role,
    department, staff_id, position, phone, avatar_url,
    student_id, index_number, programme
  )
  VALUES (
    p_id, p_email, p_full_name, p_display_name, p_role,
    p_department, p_staff_id, p_position, p_phone, p_avatar_url,
    p_student_id, p_index_number, p_programme
  )
  ON CONFLICT (id) DO UPDATE SET
    email        = EXCLUDED.email,
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
END;
$$;

-- Allow authenticated users (admins) to call this function
GRANT EXECUTE ON FUNCTION public.admin_create_user_profile TO authenticated;
