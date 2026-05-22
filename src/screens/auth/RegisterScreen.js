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
const BLUE         = '#2563EB';
const DARK         = '#0F172A';
const MUTED        = '#64748B';
const INPUT_BG     = '#F8FAFC';
const INPUT_FOCUS  = '#FFFFFF';
const BORDER       = '#E2E8F0';
const BORDER_FOCUS = '#2563EB';
const BORDER_ERR   = '#FCA5A5';
const WHITE        = '#FFFFFF';
const PH           = '#94A3B8'; // placeholder colour

// Programmes are now fetched from the DB based on selected department.
// The static fallback is intentionally removed.

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
  const [departments,   setDepartments]  = useState([]);
  const [loadingDepts,  setLoadingDepts] = useState(true);
  const [programmes,    setProgrammes]   = useState([]);
  const [loadingProgs,  setLoadingProgs] = useState(false);
  const [selectedDeptId,setSelectedDeptId] = useState(null); // dept ID for programme fetch
  const [avatarUri,     setAvatarUri]    = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));
  const onFocus = (k) => setFocused((f) => ({ ...f, [k]: true }));
  const onBlur  = (k) => setFocused((f) => ({ ...f, [k]: false }));
  const clearError = (k) => setErrors((e) => ({ ...e, [k]: undefined }));

  // Fetch departments — runs without an auth session (registration page).
  // Requires the departments RLS policy to allow auth.role() = 'anon'.
  // Run the PATCH in database/schema.sql if this returns empty.
  useEffect(() => {
    supabase
      .from('departments')
      .select('id, name, faculty')
      .order('faculty')
      .order('name')
      .then(({ data, error }) => {
        if (!error && data?.length) setDepartments(data);
      })
      .finally(() => setLoadingDepts(false));
  }, []);

  // Fetch programmes for the selected department.
  // Only runs after the student picks a department.
  useEffect(() => {
    if (!selectedDeptId) { setProgrammes([]); return; }
    setLoadingProgs(true);
    supabase
      .from('programmes')
      .select('id, name, level')
      .eq('department_id', selectedDeptId)
      .eq('is_active', true)
      .order('level')
      .order('name')
      .then(({ data, error }) => {
        if (!error && data?.length) setProgrammes(data);
        else setProgrammes([]);
      })
      .finally(() => setLoadingProgs(false));
  }, [selectedDeptId]);

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
      // Create the auth account — avatar upload is deferred to after OTP
      // verification because persistSession:false means there is no active
      // session between signUp() and verifyOtp(), so getUser() returns null
      // and any upload attempted here silently fails.
      await register({ ...values, avatarUrl: null });

      // Pass the local avatar URI to the OTP screen so it can upload
      // using the confirmed session that exists after verifyOtp().
      navigation.navigate('OTPVerification', {
        email:     values.email,
        type:      'signup',
        avatarUri: avatarUri || null,
      });
    } catch (err) {
      Alert.alert('Registration failed', err.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Login');

  const busy = loading;

  // Use department ID as the picker value so we can fetch programmes by dept ID.
  const deptOptions = departments.map((d) => ({ label: d.name, value: d.id }));
  const progOptions = programmes.map((p) => ({ label: p.name, value: p.name }));

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor={WHITE} />
      <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>

        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={goBack} style={s.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back-outline" size={22} color={DARK} />
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
                    <Ionicons name="person-outline" size={30} color={MUTED} />
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
              <Ionicons name="person-outline" size={17} color={focused.fullName ? BLUE : MUTED} />
              <TextInput style={s.input} value={form.fullName} onChangeText={(v) => { set('fullName')(v); clearError('fullName'); }}
                placeholder="e.g. Kwame Mensah" placeholderTextColor={PH}
                autoCapitalize="words" onFocus={() => onFocus('fullName')} onBlur={() => onBlur('fullName')} />
            </InputRow>
            {errors.fullName ? <Text style={s.err}>{errors.fullName}</Text> : null}

            <Text style={s.label}>Display Name</Text>
            <InputRow focused={focused.displayName}>
              <Ionicons name="at-outline" size={17} color={focused.displayName ? BLUE : MUTED} />
              <TextInput style={s.input} value={form.displayName} onChangeText={set('displayName')}
                placeholder="Defaults to full name if blank" placeholderTextColor={PH}
                autoCapitalize="words" onFocus={() => onFocus('displayName')} onBlur={() => onBlur('displayName')} />
            </InputRow>

            {/* ── Student IDs (side by side) ── */}
            <Text style={s.sectionHeader}>STUDENT IDs</Text>
            <View style={s.rowFields}>
              <View style={s.halfWrap}>
                <Text style={s.label}>Student ID <Text style={s.req}>*</Text></Text>
                <InputRow focused={focused.studentId} error={errors.studentId}>
                  <TextInput style={s.input} value={form.studentId} onChangeText={(v) => { set('studentId')(v); clearError('studentId'); }}
                    placeholder="00000000" placeholderTextColor={PH}
                    autoCapitalize="characters" onFocus={() => onFocus('studentId')} onBlur={() => onBlur('studentId')} />
                </InputRow>
                {errors.studentId ? <Text style={s.err}>{errors.studentId}</Text> : null}
              </View>
              <View style={s.halfWrap}>
                <Text style={s.label}>Index Number <Text style={s.req}>*</Text></Text>
                <InputRow focused={focused.indexNumber} error={errors.indexNumber}>
                  <TextInput style={s.input} value={form.indexNumber} onChangeText={(v) => { set('indexNumber')(v); clearError('indexNumber'); }}
                    placeholder="BIT0002066" placeholderTextColor={PH}
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
              <Ionicons name="layers-outline" size={17} color={MUTED} />
              <Text style={[s.input, !form.department && { color: PH }]} numberOfLines={1}>
                {loadingDepts
                  ? 'Loading departments…'
                  : departments.length === 0
                    ? 'No departments available'
                    : form.department || 'Select your department'}
              </Text>
              {loadingDepts
                ? <ActivityIndicator size="small" color={MUTED} />
                : <Ionicons name="chevron-down-outline" size={15} color={MUTED} />}
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
                if (loadingProgs) return; // wait for fetch
                setShowProg(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={form.department ? 'school-outline' : 'lock-closed-outline'}
                size={17}
                color={form.department ? MUTED : '#CBD5E0'}
              />
              <Text style={[
                s.input,
                !form.programme && { color: PH },
                !form.department && { color: '#CBD5E0' },
              ]} numberOfLines={1}>
                {!form.department
                  ? 'Select a department first'
                  : loadingProgs
                    ? 'Loading programmes…'
                    : programmes.length === 0
                      ? 'No programmes found for this department'
                      : form.programme || 'Select your programme'}
              </Text>
              {loadingProgs && form.department
                ? <ActivityIndicator size="small" color={MUTED} />
                : <Ionicons
                    name="chevron-down-outline"
                    size={15}
                    color={form.department ? MUTED : '#CBD5E0'}
                  />
              }
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
              <Ionicons name="call-outline" size={17} color={focused.phone ? BLUE : MUTED} />
              <TextInput style={s.input} value={form.phone} onChangeText={set('phone')}
                placeholder="+233..." placeholderTextColor={PH}
                keyboardType="phone-pad" onFocus={() => onFocus('phone')} onBlur={() => onBlur('phone')} />
            </InputRow>

            {/* ── Account ── */}
            <Text style={s.sectionHeader}>ACCOUNT</Text>

            <Text style={s.label}>Email Address <Text style={s.req}>*</Text></Text>
            <InputRow focused={focused.email} error={errors.email}>
              <Ionicons name="mail-outline" size={17} color={focused.email ? BLUE : MUTED} />
              <TextInput style={s.input} value={form.email} onChangeText={(v) => { set('email')(v); clearError('email'); }}
                placeholder="name@st.rmu.edu.gh" placeholderTextColor={PH}
                autoCapitalize="none" keyboardType="email-address"
                onFocus={() => onFocus('email')} onBlur={() => onBlur('email')} />
            </InputRow>
            {errors.email ? <Text style={s.err}>{errors.email}</Text> : null}

            <Text style={s.label}>Password <Text style={s.req}>*</Text></Text>
            <InputRow focused={focused.password} error={errors.password}>
              <Ionicons name="lock-closed-outline" size={17} color={focused.password ? BLUE : MUTED} />
              <TextInput style={s.input} value={form.password} onChangeText={(v) => { set('password')(v); clearError('password'); }}
                placeholder="Min. 8 characters" placeholderTextColor={PH}
                secureTextEntry={!showPw} autoCapitalize="none"
                onFocus={() => onFocus('password')} onBlur={() => onBlur('password')} />
              <TouchableOpacity onPress={() => setShowPw((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={17} color={MUTED} />
              </TouchableOpacity>
            </InputRow>
            {errors.password ? <Text style={s.err}>{errors.password}</Text> : null}

            <Text style={s.label}>Confirm Password <Text style={s.req}>*</Text></Text>
            <InputRow focused={focused.confirmPassword} error={errors.confirmPassword}>
              <Ionicons name="lock-closed-outline" size={17} color={focused.confirmPassword ? BLUE : MUTED} />
              <TextInput style={s.input} value={form.confirmPassword} onChangeText={(v) => { set('confirmPassword')(v); clearError('confirmPassword'); }}
                placeholder="Re-enter your password" placeholderTextColor={PH}
                secureTextEntry={!showCf} autoCapitalize="none"
                onFocus={() => onFocus('confirmPassword')} onBlur={() => onBlur('confirmPassword')} />
              <TouchableOpacity onPress={() => setShowCf((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showCf ? 'eye-off-outline' : 'eye-outline'} size={17} color={MUTED} />
              </TouchableOpacity>
            </InputRow>
            {errors.confirmPassword ? <Text style={s.err}>{errors.confirmPassword}</Text> : null}

            {/* Submit */}
            <TouchableOpacity style={[s.btn, busy && s.btnDisabled]} onPress={handleRegister} disabled={busy} activeOpacity={0.88}>
              <View style={s.btnInner}>
                <Text style={s.btnText}>{busy ? (uploadingAvatar ? 'Uploading photo…' : 'Creating Account…') : 'Create Account'}</Text>
                {!busy && <Ionicons name="arrow-forward" size={17} color={WHITE} style={{ marginLeft: 6 }} />}
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
              <Ionicons name="person-outline" size={15} color={MUTED} />
              <Text style={s.guestBtnText}>Continue as Guest</Text>
              <Ionicons name="arrow-forward" size={13} color={MUTED} />
            </TouchableOpacity>

            <Text style={s.guestNote}>
              Browse the campus map, dining, and public info without an account.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Programme picker — populated from DB based on selected department */}
      <PickerModal visible={showProg} title="Select Programme"
        options={progOptions} value={form.programme}
        onSelect={(v) => { set('programme')(v); clearError('programme'); }}
        onClose={() => setShowProg(false)} />

      {/* Department picker — stores dept ID for programme fetch, name in form */}
      <PickerModal visible={showDept} title="Select Department"
        options={deptOptions} value={selectedDeptId}
        onSelect={(deptId) => {
          const dept = departments.find((d) => d.id === deptId);
          setSelectedDeptId(deptId);
          setForm((f) => ({ ...f, department: dept?.name || '', programme: '' }));
          clearError('department');
          clearError('programme');
        }}
        onClose={() => setShowDept(false)} />
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: WHITE },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 12,
  },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  title:    { fontSize: 24, fontFamily: FONTS.extraBold, color: DARK, letterSpacing: -0.4 },
  subtitle: { fontSize: 13, fontFamily: FONTS.regular,   color: MUTED, marginTop: 2 },

  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 48 },

  sectionHeader: {
    fontSize: 11, fontFamily: FONTS.bold, color: '#94A3B8',
    letterSpacing: 1.2, marginTop: 20, marginBottom: 10, flex: 1,
  },
  label: { fontSize: 13, fontFamily: FONTS.semiBold, color: '#374151', marginBottom: 6 },
  req:   { color: '#EF4444' },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: INPUT_BG, borderRadius: 13,
    borderWidth: 1.5, borderColor: BORDER,
    paddingHorizontal: 14, height: 52, gap: 10, marginBottom: 14,
  },
  inputRowFocused: { backgroundColor: INPUT_FOCUS, borderColor: BORDER_FOCUS },
  inputRowError:   { borderColor: '#FCA5A5' },
  input: { flex: 1, fontSize: 15, fontFamily: FONTS.regular, color: DARK },
  err:   { fontSize: 12, fontFamily: FONTS.medium, color: '#DC2626', marginTop: -10, marginBottom: 10 },

  rowFields: { flexDirection: 'row', gap: 10 },
  halfWrap:  { flex: 1 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 10 },
  deptCountBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  deptCountText:    { fontSize: 10, fontFamily: FONTS.medium, color: MUTED },

  inputRowLocked: { opacity: 0.5, borderColor: '#E2E8F0' },
  fieldHint:      { fontSize: 11, fontFamily: FONTS.regular, color: '#94A3B8', marginTop: -10, marginBottom: 10, paddingLeft: 2 },

  avatarSection: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#F8FAFC', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    padding: 14, marginBottom: 4,
  },
  avatarWrap: { position: 'relative' },
  avatar:     { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#F1F5F9',
    borderWidth: 2, borderColor: '#CBD5E0', borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: BLUE,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: WHITE,
  },
  avatarInfo:  { flex: 1 },
  avatarTitle: { fontSize: 14, fontFamily: FONTS.semiBold, color: DARK },
  avatarSub:   { fontSize: 12, fontFamily: FONTS.regular,  color: MUTED, marginTop: 2 },

  btn: {
    height: 52, backgroundColor: BLUE, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
    shadowColor: BLUE, shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }, elevation: 5,
  },
  btnDisabled: { opacity: 0.6 },
  btnInner:    { flexDirection: 'row', alignItems: 'center' },
  btnText:     { fontSize: 16, fontFamily: FONTS.bold, color: WHITE, letterSpacing: 0.3 },

  loginRow:    { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  loginPrompt: { fontSize: 14, fontFamily: FONTS.regular, color: DARK },
  loginLink:   { fontSize: 14, fontFamily: FONTS.bold,    color: DARK },

  guestRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 20, marginBottom: 14,
  },
  guestDivider:     { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  guestDividerText: { fontSize: 12, fontFamily: FONTS.regular, color: '#94A3B8' },
  guestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC', marginBottom: 10,
  },
  guestBtnText: { fontSize: 14, fontFamily: FONTS.semiBold, color: MUTED },
  guestNote: {
    fontSize: 11, fontFamily: FONTS.regular, color: '#94A3B8',
    textAlign: 'center', lineHeight: 16,
    paddingHorizontal: 10, marginBottom: 10,
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
