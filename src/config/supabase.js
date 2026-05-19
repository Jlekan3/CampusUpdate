import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || supabaseUrl.includes('your-project-id')) {
  console.warn('⚠️  Supabase URL not configured. Update EXPO_PUBLIC_SUPABASE_URL in .env');
}

// persistSession: false — FORCE_REQUIRE_LOGIN is enabled in constants.js,
// so sessions should never survive a cold start. Skipping persistence
// removes the restore-then-signout round-trip that blocked startup.
export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    storage:            AsyncStorage,
    autoRefreshToken:   true,
    persistSession:     false,
    detectSessionInUrl: false,
  },
});
