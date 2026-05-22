import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { SquareArrowLeft01Icon, Mail01Icon, Shield01Icon } from '@hugeicons/core-free-icons';
import OTPInputGroup from '../../components/OTPInputGroup';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';

const RESEND_COOLDOWN = 60;

// Upload profile photo to the 'profiles' bucket using the confirmed session.
// Called only after verifyOtp() so auth.uid() is guaranteed to be set.
async function uploadAvatarAfterVerify(uri) {
  try {
    const ext         = (uri.match(/\.(\w+)(\?|$)/)?.[1] || 'jpg').toLowerCase();
    const contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const filename = `${user.id}/${Date.now()}.${ext}`;
    const response = await fetch(uri);
    const blob     = await response.blob();

    const { error } = await supabase.storage
      .from('profiles')
      .upload(filename, blob, { contentType, upsert: true });
    if (error) throw error;

    const { data } = supabase.storage.from('profiles').getPublicUrl(filename);
    const publicUrl = data.publicUrl;

    // Update auth user metadata so the dashboard can read it immediately
    await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });

    // Also update the public.users row so the DB stays in sync
    await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.id);

    return publicUrl;
  } catch (err) {
    console.warn('[OTPVerification] avatar upload failed:', err.message);
    return null;
  }
}

export default function OTPVerificationScreen({ navigation, route }) {
  const { email, type, avatarUri } = route.params;
  const { verifyOtp, resendOtp, logout } = useAuth();

  const [otp,        setOtp]        = useState('');
  const [otpError,   setOtpError]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [verified,   setVerified]   = useState(false);
  const [resending,  setResending]  = useState(false);
  const [resendMsg,  setResendMsg]  = useState('');
  const [cooldown,   setCooldown]   = useState(RESEND_COOLDOWN);
  const timer = useRef(null);

  useEffect(() => {
    startCooldown();
    return () => clearInterval(timer.current);
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(timer.current); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleVerify = async () => {
    if (otp.length < 8) { setOtpError('Please enter the 8-digit code'); return; }
    setOtpError('');
    setLoading(true);
    try {
      await verifyOtp(email, otp, type);

      if (type === 'recovery') {
        // Password reset: navigate to change-password screen
        navigation.replace('ResetPassword', { email });
      } else {
        // 1. Safely capture the confirmed session user
        const { data: { user } } = await supabase.auth.getUser();

        // 2. Upload avatar while the authenticated session is still active
        if (avatarUri && user) await uploadAvatarAfterVerify(avatarUri);

        // 3. Show success modal immediately — this prevents onAuthStateChange
        //    from racing to route the user to the student dashboard
        setVerified(true);

        // 4. After 3 seconds, log out then navigate to Login
        setTimeout(async () => {
          try {
            await logout();
            navigation.replace('Login');
          } catch (_) {
            navigation.replace('Login');
          }
        }, 3000);
      }
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setResendMsg('');
    setOtpError('');
    setOtp('');
    try {
      await resendOtp(email, type);
      startCooldown();
      setResendMsg(`A new code was sent to ${email}`);
    } catch (err) {
      setResendMsg(err.message || 'Could not resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  // ── Signup success screen ────────────────────────────────────────────────────
  // Shown after the signup OTP is accepted. AuthContext automatically routes
  // the user to StudentNavigator — no manual navigation needed.
  if (verified) {
    return (
      <View style={styles.successRoot}>
        {/* Blurred overlay backdrop */}
        <View style={styles.successBackdrop} />

        {/* Success modal card */}
        <View style={styles.successCard}>
          {/* Icon */}
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-circle" size={56} color="#10B981" />
          </View>

          {/* Copy */}
          <Text style={styles.successTitle}>Account Created!</Text>
          <Text style={styles.successSub}>
            Your RMU student account has been verified successfully.
          </Text>

          {/* Divider */}
          <View style={styles.successDivider} />

          {/* Email badge */}
          <View style={styles.successEmailRow}>
            <Ionicons name="mail-outline" size={15} color="#1A365D" />
            <Text style={styles.successEmail}>{email}</Text>
          </View>

          <Text style={styles.successRedirect}>
            Redirecting to Sign In in 3 seconds…
          </Text>

          {/* Manual button */}
          <TouchableOpacity
            style={styles.successBtn}
            onPress={() => navigation.replace('Login')}
            activeOpacity={0.85}
          >
            <Text style={styles.successBtnText}>Go to Sign In</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <HugeiconsIcon icon={SquareArrowLeft01Icon} size={26} color="#0F172A" variant="stroke" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <HugeiconsIcon icon={Shield01Icon} size={28} color="#FFFFFF" variant="solid" />
          </View>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.subtitle}>
            {type === 'signup'
              ? 'We sent an 8-digit code to confirm your account.'
              : 'Enter the 8-digit code we sent to reset your password.'}
          </Text>
          <View style={styles.emailBadge}>
            <HugeiconsIcon icon={Mail01Icon} size={16} color="#1A365D" variant="stroke" />
            <Text style={styles.emailText}>{email}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.codeLabel}>Enter 8-digit code</Text>
          <View style={styles.otpWrap}>
            <OTPInputGroup value={otp} onChange={setOtp} error={otpError} />
          </View>

          <TouchableOpacity
            style={[styles.verifyBtn, (loading || otp.length < 8) && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={loading || otp.length < 8}
            activeOpacity={0.85}
          >
            <Text style={styles.verifyText}>{loading ? 'Verifying…' : 'Verify Code'}</Text>
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendPrompt}>Didn't receive a code? </Text>
            <TouchableOpacity
              onPress={handleResend}
              disabled={cooldown > 0 || resending}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.resendLink,
                (cooldown > 0 || resending) && styles.resendLinkDisabled,
              ]}>
                {resending
                  ? 'Sending…'
                  : cooldown > 0
                    ? `Resend in ${cooldown}s`
                    : 'Resend Code'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Inline resend feedback */}
          {resendMsg ? (
            <Text style={[
              styles.resendFeedback,
              resendMsg.includes('sent') ? styles.resendSuccess : styles.resendError,
            ]}>
              {resendMsg}
            </Text>
          ) : null}
        </View>

        <Text style={styles.spamNote}>
          Check your spam/junk folder if you don't see the email.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 40 },
  backBtn: { marginBottom: 20, alignSelf: 'flex-start', padding: 4 },
  header: { marginBottom: 32 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: '#1A365D',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: '#1A365D', shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  subtitle: { fontSize: 15, color: '#475569', marginTop: 6, lineHeight: 22 },
  emailBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, marginTop: 14,
    alignSelf: 'flex-start', gap: 6,
  },
  emailText: { fontSize: 14, color: '#1A365D', fontWeight: '600' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#0F172A', shadowOpacity: 0.07, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  codeLabel: { fontSize: 14, fontWeight: '600', color: '#475569', textAlign: 'center', marginBottom: 20 },
  otpWrap: { marginBottom: 24 },
  verifyBtn: {
    height: 54, backgroundColor: '#1A365D', borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#1A365D', shadowOpacity: 0.25, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
  resendRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  resendPrompt: { fontSize: 14, color: '#64748B' },
  resendLink: { fontSize: 14, color: '#1A365D', fontWeight: '700' },
  resendLinkDisabled: { color: '#94A3B8' },
  spamNote:       { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 20, lineHeight: 19 },
  resendFeedback: { fontSize: 12, textAlign: 'center', marginTop: 10, lineHeight: 17 },
  resendSuccess:  { color: '#059669' },
  resendError:    { color: '#DC2626' },

  // ── Success modal (signup confirmed) ──────────────────────────────────────
  successRoot:       { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  successBackdrop:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.65)' },
  successCard: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 28,
    padding: 28, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 32,
    shadowOffset: { width: 0, height: 16 }, elevation: 16,
  },
  successIconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#10B981', shadowOpacity: 0.2, shadowRadius: 14, elevation: 4,
  },
  successTitle:    { fontSize: 24, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 8, letterSpacing: -0.3 },
  successSub:      { fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  successDivider:  { width: '100%', height: 1, backgroundColor: '#E2E8F0', marginBottom: 16 },
  successEmailRow: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16 },
  successEmail:    { fontSize: 13, fontWeight: '600', color: '#1A365D' },
  successRedirect: { fontSize: 12, color: '#94A3B8', marginBottom: 20, textAlign: 'center' },
  successBtn: {
    width: '100%', height: 50, backgroundColor: '#1A365D', borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  successBtnText:  { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
