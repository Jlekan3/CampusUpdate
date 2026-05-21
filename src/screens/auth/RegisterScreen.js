import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
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
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '../../context/AuthContext';
import { registerSchema, validate } from '../../utils/validationSchemas';
import { supabase } from '../../config/supabase';
import { FONTS } from '../../utils/theme';
// expo-file-system File class removed — avatar upload now uses fetch()+blob

const PRIMARY      = '#1A365D';
const INPUT_BG     = 'rgba(255,255,255,0.12)';
const INPUT_FOCUS  = 'rgba(255,255,255,0.20)';
const BORDER       = 'rgba(255,255,255,0.25)';
const BORDER_FOCUS = 'rgba(255,255,255,0.70)';
const BORDER_ERR   = '#FCA5A5';
const WHITE        = '#FFFFFF';
const WHITE_70     = 'rgba(255,255,255,0.70)';
const WHITE_45     = 'rgba(255,255,255,0.45)';

const PROGRAMMES = [
  'BSc Nautical Science', 'BSc Marine Engineering', 'BSc Maritime Science',
  'BSc Logistics & Supply Chain Management', 'BSc Port & Shipping Administration',
  'BSc Maritime Business Management', 'BSc Information Technology',
  'BSc Mechanical Engineering', 'MSc Maritime Affairs', 'MSc Port Management',
  'MBA (Maritime Focus)', 'Other',
];

// ── Picker modal ─────────────────────────────────────────────────────────────
function PickerModal({ visible, title, options, value, onSelect, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={pm.overlay} activeOpacity={1} onPress={onClose} />
      <View style={pm.sheet}>
        <View style={pm.handle} />
        <Text style={pm.title}>{title}</Text>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
          {options.map((opt, i) => (
            <TouchableOpacity
              key={opt.value ?? opt}
              style={[pm.option, i < options.length - 1 && pm.border]}
              onPress={() => { onSelect(opt.value ?? opt); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={[pm.optionText, value === (opt.value ?? opt) && pm.optionActive]}>
                {opt.label ?? opt}
              </Text>
              {value === (opt.value ?? opt) && (
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} color={PRIMARY} variant="solid" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Row input wrapper ─────────────────────────────────────────────────────────
function InputRow({ focused, error, children }) {
  return (
    <View style={[
      s.inputRow,
      focused && s.inputRowFocused,
      error  && s.inputRowError,
    ]}>
      {children}
    </View>
  );
}

export default function RegisterScreen({ navigation }) {
  const { register, enterGuestMode } = useAuth();

  const [form, setForm] = useState({
    fullName: '', displayName: '', email: '',
    studentId: '', indexNumber: '',
    programme: '', department: '', phone: '',
    password: '', confirmPassword: '',
  });
  const [errors,       setErrors]       = useState({});
  const [focused,      setFocused]      = useState({});
  const [showPw,       setShowPw]       = useState(false);
  const [showCf,       setShowCf]       = useState(false);
  const [showProg,     setShowProg]     = useState(false);
  const [showDept,     setShowDept]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [departments,  setDepartments]  = useState([]);
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [avatarUri,    setAvatarUri]    = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));
  const onFocus = (k) => setFocused((f) => ({ ...f, [k]: true }));
  const onBlur  = (k) => setFocused((f) => ({ ...f, [k]: false }));
  const clearError = (k) => setErrors((e) => ({ ...e, [k]: undefined }));

  // Fetch departments — runs without an auth session (registration page).
  // Requires the departments RLS policy to allow auth.role() = 'anon'.
  // Run the PATCH block in database/schema.sql if this returns empty.
  useEffect(() => {
    supabase
      .from('departments')
      .select('id, name')
      .order('name')
      .then(({ data, error }) => {
        if (!error && data?.length) setDepartments(data);
      })
      .finally(() => setLoadingDepts(false));
  }, []);

  // Avatar picker
  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.75,
    });
    if (!result.canceled && result.assets?.[0]) setAvatarUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access.'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.75 });
    if (!result.canceled && result.assets?.[0]) setAvatarUri(result.assets[0].uri);
  };

  const showAvatarOptions = () => Alert.alert('Profile Photo', 'Choose source', [
    { text: 'Camera', onPress: takePhoto },
    { text: 'Photo Library', onPress: pickAvatar },
    { text: 'Remove', style: 'destructive', onPress: () => setAvatarUri(null) },
    { text: 'Cancel', style: 'cancel' },
  ]);

  // Upload avatar AFTER signup so we have a valid session (auth.uid() is set).
  // Uses the 'profiles' bucket with path <uid>/<timestamp>.<ext> which matches
  // the profiles_own_insert RLS policy: auth.uid()::text = foldername[1].
  const uploadAvatar = async (uri) => {
    setUploadingAvatar(true);
    try {
      const ext = (uri.match(/\.(\w+)(\?|$)/)?.[1] || 'jpg').toLowerCase();
      const contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No active session for avatar upload.');
      const filename = `${user.id}/${Date.now()}.${ext}`;

      // Fetch the file as a blob (works cross-platform in Expo)
      const response = await fetch(uri);
      const blob     = await response.blob();

      const { error } = await supabase.storage
        .from('profiles')
        .upload(filename, blob, { contentType, upsert: true });
      if (error) throw error;

      const { data } = supabase.storage.from('profiles').getPublicUrl(filename);
      return data.publicUrl;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRegister = async () => {
    const { values, errors: errs } = validate(registerSchema, form);
    if (!values) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      // 1. Create account first (no avatar URL yet — avoids RLS issues)
      await register({ ...values, avatarUrl: null });

      // 2. After signup Supabase creates a session (even pre-email-confirmation).
      //    Use that session to upload avatar to 'profiles' bucket.
      let avatarUrl = null;
      if (avatarUri) {
        try {
          avatarUrl = await uploadAvatar(avatarUri);
          // Attach avatar URL to the auth user metadata
          await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
        } catch (uploadErr) {
          // Avatar failure must not block account creation
          console.warn('[RegisterScreen] avatar upload skipped:', uploadErr.message);
        }
      }

      // Navigate to OTP screen — Supabase sends a 6-digit code to the email.
      // (Requires OTP template configured in Supabase Dashboard — see README.)
      navigation.navigate('OTPVerification', { email: values.email, type: 'signup' });
    } catch (err) {
      Alert.alert('Registration failed', err.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login');

  const busy = loading || uploadingAvatar;

  const deptOptions = departments.map((d) => ({ label: d.name, value: d.name }));

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />
      <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={goBack} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back-outline" size={22} color={WHITE} />
          </TouchableOpacity>
          <View style={s.headerText}>
            <Text style={s.title}>Create Account</Text>
            <Text style={s.subtitle}>Join RMU Campus today</Text>
          </View>
        </View>

        <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={s.scroll}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >

            {/* ── Avatar ── */}
            <View style={s.avatarSection}>
              <TouchableOpacity onPress={showAvatarOptions} activeOpacity={0.85} style={s.avatarWrap}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={s.avatar} />
                ) : (
                  <View style={s.avatarPlaceholder}>
                    <Ionicons name="person-outline" size={30} color={WHITE_70} />
                  </View>
                )}
                <View style={s.avatarBadge}>
                  <Ionicons name="camera" size={11} color={WHITE} />
                </View>
              </TouchableOpacity>
              <View style={s.avatarInfo}>
                <Text style={s.avatarTitle}>Profile Photo</Text>
                <Text style={s.avatarSub}>Optional · Tap to upload</Text>
              </View>
            </View>

            {/* ── Identity ── */}
            <Text style={s.sectionHeader}>IDENTITY</Text>

            <Text style={s.label}>Full Name <Text style={s.req}>*</Text></Text>
            <InputRow focused={focused.fullName} error={errors.fullName}>
              <Ionicons name="person-outline" size={17} color={focused.fullName ? WHITE : WHITE_70} />
              <TextInput style={s.input} value={form.fullName} onChangeText={(v) => { set('fullName')(v); clearError('fullName'); }}
                placeholder="e.g. Kwame Mensah" placeholderTextColor={WHITE_45}
                autoCapitalize="words" onFocus={() => onFocus('fullName')} onBlur={() => onBlur('fullName')} />
            </InputRow>
            {errors.fullName ? <Text style={s.err}>{errors.fullName}</Text> : null}

            <Text style={s.label}>Display Name</Text>
            <InputRow focused={focused.displayName}>
              <Ionicons name="at-outline" size={17} color={focused.displayName ? WHITE : WHITE_70} />
              <TextInput style={s.input} value={form.displayName} onChangeText={set('displayName')}
                placeholder="Defaults to full name if blank" placeholderTextColor={WHITE_45}
                autoCapitalize="words" onFocus={() => onFocus('displayName')} onBlur={() => onBlur('displayName')} />
            </InputRow>

            {/* ── Student IDs (side by side) ── */}
            <Text style={s.sectionHeader}>STUDENT IDs</Text>
            <View style={s.rowFields}>
              <View style={s.halfWrap}>
                <Text style={s.label}>Student ID <Text style={s.req}>*</Text></Text>
                <InputRow focused={focused.studentId} error={errors.studentId}>
                  <TextInput style={s.input} value={form.studentId} onChangeText={(v) => { set('studentId')(v); clearError('studentId'); }}
                    placeholder="STU-12345" placeholderTextColor={WHITE_45}
                    autoCapitalize="characters" onFocus={() => onFocus('studentId')} onBlur={() => onBlur('studentId')} />
                </InputRow>
                {errors.studentId ? <Text style={s.err}>{errors.studentId}</Text> : null}
              </View>
              <View style={s.halfWrap}>
                <Text style={s.label}>Index Number <Text style={s.req}>*</Text></Text>
                <InputRow focused={focused.indexNumber} error={errors.indexNumber}>
                  <TextInput style={s.input} value={form.indexNumber} onChangeText={(v) => { set('indexNumber')(v); clearError('indexNumber'); }}
                    placeholder="RMU/2024/001" placeholderTextColor={WHITE_45}
                    autoCapitalize="characters" onFocus={() => onFocus('indexNumber')} onBlur={() => onBlur('indexNumber')} />
                </InputRow>
                {errors.indexNumber ? <Text style={s.err}>{errors.indexNumber}</Text> : null}
              </View>
            </View>

            {/* ── Academic ── */}
            {/* Section header with live department count */}
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionHeader}>ACADEMIC DETAILS</Text>
              {!loadingDepts && departments.length > 0 && (
                <View style={s.deptCountBadge}>
                  <Ionicons name="layers-outline" size={10} color="rgba(255,255,255,0.55)" />
                  <Text style={s.deptCountText}>{departments.length} depts</Text>
                </View>
              )}
            </View>

            {/* ── Department (MUST come first — unlocks Programme) ── */}
            <Text style={s.label}>
              Department <Text style={s.req}>*</Text>
            </Text>
            <TouchableOpacity
              style={[s.inputRow, errors.department && s.inputRowError]}
              onPress={() => !loadingDepts && departments.length > 0 && setShowDept(true)}
              activeOpacity={0.8}
              disabled={loadingDepts || departments.length === 0}
            >
              <Ionicons name="layers-outline" size={17} color={WHITE_70} />
              <Text style={[s.input, !form.department && { color: WHITE_45 }]} numberOfLines={1}>
                {loadingDepts
                  ? 'Loading departments…'
                  : departments.length === 0
                    ? 'No departments available'
                    : form.department || 'Select your department'}
              </Text>
              {loadingDepts
                ? <ActivityIndicator size="small" color={WHITE_70} />
                : <Ionicons name="chevron-down-outline" size={15} color={WHITE_70} />}
            </TouchableOpacity>
            {errors.department ? <Text style={s.err}>{errors.department}</Text> : null}

            {/* ── Programme (locked until a department is chosen) ── */}
            <Text style={[s.label, !form.department && { opacity: 0.45 }]}>
              Programme <Text style={s.req}>*</Text>
            </Text>
            <TouchableOpacity
              style={[
                s.inputRow,
                !form.department && s.inputRowLocked,
                errors.programme && s.inputRowError,
              ]}
              onPress={() => {
                if (!form.department) {
                  Alert.alert('Select Department First', 'Please choose your department before selecting a programme.');
                  return;
                }
                setShowProg(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={form.department ? 'school-outline' : 'lock-closed-outline'}
                size={17}
                color={form.department ? WHITE_70 : 'rgba(255,255,255,0.30)'}
              />
              <Text style={[
                s.input,
                !form.programme && { color: WHITE_45 },
                !form.department && { color: 'rgba(255,255,255,0.25)' },
              ]} numberOfLines={1}>
                {!form.department
                  ? 'Select a department first'
                  : form.programme || 'Select your programme'}
              </Text>
              <Ionicons
                name="chevron-down-outline"
                size={15}
                color={form.department ? WHITE_70 : 'rgba(255,255,255,0.25)'}
              />
            </TouchableOpacity>
            {!form.department && !errors.programme && (
              <Text style={s.fieldHint}>
                <Ionicons name="information-circle-outline" size={11} color="rgba(255,255,255,0.35)" />
                {' '}Choose a department to unlock programme selection
              </Text>
            )}
            {errors.programme ? <Text style={s.err}>{errors.programme}</Text> : null}

            {/* ── Contact ── */}
            <Text style={s.sectionHeader}>CONTACT</Text>

            <Text style={s.label}>Phone Number</Text>
            <InputRow focused={focused.phone}>
              <Ionicons name="call-outline" size={17} color={focused.phone ? WHITE : WHITE_70} />
              <TextInput style={s.input} value={form.phone} onChangeText={set('phone')}
                placeholder="+233..." placeholderTextColor={WHITE_45}
                keyboardType="phone-pad" onFocus={() => onFocus('phone')} onBlur={() => onBlur('phone')} />
            </InputRow>

            {/* ── Account ── */}
            <Text style={s.sectionHeader}>ACCOUNT</Text>

            <Text style={s.label}>Email Address <Text style={s.req}>*</Text></Text>
            <InputRow focused={focused.email} error={errors.email}>
              <Ionicons name="mail-outline" size={17} color={focused.email ? WHITE : WHITE_70} />
              <TextInput style={s.input} value={form.email} onChangeText={(v) => { set('email')(v); clearError('email'); }}
                placeholder="name@st.rmu.edu.gh" placeholderTextColor={WHITE_45}
                autoCapitalize="none" keyboardType="email-address"
                onFocus={() => onFocus('email')} onBlur={() => onBlur('email')} />
            </InputRow>
            {errors.email ? <Text style={s.err}>{errors.email}</Text> : null}

            <Text style={s.label}>Password <Text style={s.req}>*</Text></Text>
            <InputRow focused={focused.password} error={errors.password}>
              <Ionicons name="lock-closed-outline" size={17} color={focused.password ? WHITE : WHITE_70} />
              <TextInput style={s.input} value={form.password} onChangeText={(v) => { set('password')(v); clearError('password'); }}
                placeholder="Min. 8 characters" placeholderTextColor={WHITE_45}
                secureTextEntry={!showPw} autoCapitalize="none"
                onFocus={() => onFocus('password')} onBlur={() => onBlur('password')} />
              <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={17} color={WHITE_70} />
              </TouchableOpacity>
            </InputRow>
            {errors.password ? <Text style={s.err}>{errors.password}</Text> : null}

            <Text style={s.label}>Confirm Password <Text style={s.req}>*</Text></Text>
            <InputRow focused={focused.confirmPassword} error={errors.confirmPassword}>
              <Ionicons name="lock-closed-outline" size={17} color={focused.confirmPassword ? WHITE : WHITE_70} />
              <TextInput style={s.input} value={form.confirmPassword} onChangeText={(v) => { set('confirmPassword')(v); clearError('confirmPassword'); }}
                placeholder="Re-enter your password" placeholderTextColor={WHITE_45}
                secureTextEntry={!showCf} autoCapitalize="none"
                onFocus={() => onFocus('confirmPassword')} onBlur={() => onBlur('confirmPassword')} />
              <TouchableOpacity onPress={() => setShowCf((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showCf ? 'eye-off-outline' : 'eye-outline'} size={17} color={WHITE_70} />
              </TouchableOpacity>
            </InputRow>
            {errors.confirmPassword ? <Text style={s.err}>{errors.confirmPassword}</Text> : null}

            {/* Submit */}
            <TouchableOpacity style={[s.btn, busy && s.btnDisabled]} onPress={handleRegister} disabled={busy} activeOpacity={0.88}>
              <View style={s.btnInner}>
                <Text style={s.btnText}>{busy ? (uploadingAvatar ? 'Uploading photo…' : 'Creating Account…') : 'Create Account'}</Text>
                {!busy && <Ionicons name="arrow-forward" size={17} color={PRIMARY} style={{ marginLeft: 6 }} />}
              </View>
            </TouchableOpacity>

            <View style={s.loginRow}>
              <Text style={s.loginPrompt}>Already have an account? </Text>
              <TouchableOpacity onPress={goBack} activeOpacity={0.7}>
                <Text style={s.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* ── Guest access ── */}
            <View style={s.guestRow}>
              <View style={s.guestDivider} />
              <Text style={s.guestDividerText}>or</Text>
              <View style={s.guestDivider} />
            </View>

            <TouchableOpacity
              style={s.guestBtn}
              onPress={enterGuestMode}
              activeOpacity={0.85}
            >
              <Ionicons name="person-outline" size={15} color={WHITE_70} />
              <Text style={s.guestBtnText}>Continue as Guest</Text>
              <Ionicons name="arrow-forward" size={13} color={WHITE_45} />
            </TouchableOpacity>

            <Text style={s.guestNote}>
              Browse the campus map, dining, and public info without an account.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Programme picker */}
      <PickerModal visible={showProg} title="Select Programme"
        options={PROGRAMMES} value={form.programme}
        onSelect={(v) => { set('programme')(v); clearError('programme'); }}
        onClose={() => setShowProg(false)} />

      {/* Department picker — clears programme when department changes */}
      <PickerModal visible={showDept} title="Select Department"
        options={deptOptions} value={form.department}
        onSelect={(v) => {
          setForm((f) => ({ ...f, department: v, programme: '' }));
          clearError('department');
          clearError('programme');
        }}
        onClose={() => setShowDept(false)} />
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: PRIMARY },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 12,
  },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  title: { fontSize: 24, fontFamily: FONTS.extraBold, color: WHITE, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, fontFamily: FONTS.regular, color: WHITE_70, marginTop: 2 },

  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 48 },

  sectionHeader: {
    fontSize: 11, fontFamily: FONTS.bold, color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.2, marginTop: 20, marginBottom: 10, flex: 1,
  },
  label: { fontSize: 13, fontFamily: FONTS.semiBold, color: WHITE_70, marginBottom: 6 },
  req: { color: '#FCA5A5' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: INPUT_BG, borderRadius: 13,
    borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 14, height: 52, gap: 10, marginBottom: 14,
  },
  inputRowFocused: { backgroundColor: INPUT_FOCUS, borderColor: BORDER_FOCUS },
  inputRowError: { borderColor: BORDER_ERR },
  input: { flex: 1, fontSize: 15, fontFamily: FONTS.regular, color: WHITE },
  err: { fontSize: 12, fontFamily: FONTS.medium, color: '#FCA5A5', marginTop: -10, marginBottom: 10 },

  // Side-by-side fields
  rowFields: { flexDirection: 'row', gap: 10 },
  halfWrap: { flex: 1 },

  // Section header with inline count badge
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 10 },
  deptCountBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  deptCountText:    { fontSize: 10, fontFamily: FONTS.medium, color: 'rgba(255,255,255,0.55)' },

  // Locked input state (programme locked until department chosen)
  inputRowLocked: { opacity: 0.45, borderColor: 'rgba(255,255,255,0.12)' },

  // Hint text under locked fields
  fieldHint: { fontSize: 11, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.35)', marginTop: -10, marginBottom: 10, paddingLeft: 2 },

  // Avatar
  avatarSection: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    padding: 14, marginBottom: 4,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarInfo: { flex: 1 },
  avatarTitle: { fontSize: 14, fontFamily: FONTS.semiBold, color: WHITE },
  avatarSub: { fontSize: 12, fontFamily: FONTS.regular, color: WHITE_70, marginTop: 2 },

  // Submit
  btn: {
    height: 52, backgroundColor: WHITE, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }, elevation: 5,
  },
  btnDisabled: { opacity: 0.6 },
  btnInner: { flexDirection: 'row', alignItems: 'center' },
  btnText: { fontSize: 16, fontFamily: FONTS.bold, color: PRIMARY, letterSpacing: 0.3 },

  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginPrompt: { fontSize: 14, fontFamily: FONTS.regular, color: WHITE_70 },
  loginLink: { fontSize: 14, fontFamily: FONTS.bold, color: WHITE },

  // Guest access
  guestRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 20, marginBottom: 14,
  },
  guestDivider:     { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  guestDividerText: { fontSize: 12, fontFamily: FONTS.regular, color: WHITE_45 },
  guestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  guestBtnText: { fontSize: 14, fontFamily: FONTS.semiBold, color: WHITE_70 },
  guestNote: {
    fontSize: 11,
    fontFamily: FONTS.regular,
    color: WHITE_45,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
});

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: '72%',
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontFamily: FONTS.bold, color: '#0F172A', marginBottom: 12 },
  option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  border: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  optionText: { fontSize: 15, fontFamily: FONTS.regular, color: '#0F172A', flex: 1 },
  optionActive: { fontFamily: FONTS.semiBold, color: PRIMARY },
});
