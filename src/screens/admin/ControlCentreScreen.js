import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, TextInput, Modal, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADMIN_THEME } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../config/supabase';
import { addItem } from '../../services/databaseService';

const PRIMARY = ADMIN_THEME.primary;
const DANGER  = '#EF4444';
const BLUE    = '#2563EB';

const PUSH_NOTIF_KEY   = '@rmu_push_notifications';
const MAINTENANCE_KEY  = '@rmu_maintenance_mode';

// ── Shared helpers ────────────────────────────────────────────────────────────
const Segment = ({ tabs, active, onChange }) => (
  <View style={seg.wrap}>
    {tabs.map((t) => (
      <TouchableOpacity key={t} style={[seg.btn, active === t && seg.btnActive]} onPress={() => onChange(t)} activeOpacity={0.8}>
        <Text style={[seg.label, active === t && seg.labelActive]}>{t}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

function FormModal({ visible, title, onClose, children, onSave, saving, saveLabel = 'Save Changes' }) {
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={md.overlay} activeOpacity={1} onPress={onClose} />
      <View style={md.sheet}>
        <View style={md.handle} />
        <View style={md.sheetHeader}>
          <Text style={md.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-outline" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}>
          {children}
          <TouchableOpacity
            style={[md.saveBtn, saving && { opacity: 0.6 }]}
            onPress={onSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator color="#FFFFFF" size="small" />
              : <Text style={md.saveBtnText}>{saveLabel}</Text>}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Emergency Tab ─────────────────────────────────────────────────────────────
const ALERT_TYPES = ['Fire', 'Medical', 'Security', 'Natural Disaster', 'Power Outage', 'Other'];

function EmergencyTab() {
  const [alertType, setAlertType] = useState('');
  const [message,   setMessage]   = useState('');
  const [location,  setLocation]  = useState('');
  const [sending,   setSending]   = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await addItem('notifications', {
        title:              `🚨 EMERGENCY: ${alertType}`,
        message:            message.trim(),
        category:           'Emergency',
        audience:           'everyone',
        is_pinned:          true,
        emergency_location: location.trim() || null,
      });
      Alert.alert('Alert Sent', 'Emergency alert broadcast to all users.', [
        { text: 'OK', onPress: () => { setAlertType(''); setMessage(''); setLocation(''); } },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSending(false);
    }
  };

  const confirmSend = () =>
    Alert.alert('Confirm Emergency Alert', `Send "${alertType}" alert to ALL campus users?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send Now', style: 'destructive', onPress: handleSend },
    ]);

  return (
    <ScrollView contentContainerStyle={e.scroll} showsVerticalScrollIndicator={false}>
      <View style={e.warningBanner}>
        <Ionicons name="warning-outline" size={20} color="#92400E" />
        <Text style={e.warningText}>
          Emergency alerts are broadcast immediately to all campus users. Use only in genuine emergencies.
        </Text>
      </View>
      <Text style={e.sectionTitle}>Alert Type</Text>
      <View style={e.typeGrid}>
        {ALERT_TYPES.map((t) => (
          <TouchableOpacity key={t} style={[e.typeChip, alertType === t && e.typeChipActive]}
            onPress={() => setAlertType(t)} activeOpacity={0.8}>
            <Text style={[e.typeChipText, alertType === t && e.typeChipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[e.sectionTitle, { marginTop: 12 }]}>Location (optional)</Text>
      <TextInput style={e.input} placeholder="e.g. Engineering Block, Lecture Hall 2"
        placeholderTextColor="#94A3B8" value={location} onChangeText={setLocation} />
      <Text style={[e.sectionTitle, { marginTop: 12 }]}>Alert Message</Text>
      <TextInput style={[e.input, { height: 100, textAlignVertical: 'top' }]}
        placeholder="Describe the emergency clearly…" placeholderTextColor="#94A3B8"
        value={message} onChangeText={setMessage} multiline />
      <TouchableOpacity
        style={[e.sendBtn, (!alertType || !message.trim() || sending) && e.sendBtnDisabled]}
        onPress={confirmSend} disabled={!alertType || !message.trim() || sending} activeOpacity={0.85}>
        <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
        <Text style={e.sendBtnText}>{sending ? 'Sending…' : 'Send Emergency Alert'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ── Admin Profile Modal ───────────────────────────────────────────────────────
function AdminProfileModal({ visible, user, onClose }) {
  const [fullName, setFullName] = useState('');
  const [phone,    setPhone]    = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    if (visible && user) {
      // Load current profile from DB
      supabase.from('users').select('full_name, phone').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setFullName(data.full_name || '');
            setPhone(data.phone || '');
          }
        });
    }
  }, [visible, user]);

  const handleSave = async () => {
    if (!fullName.trim()) { Alert.alert('Required', 'Full name cannot be empty.'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('users')
        .update({ full_name: fullName.trim(), phone: phone.trim() || null })
        .eq('id', user.id);
      if (error) throw error;
      Alert.alert('Updated', 'Your profile has been updated successfully.', [
        { text: 'OK', onPress: onClose },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormModal visible={visible} title="Admin Profile" onClose={onClose} onSave={handleSave} saving={saving}>
      {/* Email — read-only */}
      <View style={md.fieldWrap}>
        <Text style={md.label}>Email Address</Text>
        <View style={md.readOnlyRow}>
          <Ionicons name="mail-outline" size={16} color="#94A3B8" />
          <Text style={md.readOnlyText}>{user?.email || '—'}</Text>
          <View style={md.lockedBadge}>
            <Ionicons name="lock-closed-outline" size={11} color="#94A3B8" />
            <Text style={md.lockedText}>Read-only</Text>
          </View>
        </View>
      </View>

      <View style={md.fieldWrap}>
        <Text style={md.label}>Full Name <Text style={{ color: DANGER }}>*</Text></Text>
        <TextInput style={md.input} value={fullName} onChangeText={setFullName}
          placeholder="Enter your full name" placeholderTextColor="#94A3B8"
          autoCapitalize="words" />
      </View>

      <View style={md.fieldWrap}>
        <Text style={md.label}>Phone Number</Text>
        <TextInput style={md.input} value={phone} onChangeText={setPhone}
          placeholder="+233..." placeholderTextColor="#94A3B8" keyboardType="phone-pad" />
      </View>
    </FormModal>
  );
}

// ── Security / Change Password Modal ─────────────────────────────────────────
function SecurityModal({ visible, onClose }) {
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew,         setShowNew]         = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [saving,          setSaving]          = useState(false);

  useEffect(() => {
    if (visible) { setNewPassword(''); setConfirmPassword(''); }
  }, [visible]);

  const handleSave = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Too short', 'Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      Alert.alert('Password Updated', 'Your password has been changed successfully.', [
        { text: 'OK', onPress: onClose },
      ]);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const PasswordInput = ({ label, value, onChange, show, onToggle }) => (
    <View style={md.fieldWrap}>
      <Text style={md.label}>{label}</Text>
      <View style={md.passwordRow}>
        <TextInput
          style={md.passwordInput}
          value={value}
          onChangeText={onChange}
          placeholder="••••••••"
          placeholderTextColor="#94A3B8"
          secureTextEntry={!show}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color="#64748B" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <FormModal visible={visible} title="Change Password" onClose={onClose}
      onSave={handleSave} saving={saving} saveLabel="Update Password">
      <View style={md.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
        <Text style={md.infoText}>
          Choose a strong password of at least 8 characters. You will stay signed in after the change.
        </Text>
      </View>
      <PasswordInput label="New Password" value={newPassword} onChange={setNewPassword}
        show={showNew} onToggle={() => setShowNew((v) => !v)} />
      <PasswordInput label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword}
        show={showConfirm} onToggle={() => setShowConfirm((v) => !v)} />
      {newPassword.length > 0 && newPassword.length < 8 && (
        <Text style={md.weakText}>⚠ Password must be at least 8 characters</Text>
      )}
      {newPassword.length >= 8 && confirmPassword.length > 0 && newPassword !== confirmPassword && (
        <Text style={md.weakText}>⚠ Passwords do not match</Text>
      )}
    </FormModal>
  );
}

// ── Settings Tab ─────────────────────────────────────────────────────────────
function SettingsTab() {
  const { logout, user } = useAuth();

  const [pushEnabled,   setPushEnabled]   = useState(true);
  const [maintenance,   setMaintenance]   = useState(false);
  const [togglingPush,  setTogglingPush]  = useState(false);
  const [togglingMaint, setTogglingMaint] = useState(false);
  const [profileOpen,   setProfileOpen]   = useState(false);
  const [securityOpen,  setSecurityOpen]  = useState(false);

  // Load persisted prefs on mount
  useEffect(() => {
    AsyncStorage.multiGet([PUSH_NOTIF_KEY, MAINTENANCE_KEY]).then((pairs) => {
      const push  = pairs[0][1];
      const maint = pairs[1][1];
      if (push  !== null) setPushEnabled(push  === 'true');
      if (maint !== null) setMaintenance(maint === 'true');
    });
  }, []);

  const handlePushToggle = async (value) => {
    setTogglingPush(true);
    try {
      await AsyncStorage.setItem(PUSH_NOTIF_KEY, String(value));
      setPushEnabled(value);
      Alert.alert(
        value ? 'Notifications Enabled' : 'Notifications Disabled',
        value
          ? 'Push notifications are now active for all users.'
          : 'Push notifications have been turned off system-wide.',
      );
    } catch {
      Alert.alert('Error', 'Could not save notification preference.');
    } finally {
      setTogglingPush(false);
    }
  };

  const handleMaintenanceToggle = async (value) => {
    const confirm = await new Promise((resolve) =>
      Alert.alert(
        value ? 'Enable Maintenance Mode?' : 'Disable Maintenance Mode?',
        value
          ? 'This will post a system notice to all users and restrict student access.'
          : 'This will remove the maintenance notice and restore student access.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Confirm', onPress: () => resolve(true) },
        ],
      )
    );
    if (!confirm) return;

    setTogglingMaint(true);
    try {
      await AsyncStorage.setItem(MAINTENANCE_KEY, String(value));
      setMaintenance(value);

      if (value) {
        // Post a pinned maintenance notification
        await addItem('notifications', {
          title:    '🔧 Campus Map Maintenance',
          message:  'The RMU Campus Map is currently undergoing scheduled maintenance. Some features may be temporarily unavailable. We apologise for the inconvenience.',
          category: 'General',
          audience: 'everyone',
          is_pinned: true,
        });
        Alert.alert('Maintenance Mode On', 'A maintenance notice has been posted to all users.');
      } else {
        Alert.alert('Maintenance Mode Off', 'Campus Map has been restored to normal operation.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setTogglingMaint(false);
    }
  };

  const SettingRow = ({ icon, label, subtitle, onPress, right, iconBg }) => (
    <TouchableOpacity style={st.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={[st.rowIcon, iconBg && { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={20} color={PRIMARY} />
      </View>
      <View style={st.rowBody}>
        <Text style={st.rowLabel}>{label}</Text>
        {subtitle ? <Text style={st.rowSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </TouchableOpacity>
  );

  return (
    <>
      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>

        {/* Maintenance Mode banner */}
        {maintenance && (
          <View style={st.maintBanner}>
            <Ionicons name="construct-outline" size={16} color="#92400E" />
            <Text style={st.maintBannerText}>Maintenance mode is active — students see a system notice.</Text>
          </View>
        )}

        <Text style={st.groupTitle}>Preferences</Text>
        <View style={st.card}>
          <SettingRow
            icon="notifications-outline"
            label="Push Notifications"
            subtitle={pushEnabled ? 'Notifications are active system-wide' : 'Notifications are disabled'}
            right={
              togglingPush
                ? <ActivityIndicator size="small" color={PRIMARY} />
                : <Switch value={pushEnabled} onValueChange={handlePushToggle}
                    trackColor={{ false: '#E2E8F0', true: PRIMARY + '80' }}
                    thumbColor={pushEnabled ? PRIMARY : '#FFFFFF'} />
            }
          />
          <View style={st.divider} />
          <SettingRow
            icon="construct-outline"
            label="Maintenance Mode"
            subtitle={maintenance ? 'Active — student access restricted' : 'Off — all users have full access'}
            right={
              togglingMaint
                ? <ActivityIndicator size="small" color={DANGER} />
                : <Switch value={maintenance} onValueChange={handleMaintenanceToggle}
                    trackColor={{ false: '#E2E8F0', true: DANGER + '80' }}
                    thumbColor={maintenance ? DANGER : '#FFFFFF'} />
            }
          />
        </View>

        <Text style={st.groupTitle}>Account</Text>
        <View style={st.card}>
          <SettingRow
            icon="person-outline"
            label="Admin Profile"
            subtitle={user?.email || 'View and update your account'}
            onPress={() => setProfileOpen(true)}
            right={<Ionicons name="chevron-forward" size={16} color="#CBD5E0" />}
          />
          <View style={st.divider} />
          <SettingRow
            icon="shield-checkmark-outline"
            label="Security"
            subtitle="Change your password"
            onPress={() => setSecurityOpen(true)}
            right={<Ionicons name="chevron-forward" size={16} color="#CBD5E0" />}
          />
        </View>

        <Text style={st.groupTitle}>System</Text>
        <View style={st.card}>
          <SettingRow
            icon="information-circle-outline"
            label="App Version"
            subtitle="v1.0.0 — RMU Campus Navigation"
            right={null}
          />
          <View style={st.divider} />
          <SettingRow
            icon="help-circle-outline"
            label="Support"
            subtitle="Contact technical support"
            onPress={() => Alert.alert('Support', 'Contact: it@rmu.edu.gh')}
            right={<Ionicons name="chevron-forward" size={16} color="#CBD5E0" />}
          />
        </View>

        <TouchableOpacity
          style={st.logoutBtn}
          onPress={() => Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout },
          ])}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={18} color={DANGER} />
          <Text style={st.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <AdminProfileModal visible={profileOpen} user={user} onClose={() => setProfileOpen(false)} />
      <SecurityModal     visible={securityOpen}             onClose={() => setSecurityOpen(false)} />
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function ControlCentreScreen({ navigation, route }) {
  const [tab, setTab] = useState(route?.params?.initialTab || 'Emergency');

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Control Centre</Text>
          <Text style={s.headerSub}>Emergency alerts & settings</Text>
        </View>
      </View>

      <View style={s.segWrap}>
        <Segment tabs={['Emergency', 'Settings']} active={tab} onChange={setTab} />
      </View>

      <View style={s.content}>
        {tab === 'Emergency' ? <EmergencyTab /> : <SettingsTab />}
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: PRIMARY },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 20, gap: 12,
  },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  segWrap: { paddingHorizontal: 16, paddingBottom: 16 },
  content: {
    flex: 1, backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    overflow: 'hidden',
  },
});

const seg = StyleSheet.create({
  wrap: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12, padding: 4,
  },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnActive: { backgroundColor: '#FFFFFF' },
  label: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  labelActive: { color: PRIMARY, fontWeight: '700' },
});

const e = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48 },
  warningBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: '#FFFBEB', borderRadius: 14,
    borderWidth: 1, borderColor: '#FDE68A',
    padding: 14, marginBottom: 20,
  },
  warningText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 19 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 10 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  typeChip: {
    paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: '#FFFFFF', borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  typeChipActive: { backgroundColor: '#FEF2F2', borderColor: DANGER },
  typeChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  typeChipTextActive: { color: DANGER },
  input: {
    backgroundColor: '#FFFFFF', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#0F172A',
  },
  sendBtn: {
    height: 54, backgroundColor: DANGER, borderRadius: 14,
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 8, marginTop: 16,
    shadowColor: DANGER, shadowOpacity: 0.3,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
});

const st = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 48 },
  maintBanner: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: '#FFFBEB', borderRadius: 12,
    borderWidth: 1, borderColor: '#FDE68A',
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 4,
  },
  maintBannerText: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '500' },
  groupTitle: {
    fontSize: 12, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 0.8, marginTop: 16, marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  rowIcon: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: PRIMARY + '12',
    justifyContent: 'center', alignItems: 'center',
  },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  rowSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 66 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 24, paddingVertical: 14,
    backgroundColor: '#FEF2F2', borderRadius: 14,
    borderWidth: 1, borderColor: '#FECACA',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: DANGER },
});

// ── Modal styles ──────────────────────────────────────────────────────────────
const md = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22, paddingTop: 12,
    maxHeight: '85%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#0F172A',
  },
  readOnlyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  readOnlyText: { flex: 1, fontSize: 15, color: '#64748B' },
  lockedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#F1F5F9', borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  lockedText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  passwordInput: { flex: 1, fontSize: 15, color: '#0F172A' },
  infoBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#EFF6FF', borderRadius: 12,
    borderWidth: 1, borderColor: '#BFDBFE',
    padding: 12, marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, color: '#1E40AF', lineHeight: 18 },
  weakText: { fontSize: 12, color: DANGER, fontWeight: '500', marginTop: -8, marginBottom: 8 },
  saveBtn: {
    height: 52, backgroundColor: BLUE, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 8,
    shadowColor: BLUE, shadowOpacity: 0.28,
    shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
});
