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

export const ADMIN_THEME = {
  primary: '#1A365D',
  accent: '#C5A047',
  background: '#F8F9FA',
  surface: '#FFFFFF',
  textDark: '#2D3748',
  textMuted: '#718096',
  border: '#E2E8F0',
  darkBackground: '#0D1117',
  darkSurface: '#161B22',
  darkBorder: '#30363D',
  darkText: '#E6EDF3',
  darkMuted: '#8B949E',
  success: '#38A169',
  danger: '#E53E3E',
  warning: '#D69E2E',
  info: '#3182CE',
  statusOpen: '#38A169',
  statusClosed: '#E53E3E',
  statusBusy: '#D69E2E',
  statusAvailable: '#319795',
  glassBackground: 'rgba(255,255,255,0.12)',
  glassBorder: 'rgba(255,255,255,0.25)',
  glassDark: 'rgba(0,0,0,0.25)',
};

/** RMU campus emergency & support contacts (Ghana). Update with official numbers. */
export const CAMPUS_EMERGENCY_CONTACTS = [
  {
    id: 'security',
    title: 'Campus Security',
    number: '+233302000000',
    icon: 'shield-checkmark-outline',
    description: '24/7 campus security desk',
    color: '#EF4444',
  },
  {
    id: 'health',
    title: 'Campus Clinic',
    number: '+233302000001',
    icon: 'medical-outline',
    description: 'Medical assistance on campus',
    color: '#F59E0B',
  },
  {
    id: 'counseling',
    title: 'Student Affairs',
    number: '+233302000002',
    icon: 'chatbubble-outline',
    description: 'Counselling and student support',
    color: '#8B5CF6',
  },
  {
    id: 'national',
    title: 'National Emergency',
    number: '112',
    icon: 'alert-circle-outline',
    description: 'Ghana national emergency line',
    color: '#DC2626',
  },
];
