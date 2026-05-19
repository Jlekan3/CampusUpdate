import React, { useState, useEffect } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabase';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const NOTIF_PREFS_KEY = '@admin_notif_prefs';

const AdminSettingsScreen = ({ navigation }) => {
  const { colors, isDarkMode, toggleDarkMode } = useTheme();
  const { user, logout } = useAuth();

  const [displayName, setDisplayName] = useState(user?.user_metadata?.full_name || user?.email?.split('@')[0] || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);

  const [notifEmergency, setNotifEmergency] = useState(true);
  const [notifAnnouncement, setNotifAnnouncement] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_PREFS_KEY).then((raw) => {
      if (raw) {
        const prefs = JSON.parse(raw);
        setNotifEmergency(prefs.emergency ?? true);
        setNotifAnnouncement(prefs.announcement ?? true);
      }
    }).catch(() => {});
  }, []);

  const saveNotifPrefs = async (emergency, announcement) => {
    await AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify({ emergency, announcement })).catch(() => {});
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) { Alert.alert('Validation', 'Display name cannot be empty.'); return; }
    setSavingProfile(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName.trim(), display_name: displayName.trim() },
      });
      if (error) throw error;
      await supabase.from('users').update({ full_name: displayName.trim(), display_name: displayName.trim() }).eq('id', user.id);
      Alert.alert('Success', 'Profile updated.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) { Alert.alert('Validation', 'All password fields are required.'); return; }
    if (newPwd.length < 6) { Alert.alert('Validation', 'New password must be at least 6 characters.'); return; }
    if (newPwd !== confirmPwd) { Alert.alert('Validation', 'New passwords do not match.'); return; }
    setSavingPwd(true);
    try {
      // Re-authenticate by signing in again (Supabase equivalent of reauthenticate)
      const { error: reAuthError } = await supabase.auth.signInWithPassword({
        email: user.email, password: currentPwd,
      });
      if (reAuthError) { Alert.alert('Error', 'Current password is incorrect.'); return; }

      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      Alert.alert('Success', 'Password changed successfully.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to change password.');
    } finally {
      setSavingPwd(false);
    }
  };

  const SectionHeader = ({ icon, title }) => (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: '#1A365D' }]}>
        <Ionicons name={icon} size={16} color="#C5A047" />
      </View>
      <Text style={[styles.sectionTitle, { color: colors.textDark }]}>{title}</Text>
    </View>
  );

  const SettingRow = ({ icon, label, children, borderBottom = true }) => (
    <View style={[styles.settingRow, borderBottom && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={styles.settingRowLeft}>
        <Ionicons name={icon} size={18} color={colors.textMuted} style={{ marginRight: 10 }} />
        <Text style={[styles.settingLabel, { color: colors.textDark }]}>{label}</Text>
      </View>
      {children}
    </View>
  );

  return (
    <ScreenWrapper backgroundColor={colors.background} statusBarStyle="dark-content">
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroAccent} />
        <View style={styles.heroContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroText}>
            <Text style={styles.heroEyebrow}>Admin</Text>
            <Text style={styles.heroTitle}>Settings</Text>
            <Text style={styles.heroSub}>{user?.email || ''}</Text>
          </View>
          <View style={[styles.avatarCircle, { backgroundColor: '#C5A047' }]}>
            <Text style={styles.avatarText}>{(user?.user_metadata?.full_name || user?.email || 'A')[0].toUpperCase()}</Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Profile */}
        <SectionHeader icon="person-outline" title="Profile" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Display Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>Email</Text>
          <View style={[styles.inputReadonly, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.inputReadonlyText, { color: colors.textMuted }]}>{user?.email || '—'}</Text>
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={savingProfile}>
            {savingProfile ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Save Profile</Text>}
          </TouchableOpacity>
        </View>

        {/* Change password */}
        <SectionHeader icon="lock-closed-outline" title="Change Password" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.inputLabel, { color: colors.textMuted }]}>Current Password</Text>
          <View style={styles.pwdRow}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
              value={currentPwd}
              onChangeText={setCurrentPwd}
              secureTextEntry={!showCurrentPwd}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity onPress={() => setShowCurrentPwd(!showCurrentPwd)} style={styles.eyeBtn}>
              <Ionicons name={showCurrentPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>New Password</Text>
          <View style={styles.pwdRow}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
              value={newPwd}
              onChangeText={setNewPwd}
              secureTextEntry={!showNewPwd}
              placeholder="Min. 6 characters"
              placeholderTextColor={colors.textMuted}
            />
            <TouchableOpacity onPress={() => setShowNewPwd(!showNewPwd)} style={styles.eyeBtn}>
              <Ionicons name={showNewPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.inputLabel, { color: colors.textMuted, marginTop: 12 }]}>Confirm New Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
            value={confirmPwd}
            onChangeText={setConfirmPwd}
            secureTextEntry
            placeholder="Repeat new password"
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={savingPwd}>
            {savingPwd ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>Update Password</Text>}
          </TouchableOpacity>
        </View>

        {/* Appearance */}
        <SectionHeader icon="color-palette-outline" title="Appearance" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 0 }]}>
          <SettingRow icon="moon-outline" label="Dark Mode">
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: colors.border, true: '#1A365D' }}
              thumbColor={isDarkMode ? '#C5A047' : '#fff'}
            />
          </SettingRow>
        </View>

        {/* Notifications */}
        <SectionHeader icon="notifications-outline" title="Notifications" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 0 }]}>
          <SettingRow icon="alert-circle-outline" label="Emergency Alerts">
            <Switch
              value={notifEmergency}
              onValueChange={(v) => { setNotifEmergency(v); saveNotifPrefs(v, notifAnnouncement); }}
              trackColor={{ false: colors.border, true: '#E53E3E' }}
              thumbColor={notifEmergency ? '#fff' : '#fff'}
            />
          </SettingRow>
          <SettingRow icon="megaphone-outline" label="Announcements" borderBottom={false}>
            <Switch
              value={notifAnnouncement}
              onValueChange={(v) => { setNotifAnnouncement(v); saveNotifPrefs(notifEmergency, v); }}
              trackColor={{ false: colors.border, true: '#1A365D' }}
              thumbColor={notifAnnouncement ? '#C5A047' : '#fff'}
            />
          </SettingRow>
        </View>

        {/* System Info */}
        <SectionHeader icon="information-circle-outline" title="System Info" />
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 0 }]}>
          <SettingRow icon="phone-portrait-outline" label="Platform">
            <Text style={[styles.infoValue, { color: colors.textMuted }]}>{Platform.OS} {Platform.Version}</Text>
          </SettingRow>
          <SettingRow icon="cloud-outline" label="Firebase Project">
            <Text style={[styles.infoValue, { color: colors.textMuted }]} numberOfLines={1}>{auth?.app?.options?.projectId || '—'}</Text>
          </SettingRow>
          <SettingRow icon="person-circle-outline" label="Admin UID" borderBottom={false}>
            <Text style={[styles.infoValue, { color: colors.textMuted }]} numberOfLines={1}>{user?.uid?.substring(0, 12) || '—'}...</Text>
          </SettingRow>
        </View>

        {/* Logout */}
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: '#E53E3E' }]}
          onPress={() => Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout },
          ])}
        >
          <Ionicons name="log-out-outline" size={18} color="#E53E3E" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#1A365D',
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 56,
    overflow: 'hidden',
  },
  heroAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#C5A047' },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  heroText: { flex: 1 },
  heroEyebrow: { fontSize: 11, fontWeight: '700', color: '#C5A047', textTransform: 'uppercase', letterSpacing: 1.2 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 2 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#1A365D' },
  scroll: { padding: 16, paddingBottom: 40 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 8 },
  sectionIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 4, overflow: 'hidden' },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 4 },
  inputReadonly: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  inputReadonlyText: { fontSize: 14 },
  pwdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 12 },
  saveBtn: { backgroundColor: '#1A365D', borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center' },
  settingLabel: { fontSize: 14, fontWeight: '500' },
  infoValue: { fontSize: 13, maxWidth: 160, textAlign: 'right' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 20,
    marginBottom: 8,
  },
  logoutText: { color: '#E53E3E', fontSize: 15, fontWeight: '700' },
});

export default AdminSettingsScreen;
