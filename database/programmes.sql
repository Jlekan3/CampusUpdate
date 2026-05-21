-- =============================================================================
-- RMU CAMPUS MAP — Programmes Migration
-- Run this ONCE in the Supabase SQL Editor.
-- Creates the `programmes` table, inserts all departments, then inserts
-- every programme linked to its department.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Programmes table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.programmes (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  department_id uuid        NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  level         text        DEFAULT 'BSc'
                            CHECK (level IN ('BSc','MSc','MA','Diploma','Certificate','Vocational','Other')),
  is_active     boolean     DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (name, department_id)
);

-- RLS: anyone can read (needed for registration page, same as departments)
ALTER TABLE public.programmes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "programmes_select"       ON public.programmes;
DROP POLICY IF EXISTS "programmes_insert_admin" ON public.programmes;
DROP POLICY IF EXISTS "programmes_update_admin" ON public.programmes;
DROP POLICY IF EXISTS "programmes_delete_admin" ON public.programmes;

CREATE POLICY "programmes_select"       ON public.programmes FOR SELECT USING (true);
CREATE POLICY "programmes_insert_admin" ON public.programmes FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "programmes_update_admin" ON public.programmes FOR UPDATE USING (is_admin());
CREATE POLICY "programmes_delete_admin" ON public.programmes FOR DELETE USING (is_admin());


-- ---------------------------------------------------------------------------
-- 2. Upsert departments
--    Uses ON CONFLICT (name) so re-running is safe.
-- ---------------------------------------------------------------------------
ALTER TABLE public.departments ADD COLUMN IF NOT EXISTS faculty text;

INSERT INTO public.departments (name, description, category, faculty)
VALUES
  -- Faculty of Maritime Studies
  ('Department of Nautical Science',
   'Core seagoing and navigation disciplines',
   'Academic',
   'Faculty of Maritime Studies'),

  ('Department of Port and Shipping Administration',
   'Port management, shipping administration and maritime logistics',
   'Academic',
   'Faculty of Maritime Studies'),

  -- Faculty of Engineering and Applied Sciences
  ('Department of Marine Engineering',
   'Marine engineering and propulsion systems',
   'Academic',
   'Faculty of Engineering and Applied Sciences'),

  ('Department of Electrical and Electronic Engineering',
   'Electrical power, marine electrical and electronics engineering',
   'Academic',
   'Faculty of Engineering and Applied Sciences'),

  ('Department of Mechanical and Computer Engineering',
   'Mechanical, naval architecture and computer engineering',
   'Academic',
   'Faculty of Engineering and Applied Sciences'),

  ('Department of Information Technology and Computer Science',
   'Computer science, software and information technology',
   'Academic',
   'Faculty of Engineering and Applied Sciences'),

  -- Faculty of International Business and Humanities
  ('Department of Business Studies',
   'Business management, logistics, procurement and accounting',
   'Academic',
   'Faculty of International Business and Humanities')

ON CONFLICT (name) DO UPDATE
  SET description = EXCLUDED.description,
      faculty     = EXCLUDED.faculty,
      updated_at  = now();


-- ---------------------------------------------------------------------------
-- 3. Insert programmes
--    References departments by name so order of insertion does not matter.
-- ---------------------------------------------------------------------------

INSERT INTO public.programmes (name, department_id, level)
SELECT p.prog_name, d.id, p.level
FROM (VALUES

  -- ── Department of Nautical Science ────────────────────────────────────────
  ('BSc Nautical Science',
   'Department of Nautical Science', 'BSc'),

  ('Diploma in Nautical Science',
   'Department of Nautical Science', 'Diploma'),

  ('Class 1, 2 and 3 Deck Certificates of Competency',
   'Department of Nautical Science', 'Certificate'),

  ('General Purpose Rating (Pre-Sea Vocational)',
   'Department of Nautical Science', 'Vocational'),

  -- ── Department of Port and Shipping Administration ────────────────────────
  ('MA Ports and Shipping Administration',
   'Department of Port and Shipping Administration', 'MA'),

  ('MSc International Shipping and Logistics',
   'Department of Port and Shipping Administration', 'MSc'),

  ('MSc Coastal Environment Management',
   'Department of Port and Shipping Administration', 'MSc'),

  ('MSc Safety, Security & Risk Management',
   'Department of Port and Shipping Administration', 'MSc'),

  ('BSc Ports and Shipping Administration',
   'Department of Port and Shipping Administration', 'BSc'),

  ('Diploma in Ports and Shipping Administration',
   'Department of Port and Shipping Administration', 'Diploma'),

  -- ── Department of Marine Engineering ─────────────────────────────────────
  ('BSc Marine Engineering',
   'Department of Marine Engineering', 'BSc'),

  ('Diploma in Marine Engineering',
   'Department of Marine Engineering', 'Diploma'),

  ('Marine Engine Mechanic (Vocational)',
   'Department of Marine Engineering', 'Vocational'),

  -- ── Department of Electrical and Electronic Engineering ───────────────────
  ('MSc Electrical Power Engineering',
   'Department of Electrical and Electronic Engineering', 'MSc'),

  ('BSc Marine Electrical & Electronics Engineering',
   'Department of Electrical and Electronic Engineering', 'BSc'),

  ('BSc Electrical & Electronic Engineering',
   'Department of Electrical and Electronic Engineering', 'BSc'),

  ('Diploma in Electrical & Electronic Engineering',
   'Department of Electrical and Electronic Engineering', 'Diploma'),

  -- ── Department of Mechanical and Computer Engineering ────────────────────
  ('MSc Renewable Energy Engineering',
   'Department of Mechanical and Computer Engineering', 'MSc'),

  ('MSc Bioprocess Engineering',
   'Department of Mechanical and Computer Engineering', 'MSc'),

  ('MSc Environmental Engineering',
   'Department of Mechanical and Computer Engineering', 'MSc'),

  ('MSc Subsea Engineering',
   'Department of Mechanical and Computer Engineering', 'MSc'),

  ('BSc Naval Architecture',
   'Department of Mechanical and Computer Engineering', 'BSc'),

  ('BSc Mechanical Engineering',
   'Department of Mechanical and Computer Engineering', 'BSc'),

  ('BSc Computer Engineering',
   'Department of Mechanical and Computer Engineering', 'BSc'),

  -- ── Department of Information Technology and Computer Science ─────────────
  ('BSc Computer Science',
   'Department of Information Technology and Computer Science', 'BSc'),

  ('BSc Information Technology',
   'Department of Information Technology and Computer Science', 'BSc'),

  ('Diploma in Information Technology',
   'Department of Information Technology and Computer Science', 'Diploma'),

  -- ── Department of Business Studies ───────────────────────────────────────
  ('BSc Logistics Management',
   'Department of Business Studies', 'BSc'),

  ('BSc Procurement and Operations Management',
   'Department of Business Studies', 'BSc'),

  ('BSc Accounting',
   'Department of Business Studies', 'BSc'),

  ('BSc Marketing and International Business',
   'Department of Business Studies', 'BSc'),

  ('Diploma in Accounting with Information Technology',
   'Department of Business Studies', 'Diploma'),

  ('Vocational & Professional Short Course',
   'Department of Business Studies', 'Vocational')

) AS p(prog_name, dept_name, level)
JOIN public.departments d ON d.name = p.dept_name
ON CONFLICT (name, department_id) DO NOTHING;


-- ---------------------------------------------------------------------------
-- Verify: run this SELECT to confirm the data loaded correctly
-- ---------------------------------------------------------------------------
-- SELECT d.faculty, d.name AS department, p.name AS programme, p.level
-- FROM   public.programmes p
-- JOIN   public.departments d ON d.id = p.department_id
-- ORDER  BY d.faculty, d.name, p.level, p.name;
