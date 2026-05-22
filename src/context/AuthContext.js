import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../config/supabase';
import { ENABLE_DEV_ADMIN_EMAIL_OVERRIDE, FORCE_REQUIRE_LOGIN } from '../utils/constants';

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

// ─── Role helpers ─────────────────────────────────────────────────────────────

const ADMIN_EMAILS = [
  'jlekanjarteh@rmu.edu.gh',
];

const isKnownAdminEmail = (email) =>
  ADMIN_EMAILS.some((a) => a.toLowerCase() === (email || '').trim().toLowerCase());

const normalizeRole = (raw) => {
  const r = (raw || '').toString().trim().toLowerCase().replace(/[\s_-]/g, '');
  if (['admin','administrator','superadmin','owner'].includes(r)) return 'admin';
  if (['faculty','staff','lecturer','instructor'].includes(r))    return 'faculty';
  if (['student','learner','user','member'].includes(r))          return 'student';
  if (r === 'guest')                                              return 'guest';
  return null;
};

const DEFAULT_ROLE = 'student';

// ─── Resolve role for a signed-in Supabase user ──────────────────────────────

const resolveRole = async (authUser) => {
  if (!authUser) return 'guest';

  // 0. Anonymous sign-in MUST be caught first — before any DB lookup.
  //    The handle_new_user trigger inserts an anonymous user into public.users
  //    with role='student' (no metadata), so the DB query below would
  //    incorrectly return 'student' if we don't short-circuit here.
  if (authUser.is_anonymous) return 'guest';

  // 1. Known admin email override
  if (isKnownAdminEmail(authUser.email)) return 'admin';

  // 2. Dev email-part inference (controlled by flag)
  if (ENABLE_DEV_ADMIN_EMAIL_OVERRIDE) {
    const local = (authUser.email || '').split('@')[0].toLowerCase();
    if (/^admin([._-]|$)/.test(local)) return 'admin';
  }

  // 3. user_metadata set at sign-up / by admin
  const metaRole = normalizeRole(
    authUser.user_metadata?.role ||
    authUser.user_metadata?.userRole ||
    authUser.app_metadata?.role
  );
  if (metaRole) return metaRole;

  // 4. users table (source of truth for registered users)
  try {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', authUser.id)
      .single();

    if (profile?.role) {
      const r = normalizeRole(profile.role);
      if (r) return r;
    }
  } catch (_) {}

  return DEFAULT_ROLE;
};

// ─── Touch last-login timestamp ───────────────────────────────────────────────

const touchUserProfile = async (authUser) => {
  if (!authUser?.id) return;
  try {
    await supabase.rpc('touch_user_login');
  } catch (_) {}
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }) => {
  const [user,              setUser]              = useState(null);
  const [role,              setRole]              = useState('guest');
  const [authLoading,       setAuthLoading]       = useState(true);
  const [actionLoading,     setActionLoading]     = useState(false);
  const [localMustChangePw, setLocalMustChangePw] = useState(null);

  const isExplicitLoginInFlight = useRef(false);
  const didStartupAuthReset     = useRef(false);
  const suppressOtpRouting      = useRef(false);

  // ── Core auth state listener ────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuthLoading(true);

        if (!session?.user) {
          suppressOtpRouting.current = false;
          setUser(null);
          setRole('guest');
          setActionLoading(false);
          setAuthLoading(false);
          return;
        }

        // OTP verification fires SIGNED_IN — suppress routing so the success
        // modal stays visible until logout() clears the session after 3 s.
        if (suppressOtpRouting.current) {
          setActionLoading(false);
          setAuthLoading(false);
          return;
        }

        const authUser = session.user;

        // FORCE_REQUIRE_LOGIN: clear any auto-restored session on first cold start
        if (
          FORCE_REQUIRE_LOGIN &&
          !didStartupAuthReset.current &&
          !isExplicitLoginInFlight.current
        ) {
          didStartupAuthReset.current = true;
          await supabase.auth.signOut();
          setUser(null);
          setRole('guest');
          setActionLoading(false);
          setAuthLoading(false);
          return;
        }

        if (!didStartupAuthReset.current) didStartupAuthReset.current = true;

        // Reset local override so the DB metadata is the source of truth for
        // each new session (important: a returning user who already changed their
        // password will have must_change_password=false in the DB).
        setLocalMustChangePw(null);

        // Resolve role then commit state atomically
        const resolvedRole = await resolveRole(authUser);
        setUser(authUser);
        setRole(resolvedRole);

        await touchUserProfile(authUser);

        isExplicitLoginInFlight.current = false;
        setActionLoading(false);
        setAuthLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ── login ───────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    isExplicitLoginInFlight.current = true;
    setActionLoading(true);
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        isExplicitLoginInFlight.current = false;
        setActionLoading(false);
        setAuthLoading(false);
        throw error;
      }
      // onAuthStateChange handles the rest
    } catch (err) {
      isExplicitLoginInFlight.current = false;
      setActionLoading(false);
      setAuthLoading(false);
      throw err;
    }
  };

  // ── logout ──────────────────────────────────────────────────────────────────
  const logout = async () => {
    suppressOtpRouting.current = false;
    setActionLoading(true);
    setAuthLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setRole('guest');
    } catch (_) {
      setUser(null);
      setRole('guest');
    } finally {
      setActionLoading(false);
      setAuthLoading(false);
    }
  };

  // ── register ────────────────────────────────────────────────────────────────
  const register = async ({ fullName, displayName, email, password, studentId, indexNumber, programme, department, phone, avatarUrl }) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name:     fullName,
            display_name:  displayName?.trim() || fullName,
            role:          'student',
            student_id:    studentId,
            index_number:  indexNumber,
            programme,
            department:    department || null,
            phone:         phone     || null,
            avatar_url:    avatarUrl || null,
          },
        },
      });
      if (error) throw error;
    } finally {
      setActionLoading(false);
    }
  };

  // ── forgotPassword ──────────────────────────────────────────────────────────
  // 1. Checks the email exists in public.users via a SECURITY DEFINER RPC
  //    (so anon users can call it without hitting the users RLS).
  // 2. Sends a 6-digit OTP via signInWithOtp so the app can verify inline.
  const forgotPassword = async (email) => {
    // Step 1: email-existence check
    const { data: exists, error: checkErr } = await supabase.rpc('check_email_exists', { p_email: email.toLowerCase().trim() });
    if (checkErr) throw checkErr;
    if (!exists) throw new Error('No account found with that email address. Please check and try again.');

    // Step 2: send recovery OTP via resetPasswordForEmail so the token type
    // matches 'recovery' in verifyOtp (signInWithOtp would generate 'email' type)
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.toLowerCase().trim(),
    );
    if (error) throw error;
  };

  // ── verifyOtp ───────────────────────────────────────────────────────────────
  // Verifies the 6-digit code from the email. On success, Supabase creates a
  // session so the user can immediately call resetPassword().
  const verifyOtp = async (email, token, type) => {
    if (type !== 'recovery') suppressOtpRouting.current = true;

    const normalizedEmail = email.toLowerCase().trim();

    // For recovery flow use 'recovery' type directly.
    if (type === 'recovery') {
      const { data, error } = await supabase.auth.verifyOtp({
        email: normalizedEmail, token, type: 'recovery',
      });
      if (error) throw error;
      return data;
    }

    // For signup: try 'signup' first (initial registration OTP).
    // If that fails, try 'email' — this handles the case where the user
    // tapped Resend, which calls signInWithOtp() and generates an 'email'
    // type token instead of a 'signup' token.
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalizedEmail, token, type: 'signup',
    });
    if (!error) return data;

    const { data: data2, error: error2 } = await supabase.auth.verifyOtp({
      email: normalizedEmail, token, type: 'email',
    });
    if (!error2) return data2;

    suppressOtpRouting.current = false;
    throw error; // throw original error for clearest message
  };

  // ── resendOtp ───────────────────────────────────────────────────────────────
  // Both signup and recovery resend use signInWithOtp — it reliably
  // triggers the same SMTP path (Brevo) that delivered the original code.
  // supabase.auth.resend({ type:'signup' }) can fail silently in some
  // project configurations, so we avoid it here.
  const resendOtp = async (email, type) => {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.toLowerCase().trim(),
      options: { shouldCreateUser: false },
    });
    if (error) throw error;
  };

  // ── resetPassword ───────────────────────────────────────────────────────────
  const resetPassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  // ── enterGuestMode — anonymous sign-in → routes to GuestNavigator ──────────
  const enterGuestMode = async () => {
    setActionLoading(true);
    setAuthLoading(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      // onAuthStateChange fires → resolveRole returns 'guest' because
      // authUser.is_anonymous is true → RootNavigator shows GuestNavigator
    } catch (err) {
      setActionLoading(false);
      setAuthLoading(false);
      Alert.alert(
        'Guest access unavailable',
        err?.message || 'Could not start a guest session. Please try again.',
      );
    }
  };

  // ── mustChangePassword — set by admin when creating accounts ─────────────────
  // localMustChangePw=false → immediately cleared (no waiting for onAuthStateChange)
  // localMustChangePw=null  → fall back to what the DB says
  const mustChangePassword =
    localMustChangePw === false
      ? false
      : user?.user_metadata?.must_change_password === true;

  const clearMustChangePassword = async () => {
    setLocalMustChangePw(false); // Clear instantly in local state
    try {
      await supabase.auth.updateUser({ data: { must_change_password: false } });
    } catch (err) {
      console.warn('[Auth] clearMustChangePassword failed:', err?.message);
    }
  };

  // ── userRole alias (backwards compat with old Firebase AuthContext) ─────────
  const userRole = role;

  return (
    <AuthContext.Provider value={{
      user,
      userRole,
      loading:       actionLoading,
      authLoading,
      mustChangePassword,
      clearMustChangePassword,
      login,
      logout,
      register,
      forgotPassword,
      verifyOtp,
      resendOtp,
      resetPassword,
      enterGuestMode,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
