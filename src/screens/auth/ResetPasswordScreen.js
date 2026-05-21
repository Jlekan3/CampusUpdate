import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '../../context/AuthContext';
import { resetPasswordSchema, validate } from '../../utils/validationSchemas';
import { COLORS, FONTS } from '../../utils/theme';

export default function ResetPasswordScreen({ navigation }) {
  const { resetPassword } = useAuth();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [focused, setFocused] = useState({});

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));
  const onFocus = (key) => setFocused((f) => ({ ...f, [key]: true }));
  const onBlur = (key) => setFocused((f) => ({ ...f, [key]: false }));

  const handleReset = async () => {
    const { values, errors: errs } = validate(resetPasswordSchema, form);
    if (!values) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await resetPassword(values.password);
      setDone(true);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
        <View style={s.topBarSpacer} />
        <View style={s.successCard}>
          <View style={s.successIconWrap}>
            <HugeiconsIcon icon={CheckmarkCircle02Icon} size={48} color='#16A34A' variant="solid" />
          </View>
          <Text style={s.successTitle}>Password Updated!</Text>
          <Text style={s.successBody}>
            Your password has been changed successfully. You can now sign in with your new password.
          </Text>
          <TouchableOpacity style={s.btn} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={s.btnText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* ── Blue top bar ── */}
      <View style={s.topBar}>
        <View style={s.topBarCenter}>
          <View style={s.iconCircle}>
            <Ionicons name="lock-closed-outline" size={26} color="#FFFFFF" />
          </View>
          <Text style={s.topBarTitle}>New Password</Text>
          <Text style={s.topBarSub}>Choose a strong password</Text>
        </View>
      </View>

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
          <View style={s.card}>
            <Text style={s.cardTitle}>Set new password</Text>
            <Text style={s.cardSub}>Your password must be at least 8 characters long.</Text>

            <View style={s.fieldWrap}>
              <Text style={s.label}>New Password</Text>
              <View style={[s.inputRow, focused.pw && s.inputRowFocused, errors.password && s.inputRowError]}>
                <Ionicons name="lock-closed-outline" size={18} color={focused.pw ? COLORS.primaryLight : COLORS.iconDefault} />
                <TextInput
                  style={s.input}
                  placeholder="At least 8 characters"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={form.password}
                  onChangeText={set('password')}
                  secureTextEntry={!showPw}
                  autoCapitalize="none"
                  onFocus={() => onFocus('pw')}
                  onBlur={() => onBlur('pw')}
                />
                <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.iconDefault} />
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={s.fieldError}>{errors.password}</Text> : null}
            </View>

            <View style={s.fieldWrap}>
              <Text style={s.label}>Confirm Password</Text>
              <View style={[s.inputRow, focused.cf && s.inputRowFocused, errors.confirmPassword && s.inputRowError]}>
                <Ionicons name="lock-closed-outline" size={18} color={focused.cf ? COLORS.primaryLight : COLORS.iconDefault} />
                <TextInput
                  style={s.input}
                  placeholder="Re-enter your password"
                  placeholderTextColor={COLORS.textPlaceholder}
                  value={form.confirmPassword}
                  onChangeText={set('confirmPassword')}
                  secureTextEntry={!showCf}
                  autoCapitalize="none"
                  onFocus={() => onFocus('cf')}
                  onBlur={() => onBlur('cf')}
                />
                <TouchableOpacity onPress={() => setShowCf((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={showCf ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.iconDefault} />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword ? <Text style={s.fieldError}>{errors.confirmPassword}</Text> : null}
            </View>

            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleReset}
              disabled={loading}
              activeOpacity={0.85}
            >
              <Text style={s.btnText}>{loading ? 'Saving…' : 'Save New Password'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primary },
  flex: { flex: 1 },

  topBar: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  topBarSpacer: { height: 60 },
  topBarCenter: { alignItems: 'center' },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  topBarTitle: { fontSize: 20, fontFamily: FONTS.bold, color: '#FFFFFF', marginBottom: 4 },
  topBarSub: { fontSize: 13, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.65)' },

  scroll: { flexGrow: 1 },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 48,
  },
  cardTitle: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginBottom: 8 },
  cardSub: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginBottom: 28, lineHeight: 21 },

  successCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 48,
    alignItems: 'center',
  },
  successIconWrap: { marginBottom: 20 },
  successTitle: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.textPrimary, textAlign: 'center', marginBottom: 10 },
  successBody: { fontSize: 15, fontFamily: FONTS.regular, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 36 },

  fieldWrap: { marginBottom: 18 },
  label: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.label, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFF', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, height: 52,
  },
  inputRowFocused: {
    borderColor: COLORS.primaryLight, backgroundColor: '#FFFFFF',
    shadowColor: COLORS.primaryLight, shadowOpacity: 0.12,
    shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  inputRowError: { borderColor: '#EF4444' },
  input: { flex: 1, fontSize: 15, fontFamily: FONTS.regular, color: COLORS.textPrimary, marginHorizontal: 10 },
  fieldError: { fontSize: 12, fontFamily: FONTS.medium, color: '#EF4444', marginTop: 5 },

  btn: {
    height: 52, backgroundColor: COLORS.primary, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 8, width: '100%',
    shadowColor: COLORS.primary, shadowOpacity: 0.35,
    shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontFamily: FONTS.bold, color: '#FFFFFF', letterSpacing: 0.3 },
});
