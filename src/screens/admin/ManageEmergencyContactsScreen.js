import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import {
  subscribeToEmergencyContacts,
  addEmergencyContact,
  updateEmergencyContact,
  deleteEmergencyContact,
} from '../../services/databaseService';

// ── Brand tokens ─────────────────────────────────────────────────────────────
const NAVY = '#1A365D';
const GOLD = '#C5A047';
const BG   = '#F8F9FA';

// ── Import helpers ────────────────────────────────────────────────────────────

const normalise = (s) => String(s ?? '').toLowerCase().replace(/[\s_\-.]/g, '');

// Pull candidate names from a header cell — prioritises the canonical
// snake_case name written inside parentheses, e.g. "Title (title)" → "title"
const extractHeaderKeys = (cell) => {
  const raw = String(cell ?? '');
  const keys = [];
  const parenMatches = [...raw.matchAll(/\(([^)]+)\)/g)];
  parenMatches.forEach((m) => keys.push(m[1].trim()));
  keys.push(raw);
  const beforeParen = raw.split('(')[0].trim();
  if (beforeParen && beforeParen !== raw) keys.push(beforeParen);
  return keys;
};

const findCol = (headers, keys) => {
  for (const header of headers) {
    const candidates = extractHeaderKeys(header);
    for (const cand of candidates) {
      for (const k of keys) {
        if (normalise(cand) === normalise(k)) return header;
      }
    }
  }
  return null;
};

// Reads a Uint8Array, automatically skips title/instruction rows, and
// returns row objects keyed by the detected column headers.
const smartParseSheet = (data, knownColMap) => {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet    = workbook.Sheets[workbook.SheetNames[0]];
  const raw      = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!raw.length) return { rows: [], headerIdx: 0 };

  const allKnown = Object.values(knownColMap).flat().map(normalise);

  let headerIdx = 0;
  for (let i = 0; i < Math.min(raw.length, 10); i++) {
    const rowCandidates = (raw[i] || []).flatMap((c) => extractHeaderKeys(String(c))).map(normalise);
    const hits = allKnown.filter((k) => rowCandidates.includes(k)).length;
    if (hits >= 2) { headerIdx = i; break; }
  }

  const headerRow = (raw[headerIdx] || []).map(String);
  const dataRows  = raw.slice(headerIdx + 1).filter((r) => r.some((c) => String(c).trim() !== ''));
  const rows      = dataRows.map((row) => {
    const obj = {};
    headerRow.forEach((key, i) => { obj[key] = row[i] ?? ''; });
    return obj;
  });
  return { rows, headerIdx };
};

const EC_COL_MAP = {
  title:                    ['title', 'name', 'service', 'contact'],
  description:              ['description', 'desc', 'detail', 'notes'],
  phone_number:             ['phonenumber', 'phone', 'number', 'primaryphone'],
  alternative_phone_number: ['alternativephonenumber', 'altphone', 'alternativephone', 'secondary', 'backup'],
  category:                 ['category', 'type', 'cat'],
  is_available_24_7:        ['isavailable247', 'available247', '247', 'roundtheclock'],
  operating_hours:          ['operatinghours', 'hours', 'openinghours', 'schedule'],
  icon_name:                ['iconname', 'icon', 'iconid'],
};

const VALID_EC_CATEGORIES = ['Emergency', 'Medical', 'Counseling', 'Security', 'Maintenance'];

const parseBoolEC = (v) => {
  if (typeof v === 'boolean') return v;
  return !['false', '0', 'no', 'off'].includes(String(v).toLowerCase().trim());
};

const parseECSheet = (rows, headerIdx) => {
  const valid = []; const errors = [];
  rows.forEach((row, idx) => {
    const headers = Object.keys(row);
    const get = (keys) => {
      const col = findCol(headers, keys);
      return col ? String(row[col] ?? '').trim() : '';
    };
    const title                    = get(EC_COL_MAP.title);
    const description              = get(EC_COL_MAP.description);
    const phone_number             = get(EC_COL_MAP.phone_number);
    const alternative_phone_number = get(EC_COL_MAP.alternative_phone_number);
    const category                 = get(EC_COL_MAP.category);
    const is247Raw                 = get(EC_COL_MAP.is_available_24_7);
    const is_available_24_7        = is247Raw === '' ? true : parseBoolEC(is247Raw);
    const operating_hours          = get(EC_COL_MAP.operating_hours);
    const icon_name                = get(EC_COL_MAP.icon_name) || 'shield-checkmark-outline';

    const rowErrors = [];
    if (!title)        rowErrors.push('title required');
    if (!phone_number) rowErrors.push('phone_number required');
    if (category && !VALID_EC_CATEGORIES.includes(category)) rowErrors.push(`invalid category "${category}"`);

    if (rowErrors.length) {
      errors.push({ row: headerIdx + idx + 2, reason: rowErrors.join(', ') });
    } else {
      valid.push({
        title,
        description:              description              || null,
        phone_number,
        alternative_phone_number: alternative_phone_number || null,
        category:  VALID_EC_CATEGORIES.includes(category) ? category : 'Emergency',
        is_available_24_7,
        operating_hours: is_available_24_7 ? null : (operating_hours || null),
        icon_name,
      });
    }
  });
  return { valid, errors };
};

// ── Category meta ─────────────────────────────────────────────────────────────
const CATEGORIES = ['Emergency', 'Medical', 'Counseling', 'Security', 'Maintenance'];
const CAT_CFG = {
  Emergency:   { color: '#E53E3E', bg: '#FEE2E2', icon: 'alert-circle-outline'    },
  Medical:     { color: '#D69E2E', bg: '#FEF3C7', icon: 'medical-outline'          },
  Counseling:  { color: '#7C3AED', bg: '#EDE9FE', icon: 'people-outline'           },
  Security:    { color: NAVY,      bg: '#EDF1F8', icon: 'shield-checkmark-outline' },
  Maintenance: { color: '#059669', bg: '#D1FAE5', icon: 'construct-outline'        },
};

// ── Icon picker options ───────────────────────────────────────────────────────
const ICONS = [
  'shield-checkmark-outline', 'alert-circle-outline', 'medical-outline',
  'flame-outline',             'people-outline',       'construct-outline',
  'call-outline',              'car-outline',           'home-outline',
  'lock-closed-outline',       'bandage-outline',       'water-outline',
];

// ── Phone input filter — digits, spaces, +, -, (, ) ────────────────────────
const sanitisePhone = (text) => text.replace(/[^\d\s+\-()]/g, '');

// ── Blank form ────────────────────────────────────────────────────────────────
const EMPTY = {
  title:                    '',
  description:              '',
  phone_number:             '',
  alternative_phone_number: '',
  category:                 'Emergency',
  is_available_24_7:        true,
  operating_hours:          '',
  icon_name:                'shield-checkmark-outline',
};

// ─────────────────────────────────────────────────────────────────────────────
export default function ManageEmergencyContactsScreen({ navigation }) {
  const [contacts,  setContacts]  = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving,    setSaving]    = useState(false);

  // Import state
  const [showImport,     setShowImport]     = useState(false);
  const [importPreview,  setImportPreview]  = useState({ valid: [], errors: [] });
  const [importing,      setImporting]      = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [filterCat, setFilterCat] = useState('All');
  const [errors,    setErrors]    = useState({});

  // Animated height for operating_hours field
  const hoursAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsub = subscribeToEmergencyContacts((data) => setContacts(data || []));
    return () => { try { unsub?.(); } catch (_) {} };
  }, []);

  useEffect(() => {
    Animated.timing(hoursAnim, {
      toValue:  form.is_available_24_7 ? 0 : 1,
      duration: 300,
      easing:   Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [form.is_available_24_7]);

  // ── Filtered list ───────────────────────────────────────────────────────────
  const displayed = useMemo(
    () => filterCat === 'All' ? contacts : contacts.filter((c) => c.category === filterCat),
    [contacts, filterCat]
  );

  // ── Form helpers ────────────────────────────────────────────────────────────
  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: null }));
  };

  const openAdd = () => {
    setForm(EMPTY); setEditingId(null); setErrors({}); setShowModal(true);
  };

  const openEdit = (contact) => {
    setForm({
      title:                    contact.title                    || '',
      description:              contact.description              || '',
      phone_number:             contact.phone_number             || '',
      alternative_phone_number: contact.alternative_phone_number || '',
      category:                 contact.category                 || 'Emergency',
      is_available_24_7:        contact.is_available_24_7 !== false,
      operating_hours:          contact.operating_hours          || '',
      icon_name:                contact.icon_name                || 'shield-checkmark-outline',
    });
    setEditingId(contact.id);
    setErrors({});
    setShowModal(true);
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.title.trim())        errs.title        = 'Title is required';
    if (!form.phone_number.trim()) errs.phone_number = 'Phone number is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        title:                    form.title.trim(),
        description:              form.description.trim() || null,
        phone_number:             form.phone_number.trim(),
        alternative_phone_number: form.alternative_phone_number.trim() || null,
        category:                 form.category,
        is_available_24_7:        form.is_available_24_7,
        operating_hours:          form.is_available_24_7 ? null : (form.operating_hours.trim() || null),
        icon_name:                form.icon_name,
      };

      if (editingId) {
        await updateEmergencyContact(editingId, payload);
      } else {
        await addEmergencyContact(payload);
      }

      setShowModal(false);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not save contact.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = (contact) => {
    Alert.alert(
      'Delete Contact',
      `Remove "${contact.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try { await deleteEmergencyContact(contact.id); }
            catch (err) { Alert.alert('Error', err?.message || 'Could not delete.'); }
          },
        },
      ]
    );
  };

  // ── Animated style for operating_hours ──────────────────────────────────────
  const hoursContainerStyle = {
    height:   hoursAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 110] }),
    opacity:  hoursAnim,
    overflow: 'hidden',
  };

  // ── Pick & parse file ──────────────────────────────────────────────────────
  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.ms-excel',
               'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
               'text/csv', 'text/comma-separated-values', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      setImportFileName(file.name || 'file');

      const response    = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();
      const data        = new Uint8Array(arrayBuffer);
      const { rows, headerIdx } = smartParseSheet(data, EC_COL_MAP);

      if (!rows.length) { Alert.alert('Empty file', 'No data rows found in the spreadsheet.'); return; }
      setImportPreview(parseECSheet(rows, headerIdx));
      setShowImport(true);
    } catch (err) {
      console.error('[Import] parse error:', err);
      Alert.alert('Import error', err?.message || 'Could not read file.');
    }
  };

  // ── Bulk insert confirmed rows ──────────────────────────────────────────────
  const handleConfirmImport = async () => {
    if (!importPreview.valid.length) return;
    setImporting(true);
    let ok = 0; let fail = 0;
    for (const row of importPreview.valid) {
      try { await addEmergencyContact(row); ok++; }
      catch { fail++; }
    }
    setImporting(false);
    setShowImport(false);
    Alert.alert('Import complete', `${ok} contact${ok !== 1 ? 's' : ''} imported${fail ? `, ${fail} failed` : ''}.`);
  };

  const canGoBack = navigation?.canGoBack?.();

  // ── Render contact card ─────────────────────────────────────────────────────
  const renderContact = ({ item }) => {
    const cfg = CAT_CFG[item.category] || CAT_CFG.Security;
    return (
      <View style={styles.card}>
        <View style={[styles.cardLeftBar, { backgroundColor: cfg.color }]} />
        <View style={styles.cardBody}>
          {/* Top row */}
          <View style={styles.cardTopRow}>
            <View style={[styles.cardIconBox, { backgroundColor: cfg.bg }]}>
              <Ionicons name={item.icon_name || cfg.icon} size={20} color={cfg.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.catBadge, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.catBadgeText, { color: cfg.color }]}>{item.category}</Text>
              </View>
            </View>
            <View style={[styles.availBadge, item.is_available_24_7 ? styles.availBadge24 : styles.availBadgeHours]}>
              <Ionicons name="time-outline" size={11} color={item.is_available_24_7 ? '#059669' : '#718096'} />
              <Text style={[styles.availBadgeText, { color: item.is_available_24_7 ? '#059669' : '#718096' }]}>
                {item.is_available_24_7 ? '24 / 7' : 'Hours'}
              </Text>
            </View>
          </View>

          {/* Description */}
          {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}

          {/* Phones */}
          <View style={styles.phonesRow}>
            <View style={styles.phoneChip}>
              <Ionicons name="call-outline" size={13} color={NAVY} />
              <Text style={styles.phoneText}>{item.phone_number}</Text>
            </View>
            {item.alternative_phone_number ? (
              <View style={[styles.phoneChip, { backgroundColor: '#EDF1F8' }]}>
                <Ionicons name="call-outline" size={13} color="#718096" />
                <Text style={[styles.phoneText, { color: '#718096' }]}>{item.alternative_phone_number}</Text>
              </View>
            ) : null}
          </View>

          {/* Hours */}
          {!item.is_available_24_7 && item.operating_hours ? (
            <Text style={styles.cardHours}>{item.operating_hours}</Text>
          ) : null}

          {/* Actions */}
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)} activeOpacity={0.85}>
              <Ionicons name="pencil-outline" size={14} color={NAVY} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={14} color="#E53E3E" />
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <ScreenWrapper backgroundColor={BG} statusBarStyle="light-content">
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerGoldBar} />
        <View style={styles.headerContent}>
          {canGoBack && (
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>ADMIN</Text>
            <Text style={styles.headerTitle}>Emergency Contacts</Text>
          </View>
          <TouchableOpacity style={styles.importBtn} onPress={handlePickFile} activeOpacity={0.85}>
            <Ionicons name="cloud-upload-outline" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.importBtnText}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color={NAVY} />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>Manage campus emergency and support contacts.</Text>
      </View>

      {/* ── Category filter ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {['All', ...CATEGORIES].map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterChip, filterCat === cat && styles.filterChipActive]}
            onPress={() => setFilterCat(cat)}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterChipText, filterCat === cat && styles.filterChipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Contact list ── */}
      <FlatList
        data={displayed}
        keyExtractor={(item, i) => item.id || String(i)}
        renderItem={renderContact}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="call-outline" size={48} color={GOLD} />
            <Text style={styles.emptyTitle}>No contacts yet</Text>
            <Text style={styles.emptySub}>Tap "+ Add" to create the first emergency contact.</Text>
          </View>
        }
      />

      {/* ════════════════════════════════════════════════════════════════════════
          IMPORT PREVIEW MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showImport} transparent animationType="slide" onRequestClose={() => setShowImport(false)}>
        <View style={styles.importBackdrop}>
          <View style={styles.importSheet}>
            <View style={[styles.importGoldBar, { backgroundColor: GOLD }]} />
            <View style={styles.importHandle} />

            <View style={styles.importSheetHeader}>
              <View>
                <Text style={styles.importSheetTitle}>Import Preview</Text>
                <Text style={styles.importSheetFile} numberOfLines={1}>{importFileName}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowImport(false)} style={styles.importCloseBtn}>
                <Ionicons name="close" size={20} color="#718096" />
              </TouchableOpacity>
            </View>

            <View style={styles.importStats}>
              <View style={[styles.importStatChip, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle-outline" size={15} color="#059669" />
                <Text style={[styles.importStatText, { color: '#059669' }]}>{importPreview.valid.length} valid</Text>
              </View>
              {importPreview.errors.length > 0 && (
                <View style={[styles.importStatChip, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="alert-circle-outline" size={15} color="#DC2626" />
                  <Text style={[styles.importStatText, { color: '#DC2626' }]}>{importPreview.errors.length} skipped</Text>
                </View>
              )}
            </View>

            <View style={styles.importHint}>
              <Ionicons name="information-circle-outline" size={14} color={GOLD} />
              <Text style={styles.importHintText}>
                Expected columns: <Text style={{ fontWeight: '700' }}>title*,  phone_number*,  description,  category,  is_available_24_7,  operating_hours,  icon_name</Text>
              </Text>
            </View>

            <ScrollView style={styles.importPreviewScroll} showsVerticalScrollIndicator={false}>
              <View style={[styles.importRow, styles.importRowHeader]}>
                {['Title', 'Phone', 'Category', '24/7'].map((h) => (
                  <Text key={h} style={[styles.importCell, styles.importCellHeader]}>{h}</Text>
                ))}
              </View>
              {importPreview.valid.slice(0, 10).map((row, i) => (
                <View key={i} style={[styles.importRow, i % 2 === 0 && styles.importRowAlt]}>
                  <Text style={styles.importCell} numberOfLines={1}>{row.title}</Text>
                  <Text style={styles.importCell} numberOfLines={1}>{row.phone_number}</Text>
                  <Text style={styles.importCell} numberOfLines={1}>{row.category}</Text>
                  <Text style={[styles.importCell, { color: row.is_available_24_7 ? '#059669' : '#718096' }]}>
                    {row.is_available_24_7 ? 'Yes' : 'No'}
                  </Text>
                </View>
              ))}
              {importPreview.valid.length > 10 && (
                <Text style={styles.importMore}>+{importPreview.valid.length - 10} more rows…</Text>
              )}
              {importPreview.errors.length > 0 && (
                <View style={styles.importErrorsWrap}>
                  <Text style={styles.importErrorsTitle}>Skipped rows:</Text>
                  {importPreview.errors.map((e, i) => (
                    <Text key={i} style={styles.importErrorRow}>Row {e.row}: {e.reason}</Text>
                  ))}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.importConfirmBtn, (!importPreview.valid.length || importing) && { opacity: 0.5 }]}
              onPress={handleConfirmImport}
              disabled={!importPreview.valid.length || importing}
              activeOpacity={0.85}
            >
              <Ionicons name="cloud-upload-outline" size={18} color={NAVY} />
              <Text style={styles.importConfirmText}>
                {importing ? 'Importing…' : `Import ${importPreview.valid.length} Contact${importPreview.valid.length !== 1 ? 's' : ''}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════════
          ADD / EDIT MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showModal} animationType="slide" transparent={false} onRequestClose={() => setShowModal(false)}>
        <ScreenWrapper backgroundColor={BG} statusBarStyle="dark-content">
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScroll}
          >
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderGoldBar} />
              <View style={styles.modalHeaderContent}>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={22} color="#2D3748" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{editingId ? 'Edit Contact' : 'Add Emergency Contact'}</Text>
              </View>
            </View>

            <View style={styles.formBody}>
              {/* ── Icon selector ── */}
              <Text style={styles.fieldLabel}>Icon</Text>
              <View style={styles.iconGrid}>
                {ICONS.map((iconName) => (
                  <TouchableOpacity
                    key={iconName}
                    style={[styles.iconOption, form.icon_name === iconName && styles.iconOptionActive]}
                    onPress={() => set('icon_name', iconName)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={iconName}
                      size={22}
                      color={form.icon_name === iconName ? '#fff' : '#718096'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Title ── */}
              <Text style={styles.fieldLabel}>Title <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.input, errors.title && styles.inputError]}
                placeholder="e.g. Campus Fire Wardens"
                placeholderTextColor="#A0AEC0"
                value={form.title}
                onChangeText={(v) => set('title', v)}
                returnKeyType="next"
              />
              {errors.title ? <Text style={styles.errorMsg}>{errors.title}</Text> : null}

              {/* ── Description ── */}
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="e.g. For fire outbreaks and hazardous management"
                placeholderTextColor="#A0AEC0"
                value={form.description}
                onChangeText={(v) => set('description', v)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* ── Category ── */}
              <Text style={styles.fieldLabel}>Category <Text style={styles.required}>*</Text></Text>
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={form.category}
                  onValueChange={(v) => set('category', v)}
                  style={styles.picker}
                  itemStyle={{ fontSize: 14, color: '#2D3748' }}
                >
                  {CATEGORIES.map((cat) => (
                    <Picker.Item key={cat} label={cat} value={cat} />
                  ))}
                </Picker>
              </View>

              {/* ── Phones row ── */}
              <View style={styles.phonesGrid}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Phone Number <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={[styles.input, errors.phone_number && styles.inputError]}
                    placeholder="+233 24 000 0000"
                    placeholderTextColor="#A0AEC0"
                    value={form.phone_number}
                    onChangeText={(v) => set('phone_number', sanitisePhone(v))}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                  />
                  {errors.phone_number ? <Text style={styles.errorMsg}>{errors.phone_number}</Text> : null}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Alt. Phone <Text style={styles.optional}>(optional)</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="+233 24 000 0001"
                    placeholderTextColor="#A0AEC0"
                    value={form.alternative_phone_number}
                    onChangeText={(v) => set('alternative_phone_number', sanitisePhone(v))}
                    keyboardType="phone-pad"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* ── Available 24/7 toggle ── */}
              <View style={styles.toggleRow}>
                <View>
                  <Text style={styles.toggleLabel}>Available 24 / 7</Text>
                  <Text style={styles.toggleSub}>Turn off to specify operating hours</Text>
                </View>
                <Switch
                  value={form.is_available_24_7}
                  onValueChange={(v) => set('is_available_24_7', v)}
                  trackColor={{ false: '#CBD5E0', true: NAVY }}
                  thumbColor={form.is_available_24_7 ? GOLD : '#fff'}
                />
              </View>

              {/* ── Operating hours (animated slide) ── */}
              <Animated.View style={hoursContainerStyle}>
                <Text style={[styles.fieldLabel, { marginTop: 4 }]}>Operating Hours</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Mon – Fri  8:00 AM – 5:00 PM"
                  placeholderTextColor="#A0AEC0"
                  value={form.operating_hours}
                  onChangeText={(v) => set('operating_hours', v)}
                  returnKeyType="done"
                />
              </Animated.View>

              {/* ── Submit ── */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Ionicons name={editingId ? 'checkmark-circle-outline' : 'add-circle-outline'} size={18} color={NAVY} />
                <Text style={styles.saveBtnText}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Contact'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ScreenWrapper>
      </Modal>
    </ScreenWrapper>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Header
  header:          { backgroundColor: NAVY, paddingTop: 52, paddingBottom: 22, paddingHorizontal: 20 },
  headerGoldBar:   { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: GOLD },
  headerContent:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  backBtn:         { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  headerEyebrow:   { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: GOLD, textTransform: 'uppercase' },
  headerTitle:     { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub:       { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  addBtn:          { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: GOLD, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  addBtnText:      { fontSize: 13, fontWeight: '800', color: NAVY },

  // Filter
  filterRow: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10, gap: 8 },
  filterChip:         { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(26,54,93,0.12)' },
  filterChipActive:   { backgroundColor: NAVY, borderColor: NAVY },
  filterChipText:     { fontSize: 12, fontWeight: '600', color: '#718096' },
  filterChipTextActive:{ color: '#fff' },

  // List
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },

  // Contact card
  card:        { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(26,54,93,0.08)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardLeftBar: { width: 4 },
  cardBody:    { flex: 1, padding: 14 },
  cardTopRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  cardIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: '#2D3748', marginBottom: 5 },
  catBadge:    { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7 },
  catBadgeText:{ fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  availBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  availBadge24:{ backgroundColor: '#D1FAE5' },
  availBadgeHours:{ backgroundColor: '#F1F5F9' },
  availBadgeText:{ fontSize: 10, fontWeight: '700' },
  cardDesc:    { fontSize: 12, color: '#718096', lineHeight: 17, marginBottom: 10 },
  phonesRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  phoneChip:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: '#EDF1F8' },
  phoneText:   { fontSize: 12, fontWeight: '600', color: NAVY },
  cardHours:   { fontSize: 11, color: '#718096', marginBottom: 8 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  editBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#EDF1F8' },
  editBtnText: { fontSize: 12, fontWeight: '700', color: NAVY },
  deleteBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FEE2E2' },
  deleteBtnText:{ fontSize: 12, fontWeight: '700', color: '#E53E3E' },

  // Empty
  empty:      { flex: 1, alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748' },
  emptySub:   { fontSize: 13, color: '#718096', textAlign: 'center', maxWidth: 240 },

  // Modal
  modalScroll:        { paddingBottom: 40 },
  modalHeader:        { backgroundColor: NAVY, paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20, position: 'relative' },
  modalHeaderGoldBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: GOLD },
  modalHeaderContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  modalCloseBtn:      { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  modalTitle:         { fontSize: 20, fontWeight: '800', color: '#fff' },

  // Form
  formBody:    { paddingHorizontal: 20, paddingTop: 24, gap: 4 },
  fieldLabel:  { fontSize: 13, fontWeight: '700', color: '#2D3748', marginBottom: 7, marginTop: 14 },
  required:    { color: '#E53E3E' },
  optional:    { color: '#A0AEC0', fontWeight: '400', fontSize: 12 },
  input: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5,
    borderColor: 'rgba(26,54,93,0.14)', paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    fontSize: 14, color: '#2D3748',
  },
  inputError:  { borderColor: '#E53E3E', backgroundColor: '#FFF5F5' },
  textarea:    { minHeight: 80, textAlignVertical: 'top' },
  errorMsg:    { fontSize: 12, color: '#E53E3E', marginTop: 4 },

  // Icon grid — 4 cols
  iconGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  iconOption:     { width: 50, height: 50, borderRadius: 14, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  iconOptionActive:{ backgroundColor: NAVY, borderColor: GOLD },

  // Category picker
  pickerWrap: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(26,54,93,0.14)', overflow: 'hidden' },
  picker:     { height: Platform.OS === 'ios' ? 150 : 52, color: '#2D3748' },

  // Phones grid (side-by-side)
  phonesGrid: { flexDirection: 'row', gap: 12, marginTop: 14 },

  // Toggle
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 14, borderWidth: 1, borderColor: 'rgba(26,54,93,0.10)' },
  toggleLabel:{ fontSize: 15, fontWeight: '700', color: '#2D3748' },
  toggleSub:  { fontSize: 12, color: '#718096', marginTop: 2 },

  // Save button
  saveBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 16, backgroundColor: GOLD, marginTop: 24 },
  saveBtnDisabled: { opacity: 0.55 },
  saveBtnText:     { fontSize: 15, fontWeight: '800', color: NAVY },

  // ── Import button (header)
  importBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  importBtnText:  { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },

  // ── Import preview modal
  importBackdrop:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  importSheet:         { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 36, maxHeight: '88%', overflow: 'hidden' },
  importGoldBar:       { height: 3, marginHorizontal: -20 },
  importHandle:        { width: 44, height: 4, borderRadius: 2, backgroundColor: '#CBD5E0', alignSelf: 'center', marginTop: 10, marginBottom: 16 },
  importSheetHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  importSheetTitle:    { fontSize: 18, fontWeight: '800', color: '#2D3748' },
  importSheetFile:     { fontSize: 12, color: '#718096', marginTop: 3, maxWidth: 260 },
  importCloseBtn:      { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  importStats:         { flexDirection: 'row', gap: 10, marginBottom: 12 },
  importStatChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  importStatText:      { fontSize: 13, fontWeight: '700' },
  importHint:          { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: 'rgba(197,160,71,0.10)', borderRadius: 12, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(197,160,71,0.25)' },
  importHintText:      { flex: 1, fontSize: 12, color: '#4A5568', lineHeight: 17 },
  importPreviewScroll: { maxHeight: 300, marginBottom: 16 },
  importRow:           { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  importRowHeader:     { borderBottomWidth: 2, borderBottomColor: '#E2E8F0', backgroundColor: '#F8F9FA' },
  importRowAlt:        { backgroundColor: '#FAFBFC' },
  importCell:          { flex: 1, fontSize: 12, color: '#2D3748', paddingHorizontal: 4 },
  importCellHeader:    { fontWeight: '800', fontSize: 11, color: '#718096', textTransform: 'uppercase', letterSpacing: 0.4 },
  importMore:          { fontSize: 12, color: '#718096', textAlign: 'center', paddingVertical: 8, fontStyle: 'italic' },
  importErrorsWrap:    { marginTop: 12, backgroundColor: '#FFF5F5', borderRadius: 12, padding: 12 },
  importErrorsTitle:   { fontSize: 12, fontWeight: '700', color: '#DC2626', marginBottom: 6 },
  importErrorRow:      { fontSize: 12, color: '#9B2335', marginBottom: 3 },
  importConfirmBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 16, backgroundColor: GOLD },
  importConfirmText:   { fontSize: 15, fontWeight: '800', color: NAVY },
});
