-- =============================================================================
-- RMU CAMPUS MAP  —  Supabase PostgreSQL Schema  (v2 – fixed creation order)
-- Paste this entire file into the Supabase SQL Editor and click "Run".
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ---------------------------------------------------------------------------
-- 1. Pure helper — no table dependency
-- ---------------------------------------------------------------------------

-- Auto-update updated_at on every UPDATE
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- 2. Tables  (must exist before any function that references them)
-- ---------------------------------------------------------------------------

-- 2.1  Users  (extends auth.users — one row per Supabase Auth account)
CREATE TABLE IF NOT EXISTS public.users (
  id              uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text,
  full_name       text,
  display_name    text,
  role            text        NOT NULL DEFAULT 'student'
                              CHECK (role IN ('admin','faculty','student','guest')),
  department      text,
  programme       text,
  student_id      text,
  staff_id        text,
  position        text,
  phone           text,
  avatar_url      text,
  index_number    text,
  is_anonymous    boolean     DEFAULT false,
  last_login_at   timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 2.2  Buildings
CREATE TABLE IF NOT EXISTS public.buildings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  description text,
  image_url   text,
  latitude    float8,
  longitude   float8,
  floors      integer,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 2.3  Locations
CREATE TABLE IF NOT EXISTS public.locations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        NOT NULL,
  description   text,
  building      text,
  category      text,
  type          text,
  latitude      float8,
  longitude     float8,
  image_urls    text[]      DEFAULT '{}',
  floor         text,
  room_number   text,
  features      text[]      DEFAULT '{}',
  opening_hours jsonb       DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 2.4  Notifications / Announcements
CREATE TABLE IF NOT EXISTS public.notifications (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  message         text,
  body            text,
  subject         text,
  category        text        DEFAULT 'General',
  type            text,
  audience        text        DEFAULT 'everyone'
                              CHECK (audience IN ('everyone','staff','direct')),
  recipient_ids   uuid[]      DEFAULT '{}',
  posted_by       uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  posted_by_name  text,
  is_pinned       boolean     DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 2.5  Notification reads  (per-user read receipts)
CREATE TABLE IF NOT EXISTS public.notification_reads (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id uuid        NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  read_at         timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  UNIQUE(user_id, notification_id)
);

-- 2.6  Events
CREATE TABLE IF NOT EXISTS public.events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  name            text,
  description     text,
  location        text,
  category        text,
  start_date      timestamptz,
  end_date        timestamptz,
  date            timestamptz,
  image_url       text,
  organizer       text,
  attendee_count  integer     DEFAULT 0,
  is_featured     boolean     DEFAULT false,
  created_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 2.7  Event interests  (user bookmarks / RSVPs)
CREATE TABLE IF NOT EXISTS public.event_interests (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id    uuid        NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, event_id)
);

-- 2.8  Dining
CREATE TABLE IF NOT EXISTS public.dining (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  description     text,
  category        text,
  menu_items      jsonb       DEFAULT '[]',
  operating_hours text,
  location        text,
  image_url       text,
  is_available    boolean     DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 2.9  Campus rules
CREATE TABLE IF NOT EXISTS public.campus_rules (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text        NOT NULL,
  description text,
  category    text,
  severity    text        DEFAULT 'info'
                          CHECK (severity IN ('info','warning','critical')),
  is_active   boolean     DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 2.10 Favourites
CREATE TABLE IF NOT EXISTS public.favourites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id uuid        NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(user_id, location_id)
);

-- 2.11 Issue reports
CREATE TABLE IF NOT EXISTS public.reports (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  description     text,
  category        text        DEFAULT 'General',
  status          text        DEFAULT 'open'
                              CHECK (status IN ('open','in_progress','resolved','dismissed')),
  priority        text        DEFAULT 'medium'
                              CHECK (priority IN ('low','medium','high','critical')),
  reporter_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  reporter_name   text,
  reporter_email  text,
  reporter_role   text,
  photo_urls      text[]      DEFAULT '{}',
  photo_uris      text[]      DEFAULT '{}',
  photo_count     integer     DEFAULT 0,
  admin_response  text,
  admin_read_at   timestamptz,
  admin_read_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 2.12 Amenities
CREATE TABLE IF NOT EXISTS public.amenities (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  description     text,
  category        text,
  type            text,
  icon_name       text,
  latitude        float8,
  longitude       float8,
  operating_hours text,
  image_url       text,
  is_available    boolean     DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 2.13 Departments
CREATE TABLE IF NOT EXISTS public.departments (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text        NOT NULL,
  description         text,
  category            text        DEFAULT 'Academic',
  availability_status text        DEFAULT 'Open'
                                  CHECK (availability_status IN ('Open','Closed','Busy','Available','In Meeting')),
  operating_hours     text,
  image_url           text,
  head_of_department  text,
  contact_email       text,
  contact_phone       text,
  location            text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now()
);


-- ---------------------------------------------------------------------------
-- 3. updated_at triggers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE TRIGGER users_updated_at         BEFORE UPDATE ON public.users         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER buildings_updated_at     BEFORE UPDATE ON public.buildings     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER locations_updated_at     BEFORE UPDATE ON public.locations     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER events_updated_at        BEFORE UPDATE ON public.events        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER dining_updated_at        BEFORE UPDATE ON public.dining        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER campus_rules_updated_at  BEFORE UPDATE ON public.campus_rules  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER reports_updated_at       BEFORE UPDATE ON public.reports       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER amenities_updated_at     BEFORE UPDATE ON public.amenities     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE OR REPLACE TRIGGER departments_updated_at   BEFORE UPDATE ON public.departments   FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ---------------------------------------------------------------------------
-- 4. Role-check helpers  (defined AFTER public.users exists)
-- ---------------------------------------------------------------------------

-- Returns true when the calling user has role = 'admin'
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Returns true when the calling user has role in ('admin','faculty')
CREATE OR REPLACE FUNCTION is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'faculty')
  );
$$;

-- Returns the role string for any user id
CREATE OR REPLACE FUNCTION get_user_role(p_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.users WHERE id = p_user_id;
$$;


-- ---------------------------------------------------------------------------
-- 5. Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_role             ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_email            ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_locations_category     ON public.locations(category);
CREATE INDEX IF NOT EXISTS idx_locations_building     ON public.locations(building);
CREATE INDEX IF NOT EXISTS idx_notifications_audience ON public.notifications(audience);
CREATE INDEX IF NOT EXISTS idx_notifications_created  ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_start_date      ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_reports_status         ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter       ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_favourites_user        ON public.favourites(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_reads_user       ON public.notification_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_event_interests_user   ON public.event_interests(user_id);
CREATE INDEX IF NOT EXISTS idx_departments_status     ON public.departments(availability_status);


-- ---------------------------------------------------------------------------
-- 6. Row Level Security  (RLS)
-- ---------------------------------------------------------------------------
ALTER TABLE public.users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_interests    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dining             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campus_rules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favourites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.amenities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments        ENABLE ROW LEVEL SECURITY;

-- users
CREATE POLICY "users_select"       ON public.users FOR SELECT  USING (auth.uid() = id OR is_admin());
CREATE POLICY "users_insert"       ON public.users FOR INSERT  WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update"       ON public.users FOR UPDATE  USING (auth.uid() = id OR is_admin());
CREATE POLICY "users_delete"       ON public.users FOR DELETE  USING (is_admin());

-- buildings
CREATE POLICY "buildings_select"   ON public.buildings FOR SELECT  USING (auth.role() = 'authenticated');
CREATE POLICY "buildings_insert"   ON public.buildings FOR INSERT  WITH CHECK (is_admin());
CREATE POLICY "buildings_update"   ON public.buildings FOR UPDATE  USING (is_admin());
CREATE POLICY "buildings_delete"   ON public.buildings FOR DELETE  USING (is_admin());

-- locations
CREATE POLICY "locs_select"        ON public.locations FOR SELECT  USING (auth.role() = 'authenticated');
CREATE POLICY "locs_insert"        ON public.locations FOR INSERT  WITH CHECK (is_admin());
CREATE POLICY "locs_update"        ON public.locations FOR UPDATE  USING (is_admin());
CREATE POLICY "locs_delete"        ON public.locations FOR DELETE  USING (is_admin());

-- notifications
CREATE POLICY "notif_select"       ON public.notifications FOR SELECT  USING (auth.role() = 'authenticated');
CREATE POLICY "notif_insert"       ON public.notifications FOR INSERT  WITH CHECK (is_staff());
CREATE POLICY "notif_update"       ON public.notifications FOR UPDATE  USING (is_staff());
CREATE POLICY "notif_delete"       ON public.notifications FOR DELETE  USING (is_admin());

-- notification_reads
CREATE POLICY "nr_select"          ON public.notification_reads FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "nr_insert"          ON public.notification_reads FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "nr_update"          ON public.notification_reads FOR UPDATE  USING (auth.uid() = user_id);
CREATE POLICY "nr_delete"          ON public.notification_reads FOR DELETE  USING (auth.uid() = user_id);

-- events
CREATE POLICY "events_select"      ON public.events FOR SELECT  USING (auth.role() = 'authenticated');
CREATE POLICY "events_insert"      ON public.events FOR INSERT  WITH CHECK (is_staff());
CREATE POLICY "events_update"      ON public.events FOR UPDATE  USING (is_staff());
CREATE POLICY "events_delete"      ON public.events FOR DELETE  USING (is_admin());

-- event_interests
CREATE POLICY "ei_select"          ON public.event_interests FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "ei_insert"          ON public.event_interests FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "ei_delete"          ON public.event_interests FOR DELETE  USING (auth.uid() = user_id);

-- dining
CREATE POLICY "dining_select"      ON public.dining FOR SELECT  USING (auth.role() = 'authenticated');
CREATE POLICY "dining_insert"      ON public.dining FOR INSERT  WITH CHECK (is_admin());
CREATE POLICY "dining_update"      ON public.dining FOR UPDATE  USING (is_admin());
CREATE POLICY "dining_delete"      ON public.dining FOR DELETE  USING (is_admin());

-- campus_rules
CREATE POLICY "rules_select"       ON public.campus_rules FOR SELECT  USING (auth.role() = 'authenticated');
CREATE POLICY "rules_insert"       ON public.campus_rules FOR INSERT  WITH CHECK (is_admin());
CREATE POLICY "rules_update"       ON public.campus_rules FOR UPDATE  USING (is_admin());
CREATE POLICY "rules_delete"       ON public.campus_rules FOR DELETE  USING (is_admin());

-- favourites
CREATE POLICY "fav_select"         ON public.favourites FOR SELECT  USING (auth.uid() = user_id);
CREATE POLICY "fav_insert"         ON public.favourites FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fav_delete"         ON public.favourites FOR DELETE  USING (auth.uid() = user_id);

-- reports
CREATE POLICY "rep_select_own"     ON public.reports FOR SELECT  USING (auth.uid() = reporter_id);
CREATE POLICY "rep_select_staff"   ON public.reports FOR SELECT  USING (is_staff());
CREATE POLICY "rep_insert"         ON public.reports FOR INSERT  WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "rep_update"         ON public.reports FOR UPDATE  USING (is_staff());
CREATE POLICY "rep_delete"         ON public.reports FOR DELETE  USING (is_admin());

-- amenities
CREATE POLICY "amen_select"        ON public.amenities FOR SELECT  USING (auth.role() = 'authenticated');
CREATE POLICY "amen_insert"        ON public.amenities FOR INSERT  WITH CHECK (is_admin());
CREATE POLICY "amen_update"        ON public.amenities FOR UPDATE  USING (is_admin());
CREATE POLICY "amen_delete"        ON public.amenities FOR DELETE  USING (is_admin());

-- departments
CREATE POLICY "dept_select"        ON public.departments FOR SELECT  USING (auth.role() = 'authenticated');
CREATE POLICY "dept_insert"        ON public.departments FOR INSERT  WITH CHECK (is_staff());
CREATE POLICY "dept_update"        ON public.departments FOR UPDATE  USING (is_staff());
CREATE POLICY "dept_delete"        ON public.departments FOR DELETE  USING (is_admin());


-- ---------------------------------------------------------------------------
-- 7. Realtime  (enable for tables that need live updates)
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications      REPLICA IDENTITY FULL;
ALTER TABLE public.events             REPLICA IDENTITY FULL;
ALTER TABLE public.departments        REPLICA IDENTITY FULL;
ALTER TABLE public.reports            REPLICA IDENTITY FULL;
ALTER TABLE public.notification_reads REPLICA IDENTITY FULL;
ALTER TABLE public.locations          REPLICA IDENTITY FULL;
ALTER TABLE public.buildings          REPLICA IDENTITY FULL;
ALTER TABLE public.users              REPLICA IDENTITY FULL;
ALTER TABLE public.dining             REPLICA IDENTITY FULL;
ALTER TABLE public.amenities          REPLICA IDENTITY FULL;
ALTER TABLE public.favourites         REPLICA IDENTITY FULL;

DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE
  public.notifications,
  public.notification_reads,
  public.events,
  public.event_interests,
  public.departments,
  public.reports,
  public.locations,
  public.buildings,
  public.users,
  public.dining,
  public.amenities,
  public.favourites;


-- ---------------------------------------------------------------------------
-- 8. Storage buckets
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('locations',   'locations',   true,  10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('departments', 'departments', true,  10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('reports',     'reports',     false, 10485760, ARRAY['image/jpeg','image/png','image/webp']),
  ('profiles',    'profiles',    true,  5242880,  ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS  (storage.objects already has RLS enabled by Supabase)
CREATE POLICY "locations_public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'locations');
CREATE POLICY "locations_admin_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'locations' AND is_admin());
CREATE POLICY "locations_admin_delete" ON storage.objects FOR DELETE USING (bucket_id = 'locations' AND is_admin());

CREATE POLICY "depts_public_read"      ON storage.objects FOR SELECT USING (bucket_id = 'departments');
CREATE POLICY "depts_staff_insert"     ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'departments' AND is_staff());
CREATE POLICY "depts_staff_delete"     ON storage.objects FOR DELETE USING (bucket_id = 'departments' AND is_staff());

CREATE POLICY "profiles_public_read"   ON storage.objects FOR SELECT USING (bucket_id = 'profiles');
CREATE POLICY "profiles_own_insert"    ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'profiles' AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "reports_read"           ON storage.objects FOR SELECT USING (
  bucket_id = 'reports' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR is_staff()
  )
);
CREATE POLICY "reports_auth_insert"    ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'reports' AND auth.role() = 'authenticated'
);


-- ---------------------------------------------------------------------------
-- 9. Auth trigger  (auto-create user profile row on sign-up)
--    Defined AFTER public.users exists
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------------------
-- 10. Utility RPC functions  (callable from the app via supabase.rpc())
--     All defined AFTER public.users and the other tables exist
-- ---------------------------------------------------------------------------

-- Toggle favourite — returns true if added, false if removed
CREATE OR REPLACE FUNCTION public.toggle_favourite(p_location_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.favourites
    WHERE user_id = auth.uid() AND location_id = p_location_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.favourites
    WHERE user_id = auth.uid() AND location_id = p_location_id;
    RETURN false;
  ELSE
    INSERT INTO public.favourites (user_id, location_id)
    VALUES (auth.uid(), p_location_id);
    RETURN true;
  END IF;
END;
$$;

-- Mark a notification as read for the calling user
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notification_reads (user_id, notification_id, read_at)
  VALUES (auth.uid(), p_notification_id, now())
  ON CONFLICT (user_id, notification_id)
  DO UPDATE SET read_at = now();
END;
$$;

-- Toggle event interest — returns true if added, false if removed
CREATE OR REPLACE FUNCTION public.toggle_event_interest(p_event_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.event_interests
    WHERE user_id = auth.uid() AND event_id = p_event_id
  ) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.event_interests
    WHERE user_id = auth.uid() AND event_id = p_event_id;
    RETURN false;
  ELSE
    INSERT INTO public.event_interests (user_id, event_id)
    VALUES (auth.uid(), p_event_id);
    RETURN true;
  END IF;
END;
$$;

-- Update last_login_at for the calling user (called after every sign-in)
CREATE OR REPLACE FUNCTION public.touch_user_login()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.users
  SET last_login_at = now(), updated_at = now()
  WHERE id = auth.uid();
END;
$$;


-- ---------------------------------------------------------------------------
-- 11. Safety & Support  (table name: safety_and_support)
--     Previously referred to as emergency_contacts in the codebase.
--     Run this block if the table does not yet exist in your project.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.safety_and_support (
  id                       uuid        NOT NULL DEFAULT gen_random_uuid(),
  title                    text        NOT NULL,
  description              text,
  phone_number             text        NOT NULL,
  alternative_phone_number text,
  category                 text        DEFAULT 'Emergency'::text
                           CHECK (category = ANY (ARRAY[
                             'Emergency'::text, 'Medical'::text,
                             'Counseling'::text, 'Security'::text,
                             'Maintenance'::text
                           ])),
  is_available_24_7        boolean     DEFAULT true,
  operating_hours          text,
  icon_name                text        DEFAULT 'shield-alert'::text,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now(),
  CONSTRAINT safety_and_support_pkey PRIMARY KEY (id)
);

CREATE OR REPLACE TRIGGER safety_and_support_updated_at
  BEFORE UPDATE ON public.safety_and_support
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_safety_support_category ON public.safety_and_support(category);

ALTER TABLE public.safety_and_support ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_and_support REPLICA IDENTITY FULL;

CREATE POLICY "ss_select_auth"  ON public.safety_and_support FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "ss_insert_admin" ON public.safety_and_support FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "ss_update_admin" ON public.safety_and_support FOR UPDATE USING (is_admin());
CREATE POLICY "ss_delete_admin" ON public.safety_and_support FOR DELETE USING (is_admin());

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_and_support;


-- ---------------------------------------------------------------------------
-- END OF SCHEMA
-- ---------------------------------------------------------------------------
-- PATCH — Public read access for registration & guest dashboard
-- ---------------------------------------------------------------------------
-- Run this block if:
--   • The Department dropdown on the sign-up screen is empty (the page
--     loads before any auth session exists, so auth.role() = 'anon').
--   • The guest dashboard cards (Campus Rules, Dining, Emergency) show
--     no data even though rows exist in those tables.
--
-- Departments, campus rules, dining menus, and emergency contacts are
-- all public information — no auth is required to read them.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "dept_select"   ON public.departments;
DROP POLICY IF EXISTS "rules_select"  ON public.campus_rules;
DROP POLICY IF EXISTS "dining_select" ON public.dining;
DROP POLICY IF EXISTS "ss_select_auth" ON public.safety_and_support;

-- Allow anyone (including pre-login visitors) to read these tables
CREATE POLICY "dept_select"    ON public.departments      FOR SELECT USING (true);
CREATE POLICY "rules_select"   ON public.campus_rules     FOR SELECT USING (true);
CREATE POLICY "dining_select"  ON public.dining            FOR SELECT USING (true);
CREATE POLICY "ss_select_auth" ON public.safety_and_support FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- After running this SQL:
--   1. Authentication > Providers > enable "Anonymous" sign-in.
--   2. Fill in .env with your Project URL and anon key.
--   3. Run:  npm install
-- ---------------------------------------------------------------------------
