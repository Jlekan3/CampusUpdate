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
import { useAuth } from '../../context/AuthContext';
import { forgotPasswordSchema, validate } from '../../utils/validationSchemas';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../utils/theme';

export default function ForgotPasswordScreen({ navigation }) {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
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
      await forgotPassword(values.email);
      navigation.navigate('EmailSent', { email: values.email, type: 'recovery' });
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Forgot Password</Text>
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
              <View style={s.iconWrap}>
                <Ionicons name="mail-outline" size={28} color={COLORS.primary} />
              </View>

              <Text style={s.title}>Reset your password</Text>
              <Text style={s.subtitle}>
                Enter your school email and we'll send you a link to reset your password.
              </Text>

              <View style={s.fieldWrap}>
                <Text style={s.label}>Email Address</Text>
                <View style={[s.inputRow, focused && s.inputRowFocused, errors.email && s.inputRowError]}>
                  <Ionicons name="mail-outline" size={18} color={focused ? COLORS.primaryLight : COLORS.iconDefault} />
                  <TextInput
                    style={s.input}
                    placeholder="name@rmu.edu.gh"
                    placeholderTextColor={COLORS.textPlaceholder}
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
                activeOpacity={0.85}
              >
                <Text style={s.btnText}>{loading ? 'Sending…' : 'Send Reset Link'}</Text>
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
  root: { flex: 1, backgroundColor: COLORS.primary },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 16,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontFamily: FONTS.bold, color: '#FFFFFF' },

  scroll: { flexGrow: 1, paddingBottom: 24 },
  card: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 48,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1.5, borderColor: COLORS.primaryBorder,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textSecondary, lineHeight: 21, marginBottom: 28 },

  fieldWrap: { marginBottom: 20 },
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
    justifyContent: 'center', alignItems: 'center', ...SHADOW.blue,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.white, letterSpacing: 0.3 },

  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginPrompt: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  loginLink: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.primary },
});
