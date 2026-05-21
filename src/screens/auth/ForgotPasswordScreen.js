import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { forgotPasswordSchema, validate } from '../../utils/validationSchemas';
import { FONTS } from '../../utils/theme';

const PRIMARY      = '#1A365D';
const BLUE         = '#2563EB';
const DARK         = '#0F172A';
const MUTED        = '#64748B';
const INPUT_BG     = '#F8FAFC';
const INPUT_FOCUS  = '#FFFFFF';
const BORDER       = '#E2E8F0';
const BORDER_FOCUS = '#2563EB';
const BORDER_ERR   = '#FCA5A5';
const WHITE        = '#FFFFFF';

export default function ForgotPasswordScreen({ navigation }) {
  const { forgotPassword } = useAuth();
  const [email, setEmail]   = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const goBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login');

  const handleSubmit = async () => {
    const { values, errors: errs } = validate(forgotPasswordSchema, { email });
    if (!values) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      // forgotPassword checks email existence first, then sends OTP
      await forgotPassword(values.email);
      // Navigate to OTP screen so the user can enter the 6-digit code
      navigation.navigate('OTPVerification', { email: values.email, type: 'recovery' });
    } catch (err) {
      // Show inline error (e.g. "No account found with that email")
      setErrors({ email: err.message || 'Could not send code. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Back button ── */}
          <TouchableOpacity onPress={goBack} activeOpacity={0.7} style={s.backBtn}>
            <Ionicons name="arrow-back-outline" size={22} color={DARK} />
          </TouchableOpacity>

          {/* ── Icon + title ── */}
          <View style={s.topSection}>
            <View style={s.iconCircle}>
              <Ionicons name="key-outline" size={32} color={BLUE} />
            </View>
            <Text style={s.title}>Forgot Password?</Text>
            <Text style={s.subtitle}>
              Enter your registered school email and we'll send you a 6-digit verification code to reset your password.
            </Text>
          </View>

          {/* ── Form ── */}
          <View style={s.form}>
            <View style={s.fieldWrap}>
              <Text style={s.label}>Email Address</Text>
              <View style={[s.inputRow, focused && s.inputRowFocused, errors.email && s.inputRowError]}>
                <Ionicons name="mail-outline" size={18} color={focused ? BLUE : MUTED} />
                <TextInput
                  style={s.input}
                  placeholder="name@rmu.edu.gh"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                />
              </View>
              {errors.email ? <Text style={s.fieldError}>{errors.email}</Text> : null}
            </View>

            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <Text style={s.btnText}>Checking & Sending…</Text>
              ) : (
                <View style={s.btnInner}>
                  <Text style={s.btnText}>Send Verification Code</Text>
                  <Ionicons name="arrow-forward" size={18} color={WHITE} style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>

            <View style={s.loginRow}>
              <Text style={s.loginPrompt}>Remember your password? </Text>
              <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
                <Text style={s.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },

  backBtn: {
    padding: 4,
    marginTop: 8,
    marginBottom: 32,
    alignSelf: 'flex-start',
  },

  topSection: { marginBottom: 44 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EFF6FF',
    borderWidth: 2, borderColor: '#BFDBFE',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32, fontFamily: FONTS.extraBold,
    color: DARK, letterSpacing: -0.5, marginBottom: 12,
  },
  subtitle: {
    fontSize: 15, fontFamily: FONTS.regular,
    color: MUTED, lineHeight: 23,
  },

  form: { flex: 1 },

  fieldWrap: { marginBottom: 24 },
  label: {
    fontSize: 13, fontFamily: FONTS.semiBold,
    color: '#374151', marginBottom: 8, letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: INPUT_BG, borderRadius: 14,
    borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 16, height: 54,
  },
  inputRowFocused: { backgroundColor: INPUT_FOCUS, borderColor: BORDER_FOCUS },
  inputRowError:   { borderColor: BORDER_ERR },
  input: {
    flex: 1, fontSize: 15, fontFamily: FONTS.regular,
    color: DARK, marginHorizontal: 10,
  },
  fieldError: { fontSize: 12, fontFamily: FONTS.medium, color: '#DC2626', marginTop: 6 },

  btn: {
    height: 54, backgroundColor: BLUE, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: BLUE, shadowOpacity: 0.3, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnInner:    { flexDirection: 'row', alignItems: 'center' },
  btnText:     { fontSize: 16, fontFamily: FONTS.bold, color: WHITE, letterSpacing: 0.3 },

  loginRow:    { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  loginPrompt: { fontSize: 14, fontFamily: FONTS.regular, color: DARK },
  loginLink:   { fontSize: 14, fontFamily: FONTS.bold,    color: DARK },
});
