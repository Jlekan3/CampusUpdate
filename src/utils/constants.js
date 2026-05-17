export const NAVY = '#0F172A';

export const COLORS = {
  // Strict navy & white only — use NAVY for all accents and white for surfaces
  primary: NAVY,
  secondary: NAVY,
  warning: NAVY,
  danger: NAVY,
  white: '#FFFFFF',
  light: '#FFFFFF',
  dark: NAVY,
  muted: NAVY,
  blue: {
    50: NAVY,
    100: NAVY,
    200: NAVY,
    300: NAVY,
    400: NAVY,
    500: NAVY,
    600: NAVY,
    700: NAVY,
    800: NAVY,
    900: NAVY,
  },
  cyan: {
    400: NAVY,
    500: NAVY,
    600: NAVY,
  }
};

export const EVENT_CATEGORIES = [
  'Academic',
  'Career',
  'Sports',
  'Social',
  'Workshop',
  'Cultural',
  'Health',
];

export const EVENT_CATEGORY_ICONS = {
  Academic: 'school-outline',
  Career: 'briefcase-outline',
  Sports: 'football-outline',
  Social: 'people-outline',
  Workshop: 'construct-outline',
  Cultural: 'film-outline',
  Health: 'heart-outline',
};

export const USER_ROLES = {
  ADMIN: 'admin',
  STUDENT: 'student',
  FACULTY: 'faculty',
  GUEST: 'guest',
};

// When true, forces sign-out on app start so users must actively log in.
// This avoids Android restoring a previous session and skipping the login screen.
export const FORCE_REQUIRE_LOGIN = true;

export const ENABLE_DEV_ADMIN_EMAIL_OVERRIDE = false;
