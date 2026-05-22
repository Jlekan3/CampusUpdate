-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.buildings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  image_url text,
  latitude double precision,
  longitude double precision,
  floors text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  category text,
  operating_hours text,
  CONSTRAINT buildings_pkey PRIMARY KEY (id)
);
CREATE TABLE public.campus_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text,
  severity text DEFAULT 'info'::text CHECK (severity = ANY (ARRAY['info'::text, 'warning'::text, 'critical'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT campus_rules_pkey PRIMARY KEY (id)
);
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text DEFAULT 'Academic'::text CHECK (category = ANY (ARRAY['Academic'::text, 'Administrative'::text, 'Student Services'::text, 'Facilities'::text])),
  availability_status text DEFAULT 'Open'::text CHECK (availability_status = ANY (ARRAY['Open'::text, 'Closed'::text, 'Busy'::text, 'Available'::text, 'In Meeting'::text])),
  operating_hours text,
  image_url text,
  head_of_department text,
  contact_email text,
  contact_phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  latitude double precision,
  longitude double precision,
  CONSTRAINT departments_pkey PRIMARY KEY (id)
);
CREATE TABLE public.dining (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  operating_hours text,
  image_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  latitude double precision,
  longitude double precision,
  CONSTRAINT dining_pkey PRIMARY KEY (id)
);
CREATE TABLE public.event_interests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT event_interests_pkey PRIMARY KEY (id),
  CONSTRAINT event_interests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT event_interests_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id)
);
CREATE TABLE public.events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  location text,
  category text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  image_url text,
  organizer text,
  attendee_count integer DEFAULT 0,
  is_featured boolean DEFAULT false,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT events_pkey PRIMARY KEY (id),
  CONSTRAINT events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);
CREATE TABLE public.favourites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  location_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT favourites_pkey PRIMARY KEY (id),
  CONSTRAINT favourites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT favourites_location_id_fkey FOREIGN KEY (location_id) REFERENCES public.locations(id)
);
CREATE TABLE public.locations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text CHECK (type = ANY (ARRAY['Male'::text, 'Female'::text, 'Mixed'::text, 'International'::text, 'Main Gate'::text, 'Pedestrian Gate'::text, 'Service Entrance'::text, 'Emergency Exit'::text, 'ATM'::text, 'Parking Lot'::text, 'Bus Stop'::text, 'Sport Ground'::text, 'Open Spaces'::text])),
  latitude double precision,
  longitude double precision,
  image_urls ARRAY DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  category text CHECK (category = ANY (ARRAY['Hostel'::text, 'Gate'::text, 'Others'::text])),
  CONSTRAINT locations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.notification_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_id uuid NOT NULL,
  read_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notification_reads_pkey PRIMARY KEY (id),
  CONSTRAINT notification_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT notification_reads_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.notifications(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text,
  body text,
  subject text,
  category text DEFAULT 'General'::text,
  type text,
  audience text DEFAULT 'everyone'::text CHECK (audience = ANY (ARRAY['everyone'::text, 'staff'::text, 'direct'::text])),
  recipient_ids ARRAY DEFAULT '{}'::uuid[],
  posted_by uuid,
  posted_by_name text,
  is_pinned boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  emergency_location text,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES auth.users(id)
);
CREATE TABLE public.reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text DEFAULT 'General'::text,
  status text DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'in_progress'::text, 'resolved'::text, 'dismissed'::text])),
  priority text DEFAULT 'medium'::text CHECK (priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text])),
  reporter_id uuid,
  reporter_name text,
  reporter_email text,
  reporter_role text,
  photo_urls ARRAY DEFAULT '{}'::text[],
  photo_uris ARRAY DEFAULT '{}'::text[],
  photo_count integer DEFAULT 0,
  admin_response text,
  admin_read_at timestamp with time zone,
  admin_read_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES auth.users(id),
  CONSTRAINT reports_admin_read_by_fkey FOREIGN KEY (admin_read_by) REFERENCES auth.users(id)
);
CREATE TABLE public.safety_and_support (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  phone_number text NOT NULL,
  alternative_phone_number text,
  category text DEFAULT 'Emergency'::text CHECK (category = ANY (ARRAY['Emergency'::text, 'Medical'::text, 'Counseling'::text, 'Security'::text, 'Maintenance'::text])),
  is_available_24_7 boolean DEFAULT true,
  operating_hours text,
  icon_name text DEFAULT 'shield-alert'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT safety_and_support_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL,
  email text,
  full_name text,
  display_name text,
  role text NOT NULL DEFAULT 'student'::text CHECK (role = ANY (ARRAY['admin'::text, 'faculty'::text, 'student'::text, 'guest'::text])),
  department text,
  programme text,
  student_id text,
  staff_id text,
  position text,
  phone text,
  avatar_url text,
  index_number text,
  is_anonymous boolean DEFAULT false,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);