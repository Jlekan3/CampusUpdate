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
import { FONTS } from '../../utils/theme';

const PRIMARY = '#1A365D';
const PRIMARY_DARK = '#0F2240';
const INPUT_BG = 'rgba(255,255,255,0.12)';
const INPUT_BG_FOCUSED = 'rgba(255,255,255,0.2)';
const INPUT_BORDER = 'rgba(255,255,255,0.25)';
const INPUT_BORDER_FOCUSED = 'rgba(255,255,255,0.7)';
const INPUT_BORDER_ERROR = '#FCA5A5';
const WHITE = '#FFFFFF';
const WHITE_70 = 'rgba(255,255,255,0.7)';
const WHITE_45 = 'rgba(255,255,255,0.45)';

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
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
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
          {/* ── Logo + branding ── */}
          <View style={s.brand}>
            <Image
              source={{ uri: 'https://rmusgms.vercel.app/logo.png' }}
              style={s.logo}
              resizeMode="contain"
            />
          </View>

          {/* ── Title ── */}
          <View style={s.titleWrap}>
            <Text style={s.title}>Sign In</Text>
            <Text style={s.subtitle}>Welcome back to RMU Campus Map</Text>
          </View>

          {/* ── Form ── */}
          <View style={s.form}>
            {/* Email */}
            <View style={s.fieldWrap}>
              <Text style={s.label}>Email Address</Text>
              <View style={[
                s.inputRow,
                emailFocused && s.inputRowFocused,
                errors.email && s.inputRowError,
              ]}>
                <Ionicons name="mail-outline" size={18} color={emailFocused ? WHITE : WHITE_70} />
                <TextInput
                  style={s.input}
                  placeholder="name@rmu.edu.gh"
                  placeholderTextColor={WHITE_45}
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
              <View style={[
                s.inputRow,
                passwordFocused && s.inputRowFocused,
                errors.password && s.inputRowError,
              ]}>
                <Ionicons name="lock-closed-outline" size={18} color={passwordFocused ? WHITE : WHITE_70} />
                <TextInput
                  style={s.input}
                  placeholder="Your password"
                  placeholderTextColor={WHITE_45}
                  secureTextEntry={!showPw}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={WHITE_70} />
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={s.fieldError}>{errors.password}</Text> : null}
            </View>

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} activeOpacity={0.7} style={s.forgotWrap}>
              <Text style={s.forgot}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Sign In button — inverted (white bg, navy text) */}
            <TouchableOpacity
              style={[s.btn, loading && s.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.88}
            >
              {loading ? (
                <Text style={s.btnText}>Signing in…</Text>
              ) : (
                <View style={s.btnInner}>
                  <Text style={s.btnText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={18} color={PRIMARY} style={{ marginLeft: 6 }} />
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.divRow}>
              <View style={s.divLine} />
              <Text style={s.divText}>or</Text>
              <View style={s.divLine} />
            </View>

            {/* Sign up */}
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
  root: { flex: 1, backgroundColor: PRIMARY },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28 },

  brand: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
  },
  logo: {
    width: 130,
    height: 50,
  },

  titleWrap: {
    marginBottom: 36,
  },
  title: {
    fontSize: 36,
    fontFamily: FONTS.extraBold,
    color: WHITE,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: WHITE_70,
  },

  form: {
    flex: 1,
    paddingBottom: 40,
  },

  fieldWrap: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: WHITE_70,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: INPUT_BORDER,
    paddingHorizontal: 16,
    height: 54,
  },
  inputRowFocused: {
    backgroundColor: INPUT_BG_FOCUSED,
    borderColor: INPUT_BORDER_FOCUSED,
  },
  inputRowError: {
    borderColor: INPUT_BORDER_ERROR,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: WHITE,
    marginHorizontal: 10,
  },
  fieldError: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: '#FCA5A5',
    marginTop: 6,
  },

  forgotWrap: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 28 },
  forgot: { fontSize: 13, fontFamily: FONTS.semiBold, color: WHITE_70 },

  btn: {
    height: 54,
    backgroundColor: WHITE,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  btnDisabled: { opacity: 0.6 },
  btnInner: { flexDirection: 'row', alignItems: 'center' },
  btnText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: PRIMARY,
    letterSpacing: 0.3,
  },

  divRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 28 },
  divLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  divText: {
    marginHorizontal: 14,
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: WHITE_45,
  },

  signupRow: { flexDirection: 'row', justifyContent: 'center' },
  signupPrompt: { fontSize: 14, fontFamily: FONTS.regular, color: WHITE_70 },
  signupLink: { fontSize: 14, fontFamily: FONTS.bold, color: WHITE },
});
