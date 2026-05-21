import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { uploadDepartmentImage } from '../../services/storageService';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import {
  subscribeToDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
} from '../../services/databaseService';

const AVAILABILITY_OPTIONS = [
  { value: 'Open', color: '#38A169', icon: 'checkmark-circle-outline' },
  { value: 'Closed', color: '#E53E3E', icon: 'close-circle-outline' },
  { value: 'Busy', color: '#D69E2E', icon: 'time-outline' },
  { value: 'Available', color: '#319795', icon: 'ellipse-outline' },
];

const CATEGORY_OPTIONS = ['Academic', 'Administrative', 'Student Services', 'Facilities', 'Research', 'General'];
const STATUS_FILTERS = ['All', 'Open', 'Closed', 'Busy', 'Available'];

const EMPTY_FORM = {
  name: '',
  description: '',
  category: 'Academic',
  operatingHours: '',
  availabilityStatus: 'Open',
  imageUrl: '',
};

const ManageDepartmentsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [localImageUri, setLocalImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    const unsub = subscribeToDepartments((items) => setDepartments(items));
    return () => { try { unsub?.(); } catch (e) {} };
  }, []);

  const filtered = useMemo(() => {
    return departments.filter((d) => {
      const matchSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === 'All' || d.availabilityStatus === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [departments, searchQuery, statusFilter]);

  const openModal = useCallback((dept = null) => {
    if (dept) {
      setEditingId(dept.id);
      setForm({
        name: dept.name,
        description: dept.description,
        category: dept.category,
        operatingHours: dept.operatingHours,
        availabilityStatus: dept.availabilityStatus,
        imageUrl: dept.imageUrl,
      });
    } else {
      setEditingId(null);
      setForm(EMPTY_FORM);
    }
    setLocalImageUri(null);
    setShowModal(true);
    Animated.timing(slideAnim, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [slideAnim]);

  const closeModal = useCallback(() => {
    Animated.timing(slideAnim, { toValue: 400, duration: 250, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
      setShowModal(false);
      setEditingId(null);
      setLocalImageUri(null);
    });
  }, [slideAnim]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Gallery access is needed to upload department images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setLocalImageUri(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    const filename = uri.split('/').pop() || 'image.jpg';
    return uploadDepartmentImage(filename, uri);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Department name is required.');
      return;
    }
    setSaving(true);
    try {
      let imageUrl = form.imageUrl;
      if (localImageUri) {
        setUploading(true);
        imageUrl = await uploadImage(localImageUri);
        setUploading(false);
      }
      const data = { ...form, name: form.name.trim(), imageUrl };
      if (editingId) {
        await updateDepartment(editingId, data);
      } else {
        await addDepartment(data);
      }
      closeModal();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to save department.');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleDelete = (id, name) => {
    Alert.alert('Delete Department', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDepartment(id) },
    ]);
  };

  const cycleStatus = async (dept) => {
    const idx = AVAILABILITY_OPTIONS.findIndex((o) => o.value === dept.availabilityStatus);
    const next = AVAILABILITY_OPTIONS[(idx + 1) % AVAILABILITY_OPTIONS.length].value;
    try {
      await updateDepartment(dept.id, { availabilityStatus: next });
    } catch (e) {
      Alert.alert('Error', 'Could not update status.');
    }
  };

  const getStatusStyle = (status) => {
    const opt = AVAILABILITY_OPTIONS.find((o) => o.value === status);
    return opt ? opt.color : '#718096';
  };

  const renderDepartment = ({ item }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImagePlaceholder, { backgroundColor: colors.border }]}>
          <Ionicons name="layers-outline" size={32} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardName, { color: colors.textDark }]} numberOfLines={1}>{item.name}</Text>
          <TouchableOpacity onPress={() => cycleStatus(item)} style={[styles.statusBadge, { backgroundColor: getStatusStyle(item.availabilityStatus) + '22', borderColor: getStatusStyle(item.availabilityStatus) }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusStyle(item.availabilityStatus) }]} />
            <Text style={[styles.statusText, { color: getStatusStyle(item.availabilityStatus) }]}>{item.availabilityStatus}</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.cardCategory, { color: colors.textMuted }]}>{item.category}</Text>
        {item.description ? <Text style={[styles.cardDesc, { color: colors.textMuted }]} numberOfLines={2}>{item.description}</Text> : null}
        {item.operatingHours ? (
          <View style={styles.hoursRow}>
            <Ionicons name="time-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.hoursText, { color: colors.textMuted }]}>{item.operatingHours}</Text>
          </View>
        ) : null}
        <View style={styles.cardActions}>
          <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => openModal(item)}>
            <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.actionBtnText, { color: colors.textMuted }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(item.id, item.name)}>
            <Ionicons name="trash-outline" size={16} color="#E53E3E" />
            <Text style={[styles.actionBtnText, { color: '#E53E3E' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
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
            <Text style={styles.heroTitle}>Departments</Text>
            <Text style={styles.heroSub}>{departments.length} department{departments.length !== 1 ? 's' : ''} registered</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search & Filter */}
      <View style={[styles.searchArea, { backgroundColor: colors.background }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textDark }]}
            placeholder="Search departments..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={18} color={colors.textMuted} /></TouchableOpacity> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {STATUS_FILTERS.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setStatusFilter(f)}
              style={[styles.filterPill, { backgroundColor: statusFilter === f ? '#2563EB' : colors.surface, borderColor: statusFilter === f ? '#2563EB' : colors.border }]}
            >
              <Text style={[styles.filterPillText, { color: statusFilter === f ? '#fff' : colors.textMuted }]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderDepartment}
        contentContainerStyle={[styles.listContent, filtered.length === 0 && styles.emptyContent]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="layers-outline" size={64} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.textDark }]}>No departments yet</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>Tap the + button to add your first department.</Text>
          </View>
        }
      />

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="none" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <Animated.View style={[styles.sheet, { backgroundColor: colors.surface, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.sheetHandle} />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={[styles.sheetTitle, { color: colors.textDark }]}>{editingId ? 'Edit Department' : 'Add Department'}</Text>
                  <Text style={[styles.sheetSub, { color: colors.textMuted }]}>{editingId ? 'Update department details' : 'Fill in the details below'}</Text>
                </View>
                <TouchableOpacity onPress={closeModal} style={[styles.closeBtn, { backgroundColor: colors.border }]}>
                  <Ionicons name="close" size={20} color={colors.textDark} />
                </TouchableOpacity>
              </View>

              {/* Image picker */}
              <TouchableOpacity onPress={pickImage} style={[styles.imagePicker, { borderColor: colors.border }]}>
                {localImageUri || form.imageUrl ? (
                  <Image source={{ uri: localImageUri || form.imageUrl }} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePickerEmpty}>
                    <Ionicons name="camera-outline" size={32} color={colors.textMuted} />
                    <Text style={[styles.imagePickerText, { color: colors.textMuted }]}>Tap to add photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {(localImageUri || form.imageUrl) && (
                <TouchableOpacity onPress={() => { setLocalImageUri(null); setForm((f) => ({ ...f, imageUrl: '' })); }} style={styles.removeImage}>
                  <Text style={styles.removeImageText}>Remove image</Text>
                </TouchableOpacity>
              )}

              {/* Name */}
              <Text style={[styles.label, { color: colors.textDark }]}>Name <Text style={styles.required}>*</Text></Text>
              <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. Computer Science" placeholderTextColor={colors.textMuted} />

              {/* Description */}
              <Text style={[styles.label, { color: colors.textDark }]}>Description</Text>
              <TextInput style={[styles.input, styles.textarea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]} value={form.description} onChangeText={(v) => setForm((f) => ({ ...f, description: v }))} placeholder="Brief description..." placeholderTextColor={colors.textMuted} multiline numberOfLines={3} textAlignVertical="top" />

              {/* Category */}
              <Text style={[styles.label, { color: colors.textDark }]}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                {CATEGORY_OPTIONS.map((c) => (
                  <TouchableOpacity key={c} onPress={() => setForm((f) => ({ ...f, category: c }))} style={[styles.chip, { backgroundColor: form.category === c ? '#2563EB' : colors.background, borderColor: form.category === c ? '#2563EB' : colors.border }]}>
                    <Text style={[styles.chipText, { color: form.category === c ? '#fff' : colors.textMuted }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Operating Hours */}
              <Text style={[styles.label, { color: colors.textDark }]}>Operating Hours</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]} value={form.operatingHours} onChangeText={(v) => setForm((f) => ({ ...f, operatingHours: v }))} placeholder="e.g. Mon–Fri 8am–5pm" placeholderTextColor={colors.textMuted} />

              {/* Availability */}
              <Text style={[styles.label, { color: colors.textDark }]}>Availability Status</Text>
              <View style={styles.availRow}>
                {AVAILABILITY_OPTIONS.map((o) => (
                  <TouchableOpacity key={o.value} onPress={() => setForm((f) => ({ ...f, availabilityStatus: o.value }))} style={[styles.availChip, { backgroundColor: form.availabilityStatus === o.value ? o.color + '22' : colors.background, borderColor: form.availabilityStatus === o.value ? o.color : colors.border }]}>
                    <Ionicons name={o.icon} size={14} color={form.availabilityStatus === o.value ? o.color : colors.textMuted} />
                    <Text style={[styles.chipText, { color: form.availabilityStatus === o.value ? o.color : colors.textMuted }]}>{o.value}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Actions */}
              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.btn, styles.btnCancel, { borderColor: colors.border }]} onPress={closeModal}>
                  <Text style={[styles.btnText, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                {editingId ? (
                  <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={() => { closeModal(); handleDelete(editingId, form.name); }}>
                    <Text style={[styles.btnText, { color: '#fff' }]}>Delete</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.btnText, { color: '#fff' }]}>{editingId ? 'Update' : 'Add'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
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
  heroAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#C5A047',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroText: { flex: 1 },
  heroEyebrow: { fontSize: 11, fontWeight: '700', color: '#C5A047', textTransform: 'uppercase', letterSpacing: 1.2 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 2 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#C5A047',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  searchArea: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14 },
  filterRow: { flexDirection: 'row', marginBottom: 4 },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterPillText: { fontSize: 12, fontWeight: '600' },
  listContent: { padding: 16, gap: 12 },
  emptyContent: { flexGrow: 1 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardImage: { width: '100%', height: 120 },
  cardImagePlaceholder: { width: '100%', height: 100, justifyContent: 'center', alignItems: 'center' },
  cardBody: { padding: 14 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardCategory: { fontSize: 12, fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardDesc: { fontSize: 13, lineHeight: 18, marginBottom: 6 },
  hoursRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  hoursText: { fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnDanger: { borderColor: '#FED7D7' },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySub: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%', minHeight: 200 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD5E0', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetScroll: { padding: 20, paddingBottom: 40 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  sheetSub: { fontSize: 13, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  imagePicker: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
    minHeight: 100,
  },
  imagePreview: { width: '100%', height: 160 },
  imagePickerEmpty: { height: 100, justifyContent: 'center', alignItems: 'center', gap: 6 },
  imagePickerText: { fontSize: 13 },
  removeImage: { alignSelf: 'flex-end', marginBottom: 12 },
  removeImageText: { fontSize: 12, color: '#E53E3E', fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6, marginTop: 14 },
  required: { color: '#E53E3E' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  textarea: { height: 80, paddingTop: 12 },
  chipRow: { flexDirection: 'row', marginBottom: 4 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  availRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  availChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnCancel: { borderWidth: 1 },
  btnDanger: { backgroundColor: '#E53E3E' },
  btnPrimary: { backgroundColor: '#2563EB' },
  btnText: { fontSize: 14, fontWeight: '700' },
});

export default ManageDepartmentsScreen;
