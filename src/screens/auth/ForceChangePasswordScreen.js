import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { LockPasswordIcon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { supabase } from '../../config/supabase';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/InputField';

export default function ForceChangePasswordScreen() {
  const { user, clearMustChangePassword } = useAuth();

  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [done,            setDone]            = useState(false);

  const validate = () => {
    if (newPassword.length < 8)
      return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(newPassword))
      return 'Password must include at least one uppercase letter.';
    if (!/[0-9]/.test(newPassword))
      return 'Password must include at least one number.';
    if (newPassword !== confirmPassword)
      return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setError('');
    setLoading(true);
    try {
      // 1. Update the password
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;

      // 2. Clear the must_change_password flag in metadata
      await supabase.auth.updateUser({ data: { must_change_password: false } });

      // 3. Sign out completely — forces a fresh, clean login with the new password.
      //    This avoids stale session / infinite loading on the dashboard after
      //    a forced password reset. onAuthStateChange clears state → Auth stack shown.
      await supabase.auth.signOut();

      // setDone briefly shows the success screen before the auth state clears
      setDone(true);
    } catch (err) {
      setError(err.message || 'Could not update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={s.successRoot}>
        <View style={s.successCard}>
          <View style={s.successIconCircle}>
            <HugeiconsIcon icon={CheckmarkCircle01Icon} size={52} color="#10B981" variant="solid" />
          </View>
          <Text style={s.successTitle}>Password Updated!</Text>
          <Text style={s.successSub}>
            Your password has been changed successfully. Please sign in with your new password to continue.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.iconWrap}>
            <HugeiconsIcon icon={LockPasswordIcon} size={28} color="#FFFFFF" variant="solid" />
          </View>
          <Text style={s.title}>Change Your Password</Text>
          <Text style={s.subtitle}>
            Your account was set up with a temporary password. Please create a new secure password to continue.
          </Text>
          {user?.email ? (
            <View style={s.emailBadge}>
              <Ionicons name="mail-outline" size={14} color="#1A365D" />
              <Text style={s.emailText}>{user.email}</Text>
            </View>
          ) : null}
        </View>

        {/* Form card */}
        <View style={s.card}>
          {/* New password */}
          <Text style={s.fieldLabel}>New Password</Text>
          <View style={s.inputWrap}>
            <InputField
              value={newPassword}
              onChangeText={(v) => { setNewPassword(v); setError(''); }}
              placeholder="Min. 8 characters"
              secureTextEntry={!showNew}
              autoCapitalize="none"
              style={s.input}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowNew((v) => !v)} activeOpacity={0.7}>
              <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Confirm password */}
          <Text style={s.fieldLabel}>Confirm New Password</Text>
          <View style={s.inputWrap}>
            <InputField
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
              placeholder="Re-enter your new password"
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              style={s.input}
            />
            <TouchableOpacity style={s.eyeBtn} onPress={() => setShowConfirm((v) => !v)} activeOpacity={0.7}>
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Requirements */}
          <View style={s.requirements}>
            <Requirement met={newPassword.length >= 8}         label="At least 8 characters" />
            <Requirement met={/[A-Z]/.test(newPassword)}       label="At least one uppercase letter" />
            <Requirement met={/[0-9]/.test(newPassword)}       label="At least one number" />
            <Requirement met={newPassword === confirmPassword && newPassword.length > 0} label="Passwords match" />
          </View>

          {!!error && (
            <View style={s.errorBanner}>
              <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
              <Text style={s.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.submitBtn, (loading || newPassword.length < 8) && s.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading || newPassword.length < 8}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={s.submitText}>Set New Password</Text>}
          </TouchableOpacity>
        </View>

        <Text style={s.note}>
          After changing your password you'll be taken to your dashboard automatically.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const Requirement = ({ met, label }) => (
  <View style={s.reqRow}>
    <Ionicons
      name={met ? 'checkmark-circle' : 'ellipse-outline'}
      size={14}
      color={met ? '#10B981' : '#CBD5E0'}
    />
    <Text style={[s.reqLabel, met && s.reqLabelMet]}>{label}</Text>
  </View>
);

const s = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 64, paddingBottom: 40 },

  header: { marginBottom: 28 },
  iconWrap: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: '#1A365D',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
    shadowColor: '#1A365D', shadowOpacity: 0.3, shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 }, elevation: 6,
  },
  title:    { fontSize: 26, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  subtitle: { fontSize: 15, color: '#475569', marginTop: 8, lineHeight: 22 },
  emailBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EFF6FF', borderRadius: 10,
    paddingVertical: 8, paddingHorizontal: 12, marginTop: 14, alignSelf: 'flex-start',
  },
  emailText: { fontSize: 13, color: '#1A365D', fontWeight: '600' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22,
    borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#0F172A', shadowOpacity: 0.07, shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputWrap:  { position: 'relative', marginBottom: 18 },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 12, paddingHorizontal: 14, paddingRight: 44, paddingVertical: 13,
    fontSize: 14, color: '#0F172A',
  },
  eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },

  requirements: { marginBottom: 18, gap: 8 },
  reqRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqLabel:    { fontSize: 12, color: '#94A3B8' },
  reqLabelMet: { color: '#059669', fontWeight: '600' },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#FECACA', marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, color: '#DC2626', lineHeight: 18 },

  submitBtn: {
    height: 52, backgroundColor: '#1A365D', borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#1A365D', shadowOpacity: 0.25, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  note: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 20, lineHeight: 18 },

  // Success state
  successRoot: {
    flex: 1, backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
  },
  successCard: {
    width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24,
    padding: 28, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 }, elevation: 8,
  },
  successIconCircle: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: '#ECFDF5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 10 },
  successSub:   { fontSize: 14, color: '#475569', textAlign: 'center', lineHeight: 21 },
});
