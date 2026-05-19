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
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '../../context/AuthContext';
import { registerSchema, validate } from '../../utils/validationSchemas';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../utils/theme';

const PROGRAMMES = [
  'BSc Nautical Science',
  'BSc Marine Engineering',
  'BSc Maritime Science',
  'BSc Logistics & Supply Chain Management',
  'BSc Port & Shipping Administration',
  'BSc Maritime Business Management',
  'BSc Information Technology',
  'BSc Mechanical Engineering',
  'MSc Maritime Affairs',
  'MSc Port Management',
  'MBA (Maritime Focus)',
  'Other',
];

function ProgrammePickerModal({ visible, value, onSelect, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={pm.overlay} activeOpacity={1} onPress={onClose} />
      <View style={pm.sheet}>
        <View style={pm.handle} />
        <Text style={pm.sheetTitle}>Select Programme</Text>
        <FlatList
          data={PROGRAMMES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={pm.option}
              onPress={() => { onSelect(item); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={[pm.optionText, item === value && pm.optionTextActive]}>{item}</Text>
              {item === value && (
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} color={COLORS.primaryLight} variant="solid" />
              )}
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={pm.sep} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      </View>
    </Modal>
  );
}

function Field({ label, error, children }) {
  return (
    <View style={s.fieldWrap}>
      <Text style={s.label}>{label} <Text style={s.required}>*</Text></Text>
      {children}
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </View>
  );
}

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    indexNumber: '',
    programme: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState({});

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));
  const onFocus = (key) => setFocused((f) => ({ ...f, [key]: true }));
  const onBlur = (key) => setFocused((f) => ({ ...f, [key]: false }));

  const rowStyle = (key) => [
    s.inputRow,
    focused[key] && s.inputRowFocused,
    errors[key] && s.inputRowError,
  ];

  const handleRegister = async () => {
    const { values, errors: errs } = validate(registerSchema, form);
    if (!values) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      await register(values);
      navigation.navigate('EmailSent', { email: values.email, type: 'signup' });
    } catch (err) {
      Alert.alert('Registration failed', err.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login');

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
        <View style={s.header}>
          <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Create Account</Text>
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
                <Text style={s.intro}>Fill in your details to get started.</Text>

                <Field label="Full Name" error={errors.fullName}>
                  <View style={rowStyle('fullName')}>
                    <Ionicons name="person-outline" size={18} color={focused.fullName ? COLORS.primaryLight : COLORS.iconDefault} />
                    <TextInput
                      style={s.input}
                      placeholder="e.g. Kwame Mensah"
                      placeholderTextColor={COLORS.textPlaceholder}
                      value={form.fullName}
                      onChangeText={set('fullName')}
                      autoCapitalize="words"
                      onFocus={() => onFocus('fullName')}
                      onBlur={() => onBlur('fullName')}
                    />
                  </View>
                </Field>

                <Field label="Email Address" error={errors.email}>
                  <View style={rowStyle('email')}>
                    <Ionicons name="mail-outline" size={18} color={focused.email ? COLORS.primaryLight : COLORS.iconDefault} />
                    <TextInput
                      style={s.input}
                      placeholder="name@rmu.edu.gh"
                      placeholderTextColor={COLORS.textPlaceholder}
                      value={form.email}
                      onChangeText={set('email')}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onFocus={() => onFocus('email')}
                      onBlur={() => onBlur('email')}
                    />
                  </View>
                </Field>

                <Field label="Index Number" error={errors.indexNumber}>
                  <View style={rowStyle('indexNumber')}>
                    <Ionicons name="id-card-outline" size={18} color={focused.indexNumber ? COLORS.primaryLight : COLORS.iconDefault} />
                    <TextInput
                      style={s.input}
                      placeholder="e.g. RMU/2024/0001"
                      placeholderTextColor={COLORS.textPlaceholder}
                      value={form.indexNumber}
                      onChangeText={set('indexNumber')}
                      autoCapitalize="characters"
                      onFocus={() => onFocus('indexNumber')}
                      onBlur={() => onBlur('indexNumber')}
                    />
                  </View>
                </Field>

                <Field label="Programme" error={errors.programme}>
                  <TouchableOpacity
                    style={[s.inputRow, errors.programme && s.inputRowError]}
                    onPress={() => setShowPicker(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="school-outline" size={18} color={COLORS.iconDefault} />
                    <Text style={[s.input, !form.programme && { color: COLORS.textPlaceholder }]} numberOfLines={1}>
                      {form.programme || 'Select your programme'}
                    </Text>
                    <Ionicons name="chevron-down-outline" size={16} color={COLORS.iconDefault} />
                  </TouchableOpacity>
                </Field>

                <Field label="Password" error={errors.password}>
                  <View style={rowStyle('password')}>
                    <Ionicons name="lock-closed-outline" size={18} color={focused.password ? COLORS.primaryLight : COLORS.iconDefault} />
                    <TextInput
                      style={s.input}
                      placeholder="Min. 8 characters"
                      placeholderTextColor={COLORS.textPlaceholder}
                      value={form.password}
                      onChangeText={set('password')}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      onFocus={() => onFocus('password')}
                      onBlur={() => onBlur('password')}
                    />
                    <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.iconDefault} />
                    </TouchableOpacity>
                  </View>
                </Field>

                <Field label="Confirm Password" error={errors.confirmPassword}>
                  <View style={rowStyle('confirmPassword')}>
                    <Ionicons name="lock-closed-outline" size={18} color={focused.confirmPassword ? COLORS.primaryLight : COLORS.iconDefault} />
                    <TextInput
                      style={s.input}
                      placeholder="Re-enter your password"
                      placeholderTextColor={COLORS.textPlaceholder}
                      value={form.confirmPassword}
                      onChangeText={set('confirmPassword')}
                      secureTextEntry={!showConfirm}
                      autoCapitalize="none"
                      onFocus={() => onFocus('confirmPassword')}
                      onBlur={() => onBlur('confirmPassword')}
                    />
                    <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.iconDefault} />
                    </TouchableOpacity>
                  </View>
                </Field>

                <TouchableOpacity
                  style={[s.btn, loading && s.btnDisabled]}
                  onPress={handleRegister}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Text style={s.btnText}>{loading ? 'Creating Account…' : 'Create Account'}</Text>
                </TouchableOpacity>

                <View style={s.loginRow}>
                  <Text style={s.loginPrompt}>Already have an account? </Text>
                  <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
                    <Text style={s.loginLink}>Sign In</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <ProgrammePickerModal
        visible={showPicker}
        value={form.programme}
        onSelect={set('programme')}
        onClose={() => setShowPicker(false)}
      />
    </>
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

  scroll: { flexGrow: 1 },
  card: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    flex: 1,
  },
  intro: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginBottom: 24 },

  fieldWrap: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.label, marginBottom: 6 },
  required: { color: COLORS.error },
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

  btn: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    ...SHADOW.blue,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.white, letterSpacing: 0.3 },

  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 18 },
  loginPrompt: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.textSecondary },
  loginLink: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.primary },
});

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: '70%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginBottom: 16 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  optionText: { fontSize: 15, fontFamily: FONTS.regular, color: COLORS.textPrimary, flex: 1 },
  optionTextActive: { fontFamily: FONTS.semiBold, color: COLORS.primaryLight },
  sep: { height: 1, backgroundColor: COLORS.border },
});
