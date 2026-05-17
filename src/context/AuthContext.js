import React, { createContext, useEffect, useState, useContext, useRef } from 'react';
import { Alert } from 'react-native';
import { getIdTokenResult, onAuthStateChanged, signOut, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { ENABLE_DEV_ADMIN_EMAIL_OVERRIDE, FORCE_REQUIRE_LOGIN } from '../utils/constants';

export const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

const normalizeRole = (input) => {
  if (Array.isArray(input)) {
    if (input.some((value) => normalizeRole(value) === 'admin')) return 'admin';
    if (input.some((value) => normalizeRole(value) === 'faculty')) return 'faculty';
    if (input.some((value) => normalizeRole(value) === 'student')) return 'student';
    if (input.some((value) => normalizeRole(value) === 'guest')) return 'guest';
    return 'guest';
  }

  const rawRole = (input || 'guest').toString().trim().toLowerCase();
  const compactRole = rawRole.replace(/[\s_-]/g, '');

  if (['admin', 'admins', 'administrator', 'superadmin', 'systemadmin', 'owner', 'amin'].includes(compactRole)) return 'admin';
  if (['faculty', 'staff', 'lecturer', 'instructor'].includes(compactRole)) return 'faculty';
  if (['student', 'students', 'learner', 'user', 'member'].includes(compactRole)) return 'student';
  if (compactRole === 'guest') return 'guest';

  if (['admin', 'student', 'faculty', 'guest'].includes(rawRole)) return rawRole;
  return 'guest';
};

const ROLE_FIELD_KEYS = new Set([
  'role',
  'userrole',
  'usertype',
  'user_type',
  'personrole',
  'accountrole',
  'accounttype',
  'type',
  'accesslevel',
  'access_level',
]);

const ADMIN_BOOLEAN_KEYS = new Set([
  'admin',
  'isadmin',
  'is_admin',
  'superadmin',
  'super_admin',
]);

const PERMISSION_KEYS = new Set(['roles', 'permissions', 'scopes', 'claims']);

const extractRoleDeep = (value, seen = new WeakSet()) => {
  if (value == null) return undefined;

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = extractRoleDeep(item, seen);
      const normalized = normalizeRole(nested);
      if (normalized === 'admin') return 'admin';
      if (normalized !== 'guest') return normalized;

      const asString = (item || '').toString().trim().toLowerCase();
      if (
        ['admin', 'administrator', 'superadmin', 'owner'].includes(asString) ||
        asString.startsWith('manage_') ||
        asString.includes('admin')
      ) {
        return 'admin';
      }
    }
    return undefined;
  }

  if (typeof value !== 'object') {
    return value;
  }

  if (seen.has(value)) return undefined;
  seen.add(value);

  for (const [rawKey, rawVal] of Object.entries(value)) {
    const key = rawKey.toLowerCase();

    if (ADMIN_BOOLEAN_KEYS.has(key) && rawVal === true) {
      return 'admin';
    }

    if (ROLE_FIELD_KEYS.has(key)) {
      const normalized = normalizeRole(rawVal);
      if (normalized !== 'guest') return normalized;
    }

    if (PERMISSION_KEYS.has(key)) {
      const nestedPermissionRole = extractRoleDeep(rawVal, seen);
      const normalized = normalizeRole(nestedPermissionRole);
      if (normalized === 'admin') return 'admin';
      if (normalized !== 'guest') return normalized;

      if (Array.isArray(rawVal)) {
        const hasAdminLikePermission = rawVal.some((permission) => {
          const text = (permission || '').toString().trim().toLowerCase();
          return text.includes('admin') || text.startsWith('manage_');
        });
        if (hasAdminLikePermission) return 'admin';
      }
    }

    if (rawVal && typeof rawVal === 'object') {
      const nested = extractRoleDeep(rawVal, seen);
      const normalized = normalizeRole(nested);
      if (normalized === 'admin') return 'admin';
      if (normalized !== 'guest') return normalized;
    }
  }

  return undefined;
};

const extractRoleFromProfile = (data) => {
  if (!data || typeof data !== 'object') return undefined;

  const deepRole = extractRoleDeep(data);
  const normalizedDeepRole = normalizeRole(deepRole);
  if (normalizedDeepRole !== 'guest') return normalizedDeepRole;

  if (
    data.isAdmin === true ||
    data.admin === true ||
    data.is_admin === true ||
    data.superAdmin === true ||
    data.super_admin === true
  ) {
    return 'admin';
  }

  if (Array.isArray(data.roles) && data.roles.length > 0) {
    return data.roles;
  }

  if (typeof data.roles === 'string' && data.roles.trim()) {
    return data.roles;
  }

  return (
    data.role ??
    data.accountRole ??
    data.accessLevel ??
    data.access_level ??
    data.userRole ??
    data.type ??
    data.userType ??
    data.user_type ??
    data.personRole ??
    data.accountType
  );
};

const USERS_COLLECTION = 'users';
const DEFAULT_AUTH_ROLE = 'student';

const touchUserProfile = async (authUser) => {
  if (!authUser?.uid) return;

  try {
    await setDoc(
      doc(db, USERS_COLLECTION, authUser.uid),
      {
        uid: authUser.uid,
        email: authUser.email || '',
        lastLoginAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.log('AuthProvider: could not update last login timestamp', e);
  }
};

const rolePriority = (role) => {
  switch (role) {
    case 'admin':
      return 4;
    case 'faculty':
      return 3;
    case 'student':
      return 2;
    case 'guest':
    default:
      return 1;
  }
};

// Add known admin emails here for guaranteed admin access
// This overrides any Firestore profile role
const ADMIN_EMAILS = [
  'jlekanjarteh@rmu.edu.gh',  // Admin account
];

const isKnownAdminEmail = (email) => {
  const normalizedEmail = (email || '').trim().toLowerCase();
  return ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === normalizedEmail);
};

const inferRoleFromEmail = (email) => {
  const rawEmail = (email || '').trim().toLowerCase();
  if (!rawEmail.includes('@')) return undefined;

  // Always honor known admin emails.
  if (isKnownAdminEmail(rawEmail)) {
    return 'admin';
  }

  // Broader local-part admin inference is controlled by the dev override flag.
  if (!ENABLE_DEV_ADMIN_EMAIL_OVERRIDE) return undefined;

  const [localPart] = rawEmail.split('@');
  if (!localPart) return undefined;

  if (/^admin([._-]|$)/.test(localPart) || /(^|[._-])admin($|[._-])/.test(localPart)) {
    return 'admin';
  }

  return undefined;
};

const resolveRoleFromClaims = async (authUser) => {
  try {
    const token = await getIdTokenResult(authUser, false);
    const claims = token?.claims || {};

    if (claims.admin === true || claims.isAdmin === true) return 'admin';

    const claimRole =
      claims.role ??
      claims.userRole ??
      claims.type ??
      claims.userType;

    const normalized = normalizeRole(claimRole);
    return normalized === 'guest' ? undefined : normalized;
  } catch (e) {
    console.log('AuthProvider: could not read token claims', e);
    return undefined;
  }
};

const findProfileByUidOrEmail = async (authUser) => {
  const usersRef = collection(db, USERS_COLLECTION);
  const candidates = [];

  const addCandidate = (profile, source, sourceDocId) => {
    const safeProfile = profile || {};
    const extractedRole = extractRoleFromProfile(safeProfile);
    const normalizedRole = normalizeRole(extractedRole);
    candidates.push({
      profile: safeProfile,
      source,
      sourceDocId,
      normalizedRole,
      extractedRole,
      priority: rolePriority(normalizedRole),
    });
  };

  const canonicalRef = doc(db, USERS_COLLECTION, authUser.uid);
  try {
    const canonicalSnap = await getDoc(canonicalRef);
    if (canonicalSnap.exists()) {
      addCandidate(canonicalSnap.data(), 'users/{uid}', canonicalRef.id);
    }
  } catch (e) {
    console.log('AuthProvider: canonical profile read skipped', e);
  }

  try {
    const uidQuery = query(usersRef, where('uid', '==', authUser.uid), limit(5));
    const uidResult = await getDocs(uidQuery);
    uidResult.docs.forEach((foundDoc) => {
      addCandidate(foundDoc.data(), 'users(uid field)', foundDoc.id);
    });
  } catch (e) {
    console.log('AuthProvider: uid query skipped', e);
  }

  const email = (authUser.email || '').trim();
  if (email) {
    const emailCandidates = Array.from(new Set([email, email.toLowerCase()]));
    for (const candidate of emailCandidates) {
      try {
        const emailQuery = query(usersRef, where('email', '==', candidate), limit(5));
        const emailResult = await getDocs(emailQuery);
        emailResult.docs.forEach((foundDoc) => {
          addCandidate(foundDoc.data(), 'users(email field)', foundDoc.id);
        });
      } catch (e) {
        console.log('AuthProvider: email query skipped', e);
      }
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    if (a.sourceDocId === authUser.uid && b.sourceDocId !== authUser.uid) return -1;
    if (b.sourceDocId === authUser.uid && a.sourceDocId !== authUser.uid) return 1;
    return 0;
  });

  const best = candidates[0];

  console.log('AuthProvider: profile candidates evaluated', {
    total: candidates.length,
    pickedSource: best.source,
    pickedDocId: best.sourceDocId,
    pickedRole: best.normalizedRole,
  });

  return {
    profile: best.profile,
    source: best.source,
    sourceDocId: best.sourceDocId,
  };
};

const resolveRoleForAuthenticatedUser = async (authUser) => {
  if (authUser?.isAnonymous) {
    let foundProfile = false;

    try {
      const anonRef = doc(db, USERS_COLLECTION, authUser.uid);
      const anonSnap = await getDoc(anonRef);
      foundProfile = anonSnap.exists();

      if (!foundProfile) {
        await setDoc(
          anonRef,
          {
            uid: authUser.uid,
            role: 'guest',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
            isAnonymous: true,
          },
          { merge: true }
        );
      }
    } catch (e) {
      console.log('AuthProvider: could not initialize anonymous profile', e);
    }

    return { role: 'guest', foundProfile, source: 'anonymous' };
  }

  const claimRole = await resolveRoleFromClaims(authUser);
  const inferredRole = inferRoleFromEmail(authUser.email);
  const found = await findProfileByUidOrEmail(authUser);

  console.log('resolveRoleForAuthenticatedUser: resolving role for user', {
    uid: authUser.uid,
    email: authUser.email,
    claimRole,
    inferredRole,
    isAdminEmail: isKnownAdminEmail(authUser.email),
    foundProfile: !!found,
    profileRole: found ? extractRoleFromProfile(found.profile) : undefined,
  });

  // PRIORITY: admin from any source wins
  // 1. Token claims saying admin
  if (claimRole === 'admin') {
    console.log('resolveRoleForAuthenticatedUser: admin from token claims');
    return { role: 'admin', foundProfile: !!found, source: 'token-claims (admin)' };
  }

  // 2. Email inference saying admin
  if (inferredRole === 'admin') {
    console.log('resolveRoleForAuthenticatedUser: admin from email inference');
    // Also update their profile to admin
    try {
      await setDoc(
        doc(db, USERS_COLLECTION, authUser.uid),
        {
          uid: authUser.uid,
          role: 'admin',
          email: authUser.email || '',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.log('AuthProvider: could not update admin role', e);
    }
    return { role: 'admin', foundProfile: !!found, source: 'email-inference (admin)' };
  }

  if (!found) {
    const fallbackRole = claimRole || inferredRole || DEFAULT_AUTH_ROLE;
    try {
      await setDoc(
        doc(db, USERS_COLLECTION, authUser.uid),
        {
          uid: authUser.uid,
          role: fallbackRole,
          email: authUser.email || '',
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.log('AuthProvider: could not create user profile doc', e);
    }
    return {
      role: fallbackRole,
      foundProfile: false,
      source: claimRole ? 'token-claims' : (inferredRole ? 'email-inference' : 'default'),
    };
  }

  const extractedRole = extractRoleFromProfile(found.profile);
  const profileRole = normalizeRole(extractedRole);
  
  console.log('resolveRoleForAuthenticatedUser: profile role extraction', {
    extractedRole,
    profileRole,
  });

  // 3. Profile says admin
  if (profileRole === 'admin') {
    console.log('resolveRoleForAuthenticatedUser: admin from profile');
    return { role: 'admin', foundProfile: true, extractedRole, source: found.source + ' (admin)' };
  }

  // 4. Use claimRole if available and not guest
  if (claimRole && claimRole !== 'guest') {
    return { role: claimRole, foundProfile: true, extractedRole, source: 'token-claims' };
  }

  // 5. Use profile role
  const normalizedRole = profileRole;

  if (found.sourceDocId !== authUser.uid) {
    try {
      await setDoc(
        doc(db, USERS_COLLECTION, authUser.uid),
        {
          uid: authUser.uid,
          role: normalizedRole,
          email: authUser.email || '',
          sourceProfileId: found.sourceDocId,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e) {
      console.log('AuthProvider: could not sync canonical user profile doc', e);
    }
  }

  return {
    role: normalizedRole,
    foundProfile: true,
    profileKeys: Object.keys(found.profile || {}),
    extractedRole,
    source: found.source,
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState('guest');
  // authLoading = blocks RootNavigator until we know auth + role
  const [authLoading, setAuthLoading] = useState(true);
  // actionLoading = used for UI (login/logout buttons)
  const [actionLoading, setActionLoading] = useState(false);
  // Tracks whether this auth callback came from a user-initiated login action.
  // We should not force sign-out in that case.
  const isExplicitLoginInFlight = useRef(false);
  const didStartupAuthReset = useRef(false);

  useEffect(() => {
    let isActive = true;
    let unsubscribe = () => {};

    const registerAuthListener = () => {
      console.log('AuthProvider: registering onAuthStateChanged listener');
      unsubscribe = onAuthStateChanged(auth, async (authUser) => {
        console.log('AuthProvider: onAuthStateChanged callback', { uid: authUser?.uid });
        setAuthLoading(true);

        // Force a fresh login for restored sessions, but never for a manual login.
        // This avoids missing-login race conditions when callback order is null -> user.
        if (FORCE_REQUIRE_LOGIN && authUser && !didStartupAuthReset.current && !isExplicitLoginInFlight.current) {
          didStartupAuthReset.current = true;
          try {
            await signOut(auth);
            console.log('AuthProvider: FORCE_REQUIRE_LOGIN enabled - restored session cleared');
          } catch (e) {
            console.log('AuthProvider: startup signOut skipped', e);
          }

          setUser(null);
          setRole('guest');
          setActionLoading(false);
          setAuthLoading(false);
          return;
        }

        if (authUser && !didStartupAuthReset.current) {
          didStartupAuthReset.current = true;
        }

        if (authUser) {
          try {
            const resolved = await resolveRoleForAuthenticatedUser(authUser);
            setUser(authUser);
            setRole(resolved.role);
            console.log('AuthProvider: user role resolved', {
              normalizedRole: resolved.role,
              foundProfile: resolved.foundProfile,
              profileKeys: resolved.profileKeys,
              extractedRole: resolved.extractedRole,
              source: resolved.source,
            });
          } catch (error) {
            console.log('AuthContext error:', error);
            setUser(authUser);
            const claimRole = await resolveRoleFromClaims(authUser);
            const inferredRole = inferRoleFromEmail(authUser?.email);
            setRole(claimRole || inferredRole || DEFAULT_AUTH_ROLE);
          } finally {
            await touchUserProfile(authUser);
          }
        } else {
          // No user logged in
          setUser(null);
          setRole('guest');
          console.log('AuthProvider: no authenticated user');
        }

        setActionLoading(false);
        setAuthLoading(false);
        console.log('AuthProvider: finished auth check', { authLoading: false });
      });
    };

    if (isActive) registerAuthListener();

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    isExplicitLoginInFlight.current = true;
    setActionLoading(true);
    setAuthLoading(true);
    console.log('Login: attempting login with email:', email);
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      const authUser = res.user;
      console.log('Login: Firebase authentication successful for UID:', authUser.uid);
      setUser(authUser);

      // Fetch role right away so RootNavigator can route immediately.
      try {
        const resolved = await resolveRoleForAuthenticatedUser(authUser);
        console.log('Login: role resolved successfully', {
          role: resolved.role,
          source: resolved.source,
          foundProfile: resolved.foundProfile,
        });
        setRole(resolved.role);
      } catch (e) {
        console.log('Login: error fetching user role, using claim/default fallback', e);
        const claimRole = await resolveRoleFromClaims(authUser);
        const inferredRole = inferRoleFromEmail(authUser?.email);
        const fallbackRole = claimRole || inferredRole || DEFAULT_AUTH_ROLE;
        console.log('Login: using fallback role', {
          claimRole,
          inferredRole,
          fallbackRole,
        });
        setRole(fallbackRole);
      }

      await touchUserProfile(authUser);
    } finally {
      isExplicitLoginInFlight.current = false;
      setActionLoading(false);
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    setActionLoading(true);
    setAuthLoading(true);
    try {
      // If an authenticated user exists, sign out. Otherwise just clear local state.
      try {
        if (auth && auth.currentUser) await signOut(auth);
      } catch (e) {
        console.log('Logout: signOut error or no user', e);
      }
      setUser(null);
      setRole('guest');
    } catch (e) {
      console.log('Logout: unexpected error', e);
      throw e;
    } finally {
      // Ensure UI loading states are always cleared, even for guest sessions
      setActionLoading(false);
      setAuthLoading(false);
    }
  };

  const enterGuestMode = () => {
    isExplicitLoginInFlight.current = true;
    setActionLoading(true);
    setAuthLoading(true);

    signInAnonymously(auth)
      .catch((error) => {
        console.log('Guest sign-in failed', error);
        Alert.alert('Guest login failed', 'Unable to start a guest session right now.');
      })
      .finally(() => {
        isExplicitLoginInFlight.current = false;
        setActionLoading(false);
        setAuthLoading(false);
      });
  };

  return (
    <AuthContext.Provider value={{ user, userRole: role, loading: actionLoading, authLoading, login, logout, enterGuestMode }}>
      {children}
    </AuthContext.Provider>
  );
};
