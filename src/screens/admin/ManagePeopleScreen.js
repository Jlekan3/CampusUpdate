import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import ScreenWrapper from '../../components/ScreenWrapper';
import { supabase } from '../../config/supabase';
import { createUserWithAuthAndFirestore } from '../../services/databaseService';

// Auto-generate a secure temp password (staff will be prompted to change on first login)
const generateTempPassword = () => {
  const upper   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower   = 'abcdefghjkmnpqrstuvwxyz';
  const digits  = '23456789';
  const special = '@#!';
  const all     = upper + lower + digits + special;
  const pw = [
    upper[Math.floor(Math.random()   * upper.length)],
    lower[Math.floor(Math.random()   * lower.length)],
    digits[Math.floor(Math.random()  * digits.length)],
    special[Math.floor(Math.random() * special.length)],
    ...Array.from({ length: 6 }, () => all[Math.floor(Math.random() * all.length)]),
  ];
  for (let i = pw.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pw[i], pw[j]] = [pw[j], pw[i]];
  }
  return pw.join('');
};

// ── Clean Design Tokens ───────────────────────────────────────────────────────
const NAVY = '#1A365D';
const GOLD = '#C5A047';
const SLATE = '#0F172A';
const MUTED = '#64748B';
const LIGHT = '#94A3B8';
const BG = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER = '#E2E8F0';

const ROLE_THEMES = {
  admin: { color: '#DC2626', bg: '#FEF2F2', label: 'Admin' },
  faculty: { color: '#7C3AED', bg: '#F5F3FF', label: 'Faculty' },
  student: { color: '#2563EB', bg: '#EFF6FF', label: 'Student' },
};

export default function ManagePeopleScreen({ navigation }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [selectedUser, setSelectedUser] = useState(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Department picker
  const [departments, setDepartments] = useState([]);
  const [deptPickerVisible, setDeptPickerVisible] = useState(false);

  useEffect(() => {
    fetchUsers();
    supabase
      .from('departments')
      .select('id, name')
      .order('name')
      .then(({ data }) => { if (data) setDepartments(data); });
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const q = search.toLowerCase();
    return (
      (user.full_name || '').toLowerCase().includes(q) ||
      (user.email || '').toLowerCase().includes(q) ||
      (user.role || '').toLowerCase().includes(q)
    );
  });

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setSelectedUser(null);
    setFullName('');
    setEmail('');
    setRole('staff');
    setPhone('');
    setDepartment('');
    setPosition('');
    setStaffId('');
    setPassword('');
    setShowPassword(false);
    setModalVisible(true);
  };

  const handleOpenEditModal = (user) => {
    // Safety check: block if admin attempts to open form edit for student entries
    if (user.role?.toLowerCase() === 'student') {
      Alert.alert('Action Denied', 'Student profiles cannot be modified directly. Use Archive or Delete operations.');
      return;
    }

    setIsEditing(true);
    setSelectedUser(user);
    setFullName(user.full_name || '');
    setEmail(user.email || '');
    setRole(user.role?.toLowerCase() || 'staff');
    setPhone(user.phone || '');
    setDepartment(user.department || '');
    setPosition(user.position || '');
    setStaffId(user.staff_id || '');
    setModalVisible(true);
  };

  const handleSaveUser = async () => {
    if (!fullName.trim() || !email.trim()) {
      Alert.alert('Required Fields', 'Please fill in Name and Email address.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        full_name: fullName,
        email: email,
        role: role, // Will save safely as 'faculty' or other designated roles
        phone: phone || null,
        department: department || null,
        position: position || null,
        staff_id: staffId || null,
        updated_at: new Date(),
      };

      if (isEditing && selectedUser) {
        const { error } = await supabase
          .from('users')
          .update(payload)
          .eq('id', selectedUser.id);

        if (error) throw error;
        Alert.alert('Success', 'Profile updated successfully.');
      } else {
        // Use the password from the form if provided, otherwise auto-generate one.
        // createUserWithAuthAndFirestore creates the auth.users row first (which
        // generates the UUID), then upserts public.users — fixing the null id error.
        // The auto_confirm_staff trigger in Supabase skips email verification for
        // non-@st.rmu.edu.gh addresses, so staff can log in immediately.
        const tempPassword = password.trim() || generateTempPassword();
        await createUserWithAuthAndFirestore(email.trim(), tempPassword, {
          full_name:    fullName.trim(),
          display_name: fullName.trim(),
          role,
          phone:        phone     || null,
          department:   department || null,
          position:     position  || null,
          staff_id:     staffId   || null,
        });
        Alert.alert(
          'Account Created',
          `Staff account created for ${email.trim()}.\n\nTemporary password:\n${tempPassword}\n\nThey will be asked to change it on first login.`
        );
      }
      setModalVisible(false);
      fetchUsers();
    } catch (error) {
      Alert.alert('Error Saving Data', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleArchiveUser = (user) => {
    // If your user table doesn't have an explicit 'is_active' column yet, you can toggle a metadata state, 
    // or utilize this block to switch roles/suspend credentials cleanly.
    const currentStatus = user.is_anonymous ? 'Restore' : 'Archive';
    Alert.alert(
      `${currentStatus} User`,
      `Are you sure you want to change the active visibility state for ${user.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentStatus,
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('users')
                .update({ is_anonymous: !user.is_anonymous, updated_at: new Date() })
                .eq('id', user.id);

              if (error) throw error;
              Alert.alert('Status Updated', 'User visibility state adjusted.');
              fetchUsers();
            } catch (err) {
              Alert.alert('Operation Failed', err.message);
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleDeleteUser = (userId) => {
    Alert.alert(
      'Delete User Record',
      'Are you completely sure you want to remove this profile registry row? This action is permanent.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('users').delete().eq('id', userId);
              if (error) throw error;
              fetchUsers();
            } catch (err) {
              Alert.alert('Deletion Error', err.message);
            }
          }
        }
      ]
    );
  };

  // ── Excel / CSV import ──────────────────────────────────────────────────────
  const handleImportRows = async (rows) => {
    const toInsert = [];
    const skipped  = [];

    rows.forEach((row, i) => {
      const full_name  = (row['full_name']  || row['Full Name']  || row['name']     || '').toString().trim();
      const email      = (row['email']      || row['Email']      || '').toString().trim().toLowerCase();
      const phone      = (row['phone']      || row['Phone']      || '').toString().trim() || null;
      const staff_id   = (row['staff_id']   || row['Staff ID']   || '').toString().trim() || null;
      const department = (row['department'] || row['Department'] || '').toString().trim() || null;
      const position   = (row['position']   || row['Position']   || '').toString().trim() || null;

      if (!full_name || !email) {
        skipped.push(`Row ${i + 2}: missing full_name or email`);
        return;
      }
      toInsert.push({ full_name, email, role: 'staff', phone, staff_id, department, position, is_anonymous: false });
    });

    if (!toInsert.length) {
      Alert.alert('No valid rows', skipped.length ? skipped.join('\n') : 'The file contained no valid rows.\n\nExpected columns: full_name, email, phone, staff_id, department, position');
      setImporting(false);
      return;
    }

    const { error } = await supabase.from('users').insert(toInsert);
    if (error) throw error;

    fetchUsers();
    let msg = `${toInsert.length} staff record${toInsert.length === 1 ? '' : 's'} imported.`;
    if (skipped.length) msg += `\n\n${skipped.length} row${skipped.length === 1 ? '' : 's'} skipped:\n${skipped.join('\n')}`;
    Alert.alert('Import Complete', msg);
    setImporting(false);
  };

  const handleImportStaff = async () => {
    try {
      setImporting(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
          'application/csv',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) { setImporting(false); return; }

      const file   = result.assets[0];
      const isCsv  = file.name?.toLowerCase().endsWith('.csv');
      const fileText = isCsv
        ? await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 })
        : await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });

      const workbook = isCsv
        ? XLSX.read(fileText, { type: 'string' })
        : XLSX.read(fileText, { type: 'base64' });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows  = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      await handleImportRows(rows);
    } catch (err) {
      setImporting(false);
      Alert.alert('Import Failed', err?.message || 'Could not read file. Use .xlsx or .csv format.');
    }
  };

  return (
    <ScreenWrapper backgroundColor={BG} statusBarStyle="dark-content">
      {/* ── HEADER BLOCK ── */}
      <View style={s.headerContainer}>
        <TouchableOpacity style={s.backIconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color={SLATE} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSubtitle}>ADMINISTRATION</Text>
          <Text style={s.headerTitle}>Manage Directory</Text>
        </View>
        <TouchableOpacity style={s.addFloatingActionBtn} onPress={handleOpenAddModal}>
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* ── SEARCH FILTERS ROW ── */}
      <View style={s.searchSection}>
        <Ionicons name="search-outline" size={18} color={LIGHT} style={{ marginRight: 10 }} />
        <TextInput
          style={s.searchInputField}
          placeholder="Search by name, email, or role..."
          placeholderTextColor={LIGHT}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={LIGHT} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Import button ── */}
      <TouchableOpacity
        style={[s.importBtn, importing && { opacity: 0.6 }]}
        onPress={handleImportStaff}
        disabled={importing}
        activeOpacity={0.8}
      >
        <Ionicons name={importing ? 'hourglass-outline' : 'cloud-upload-outline'} size={16} color={NAVY} />
        <Text style={s.importBtnText}>{importing ? 'Importing…' : 'Import from Excel / CSV'}</Text>
      </TouchableOpacity>

      {/* ── MAIN DIRECTORY TRANSLATION LIST ── */}
      {loading && users.length === 0 ? (
        <View style={s.centeredIndicatorContainer}>
          <ActivityIndicator size="large" color={NAVY} />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyStateContainer}>
              <Ionicons name="people-outline" size={48} color={LIGHT} />
              <Text style={s.emptyStateText}>No profiles found matching details</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isStudent = item.role?.toLowerCase() === 'student';
            const themeCfg = ROLE_THEMES[item.role?.toLowerCase()] || ROLE_THEMES.student;

            return (
              <View style={[s.directoryCard, item.is_anonymous && { opacity: 0.6, backgroundColor: '#F1F5F9' }]}>
                <View style={s.cardIdentityRow}>
                  {item.avatar_url ? (
                    <Image source={{ uri: item.avatar_url }} style={s.avatarAsset} />
                  ) : (
                    <View style={s.avatarPlaceholder}>
                      <Text style={s.avatarText}>{item.full_name?.charAt(0).toUpperCase() || 'U'}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.personName} numberOfLines={1}>{item.full_name}</Text>
                      {item.is_anonymous && (
                        <Text style={s.archivedLabelText}>(Archived)</Text>
                      )}
                    </View>
                    <Text style={s.personEmail} numberOfLines={1}>{item.email}</Text>
                  </View>
                  <View style={[s.badgeContainer, { backgroundColor: themeCfg.bg }]}>
                    <Text style={[s.badgeText, { color: themeCfg.color }]}>{themeCfg.label}</Text>
                  </View>
                </View>

                {/* Optional Internal Meta Data Info Row */}
                {(item.department || item.programme || item.student_id || item.staff_id) && (
                  <View style={s.metaDetailsContainer}>
                    <Ionicons name="school-outline" size={14} color={MUTED} style={{ marginRight: 6 }} />
                    <Text style={s.metaDetailsText} numberOfLines={1}>
                      {isStudent 
                        ? `ID: ${item.student_id || 'N/A'} • ${item.programme || 'Unassigned'}`
                        : `Staff ID: ${item.staff_id || 'N/A'} • ${item.department || 'General'}`
                      }
                    </Text>
                  </View>
                )}

                {/* Sub Card Custom Conditionals Actions Bar */}
                <View style={s.cardActionsRow}>
                  <View style={{ flex: 1 }} />
                  
                  {/* HIDE EDIT OPTION COMPLETELY IF THE CARD REPRESENTS A STUDENT ENTRY */}
                  {!isStudent && (
                    <TouchableOpacity style={s.secondaryActionBtn} onPress={() => handleOpenEditModal(item)}>
                      <Ionicons name="create-outline" size={15} color={NAVY} />
                      <Text style={s.secondaryActionBtnText}>Edit</Text>
                    </TouchableOpacity>
                  )}

                  {/* Archive Toggle Button Option */}
                  <TouchableOpacity style={s.archiveActionBtn} onPress={() => handleToggleArchiveUser(item)}>
                    <Ionicons name={item.is_anonymous ? "refresh-outline" : "archive-outline"} size={15} color="#4A5568" />
                    <Text style={s.archiveActionBtnText}>{item.is_anonymous ? "Restore" : "Archive"}</Text>
                  </TouchableOpacity>

                  {/* Destructive Delete Button Option */}
                  <TouchableOpacity style={s.destructiveActionBtn} onPress={() => handleDeleteUser(item.id)}>
                    <Ionicons name="trash-outline" size={15} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ── MODAL SHEET CONFIGURATION DETAILS ── */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlayFrame}>
          <View style={s.bottomSheetModalSurface}>
            <View style={s.modalIndicatorHandle} />
            
            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitleText}>{isEditing ? 'Modify Staff Profile' : 'Add New Entry'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={SLATE} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalFormScroll} showsVerticalScrollIndicator={false}>
              <Text style={s.inputLabelHeader}>Full Name *</Text>
              <TextInput style={s.cleanInputBox} value={fullName} onChangeText={setFullName} placeholder="Enter full name" placeholderTextColor={LIGHT} />

              <Text style={s.inputLabelHeader}>Email Address *</Text>
              <TextInput style={s.cleanInputBox} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="name@rmu.edu.gh" placeholderTextColor={LIGHT} />

              {!isEditing && (
                <>
                  <Text style={s.inputLabelHeader}>Password *</Text>
                  <View style={s.passwordRow}>
                    <TextInput
                      style={s.passwordInput}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Min. 6 characters"
                      placeholderTextColor={LIGHT}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={s.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={LIGHT} />
                    </TouchableOpacity>
                  </View>
                </>
              )}


              <Text style={s.inputLabelHeader}>Contact Phone Number</Text>
              <TextInput style={s.cleanInputBox} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="e.g. +233..." placeholderTextColor={LIGHT} />

              <Text style={s.inputLabelHeader}>Staff ID Number</Text>
              <TextInput style={s.cleanInputBox} value={staffId} onChangeText={setStaffId} placeholder="Enter institution staff index card code" placeholderTextColor={LIGHT} />

              <Text style={s.inputLabelHeader}>Assigned Department</Text>
              <TouchableOpacity style={s.dropdownBtn} onPress={() => setDeptPickerVisible(true)} activeOpacity={0.8}>
                <Text style={[s.dropdownBtnText, !department && { color: LIGHT }]} numberOfLines={1}>
                  {department || 'Select department'}
                </Text>
                <Ionicons name="chevron-down-outline" size={16} color={LIGHT} />
              </TouchableOpacity>
              
              <Text style={s.inputLabelHeader}>Staff Position Rank</Text>
              <TextInput style={s.cleanInputBox} value={position} onChangeText={setPosition} placeholder="e.g. Senior Lecturer" placeholderTextColor={LIGHT} />
            </ScrollView>

            <TouchableOpacity style={s.primarySubmitActionBtn} onPress={handleSaveUser}>
              <Text style={s.primarySubmitActionBtnText}>Save Profiles Registry</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* ── Department picker sheet ── */}
      <Modal animationType="slide" transparent visible={deptPickerVisible} onRequestClose={() => setDeptPickerVisible(false)}>
        <TouchableOpacity style={s.modalOverlayFrame} activeOpacity={1} onPress={() => setDeptPickerVisible(false)}>
          <View style={s.bottomSheetModalSurface} onStartShouldSetResponder={() => true}>
            <View style={s.modalIndicatorHandle} />
            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitleText}>Select Department</Text>
              <TouchableOpacity onPress={() => setDeptPickerVisible(false)}>
                <Ionicons name="close" size={22} color={SLATE} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              {departments.map((dept, i) => (
                <TouchableOpacity
                  key={dept.id}
                  style={[s.deptOption, i < departments.length - 1 && s.deptOptionBorder]}
                  onPress={() => { setDepartment(dept.name); setDeptPickerVisible(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[s.deptOptionText, department === dept.name && s.deptOptionActive]}>
                    {dept.name}
                  </Text>
                  {department === dept.name && (
                    <Ionicons name="checkmark-circle" size={18} color={NAVY} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScreenWrapper>
  );
}

// ── CLEAN PREMIUM STYLING ───────────────────────────────────────────────────
const s = StyleSheet.create({
  headerContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER },
  backIconButton: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER, backgroundColor: BG, marginRight: 12 },
  headerSubtitle: { fontSize: 10, fontWeight: '700', color: GOLD, letterSpacing: 1.2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: SLATE, marginTop: 1 },
  addFloatingActionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center' },
  
  searchSection: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 16, paddingHorizontal: 14, height: 46, borderRadius: 12, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  searchInputField: { flex: 1, fontSize: 14, color: SLATE },
  
  importBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 10, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, backgroundColor: SURFACE },
  importBtnText: { fontSize: 13, fontWeight: '700', color: NAVY },

  listContainer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40, gap: 12 },
  centeredIndicatorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyStateContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyStateText: { fontSize: 14, fontWeight: '500', color: MUTED },

  directoryCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  cardIdentityRow: { flexDirection: 'row', alignItems: 'center' },
  avatarAsset: { width: 44, height: 44, borderRadius: 22, backgroundColor: BG },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDF2F7', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: NAVY },
  personName: { fontSize: 15, fontWeight: '700', color: SLATE },
  archivedLabelText: { fontSize: 12, color: MUTED, fontWeight: '600', fontStyle: 'italic' },
  personEmail: { fontSize: 12, color: MUTED, marginTop: 2 },
  badgeContainer: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  
  metaDetailsContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, padding: 10, borderRadius: 8, backgroundColor: BG },
  metaDetailsText: { fontSize: 12, color: SLATE, fontWeight: '500' },
  
  cardActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  secondaryActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: BG },
  secondaryActionBtnText: { fontSize: 12, fontWeight: '600', color: NAVY },
  
  archiveActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: BG },
  archiveActionBtnText: { fontSize: 12, fontWeight: '600', color: '#4A5568' },
  
  destructiveActionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },

  modalOverlayFrame: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  bottomSheetModalSurface: { backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 34, maxHeight: '85%' },
  modalIndicatorHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitleText: { fontSize: 16, fontWeight: '800', color: SLATE },
  modalFormScroll: { gap: 12, paddingBottom: 20 },
  inputLabelHeader: { fontSize: 11, fontWeight: '700', color: SLATE, textTransform: 'uppercase', letterSpacing: 0.5 },
  cleanInputBox: { height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 14, backgroundColor: BG, fontSize: 14, color: SLATE },
  
  roleSelectorCluster: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  roleOptionChip: { flex: 1, height: 38, borderRadius: 8, borderWidth: 1, borderColor: BORDER, justifyContent: 'center', alignItems: 'center', backgroundColor: SURFACE },
  roleOptionChipText: { fontSize: 12, fontWeight: '600', color: MUTED },
  
  primarySubmitActionBtn: { height: 48, borderRadius: 12, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  primarySubmitActionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },

  passwordRow: { flexDirection: 'row', alignItems: 'center', height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 14, backgroundColor: BG },
  passwordInput: { flex: 1, fontSize: 14, color: SLATE },
  eyeBtn: { paddingLeft: 8 },

  dropdownBtn: { height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 14, backgroundColor: BG, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownBtnText: { fontSize: 14, color: SLATE, flex: 1 },

  deptOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  deptOptionBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  deptOptionText: { fontSize: 14, color: SLATE, flex: 1 },
  deptOptionActive: { fontWeight: '700', color: NAVY },
});