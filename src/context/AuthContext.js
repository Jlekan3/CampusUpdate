import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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

  // 4. users table (source of truth)
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

  // 5. Anonymous session
  if (authUser.is_anonymous) return 'guest';

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
  const [user,          setUser]          = useState(null);
  const [role,          setRole]          = useState('guest');
  const [authLoading,   setAuthLoading]   = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isExplicitLoginInFlight = useRef(false);
  const didStartupAuthReset     = useRef(false);

  // ── Core auth state listener ────────────────────────────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setAuthLoading(true);

        if (!session?.user) {
          setUser(null);
          setRole('guest');
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
  const register = async ({ fullName, email, password, indexNumber, programme }) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'student',
            index_number: indexNumber,
            programme,
          },
        },
      });
      if (error) throw error;
    } finally {
      setActionLoading(false);
    }
  };

  // ── forgotPassword ──────────────────────────────────────────────────────────
  const forgotPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  // ── resetPassword ───────────────────────────────────────────────────────────
  const resetPassword = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  };

  // ── userRole alias (backwards compat with old Firebase AuthContext) ─────────
  const userRole = role;

  return (
    <AuthContext.Provider value={{
      user,
      userRole,
      loading:       actionLoading,
      authLoading,
      login,
      logout,
      register,
      forgotPassword,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
