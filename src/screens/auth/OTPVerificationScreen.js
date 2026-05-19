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
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { SquareArrowLeft01Icon, Mail01Icon, Shield01Icon } from '@hugeicons/core-free-icons';
import OTPInputGroup from '../../components/OTPInputGroup';
import { useAuth } from '../../context/AuthContext';

const RESEND_COOLDOWN = 60;

export default function OTPVerificationScreen({ navigation, route }) {
  const { email, type } = route.params;
  const { verifyOtp, resendOtp } = useAuth();

  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
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
    if (otp.length < 6) { setOtpError('Please enter the 6-digit code'); return; }
    setOtpError('');
    setLoading(true);
    try {
      await verifyOtp(email, otp, type);
      if (type === 'recovery') {
        navigation.replace('ResetPassword', { email });
      }
    } catch (err) {
      setOtpError(err.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    try {
      await resendOtp(email, type);
      startCooldown();
      Alert.alert('Code sent', `A new code was sent to ${email}`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not resend code');
    }
  };

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
              ? 'We sent a 6-digit code to confirm your account.'
              : 'Enter the code we sent to reset your password.'}
          </Text>
          <View style={styles.emailBadge}>
            <HugeiconsIcon icon={Mail01Icon} size={16} color="#1A365D" variant="stroke" />
            <Text style={styles.emailText}>{email}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.codeLabel}>Enter 6-digit code</Text>
          <View style={styles.otpWrap}>
            <OTPInputGroup value={otp} onChange={setOtp} error={otpError} />
          </View>

          <TouchableOpacity
            style={[styles.verifyBtn, (loading || otp.length < 6) && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={loading || otp.length < 6}
            activeOpacity={0.85}
          >
            <Text style={styles.verifyText}>{loading ? 'Verifying…' : 'Verify Code'}</Text>
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendPrompt}>Didn't receive a code? </Text>
            <TouchableOpacity onPress={handleResend} disabled={cooldown > 0} activeOpacity={0.7}>
              <Text style={[styles.resendLink, cooldown > 0 && styles.resendLinkDisabled]}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}
              </Text>
            </TouchableOpacity>
          </View>
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
  spamNote: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginTop: 20, lineHeight: 19 },
});
