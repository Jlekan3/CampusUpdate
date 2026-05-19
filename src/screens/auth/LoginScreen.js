import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  Image,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { loginSchema, validate } from '../../utils/validationSchemas';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../utils/theme';

export default function LoginScreen({ navigation }) {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    const { values, errors: errs } = validate(loginSchema, { email: email.trim(), password });
    if (!values) { setErrors(errs); return; }
    setErrors({});
    try {
      await login(values.email, values.password);
    } catch (err) {
      Alert.alert('Sign in failed', err.message || 'Please check your credentials and try again.');
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

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
            {/* Blue header */}
            <View style={s.header}>
              <Image
                source={{ uri: 'https://rmusgms.vercel.app/logo.png' }}
                style={s.logo}
                resizeMode="contain"
              />
              <Text style={s.appName}>RMU Campus Map</Text>
              <Text style={s.tagline}>Regional Maritime University</Text>
            </View>

            {/* White form card */}
            <View style={s.card}>
              <Text style={s.cardTitle}>Sign In</Text>
              <Text style={s.cardSubtitle}>Use your school email and password</Text>

              {/* Email */}
              <View style={s.fieldWrap}>
                <Text style={s.label}>Email Address</Text>
                <View style={[s.inputRow, emailFocused && s.inputRowFocused, errors.email && s.inputRowError]}>
                  <Ionicons name="mail-outline" size={18} color={emailFocused ? COLORS.primaryLight : COLORS.iconDefault} />
                  <TextInput
                    style={s.input}
                    placeholder="name@rmu.edu.gh"
                    placeholderTextColor={COLORS.textPlaceholder}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>
                {errors.email ? <Text style={s.fieldError}>{errors.email}</Text> : null}
              </View>

              {/* Password */}
              <View style={s.fieldWrap}>
                <Text style={s.label}>Password</Text>
                <View style={[s.inputRow, passwordFocused && s.inputRowFocused, errors.password && s.inputRowError]}>
                  <Ionicons name="lock-closed-outline" size={18} color={passwordFocused ? COLORS.primaryLight : COLORS.iconDefault} />
                  <TextInput
                    style={s.input}
                    placeholder="Your password"
                    placeholderTextColor={COLORS.textPlaceholder}
                    secureTextEntry={!showPw}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                  <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.iconDefault} />
                  </TouchableOpacity>
                </View>
                {errors.password ? <Text style={s.fieldError}>{errors.password}</Text> : null}
              </View>

              <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} activeOpacity={0.7} style={s.forgotWrap}>
                <Text style={s.forgot}>Forgot password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.btn, loading && s.btnDisabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={s.btnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
              </TouchableOpacity>

              <View style={s.divRow}>
                <View style={s.divLine} />
                <Text style={s.divText}>or</Text>
                <View style={s.divLine} />
              </View>

              <View style={s.signupRow}>
                <Text style={s.signupPrompt}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
                  <Text style={s.signupLink}>Sign Up</Text>
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
  scroll: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 28,
    paddingHorizontal: 24,
  },
  logo: { width: 124, height: 44, borderRadius: 8, marginBottom: 14 },
  appName: { fontSize: 22, fontFamily: FONTS.bold, color: '#FFFFFF', marginBottom: 4 },
  tagline: { fontSize: 14, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.7)' },

  card: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  cardTitle: { fontSize: 26, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginBottom: 6 },
  cardSubtitle: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginBottom: 28 },

  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.label, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    height: 52,
  },
  inputRowFocused: { borderColor: COLORS.borderFocus, backgroundColor: COLORS.white, ...SHADOW.sm },
  inputRowError: { borderColor: COLORS.borderError },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    marginHorizontal: 8,
  },
  fieldError: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.error, marginTop: 4 },

  forgotWrap: { alignSelf: 'flex-end', marginTop: 2, marginBottom: 20 },
  forgot: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.primaryLight },

  btn: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOW.blue,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.white, letterSpacing: 0.3 },

  divRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  divText: { marginHorizontal: 12, fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textMuted },

  signupRow: { flexDirection: 'row', justifyContent: 'center' },
  signupPrompt: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  signupLink: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.primary },
});
