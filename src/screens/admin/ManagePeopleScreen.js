import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import ScreenWrapper from '../../components/ScreenWrapper';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { USER_ROLES } from '../../utils/constants';
import { supabase } from '../../config/supabase';
import { deleteItem, subscribeToUsers, createUserWithAuthAndFirestore, updateItem } from '../../services/databaseService';

// Static PROGRAMMES removed — programmes are now fetched from the DB
// based on the selected department (same logic as RegisterScreen).

// ── Reusable bottom-sheet picker (fixes nested-modal tap issues) ──────────────
function PickerSheet({ visible, title, items, value, onSelect, onClose, disabled, placeholder }) {
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      {/* Wrapper with flex-end so sheet sits at bottom regardless of content */}
      <View style={sf.sheetWrap}>
        <TouchableOpacity style={sf.pickerOverlay} activeOpacity={1} onPress={onClose} />
        <View style={sf.pickerSheet}>
          <View style={sf.pickerHandle} />
          <Text style={sf.pickerTitle}>{title}</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 28 }}>
            {items.map((item, i) => {
              const label = typeof item === 'string' ? item : item.label;
              const key   = typeof item === 'string' ? item : item.value;
              const isActive = value === key;
              return (
                <TouchableOpacity key={key}
                  style={[sf.pickerOption, i < items.length - 1 && sf.pickerBorder]}
                  onPress={() => { onSelect(key); onClose(); }} activeOpacity={0.7}>
                  <Text style={[sf.pickerOptionText, isActive && sf.pickerOptionActive]}>{label}</Text>
                  {isActive && <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── Programme picker (dynamic — receives list from parent) ────────────────────
function ProgrammeDropdown({ value, onChange, programmes = [], loading, locked }) {
  const [open, setOpen] = useState(false);
  const label = locked
    ? 'Select a department first'
    : loading
      ? 'Loading programmes…'
      : value || 'Select programme';

  return (
    <>
      <TouchableOpacity
        style={[sf.dropdownBtn, locked && { opacity: 0.45 }]}
        onPress={() => { if (!locked && !loading) setOpen(true); }}
        activeOpacity={locked ? 1 : 0.8}
      >
        <Ionicons
          name={locked ? 'lock-closed-outline' : 'school-outline'}
          size={14}
          color={locked ? '#CBD5E0' : '#64748B'}
        />
        <Text style={[sf.dropdownText, !value && sf.dropdownPlaceholder, locked && { color: '#CBD5E0' }]}>
          {label}
        </Text>
        {loading ? <ActivityIndicator size="small" color="#94A3B8" /> : <Ionicons name="chevron-down-outline" size={14} color={locked ? '#CBD5E0' : '#64748B'} />}
      </TouchableOpacity>
      <PickerSheet
        visible={open}
        title="Select Programme"
        items={programmes.map((p) => ({ label: p.name, value: p.name }))}
        value={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

// ── Department picker dropdown ────────────────────────────────────────────────
function DepartmentDropdown({ value, onChange, departments, onDeptIdChange }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={sf.dropdownBtn} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={[sf.dropdownText, !value && sf.dropdownPlaceholder]}>{value || 'Select department'}</Text>
        <Ionicons name="chevron-down-outline" size={14} color="#64748B" />
      </TouchableOpacity>
      <PickerSheet
        visible={open}
        title="Select Department"
        items={departments.map((d) => ({ label: d.name, value: d.id }))}
        value={departments.find((d) => d.name === value)?.id || ''}
        onSelect={(deptId) => {
          const dept = departments.find((d) => d.id === deptId);
          onChange(dept?.name || '');
          if (onDeptIdChange) onDeptIdChange(deptId);
        }}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const POSITIONS = [
  'Lecturer',
  'Senior Lecturer',
  'Associate Professor',
  'Professor',
  'Teaching Assistant',
  'Research Fellow',
  'Part-Time Instructor',
  'Head of Department',
  'Dean',
  'Administrative Officer',
  'Administrative Staff',
  'Lab Technician',
  'IT Officer',
  'Others',
];

const STAFF_ROLES = ['faculty', 'admin'];

// ── Position picker ───────────────────────────────────────────────────────────
function PositionDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={sf.dropdownBtn} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={[sf.dropdownText, !value && sf.dropdownPlaceholder]}>{value || 'Select position'}</Text>
        <Ionicons name="chevron-down-outline" size={14} color="#64748B" />
      </TouchableOpacity>
      <PickerSheet
        visible={open}
        title="Job Position"
        items={POSITIONS}
        value={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

// ── Role picker ───────────────────────────────────────────────────────────────
function RoleDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ROLES = [
    { label: 'Faculty / Lecturer', value: 'faculty' },
    { label: 'Administrator',      value: 'admin'   },
  ];
  return (
    <>
      <TouchableOpacity style={sf.dropdownBtn} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={sf.dropdownText}>
          {ROLES.find((r) => r.value === value)?.label || 'Select role'}
        </Text>
        <Ionicons name="chevron-down-outline" size={14} color="#64748B" />
      </TouchableOpacity>
      <PickerSheet
        visible={open}
        title="System Role"
        items={ROLES}
        value={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

// ── Shared field wrapper — defined at module scope so its identity never changes
// (defining it inside a component causes React to unmount/remount on every
//  keystroke, making TextInputs lose focus after a single character)
const Field = ({ label, required, half, children }) => (
  <View style={[sf.field, half && sf.halfField]}>
    <Text style={sf.label}>
      {label}{required ? <Text style={sf.req}> *</Text> : null}
    </Text>
    {children}
  </View>
);

// ── Staff registration form ───────────────────────────────────────────────────
function StaffFormSection({ form, onChange, departments, avatarUri, onAvatarChange, isEdit }) {
  const set = (key, val) => onChange({ ...form, [key]: val });
  const isOthers = form.staff_position === 'Others';

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) onAvatarChange(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) onAvatarChange(result.assets[0].uri);
  };

  const showAvatarOptions = () => Alert.alert('Profile Photo', 'Choose source', [
    { text: 'Camera', onPress: takePhoto },
    { text: 'Photo Library', onPress: pickAvatar },
    { text: 'Remove', style: 'destructive', onPress: () => onAvatarChange(null) },
    { text: 'Cancel', style: 'cancel' },
  ]);

  return (
    <View>
      {/* ── Avatar ── */}
      <View style={sf.avatarSection}>
        <TouchableOpacity onPress={showAvatarOptions} activeOpacity={0.85} style={sf.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={sf.avatar} />
          ) : (
            <View style={sf.avatarPlaceholder}>
              <Ionicons name="person-outline" size={32} color="#94A3B8" />
            </View>
          )}
          <View style={sf.avatarBadge}>
            <Ionicons name="camera" size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <View style={sf.avatarInfo}>
          <Text style={sf.avatarTitle}>Profile Photo</Text>
          <Text style={sf.avatarSub}>Tap to upload from camera or library</Text>
        </View>
      </View>

      {/* ── Identity ── */}
      <Text style={sf.sectionHeader}>IDENTITY</Text>
      <Field label="Full Name" required>
        <TextInput style={sf.input} value={form.staff_full_name || ''} onChangeText={(v) => set('staff_full_name', v)}
          placeholder="e.g. Dr. Samuel Acheampong" placeholderTextColor="#94A3B8" autoCapitalize="words" />
      </Field>
      <Field label="Display Name">
        <TextInput style={sf.input} value={form.staff_display_name || ''} onChangeText={(v) => set('staff_display_name', v)}
          placeholder="Defaults to full name if blank" placeholderTextColor="#94A3B8" autoCapitalize="words" />
      </Field>

      {/* ── IDs (dual column) ── */}
      <Text style={sf.sectionHeader}>STAFF ID</Text>
      <View style={sf.row}>
        <Field label="Staff ID" required half>
          <TextInput style={sf.input} value={form.staff_id || ''} onChangeText={(v) => set('staff_id', v)}
            placeholder="e.g. STF-001" placeholderTextColor="#94A3B8" autoCapitalize="characters" />
        </Field>
        <Field label="Phone" half>
          <TextInput style={sf.input} value={form.staff_phone || ''} onChangeText={(v) => set('staff_phone', v)}
            placeholder="+233..." placeholderTextColor="#94A3B8" keyboardType="phone-pad" />
        </Field>
      </View>

      {/* ── Role & Position ── */}
      <Text style={sf.sectionHeader}>ROLE & POSITION</Text>
      <Field label="System Role">
        <RoleDropdown value={form.staff_role || 'faculty'} onChange={(v) => set('staff_role', v)} />
      </Field>

      <Field label="Job Position" required>
        <PositionDropdown value={form.staff_position} onChange={(v) => {
          set('staff_position', v);
          if (v !== 'Others') set('staff_position_custom', '');
        }} />
      </Field>

      {/* Conditional: "Others" description */}
      {isOthers && (
        <Field label="Please specify your position" required>
          <TextInput style={sf.input} value={form.staff_position_custom || ''} onChangeText={(v) => set('staff_position_custom', v)}
            placeholder="e.g. Research Coordinator" placeholderTextColor="#94A3B8" autoCapitalize="words" />
        </Field>
      )}

      {/* ── Department ── */}
      <Text style={sf.sectionHeader}>DEPARTMENT</Text>
      <Field label="Department">
        <DepartmentDropdown value={form.staff_department} onChange={(v) => set('staff_department', v)} departments={departments} />
      </Field>

      {/* ── Account ── */}
      <Text style={sf.sectionHeader}>ACCOUNT</Text>
      <Field label="Email Address" required>
        <TextInput style={[sf.input, isEdit && sf.inputDisabled]} value={form.email || ''}
          onChangeText={(v) => set('email', v)} placeholder="name@rmu.edu.gh"
          placeholderTextColor="#94A3B8" autoCapitalize="none" keyboardType="email-address"
          editable={!isEdit} />
        {isEdit && <Text style={sf.helperText}>Email cannot be changed after account creation</Text>}
      </Field>
      {!isEdit && (
        <Field label="Password" required>
          <TextInput style={sf.input} value={form.password || ''} onChangeText={(v) => set('password', v)}
            placeholder="Min. 6 characters" placeholderTextColor="#94A3B8" secureTextEntry />
        </Field>
      )}
    </View>
  );
}

// ── Student registration form ──────────────────────────────────────────────────
function StudentFormSection({ form, onChange, departments, avatarUri, onAvatarChange, isEdit }) {
  const set = (key, val) => onChange({ ...form, [key]: val });

  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [programmes,     setProgs]           = useState([]);
  const [loadingProgs,   setLoadingProgs]    = useState(false);

  useEffect(() => {
    if (!selectedDeptId) { setProgs([]); return; }
    setLoadingProgs(true);
    supabase.from('programmes').select('id, name').eq('department_id', selectedDeptId).order('name')
      .then(({ data }) => setProgs(data || []))
      .finally(() => setLoadingProgs(false));
  }, [selectedDeptId]);

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) onAvatarChange(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) onAvatarChange(result.assets[0].uri);
  };

  const showAvatarOptions = () => Alert.alert('Profile Photo', 'Choose source', [
    { text: 'Camera', onPress: takePhoto },
    { text: 'Photo Library', onPress: pickAvatar },
    { text: 'Remove', style: 'destructive', onPress: () => onAvatarChange(null) },
    { text: 'Cancel', style: 'cancel' },
  ]);

  return (
    <View>
      {/* ── Avatar ── */}
      <View style={sf.avatarSection}>
        <TouchableOpacity onPress={showAvatarOptions} activeOpacity={0.85} style={sf.avatarWrap}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={sf.avatar} />
          ) : (
            <View style={sf.avatarPlaceholder}>
              <Ionicons name="person-outline" size={32} color="#94A3B8" />
            </View>
          )}
          <View style={sf.avatarBadge}>
            <Ionicons name="camera" size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <View style={sf.avatarInfo}>
          <Text style={sf.avatarTitle}>Profile Photo</Text>
          <Text style={sf.avatarSub}>Tap to upload from camera or library</Text>
        </View>
      </View>

      {/* ── Identity ── */}
      <Text style={sf.sectionHeader}>IDENTITY</Text>
      <Field label="Full Name" required>
        <TextInput style={sf.input} value={form.full_name || ''} onChangeText={(v) => set('full_name', v)}
          placeholder="e.g. Kwame Mensah" placeholderTextColor="#94A3B8" autoCapitalize="words" />
      </Field>
      <Field label="Display Name">
        <TextInput style={sf.input} value={form.display_name || ''} onChangeText={(v) => set('display_name', v)}
          placeholder="Defaults to full name if blank" placeholderTextColor="#94A3B8" autoCapitalize="words" />
      </Field>

      {/* ── IDs (dual column) ── */}
      <Text style={sf.sectionHeader}>STUDENT IDs</Text>
      <View style={sf.row}>
        <Field label="Student ID" required half>
          <TextInput style={sf.input} value={form.student_id || ''} onChangeText={(v) => set('student_id', v)}
            placeholder="e.g. STU-12345" placeholderTextColor="#94A3B8" autoCapitalize="characters" />
        </Field>
        <Field label="Index Number" required half>
          <TextInput style={sf.input} value={form.index_number || ''} onChangeText={(v) => set('index_number', v)}
            placeholder="e.g. RMU/2024/001" placeholderTextColor="#94A3B8" autoCapitalize="characters" />
        </Field>
      </View>

      {/* ── Academic ── */}
      <Text style={sf.sectionHeader}>ACADEMIC DETAILS</Text>
      <Field label="Department">
        <DepartmentDropdown
          value={form.department}
          onChange={(v) => { set('department', v); set('programme', ''); }}
          departments={departments}
          onDeptIdChange={(id) => { setSelectedDeptId(id); set('programme', ''); }}
        />
      </Field>
      <Field label="Programme">
        <ProgrammeDropdown
          value={form.programme}
          onChange={(v) => set('programme', v)}
          programmes={programmes}
          loading={loadingProgs}
          locked={!selectedDeptId}
        />
      </Field>

      {/* ── Contact ── */}
      <Text style={sf.sectionHeader}>CONTACT</Text>
      <Field label="Phone Number">
        <TextInput style={sf.input} value={form.phone || ''} onChangeText={(v) => set('phone', v)}
          placeholder="+233..." placeholderTextColor="#94A3B8" keyboardType="phone-pad" />
      </Field>

      {/* ── Account ── */}
      <Text style={sf.sectionHeader}>ACCOUNT</Text>
      <Field label="Email Address" required>
        <TextInput style={[sf.input, isEdit && sf.inputDisabled]} value={form.email || ''}
          onChangeText={(v) => set('email', v)} placeholder="name@rmu.edu.gh"
          placeholderTextColor="#94A3B8" autoCapitalize="none" keyboardType="email-address"
          editable={!isEdit} />
        {isEdit && <Text style={sf.helperText}>Email cannot be changed after account creation</Text>}
      </Field>
      {!isEdit && (
        <Field label="Password" required>
          <TextInput style={sf.input} value={form.password || ''} onChangeText={(v) => set('password', v)}
            placeholder="Min. 6 characters" placeholderTextColor="#94A3B8" secureTextEntry />
        </Field>
      )}
    </View>
  );
}

const ManagePeopleScreen = ({ navigation }) => {
  const [people,          setPeople]         = useState([]);
  const [departments,     setDepartments]    = useState([]);
  const [showModal,       setShowModal]      = useState(false);
  const [isEditingPerson, setIsEditingPerson] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState(null);
  const [userType,        setUserType]       = useState('student');
  const [searchQuery,     setSearchQuery]    = useState('');
  const [avatarUri,       setAvatarUri]      = useState(null); // local URI for student avatar
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    // shared
    email: '', password: '',
    // student
    full_name: '', display_name: '', student_id: '', index_number: '',
    programme: '', department: '', phone: '',
    // staff fields
    name: '', staff_department: '',
    staff_full_name: '', staff_display_name: '', staff_id: '',
    staff_phone: '', staff_role: 'faculty', staff_position: '',
    staff_position_custom: '',
  });
  const { userRole } = useAuth();

  // Fetch departments for dropdown
  useEffect(() => {
    supabase.from('departments').select('id, name').order('name')
      .then(({ data }) => setDepartments(data || []));
  }, []);
  const peopleCount = people.length;

  const filteredPeople = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return people;

    return people.filter((item) => {
      const fields = [
        item.name,
        item.email,
        item.role,
        item.studentID,
        item.studentId,
        item.programme,
        item.department,
        item.level,
      ]
        .map((value) => (value || '').toString().toLowerCase());

      return fields.some((value) => value.includes(query));
    });
  }, [people, searchQuery]);

  const openCreateModal = () => {
    setIsEditingPerson(false);
    setEditingPersonId(null);
    setUserType('student');
    setAvatarUri(null);
    setFormData({
      email: '', password: '',
      full_name: '', display_name: '', student_id: '', index_number: '',
      programme: '', department: '', phone: '',
      name: '', staff_department: '',
      staff_full_name: '', staff_display_name: '', staff_id: '',
      staff_phone: '', staff_role: 'faculty', staff_position: '',
      staff_position_custom: '',
    });
    setShowModal(true);
  };

  const openEditModal = (person) => {
    const nextUserType = (person.role === 'staff' || person.role === 'faculty') ? 'staff' : 'student';
    setIsEditingPerson(true);
    setEditingPersonId(person.id);
    setUserType(nextUserType);
    setAvatarUri(person.avatar_url || null);
    setFormData({
      email: person.email || '',
      password: '',
      full_name: person.full_name || person.name || '',
      display_name: person.display_name || '',
      student_id: person.student_id || person.studentID || '',
      index_number: person.index_number || '',
      programme: person.programme || '',
      department: person.department || '',
      phone: person.phone || '',
      name: person.full_name || person.name || '',
      staff_department: person.department || '',
      staff_full_name: person.full_name || person.name || '',
      staff_display_name: person.display_name || '',
      staff_id: person.staff_id || '',
      staff_phone: person.phone || '',
      staff_role: person.role || 'faculty',
      staff_position: person.position || '',
      staff_position_custom: '',
    });
    setShowModal(true);
  };

  // Subscribe to real-time user updates from Supabase
  React.useEffect(() => {
    const unsubscribe = subscribeToUsers((users) => {
      // Filter to only show student and staff (not admin)
      const filteredUsers = users.filter(u => u.role === 'student' || u.role === 'staff' || u.role === 'faculty');
      setPeople(filteredUsers);
    });

    return () => { unsubscribe(); };
  }, []);

  // Upload avatar to Supabase storage
  const uploadAvatar = async (uri) => {
    if (!uri || uri.startsWith('http')) return uri;
    const ext = uri.match(/\.(\w+)(\?|$)/)?.[1] || 'jpg';
    const contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
    const filename = `avatars/${Date.now()}.${ext}`;
    const file = new File(uri);
    const { error } = await supabase.storage.from('locations').upload(filename, file, { contentType, upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('locations').getPublicUrl(filename);
    return data.publicUrl;
  };

  const handleSavePerson = async () => {
    if (userRole !== USER_ROLES.ADMIN) {
      return Alert.alert('Unauthorized', 'You are not allowed to perform this action');
    }

    if (!formData.email.trim()) {
      return Alert.alert('Validation Error', 'Email is required');
    }
    if (!isEditingPerson && (!formData.password?.trim() || formData.password.length < 6)) {
      return Alert.alert('Validation Error', 'Password must be at least 6 characters');
    }

    // Student-specific validation
    if (userType === 'student') {
      if (!formData.full_name?.trim()) return Alert.alert('Validation Error', 'Full Name is required');
      if (!formData.student_id?.trim()) return Alert.alert('Validation Error', 'Student ID is required');
      if (!formData.index_number?.trim()) return Alert.alert('Validation Error', 'Index Number is required');
    }

    // Staff validation
    if (userType === 'staff') {
      if (!formData.staff_full_name?.trim()) return Alert.alert('Validation Error', 'Full Name is required');
      if (!formData.staff_id?.trim())        return Alert.alert('Validation Error', 'Staff ID is required');
      if (!formData.staff_position)          return Alert.alert('Validation Error', 'Position is required');
      if (formData.staff_position === 'Others' && !formData.staff_position_custom?.trim()) {
        return Alert.alert('Validation Error', 'Please specify the position');
      }
    }

    try {
      setUploadingAvatar(true);

      let avatarUrl = avatarUri?.startsWith('http') ? avatarUri : null;
      if (avatarUri && !avatarUri.startsWith('http')) {
        avatarUrl = await uploadAvatar(avatarUri);
      }

      let payload;

      if (userType === 'student') {
        const displayName = formData.display_name?.trim() || formData.full_name.trim();
        payload = {
          role:          'student',              // hardcoded — never exposed to form
          email:         formData.email.trim(),
          full_name:     formData.full_name.trim(),
          display_name:  displayName,
          student_id:    formData.student_id.trim(),
          index_number:  formData.index_number.trim(),
          programme:     formData.programme || null,
          department:    formData.department || null,
          phone:         formData.phone?.trim() || null,
          avatar_url:    avatarUrl,
        };
      } else {
        const resolvedPosition = formData.staff_position === 'Others'
          ? formData.staff_position_custom.trim()
          : formData.staff_position;
        const staffDisplayName = formData.staff_display_name?.trim() || formData.staff_full_name.trim();
        payload = {
          role:         formData.staff_role || 'faculty',
          email:        formData.email.trim(),
          full_name:    formData.staff_full_name.trim(),
          display_name: staffDisplayName,
          staff_id:     formData.staff_id.trim(),
          position:     resolvedPosition,
          department:   formData.staff_department || null,
          phone:        formData.staff_phone?.trim() || null,
          avatar_url:   avatarUrl,
        };
      }

      console.log('📋 User payload:', JSON.stringify(payload, null, 2));

      if (isEditingPerson) {
        await updateItem('users', editingPersonId, payload);
      } else {
        await createUserWithAuthAndFirestore(formData.email, formData.password, payload);
      }

      setShowModal(false);
      setAvatarUri(null);
      Alert.alert('Success', isEditingPerson ? 'Record updated successfully' : 'Account created successfully');
    } catch (error) {
      const msg = (error.message || '').toLowerCase();
      let errorMessage = error.message || (isEditingPerson ? 'Unable to update' : 'Unable to create user');
      if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('duplicate')) {
        errorMessage = 'This email is already registered';
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete User', 'Are you sure you want to delete this user? This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            console.log('ManagePeopleScreen: Deleting user with ID:', id);
            await deleteItem('users', id);
            console.log('ManagePeopleScreen: Successfully deleted user');
            Alert.alert('Success', 'User deleted successfully');
            // The real-time listener will automatically update the list
          } catch (error) {
            console.error('Error deleting user:', error);
            Alert.alert('Error', error.message || 'Unable to delete user');
          }
        },
      },
    ]);
  };

  const renderPersonCard = ({ item }) => (
    <View style={styles.personCard}>
      <View style={styles.personTopRow}>
        <View style={styles.personHeader}>
          <View
            style={[
              styles.personIcon,
              {
                backgroundColor:
                  item.role === 'student' ? '#EEF4FF' : '#F3F4F6',
              },
            ]}
          >
            <Ionicons
              name={item.role === 'student' ? 'school-outline' : 'briefcase-outline'}
              size={22}
              color={item.role === 'student' ? '#2563EB' : '#6B7280'}
            />
          </View>
          <View style={styles.personInfo}>
            <Text style={styles.personName}>{item.name}</Text>
            <Text style={styles.personRole}>
              {item.role === 'student'
                ? `Student • ${item.studentID || item.studentId || 'No ID'}`
                : `Staff • ${item.department || 'No department'}`}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => openEditModal(item)}
          style={styles.editButton}
          activeOpacity={0.85}
        >
          <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item.id)}
          style={styles.deleteButton}
          activeOpacity={0.85}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.personDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Email</Text>
          <Text style={styles.detailValue}>{item.email}</Text>
        </View>

        {item.role === 'student' && (
          <View style={styles.detailGrid}>
            <View style={styles.detailChip}>
              <Text style={styles.detailChipLabel}>Student ID</Text>
              <Text style={styles.detailChipValue}>{item.studentID || item.studentId || 'N/A'}</Text>
            </View>
            <View style={styles.detailChip}>
              <Text style={styles.detailChipLabel}>Programme</Text>
              <Text style={styles.detailChipValue}>{item.programme || 'N/A'}</Text>
            </View>
            <View style={styles.detailChip}>
              <Text style={styles.detailChipLabel}>Level</Text>
              <Text style={styles.detailChipValue}>{item.level || 'N/A'}</Text>
            </View>
          </View>
        )}

        {item.role === 'staff' && (
          <View style={styles.detailGrid}>
            <View style={styles.detailChip}>
              <Text style={styles.detailChipLabel}>Department</Text>
              <Text style={styles.detailChipValue}>{item.department || 'N/A'}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.85}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroEyebrow}>Admin Dashboard</Text>
              <Text style={styles.title}>Manage People</Text>
              <Text style={styles.subtitle}>Add students and staff members</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="people-outline" size={26} color={COLORS.white} />
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroPill}>
              <Ionicons name="people-outline" size={14} color={COLORS.white} />
              <Text style={styles.heroPillText}>{peopleCount} records</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={openCreateModal} activeOpacity={0.9}>
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.addButtonText}>Add Person</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={18} color={COLORS.muted} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search people by name, email, ID, or department"
              placeholderTextColor={COLORS.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchButton}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle" size={18} color={COLORS.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.searchMetaRow}>
            <Text style={styles.searchMetaText}>
              {searchQuery ? 'Filtered people list' : 'Search the current roster'}
            </Text>
            <Text style={styles.searchMetaCount}>{filteredPeople.length} shown</Text>
          </View>
        </View>

        <FlatList
          data={filteredPeople}
          renderItem={renderPersonCard}
          keyExtractor={(item) => item.id}
          style={styles.peopleList}
          showsVerticalScrollIndicator
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="people-outline" size={48} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No matching people found' : 'No people added yet'}
              </Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? 'Try a different keyword or clear the search.'
                  : 'Tap the + button to add a student or staff member'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Add Person Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalEyebrow}>{isEditingPerson ? 'Edit record' : 'New record'}</Text>
                  <Text style={styles.modalTitle}>{isEditingPerson ? 'Update Person' : 'Add New Person'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <View style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={COLORS.dark} />
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.formContent}
              contentContainerStyle={styles.formContentInner}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              {/* User Type Selection */}
              <Text style={styles.sectionLabel}>User Type</Text>
              <View style={styles.typeButtons}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    userType === 'student' && styles.typeButtonActive,
                  ]}
                  onPress={() => {
                    setUserType('student');
                    setFormData({ ...formData, role: 'student' });
                  }}
                >
                  <Ionicons
                    name="school-outline"
                    size={20}
                    color={userType === 'student' ? COLORS.white : COLORS.muted}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      userType === 'student' && styles.typeButtonTextActive,
                    ]}
                  >
                    Student
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    userType === 'staff' && styles.typeButtonActive,
                  ]}
                  onPress={() => {
                    setUserType('staff');
                    setFormData({ ...formData, role: 'staff' });
                  }}
                >
                  <Ionicons
                    name="briefcase-outline"
                    size={20}
                    color={userType === 'staff' ? COLORS.white : COLORS.muted}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      userType === 'staff' && styles.typeButtonTextActive,
                    ]}
                  >
                    Staff
                  </Text>
                </TouchableOpacity>
              </View>

              {/* ── STUDENT form ── */}
              {userType === 'student' && (
                <StudentFormSection
                  form={formData}
                  onChange={setFormData}
                  departments={departments}
                  avatarUri={avatarUri}
                  onAvatarChange={setAvatarUri}
                  isEdit={isEditingPerson}
                />
              )}

              {/* ── STAFF form ── */}
              {userType === 'staff' && (
                <StaffFormSection
                  form={formData}
                  onChange={setFormData}
                  departments={departments}
                  avatarUri={avatarUri}
                  onAvatarChange={setAvatarUri}
                  isEdit={isEditingPerson}
                />
              )}

              <View style={styles.formButtons}>
                <TouchableOpacity style={[styles.cancelBtn]} onPress={() => setShowModal(false)} activeOpacity={0.8}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, uploadingAvatar && { opacity: 0.6 }]}
                  onPress={handleSavePerson}
                  disabled={uploadingAvatar}
                  activeOpacity={0.85}
                >
                  {uploadingAvatar
                    ? <ActivityIndicator color="#FFFFFF" size="small" />
                    : <Text style={styles.saveBtnText}>{isEditingPerson ? 'Save Changes' : 'Create Account'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 28,
    padding: 18,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: '#020617',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 6,
    lineHeight: 20,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroPillText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  addButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  searchContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.dark,
    minWidth: 0,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchMetaText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
  },
  searchMetaCount: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: -4,
    marginBottom: 12,
    lineHeight: 18,
  },
  peopleList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  personCard: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  personTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  personIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  personInfo: {
    flex: 1,
    minWidth: 0,
  },
  personName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.dark,
    flexShrink: 1,
  },
  personRole: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
    fontWeight: '600',
    flexShrink: 1,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  personDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8EEF9',
  },
  detailRow: {
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '500',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: '600',
    flexShrink: 1,
    flexWrap: 'wrap',
    lineHeight: 20,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  detailChip: {
    flexBasis: '48%',
    minWidth: 0,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  detailChipLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  detailChipValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.dark,
    flexShrink: 1,
    flexWrap: 'wrap',
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 20,
    shadowColor: '#020617',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EEF9',
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.dark,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formContent: {
    paddingHorizontal: 18,
    flexGrow: 1,
  },
  formContentInner: {
    paddingTop: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typeButtonActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.muted,
    marginLeft: 8,
  },
  typeButtonTextActive: {
    color: COLORS.white,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    fontSize: 14,
    color: COLORS.dark,
  },
  pickerContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  picker: {
    color: COLORS.dark,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 12,
  },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  saveBtn: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.28,
    shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 3,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});

// ── StudentFormSection styles ──────────────────────────────────────────────────
const sf = StyleSheet.create({
  sectionHeader: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 1, marginBottom: 10, marginTop: 16,
  },
  field: { marginBottom: 14 },
  halfField: { flex: 1 },
  label: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 5 },
  req: { color: '#EF4444' },
  row: { flexDirection: 'row', gap: 12 },
  input: {
    backgroundColor: '#F8FAFC', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 14, color: '#0F172A',
  },
  inputDisabled: { backgroundColor: '#F1F5F9', color: '#94A3B8' },
  helperText: { fontSize: 11, color: '#94A3B8', marginTop: 4 },

  // Avatar
  avatarSection: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, marginBottom: 4,
    backgroundColor: '#F8FAFC', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#E2E8F0', padding: 14,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 64, height: 64, borderRadius: 32 },
  avatarPlaceholder: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed',
  },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  avatarInfo: { flex: 1 },
  avatarTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  avatarSub: { fontSize: 12, color: '#64748B', marginTop: 2 },

  // Dropdowns
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 12, paddingVertical: 11,
  },
  dropdownText: { fontSize: 14, fontWeight: '500', color: '#0F172A', flex: 1 },
  dropdownPlaceholder: { color: '#94A3B8', fontWeight: '400' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: '65%',
  },
  pickerHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16,
  },
  pickerTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  pickerOption: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 13,
  },
  pickerBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  pickerOptionText: { fontSize: 14, fontWeight: '500', color: '#0F172A', flex: 1 },
  pickerOptionActive: { fontWeight: '700', color: COLORS.primary },
});

export default ManagePeopleScreen;
