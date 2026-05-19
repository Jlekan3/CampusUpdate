import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '../../context/AuthContext';
import { resetPasswordSchema, validate } from '../../utils/validationSchemas';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../utils/theme';

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
        <View style={s.headerSpacer} />
        <View style={s.successCard}>
          <HugeiconsIcon icon={CheckmarkCircle02Icon} size={52} color={COLORS.success} variant="solid" />
          <Text style={s.successTitle}>Password Updated!</Text>
          <Text style={s.successBody}>
            Your password has been changed. You can now sign in with your new password.
          </Text>
          <TouchableOpacity style={s.btn} onPress={() => navigation.navigate('Login')} activeOpacity={0.85}>
            <Text style={s.btnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={s.header}>
        <View style={s.headerInner}>
          <View style={s.headerIconWrap}>
            <Ionicons name="lock-closed-outline" size={22} color="#FFFFFF" />
          </View>
          <Text style={s.headerTitle}>New Password</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={s.card}>
              <Text style={s.subtitle}>Choose a strong password of at least 8 characters.</Text>

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
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primary },
  flex: { flex: 1 },
  header: { paddingTop: 12, paddingBottom: 24, paddingHorizontal: 24 },
  headerSpacer: { height: 60 },
  headerInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: '#FFFFFF' },

  scroll: { flexGrow: 1 },
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 32, paddingBottom: 48,
  },
  successCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 28, paddingTop: 48, paddingBottom: 48,
    alignItems: 'center',
  },
  subtitle: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginBottom: 28, lineHeight: 21 },

  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.label, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.inputBg, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: COLORS.border,
    paddingHorizontal: 14, height: 52,
  },
  inputRowFocused: { borderColor: COLORS.borderFocus, backgroundColor: COLORS.white, ...SHADOW.sm },
  inputRowError: { borderColor: COLORS.borderError },
  input: { flex: 1, fontSize: 15, fontFamily: FONTS.regular, color: COLORS.textPrimary, marginHorizontal: 8 },
  fieldError: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.error, marginTop: 4 },

  btn: {
    height: 52, backgroundColor: COLORS.primary, borderRadius: RADIUS.md,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 8, width: '100%', ...SHADOW.blue,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.white, letterSpacing: 0.3 },

  successTitle: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.textPrimary, textAlign: 'center', marginTop: 16, marginBottom: 10 },
  successBody: { fontSize: 15, fontFamily: FONTS.regular, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
});
