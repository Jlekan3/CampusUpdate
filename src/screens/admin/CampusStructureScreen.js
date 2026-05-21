import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Animated, Dimensions, View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, TextInput, Modal, Image, FlatList,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { File } from 'expo-file-system';
import { ADMIN_THEME } from '../../utils/constants';
import { supabase } from '../../config/supabase';
import {
  subscribeToBuildings,
  subscribeToDepartments,
  subscribeToLocations,
  subscribeToDining,
  deleteItem,
} from '../../services/databaseService';

const PRIMARY = ADMIN_THEME.primary;
const BLUE    = '#2563EB';

// ── Category config ──────────────────────────────────────────────────────────
const CATEGORIES = ['Building', 'Department', 'Dining', 'Hostel', 'Gate', 'Other'];

const CATEGORY_META = {
  Building:   { table: 'buildings',   icon: 'business-outline',    color: '#2563EB', bg: '#EFF6FF' },
  Department: { table: 'departments', icon: 'layers-outline',      color: '#7C3AED', bg: '#F5F3FF' },
  Dining:     { table: 'dining',      icon: 'restaurant-outline',  color: '#D97706', bg: '#FFFBEB' },
  Hostel:     { table: 'locations',   icon: 'home-outline',        color: '#059669', bg: '#ECFDF5' },
  Gate:       { table: 'locations',   icon: 'enter-outline',       color: '#DC2626', bg: '#FEF2F2' },
  Other:      { table: 'locations',   icon: 'ellipsis-horizontal-outline', color: '#64748B', bg: '#F8FAFC' },
};

const DEPT_CATEGORIES    = ['Academic', 'Administrative', 'Student Services', 'Facilities'];
const DEPT_STATUSES      = ['Open', 'Closed', 'Busy', 'Available', 'In Meeting'];
const HOSTEL_TYPES       = ['Male', 'Female', 'Mixed', 'International'];
const GATE_TYPES         = ['Main Gate', 'Pedestrian Gate', 'Service Entrance', 'Emergency Exit'];
const OTHER_TYPES        = ['ATM', 'Parking Lot', 'Bus Stop', 'Sport Ground', 'Open Spaces'];

// ── Helpers ──────────────────────────────────────────────────────────────────
const upload = async (uri) => {
  const extMatch = uri.match(/\.(\w+)(\?|$)/);
  const ext = (extMatch?.[1] || 'jpg').toLowerCase();
  const contentType = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
  const filename = `campus-structure/${Date.now()}.${ext}`;
  const file = new File(uri);
  const { error } = await supabase.storage.from('locations').upload(filename, file, { contentType, upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('locations').getPublicUrl(filename);
  return data.publicUrl;
};

// ── Dropdown component ────────────────────────────────────────────────────────
function Dropdown({ label, value, options, onSelect, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={f.dropdownBtn} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <Text style={[f.dropdownBtnText, !value && f.placeholder]}>{value || placeholder}</Text>
        <Ionicons name="chevron-down-outline" size={16} color="#64748B" />
      </TouchableOpacity>
      <Modal visible={open} animationType="slide" transparent presentationStyle="overFullScreen">
        <TouchableOpacity style={f.overlay} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={f.ddSheet}>
          <View style={f.ddHandle} />
          <Text style={f.ddTitle}>{label}</Text>
          {options.map((opt, i) => (
            <TouchableOpacity
              key={opt}
              style={[f.ddOption, i < options.length - 1 && f.ddBorder]}
              onPress={() => { onSelect(opt); setOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={[f.ddOptionText, value === opt && f.ddOptionActive]}>{opt}</Text>
              {value === opt && <Ionicons name="checkmark-circle" size={20} color={PRIMARY} />}
            </TouchableOpacity>
          ))}
          <View style={{ height: 28 }} />
        </View>
      </Modal>
    </>
  );
}

// ── GPS button ────────────────────────────────────────────────────────────────
function GpsButton({ onFill }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Allow location access.'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      onFill(String(loc.coords.latitude), String(loc.coords.longitude));
    } catch { Alert.alert('Error', 'Could not get current location.'); }
    finally { setLoading(false); }
  };
  return (
    <TouchableOpacity style={f.gpsBtn} onPress={handle} disabled={loading} activeOpacity={0.8}>
      <Ionicons name="locate-outline" size={15} color={PRIMARY} />
      <Text style={f.gpsBtnText}>{loading ? 'Getting location…' : 'Use Current GPS'}</Text>
    </TouchableOpacity>
  );
}

// ── Image picker section ──────────────────────────────────────────────────────
function ImageSection({ previewUri, onPick, onRemove }) {
  const [urlMode, setUrlMode] = useState(false);
  const [urlText, setUrlText] = useState('');

  const pick = async (camera) => {
    const perm = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = camera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [16, 9], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16, 9], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) onPick(result.assets[0].uri);
  };

  const showOptions = () => Alert.alert('Image', 'Choose source', [
    { text: 'Camera', onPress: () => pick(true) },
    { text: 'Photo Library', onPress: () => pick(false) },
    { text: 'Remove', style: 'destructive', onPress: onRemove },
    { text: 'Cancel', style: 'cancel' },
  ]);

  return (
    <View>
      <View style={f.imgToggleRow}>
        <TouchableOpacity style={[f.imgToggleBtn, !urlMode && f.imgToggleActive]} onPress={() => setUrlMode(false)} activeOpacity={0.8}>
          <Ionicons name="image-outline" size={13} color={!urlMode ? PRIMARY : '#94A3B8'} />
          <Text style={[f.imgToggleText, !urlMode && f.imgToggleTextActive]}>Upload</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[f.imgToggleBtn, urlMode && f.imgToggleActive]} onPress={() => setUrlMode(true)} activeOpacity={0.8}>
          <Ionicons name="link-outline" size={13} color={urlMode ? PRIMARY : '#94A3B8'} />
          <Text style={[f.imgToggleText, urlMode && f.imgToggleTextActive]}>Paste URL</Text>
        </TouchableOpacity>
      </View>

      {urlMode ? (
        <>
          <TextInput
            style={f.input}
            value={urlText}
            onChangeText={(v) => { setUrlText(v); onPick(v.trim()); }}
            placeholder="https://example.com/image.jpg"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            keyboardType="url"
          />
          {previewUri ? <Image source={{ uri: previewUri }} style={f.urlPreview} resizeMode="cover" onError={onRemove} /> : null}
        </>
      ) : previewUri ? (
        <View style={f.previewWrap}>
          <Image source={{ uri: previewUri }} style={f.preview} resizeMode="cover" />
          <TouchableOpacity style={f.changeBtn} onPress={showOptions} activeOpacity={0.8}>
            <Ionicons name="camera-outline" size={14} color="#FFFFFF" />
            <Text style={f.changeBtnText}>Change</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={f.pickBox} onPress={showOptions} activeOpacity={0.8}>
          <Ionicons name="image-outline" size={28} color="#94A3B8" />
          <Text style={f.pickBoxText}>Tap to add photo</Text>
          <Text style={f.pickBoxSub}>Camera or Library · JPG / PNG</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Multi-image field ────────────────────────────────────────────────────────
function MultiImageField({ images, onChange }) {
  const [uploading, setUploading] = useState(false);

  const addBlank = () => onChange([...images, '']);

  const update = (i, url) => {
    const next = [...images];
    next[i] = url;
    onChange(next);
  };

  const remove = (i) => onChange(images.filter((_, idx) => idx !== i));

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo library access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.75,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploading(true);
    try {
      const uri = result.assets[0].uri;
      const publicUrl = await upload(uri);
      onChange([...images, publicUrl]);
    } catch (e) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View>
      {images.map((url, i) => (
        <View key={i} style={mi.row}>
          {/* Thumbnail preview */}
          {url.trim() ? (
            <Image source={{ uri: url.trim() }} style={mi.thumb} resizeMode="cover" />
          ) : (
            <View style={mi.thumbPlaceholder}>
              <Ionicons name="image-outline" size={20} color="#94A3B8" />
            </View>
          )}
          {/* URL input */}
          <TextInput
            style={mi.input}
            value={url}
            onChangeText={(v) => update(i, v)}
            placeholder="Image URL or upload →"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            keyboardType="url"
          />
          {/* Delete */}
          <TouchableOpacity style={mi.deleteBtn} onPress={() => remove(i)} activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ))}

      {/* Action row */}
      <View style={mi.actions}>
        <TouchableOpacity style={mi.actionBtn} onPress={addBlank} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={16} color={PRIMARY} />
          <Text style={mi.actionBtnText}>Add URL</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[mi.actionBtn, mi.uploadBtn]} onPress={pickAndUpload} disabled={uploading} activeOpacity={0.8}>
          <Ionicons name="cloud-upload-outline" size={16} color="#FFFFFF" />
          <Text style={[mi.actionBtnText, { color: '#FFFFFF' }]}>{uploading ? 'Uploading…' : 'Upload Photo'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Dynamic form ──────────────────────────────────────────────────────────────
function StructureForm({ visible, editTarget, initialCategory, onClose, onSaved }) {
  const [category, setCategory]      = useState('Building');
  const [form, setForm]              = useState({});
  const [imageLocalUri, setLocalUri] = useState(null);
  const [imagePreview, setPreview]   = useState(null);
  const [hostelImages, setHostelImages] = useState(['']); // array of URL strings
  const [gateImages,   setGateImages]   = useState(['']); // array of URL strings
  const [othersImages, setOthersImages] = useState(['']); // array of URL strings
  const [saving, setSaving]          = useState(false);

  useEffect(() => {
    if (visible) {
      const cat = editTarget?._category || initialCategory || 'Building';
      setCategory(cat);
      const base = editTarget ? { ...editTarget } : {};
      if (editTarget && editTarget._category === 'Building' && editTarget.category) {
        base.building_type = editTarget.category;
      }
      setForm(base);
      setLocalUri(null);
      setPreview(editTarget?.image_url || null);
      // Populate hostel / gate images from existing record
      const existing = editTarget?.image_urls;
      const imgArr = Array.isArray(existing) && existing.length > 0 ? existing : [''];
      setHostelImages(imgArr);
      setGateImages(imgArr);
      setOthersImages(imgArr);
    }
  }, [visible]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name?.trim()) { Alert.alert('Required', 'Name is required'); return; }

    // Category-specific required fields
    if (category === 'Department' && !form.dept_category) { Alert.alert('Required', 'Select a department category'); return; }
    if (['Hostel', 'Gate', 'Other'].includes(category) && !form.type) { Alert.alert('Required', 'Select a type'); return; }

    setSaving(true);
    try {
      // Upload image if a local file was picked
      let imageUrl = imagePreview;
      if (imageLocalUri) imageUrl = await upload(imageLocalUri);

      if (category === 'Building') {
        const payload = {
          name:            form.name.trim(),
          description:     form.description?.trim() || null,
          category:        form.building_type || null,
          floors:          form.floors?.trim() || null,
          operating_hours: form.operating_hours?.trim() || null,
          latitude:        form.latitude  ? parseFloat(form.latitude)  : null,
          longitude:       form.longitude ? parseFloat(form.longitude) : null,
          image_url:       imageUrl || null,
        };
        if (editTarget) {
          const { error } = await supabase.from('buildings').update(payload).eq('id', editTarget.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('buildings').insert(payload);
          if (error) throw error;
        }

      } else if (category === 'Department') {
        // Email validation
        const emailVal = form.contact_email?.trim();
        if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
          set('emailError', true);
          Alert.alert('Invalid Email', 'Please enter a valid email address.');
          setSaving(false);
          return;
        }
        const payload = {
          name:                form.name.trim(),
          description:         form.description?.trim() || null,
          category:            form.dept_category || null,
          availability_status: form.availability_status || 'Open',
          head_of_department:  form.head_of_department?.trim() || null,
          contact_email:       emailVal || null,
          contact_phone:       form.contact_phone?.trim() || null,
          operating_hours:     form.operating_hours?.trim() || null,
          latitude:            form.latitude  ? parseFloat(form.latitude)  : null,
          longitude:           form.longitude ? parseFloat(form.longitude) : null,
          image_url:           imageUrl || null,
        };
        if (editTarget) {
          const { error } = await supabase.from('departments').update(payload).eq('id', editTarget.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('departments').insert(payload);
          if (error) throw error;
        }

      } else if (category === 'Dining') {
        const payload = {
          name:            form.name.trim(),
          description:     form.description?.trim() || null,
          operating_hours: form.operating_hours?.trim() || null,
          latitude:        form.latitude  ? parseFloat(form.latitude)  : null,
          longitude:       form.longitude ? parseFloat(form.longitude) : null,
          image_url:       imageUrl || null,
        };
        if (editTarget) {
          const { error } = await supabase.from('dining').update(payload).eq('id', editTarget.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('dining').insert(payload);
          if (error) throw error;
        }

      } else if (category === 'Hostel') {
        const payload = {
          name:        form.name.trim(),
          description: form.description?.trim() || null,
          category:    'Hostel',
          type:        form.type || null,
          latitude:    form.latitude  ? parseFloat(form.latitude)  : null,
          longitude:   form.longitude ? parseFloat(form.longitude) : null,
          ...(imageUrl ? { image_urls: [imageUrl] } : {}),
        };
        if (editTarget) {
          const { error } = await supabase.from('locations').update(payload).eq('id', editTarget.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('locations').insert(payload);
          if (error) throw error;
        }

      } else if (category === 'Gate') {
        if (!form.latitude || !form.longitude) {
          Alert.alert('Required', 'GPS coordinates are required for gates. Use the GPS button or enter manually.');
          setSaving(false);
          return;
        }
        const validUrls = gateImages.map((u) => u.trim()).filter(Boolean);
        const payload = {
          name:        form.name.trim(),
          description: form.description?.trim() || null,
          category:    'Gate',
          type:        form.type || null,
          latitude:    parseFloat(form.latitude),
          longitude:   parseFloat(form.longitude),
          ...(validUrls.length > 0 ? { image_urls: validUrls } : {}),
        };
        if (editTarget) {
          const { error } = await supabase.from('locations').update(payload).eq('id', editTarget.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('locations').insert(payload);
          if (error) throw error;
        }

      } else {
        // Other → locations table, category hardcoded 'Others'
        if (!form.latitude || !form.longitude) {
          Alert.alert('Required', 'GPS coordinates are required. Use the GPS button or enter manually.');
          setSaving(false);
          return;
        }
        const validUrls = othersImages.map((u) => u.trim()).filter(Boolean);
        const payload = {
          name:        form.name.trim(),
          description: form.description?.trim() || null,
          category:    'Others',
          type:        form.type || null,
          latitude:    parseFloat(form.latitude),
          longitude:   parseFloat(form.longitude),
          ...(validUrls.length > 0 ? { image_urls: validUrls } : {}),
        };
        if (editTarget) {
          const { error } = await supabase.from('locations').update(payload).eq('id', editTarget.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('locations').insert(payload);
          if (error) throw error;
        }
      }

      onSaved();
    } catch (e) {
      Alert.alert('Save failed', e.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const meta = CATEGORY_META[category] || CATEGORY_META.Building;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <TouchableOpacity style={f.overlay} activeOpacity={1} onPress={onClose} />
      <View style={f.sheet}>
        <ScrollView
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={f.sheetContent}
          bounces={false}
        >
          <View style={f.handle} />
          <Text style={f.sheetTitle}>{editTarget ? 'Edit' : 'Add'} Campus Structure</Text>

          {/* ── Category selector ── */}
          <Text style={f.sectionHeader}>Category <Text style={f.req}>*</Text></Text>
          <Dropdown
            label="Select Category"
            value={category}
            options={CATEGORIES}
            onSelect={(v) => { setCategory(v); setForm({}); setLocalUri(null); setPreview(null); setHostelImages(['']); setGateImages(['']); setOthersImages(['']); }}
          />

          {/* ── Category badge ── */}
          <View style={[f.catBadge, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={14} color={meta.color} />
            <Text style={[f.catBadgeText, { color: meta.color }]}>{category}</Text>
          </View>

          {/* ═══════════════════════════════════════════
              BUILDING fields
          ═══════════════════════════════════════════ */}
          {category === 'Building' && (
            <>
              {/* ── Name ── */}
              <Text style={f.sectionHeader}>BUILDING DETAILS</Text>

              <Text style={f.label}>Building Name <Text style={f.req}>*</Text></Text>
              <TextInput
                style={f.input}
                value={form.name || ''}
                onChangeText={(v) => set('name', v)}
                placeholder="e.g. Main Engineering Block"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
              />

              <Text style={f.label}>Description</Text>
              <TextInput
                style={[f.input, f.inputMulti]}
                value={form.description || ''}
                onChangeText={(v) => set('description', v)}
                placeholder="Describe the building and its purpose…"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* ── Type dropdown ── */}
              <Text style={f.sectionHeader}>BUILDING TYPE</Text>
              <Text style={f.label}>Category</Text>
              <Dropdown
                label="Building Category"
                value={form.building_type}
                options={['Academic', 'Residential', 'Administrative', 'Utility']}
                onSelect={(v) => set('building_type', v)}
                placeholder="Select building type"
              />

              {/* ── Floors & Hours ── */}
              <Text style={f.sectionHeader}>DETAILS</Text>

              <Text style={f.label}>Floors</Text>
              <TextInput
                style={f.input}
                value={form.floors || ''}
                onChangeText={(v) => set('floors', v)}
                placeholder="e.g. 4 Floors  or  G + 3"
                placeholderTextColor="#94A3B8"
              />

              <Text style={f.label}>Operating Hours</Text>
              <TextInput
                style={f.input}
                value={form.operating_hours || ''}
                onChangeText={(v) => set('operating_hours', v)}
                placeholder="e.g. Mon – Fri · 8:00 AM – 5:00 PM"
                placeholderTextColor="#94A3B8"
              />
            </>
          )}

          {/* ═══════════════════════════════════════════
              DEPARTMENT fields
          ═══════════════════════════════════════════ */}
          {category === 'Department' && (
            <>
              {/* ── Basic info ── */}
              <Text style={f.sectionHeader}>DEPARTMENT DETAILS</Text>

              <Text style={f.label}>Department Name <Text style={f.req}>*</Text></Text>
              <TextInput
                style={f.input}
                value={form.name || ''}
                onChangeText={(v) => set('name', v)}
                placeholder="e.g. Faculty of Engineering"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
              />

              <Text style={f.label}>Description</Text>
              <TextInput
                style={[f.input, f.inputMulti]}
                value={form.description || ''}
                onChangeText={(v) => set('description', v)}
                placeholder="What does this department do?"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* ── Classification ── */}
              <Text style={f.sectionHeader}>CLASSIFICATION & STATUS</Text>

              <Text style={f.label}>Category <Text style={f.req}>*</Text></Text>
              <Dropdown
                label="Department Category"
                value={form.dept_category}
                options={DEPT_CATEGORIES}
                onSelect={(v) => set('dept_category', v)}
                placeholder="Select department category"
              />

              <Text style={f.label}>Availability Status</Text>
              <Dropdown
                label="Availability"
                value={form.availability_status}
                options={DEPT_STATUSES}
                onSelect={(v) => set('availability_status', v)}
                placeholder="Select current status"
              />

              <Text style={f.label}>Operating Hours</Text>
              <TextInput
                style={f.input}
                value={form.operating_hours || ''}
                onChangeText={(v) => set('operating_hours', v)}
                placeholder="e.g. Mon–Fri: 8am – 5pm"
                placeholderTextColor="#94A3B8"
              />

              {/* ── Contact sub-card ── */}
              <Text style={f.sectionHeader}>CONTACT INFORMATION</Text>
              <View style={f.contactCard}>
                <Text style={f.label}>Head of Department</Text>
                <TextInput
                  style={[f.input, f.contactInput]}
                  value={form.head_of_department || ''}
                  onChangeText={(v) => set('head_of_department', v)}
                  placeholder="Dr. Name"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="words"
                />

                <Text style={f.label}>Contact Email</Text>
                <TextInput
                  style={[f.input, f.contactInput, form.emailError && f.inputError]}
                  value={form.contact_email || ''}
                  onChangeText={(v) => {
                    set('contact_email', v);
                    set('emailError', false);
                  }}
                  placeholder="dept@rmu.edu.gh"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                {form.emailError ? (
                  <Text style={f.fieldError}>Enter a valid email address</Text>
                ) : null}

                <Text style={f.label}>Contact Phone</Text>
                <TextInput
                  style={[f.input, f.contactInput, { marginBottom: 0 }]}
                  value={form.contact_phone || ''}
                  onChangeText={(v) => set('contact_phone', v)}
                  placeholder="+233..."
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
              </View>
            </>
          )}

          {/* ═══════════════════════════════════════════
              DINING fields
          ═══════════════════════════════════════════ */}
          {category === 'Dining' && (
            <>
              {/* ── Basic info ── */}
              <Text style={f.sectionHeader}>DINING DETAILS</Text>

              <Text style={f.label}>Outlet Name <Text style={f.req}>*</Text></Text>
              <TextInput
                style={f.input}
                value={form.name || ''}
                onChangeText={(v) => set('name', v)}
                placeholder="e.g. Main Cafeteria"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
              />

              <Text style={f.label}>Description</Text>
              <TextInput
                style={[f.input, f.inputMulti]}
                value={form.description || ''}
                onChangeText={(v) => set('description', v)}
                placeholder="What food or services are offered here?"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* ── Operations & Location ── */}
              <Text style={f.sectionHeader}>OPERATIONS & LOCATION</Text>

              <Text style={f.label}>Operating Hours</Text>
              <TextInput
                style={f.input}
                value={form.operating_hours || ''}
                onChangeText={(v) => set('operating_hours', v)}
                placeholder="e.g. 8:00 AM – 9:00 PM  ·  Mon – Sat"
                placeholderTextColor="#94A3B8"
              />

              {/* Coordinates follow in the common section below */}
              <View style={f.diningLocationHint}>
                <Ionicons name="location-outline" size={14} color="#2563EB" />
                <Text style={f.diningLocationHintText}>
                  Set the GPS coordinates in the Location section below to pin this outlet on the map.
                </Text>
              </View>
            </>
          )}

          {/* ═══════════════════════════════════════════
              HOSTEL fields
          ═══════════════════════════════════════════ */}
          {category === 'Hostel' && (
            <>
              <Text style={f.sectionHeader}>HOSTEL DETAILS</Text>

              <Text style={f.label}>Hall / Hostel Name <Text style={f.req}>*</Text></Text>
              <TextInput
                style={f.input}
                value={form.name || ''}
                onChangeText={(v) => set('name', v)}
                placeholder="e.g. Nelson Mandela Hall"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
              />

              <Text style={f.label}>Description</Text>
              <TextInput
                style={[f.input, f.inputMulti]}
                value={form.description || ''}
                onChangeText={(v) => set('description', v)}
                placeholder="Describe the hostel — facilities, capacity, rules…"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={f.label}>Hostel Type <Text style={f.req}>*</Text></Text>
              <Dropdown
                label="Hostel Type"
                value={form.type}
                options={HOSTEL_TYPES}
                onSelect={(v) => set('type', v)}
                placeholder="Select hostel type"
              />
            </>
          )}

          {/* ═══════════════════════════════════════════
              GATE fields
          ═══════════════════════════════════════════ */}
          {category === 'Gate' && (
            <>
              {/* ── Identity ── */}
              <Text style={f.sectionHeader}>GATE DETAILS</Text>

              <Text style={f.label}>Gate Name <Text style={f.req}>*</Text></Text>
              <TextInput
                style={f.input}
                value={form.name || ''}
                onChangeText={(v) => set('name', v)}
                placeholder="e.g. North Gate Entrance"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
              />

              <Text style={f.label}>Description</Text>
              <TextInput
                style={[f.input, f.inputMulti]}
                value={form.description || ''}
                onChangeText={(v) => set('description', v)}
                placeholder="Access hours, security details, vehicle restrictions…"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* ── Gate type ── */}
              <Text style={f.sectionHeader}>GATE TYPE <Text style={f.req}>*</Text></Text>
              <Dropdown
                label="Gate Type"
                value={form.type}
                options={GATE_TYPES}
                onSelect={(v) => set('type', v)}
                placeholder="Select gate type"
              />
              <View style={f.typeChipsRow}>
                {GATE_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[f.typeChip, form.type === t && f.typeChipActive]}
                    onPress={() => set('type', t)}
                    activeOpacity={0.8}
                  >
                    <Text style={[f.typeChipText, form.type === t && f.typeChipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Map pin — prioritised section ── */}
              <Text style={f.sectionHeader}>📍 MAP LOCATION <Text style={f.req}>*</Text></Text>
              <View style={f.gateCoordCard}>
                <View style={f.gateCoordCardHeader}>
                  <Ionicons name="locate-outline" size={16} color={PRIMARY} />
                  <Text style={f.gateCoordCardTitle}>Pin this gate on the map</Text>
                  <GpsButton onFill={(lat, lng) => { set('latitude', lat); set('longitude', lng); }} />
                </View>
                <View style={f.coordRow}>
                  <View style={f.coordField}>
                    <Text style={f.label}>Latitude <Text style={f.req}>*</Text></Text>
                    <TextInput
                      style={f.input}
                      value={form.latitude ? String(form.latitude) : ''}
                      onChangeText={(v) => set('latitude', v)}
                      placeholder="5.6037"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={f.coordField}>
                    <Text style={f.label}>Longitude <Text style={f.req}>*</Text></Text>
                    <TextInput
                      style={f.input}
                      value={form.longitude ? String(form.longitude) : ''}
                      onChangeText={(v) => set('longitude', v)}
                      placeholder="-0.1870"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* ── Photos ── */}
              <Text style={f.sectionHeader}>PHOTOS</Text>
              <Text style={f.label}>Gate Images</Text>
              <MultiImageField images={gateImages} onChange={setGateImages} />
            </>
          )}

          {/* ═══════════════════════════════════════════
              OTHER fields
          ═══════════════════════════════════════════ */}
          {category === 'Other' && (
            <>
              <Text style={f.sectionHeader}>LOCATION DETAILS</Text>

              <Text style={f.label}>Name <Text style={f.req}>*</Text></Text>
              <TextInput
                style={f.input}
                value={form.name || ''}
                onChangeText={(v) => set('name', v)}
                placeholder="e.g. Central Quad Summer Hut"
                placeholderTextColor="#94A3B8"
                autoCapitalize="words"
              />

              <Text style={f.label}>Description</Text>
              <TextInput
                style={[f.input, f.inputMulti]}
                value={form.description || ''}
                onChangeText={(v) => set('description', v)}
                placeholder="What is this location used for?"
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <Text style={f.sectionHeader}>LOCATION TYPE <Text style={f.req}>*</Text></Text>
              <Dropdown
                label="Location Type"
                value={form.type}
                options={OTHER_TYPES}
                onSelect={(v) => set('type', v)}
                placeholder="Select type"
              />

              {/* Inline GPS coords — required */}
              <Text style={f.sectionHeader}>📍 MAP COORDINATES <Text style={f.req}>*</Text></Text>
              <View style={f.gateCoordCard}>
                <View style={f.gateCoordCardHeader}>
                  <Ionicons name="locate-outline" size={16} color={PRIMARY} />
                  <Text style={f.gateCoordCardTitle}>Pin this location on the map</Text>
                  <GpsButton onFill={(lat, lng) => { set('latitude', lat); set('longitude', lng); }} />
                </View>
                <View style={f.coordRow}>
                  <View style={f.coordField}>
                    <Text style={f.label}>Latitude <Text style={f.req}>*</Text></Text>
                    <TextInput
                      style={f.input}
                      value={form.latitude ? String(form.latitude) : ''}
                      onChangeText={(v) => set('latitude', v)}
                      placeholder="5.6037"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={f.coordField}>
                    <Text style={f.label}>Longitude <Text style={f.req}>*</Text></Text>
                    <TextInput
                      style={f.input}
                      value={form.longitude ? String(form.longitude) : ''}
                      onChangeText={(v) => set('longitude', v)}
                      placeholder="-0.1870"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* Multi-image */}
              <Text style={f.sectionHeader}>PHOTOS</Text>
              <Text style={f.label}>Location Images</Text>
              <MultiImageField images={othersImages} onChange={setOthersImages} />
            </>
          )}

          {/* ═══════════════════════════════════════════
              COMMON: GPS + Coordinates
              (hidden for Gate and Hostel — they have their own coord UI)
          ═══════════════════════════════════════════ */}
          {/* Gate and Other handle their own coordinates inline */}
          {category !== 'Gate' && category !== 'Other' && (
            <>
              <Text style={f.sectionHeader}>{category === 'Dining' ? 'GPS COORDINATES' : 'LOCATION COORDINATES'}</Text>
              <GpsButton onFill={(lat, lng) => { set('latitude', lat); set('longitude', lng); }} />
              <View style={f.coordRow}>
                <View style={f.coordField}>
                  <Text style={f.label}>Latitude</Text>
                  <TextInput style={f.input} value={form.latitude ? String(form.latitude) : ''} onChangeText={(v) => set('latitude', v)} placeholder="5.6037" placeholderTextColor="#94A3B8" keyboardType="numeric" />
                </View>
                <View style={f.coordField}>
                  <Text style={f.label}>Longitude</Text>
                  <TextInput style={f.input} value={form.longitude ? String(form.longitude) : ''} onChangeText={(v) => set('longitude', v)} placeholder="-0.1870" placeholderTextColor="#94A3B8" keyboardType="numeric" />
                </View>
              </View>
            </>
          )}

          {/* COMMON: Image — hidden for Gate and Other (both use MultiImageField) */}
          {category !== 'Gate' && category !== 'Other' && (
            <>
              <Text style={f.sectionHeader}>Photo</Text>
              <ImageSection
                previewUri={imagePreview}
                onPick={(uri) => {
                  if (uri.startsWith('http')) { setPreview(uri); setLocalUri(null); }
                  else { setLocalUri(uri); setPreview(uri); }
                }}
                onRemove={() => { setLocalUri(null); setPreview(null); }}
              />
            </>
          )}

          {/* ── Save ── */}
          <TouchableOpacity
            style={[f.saveBtn, saving && f.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={f.saveBtnText}>{saving ? 'Saving…' : editTarget ? 'Save Changes' : `Add ${category}`}</Text>
          </TouchableOpacity>

          <View style={{ height: 24 }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Category placeholder illustrations ───────────────────────────────────────
const PH_CFG = {
  Building:   { bg: '#1E3A5F', orb1: '#2563EB', orb2: '#60A5FA', icon: 'business-outline',    sub: 'Academic · Campus'     },
  Department: { bg: '#3B1D72', orb1: '#7C3AED', orb2: '#A78BFA', icon: 'layers-outline',       sub: 'Faculty · Admin'       },
  Dining:     { bg: '#7C3209', orb1: '#D97706', orb2: '#FCD34D', icon: 'restaurant-outline',   sub: 'Cafeteria · Café'      },
  Hostel:     { bg: '#064E3B', orb1: '#059669', orb2: '#34D399', icon: 'bed-outline',           sub: 'Residence · Hall'      },
  Gate:       { bg: '#7F1D1D', orb1: '#DC2626', orb2: '#F87171', icon: 'enter-outline',        sub: 'Entry · Access'        },
  Other:      { bg: '#1E293B', orb1: '#475569', orb2: '#94A3B8', icon: 'location-outline',     sub: 'Campus · Facility'     },
};

function CategoryPlaceholder({ category }) {
  const cfg = PH_CFG[category] || PH_CFG.Other;
  return (
    <View style={[ph.root, { backgroundColor: cfg.bg }]}>
      {/* Decorative orbs */}
      <View style={[ph.orb1, { backgroundColor: cfg.orb1 }]} />
      <View style={[ph.orb2, { backgroundColor: cfg.orb2 }]} />
      <View style={[ph.orb3, { backgroundColor: cfg.orb1 }]} />
      {/* Central icon */}
      <View style={ph.iconRing}>
        <Ionicons name={cfg.icon} size={46} color="rgba(255,255,255,0.92)" />
      </View>
      {/* Sub-label */}
      <View style={ph.subWrap}>
        <Text style={ph.subText}>{cfg.sub}</Text>
      </View>
    </View>
  );
}

const ph = StyleSheet.create({
  root:    { width: '100%', height: 182, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  orb1:    { position: 'absolute', width: 160, height: 160, borderRadius: 80, top: -60, right: -40, opacity: 0.35 },
  orb2:    { position: 'absolute', width: 100, height: 100, borderRadius: 50, bottom: -30, left: -20, opacity: 0.25 },
  orb3:    { position: 'absolute', width: 70,  height: 70,  borderRadius: 35, top: 20, left: 20,  opacity: 0.15 },
  iconRing:{ width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },
  subWrap: { position: 'absolute', bottom: 14, alignItems: 'center' },
  subText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.55)', letterSpacing: 0.8, textTransform: 'uppercase' },
});

// ── Unified list card ─────────────────────────────────────────────────────────
const StructureCard = ({ item, onEdit, onDelete }) => {
  const meta   = CATEGORY_META[item._category] || CATEGORY_META.Other;
  const image  = item.image_url || item.image_urls?.[0] || null;
  const scaleA = useRef(new Animated.Value(1)).current;

  const pressIn  = () => Animated.spring(scaleA, { toValue: 0.965, speed: 24, bounciness: 3, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scaleA, { toValue: 1,     speed: 24, bounciness: 5, useNativeDriver: true }).start();

  return (
    <TouchableOpacity onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1}>
      <Animated.View style={[s.card, { transform: [{ scale: scaleA }] }]}>

        {/* ── Media area ── */}
        <View style={s.cardMediaWrap}>
          {image
            ? <Image source={{ uri: image }} style={s.cardImage} resizeMode="cover" />
            : <CategoryPlaceholder category={item._category} />}

          {/* Category tag — top-left overlay */}
          <View style={[s.catTag, { backgroundColor: meta.bg + 'F2' }]}>
            <Ionicons name={meta.icon} size={10} color={meta.color} />
            <Text style={[s.catTagText, { color: meta.color }]}>{item._category}</Text>
          </View>
        </View>

        {/* ── Bottom bar: title + subtitle left, actions right ── */}
        <View style={s.cardBottom}>
          <View style={s.cardInfo}>
            <Text style={s.cardTitle} numberOfLines={1}>{item.name || '—'}</Text>
            {item._subtitle
              ? <Text style={s.cardSub} numberOfLines={1}>{item._subtitle}</Text>
              : null}
          </View>

          {/* Smaller action buttons — bottom right corner */}
          <View style={s.cardActions}>
            <TouchableOpacity
              style={[s.cardBtn, { backgroundColor: meta.bg }]}
              onPress={onEdit} activeOpacity={0.75}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="pencil" size={12} color={meta.color} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.cardBtn, s.cardBtnDanger]}
              onPress={onDelete} activeOpacity={0.75}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="trash-outline" size={12} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

      </Animated.View>
    </TouchableOpacity>
  );
};

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CampusStructureScreen({ navigation }) {
  const [buildings,   setBuildings]   = useState([]);
  const [departments, setDepartments] = useState([]);
  const [dining,      setDining]      = useState([]);
  const [locations,   setLocations]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [filter,      setFilter]      = useState('All');
  const [search,      setSearch]      = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget,   setEditTarget]   = useState(null);

  useEffect(() => {
    let loaded = 0;
    const done = () => { loaded++; if (loaded >= 4) setLoading(false); };
    const unsubs = [
      subscribeToBuildings(   (d) => { setBuildings(d   || []); done(); }),
      subscribeToDepartments( (d) => { setDepartments(d || []); done(); }),
      subscribeToDining(      (d) => { setDining(d      || []); done(); }),
      subscribeToLocations(   (d) => { setLocations(d   || []); done(); }),
    ];
    return () => unsubs.forEach((u) => { try { u?.(); } catch (_) {} });
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  // Combine all sources into a unified list with _category and _subtitle
  const allItems = useMemo(() => {
    const b = buildings.map((x) => ({ ...x, _category: 'Building', _table: 'buildings', _subtitle: [x.category, x.floors].filter(Boolean).join(' · ') || x.description }));
    const d = departments.map((x) => ({ ...x, _category: 'Department', _table: 'departments', _subtitle: x.head_of_department || x.contact_email }));
    const di = dining.map((x) => ({ ...x, _category: 'Dining',     _table: 'dining',       _subtitle: x.operating_hours || x.description }));
    const hostels = locations.filter((x) => x.category === 'Hostel').map((x) => ({ ...x, _category: 'Hostel', _table: 'locations', _subtitle: x.type }));
    const gates   = locations.filter((x) => x.category === 'Gate').map((x) => ({ ...x, _category: 'Gate',   _table: 'locations', _subtitle: x.type }));
    const others  = locations.filter((x) => x.category === 'Others').map((x) => ({ ...x, _category: 'Other', _table: 'locations', _subtitle: x.type }));
    return [...b, ...d, ...di, ...hostels, ...gates, ...others]
      .sort((a, b) => (a.created_at > b.created_at ? -1 : 1));
  }, [buildings, departments, dining, locations]);

  const filtered = useMemo(() => {
    let result = filter === 'All' ? allItems : allItems.filter((x) => x._category === filter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((x) =>
        x.name?.toLowerCase().includes(q) ||
        x._category?.toLowerCase().includes(q) ||
        x._subtitle?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allItems, filter, search]);

  const counts = `${buildings.length} buildings · ${departments.length} depts · ${dining.length} dining · ${locations.length} locations`;

  const handleDelete = (item) => {
    Alert.alert('Delete', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await deleteItem(item._table, item.id); }
          catch (e) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  const FILTERS = ['All', ...CATEGORIES];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} activeOpacity={0.75}>
          <Ionicons name="arrow-back-outline" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Campus Structure</Text>
          {/* Lighter, smaller subtitle */}
          <Text style={s.headerSub}>
            {allItems.length} total  ·  {buildings.length} buildings  ·  {dining.length} dining
          </Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={() => { setEditTarget(null); setModalVisible(true); }} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* ── Filter pills — active state uses category accent color ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterBar} contentContainerStyle={s.filterBarContent}>
        {FILTERS.map((chip) => {
          const active   = filter === chip;
          const accentC  = chip === 'All' ? '#FFFFFF' : (CATEGORY_META[chip]?.color || '#FFFFFF');
          const accentBg = chip === 'All' ? 'rgba(255,255,255,0.22)' : (accentC + '28');
          return (
            <TouchableOpacity
              key={chip}
              style={[
                s.filterPill,
                active && { backgroundColor: accentBg, borderColor: accentC + '80' },
              ]}
              onPress={() => { setFilter(chip); setSearch(''); }}
              activeOpacity={0.8}
            >
              {chip !== 'All' && (
                <Ionicons
                  name={CATEGORY_META[chip]?.icon || 'ellipse-outline'}
                  size={11}
                  color={active ? accentC : 'rgba(255,255,255,0.55)'}
                />
              )}
              <Text style={[
                s.filterPillText,
                active && { color: chip === 'All' ? '#FFFFFF' : accentC, fontWeight: '700' },
              ]}>
                {chip}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Search bar — clean white ── */}
      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={17} color="#94A3B8" />
        <TextInput
          style={s.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder={`Search ${filter === 'All' ? 'all structures' : filter.toLowerCase() + 's'}…`}
          placeholderTextColor="#94A3B8"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={17} color="#CBD5E1" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {loading ? (
        <View style={s.center}><ActivityIndicator color={PRIMARY} size="large" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PRIMARY} />}
        >
          {filtered.length === 0 ? (
            <View style={s.empty}>
              <Ionicons name="business-outline" size={48} color="#CBD5E0" />
              <Text style={s.emptyText}>No items yet</Text>
              <TouchableOpacity style={s.emptyBtn} onPress={() => { setEditTarget(null); setModalVisible(true); }} activeOpacity={0.85}>
                <Text style={s.emptyBtnText}>Add Structure</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filtered.map((item) => (
              <StructureCard
                key={`${item._table}-${item.id}`}
                item={item}
                onEdit={() => { setEditTarget(item); setModalVisible(true); }}
                onDelete={() => handleDelete(item)}
              />
            ))
          )}
        </ScrollView>
      )}

      <StructureForm
        visible={modalVisible}
        editTarget={editTarget}
        initialCategory={editTarget?._category || 'Building'}
        onClose={() => setModalVisible(false)}
        onSaved={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: PRIMARY },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 12,
  },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 3, fontWeight: '400', letterSpacing: 0.1 },
  addBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },

  filterBar: { flexGrow: 0, marginBottom: 8 },
  filterBarContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },

  // Clean white search bar
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 14,
    height: 44,
    shadowColor: '#0A1628',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    height: '100%',
    padding: 0,
  },
  // Filter pill — inactive
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  filterPillActive: {},      // active coloring applied inline
  filterPillText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.65)' },
  filterPillTextActive: {},  // applied inline

  list: { flexGrow: 1, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 24, gap: 14, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#94A3B8', marginTop: 12, marginBottom: 20 },
  emptyBtn: { backgroundColor: BLUE, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // ── Card ──
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18, overflow: 'hidden',
    shadowColor: '#0A1628', shadowOpacity: 0.10,
    shadowRadius: 14, shadowOffset: { width: 0, height: 5 }, elevation: 4,
    marginBottom: 0,
  },
  // Media container
  cardMediaWrap: { width: '100%', overflow: 'hidden' },
  cardImage:     { width: '100%', height: 182 },

  // Category overlay tag
  catTag: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4, elevation: 2,
  },
  catTagText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },

  // Bottom info bar
  cardBottom: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 11, paddingBottom: 12,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  cardInfo:  { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', letterSpacing: -0.1 },
  cardSub:   { fontSize: 11, color: '#64748B', marginTop: 2 },

  // Action buttons — smaller, bottom-right
  cardActions:   { flexDirection: 'row', gap: 6, alignItems: 'center' },
  cardBtn: {
    width: 28, height: 28, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
  },
  cardBtnDanger: { backgroundColor: '#FEF2F2' },
});

// ── Form styles ───────────────────────────────────────────────────────────────
const f = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '95%',
  },
  sheetContent: { paddingHorizontal: 22, paddingTop: 12 },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 18,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 18 },
  sectionHeader: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 1, marginBottom: 10, marginTop: 16,
  },
  req: { color: '#EF4444' },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: {
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#0F172A', marginBottom: 14,
  },
  inputMulti: { height: 80, textAlignVertical: 'top' },

  catBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5, marginBottom: 4,
  },
  catBadgeText: { fontSize: 12, fontWeight: '700' },

  // Dropdown
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 14, paddingVertical: 14, marginBottom: 14,
  },
  dropdownBtnText: { fontSize: 15, fontWeight: '500', color: '#0F172A' },
  placeholder: { color: '#94A3B8' },
  ddSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12,
  },
  ddHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16,
  },
  ddTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
  ddOption: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 14,
  },
  ddBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  ddOptionText: { fontSize: 15, fontWeight: '500', color: '#0F172A' },
  ddOptionActive: { fontWeight: '700', color: PRIMARY },

  // GPS
  // Dining location hint
  diningLocationHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  diningLocationHintText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 17,
    fontWeight: '500',
  },

  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#EFF6FF', borderRadius: 10,
    borderWidth: 1, borderColor: '#BFDBFE',
    paddingHorizontal: 14, paddingVertical: 10,
    alignSelf: 'flex-start', marginBottom: 12,
  },
  gpsBtnText: { fontSize: 13, fontWeight: '600', color: PRIMARY },

  // Coordinates
  coordRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  coordField: { flex: 1 },

  // Image
  imgToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  imgToggleBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  imgToggleActive: { backgroundColor: '#EFF6FF', borderColor: PRIMARY },
  imgToggleText: { fontSize: 13, fontWeight: '600', color: '#94A3B8' },
  imgToggleTextActive: { color: PRIMARY },
  urlPreview: { width: '100%', height: 130, borderRadius: 12, marginTop: 8, marginBottom: 14 },
  previewWrap: { borderRadius: 14, overflow: 'hidden', marginBottom: 14, position: 'relative' },
  preview: { width: '100%', height: 160 },
  changeBtn: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  changeBtnText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  pickBox: {
    borderWidth: 2, borderColor: '#E2E8F0', borderStyle: 'dashed',
    borderRadius: 14, paddingVertical: 28, alignItems: 'center',
    backgroundColor: '#F8FAFC', marginBottom: 14,
  },
  pickBoxText: { fontSize: 14, fontWeight: '600', color: '#475569', marginTop: 8, marginBottom: 3 },
  pickBoxSub: { fontSize: 12, color: '#94A3B8' },

  // Save
  saveBtn: {
    height: 52, backgroundColor: BLUE, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
    shadowColor: BLUE, shadowOpacity: 0.3, shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },

  // Department contact sub-card
  contactCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 18,
  },
  contactInput: { marginBottom: 12 },
  inputError: { borderColor: '#EF4444' },
  fieldError: { fontSize: 12, fontWeight: '500', color: '#EF4444', marginTop: -8, marginBottom: 10 },

  // Gate coord card (pinned highlight)
  gateCoordCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    padding: 14,
    marginBottom: 18,
  },
  gateCoordCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  gateCoordCardTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0369A1',
  },

  // Hostel type quick-select chips
  typeChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18, marginTop: -8 },
  typeChip: {
    paddingVertical: 7, paddingHorizontal: 16, borderRadius: 20,
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  typeChipActive: { backgroundColor: '#EFF6FF', borderColor: PRIMARY },
  typeChipText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  typeChipTextActive: { color: PRIMARY, fontWeight: '700' },
});

// ── MultiImageField styles ────────────────────────────────────────────────────
const mi = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  thumb: {
    width: 48, height: 48, borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  thumbPlaceholder: {
    width: 48, height: 48, borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed',
  },
  input: {
    flex: 1,
    backgroundColor: '#F8FAFC', borderRadius: 10,
    borderWidth: 1.5, borderColor: '#E2E8F0',
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13, color: '#0F172A',
  },
  deleteBtn: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center', alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5, borderColor: '#E2E8F0',
  },
  uploadBtn: {
    backgroundColor: BLUE, borderColor: BLUE,
  },
  actionBtnText: {
    fontSize: 13, fontWeight: '600', color: PRIMARY,
  },
});
