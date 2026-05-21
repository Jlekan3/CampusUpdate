import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Animated, Easing, FlatList, Modal, Platform,
  ScrollView, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View,
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

// ── Design tokens ─────────────────────────────────────────────────────────────
const CHARCOAL = '#1F2937';
const DARK     = '#111827';
const SLATE    = '#374151';
const MUTED    = '#6B7280';
const LIGHT    = '#9CA3AF';
const BORDER   = '#E5E7EB';
const BG       = '#F9FAFB';
const SURFACE  = '#FFFFFF';
const GOLD     = '#C5A047';

// ── Chip colors per category ──────────────────────────────────────────────────
const CHIP = {
  All:         { bg: CHARCOAL,  text: '#FFFFFF', border: CHARCOAL  },
  Emergency:   { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  Medical:     { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  Counseling:  { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
  Security:    { bg: '#F1F5F9', text: '#0F172A', border: '#CBD5E1' },
  Maintenance: { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
};

// ── Category left-bar + card accent ──────────────────────────────────────────
const CAT_CFG = {
  Emergency:   { color: '#DC2626', bg: '#FEF2F2', icon: 'alert-circle-outline'    },
  Medical:     { color: '#2563EB', bg: '#EFF6FF', icon: 'medical-outline'          },
  Counseling:  { color: '#7C3AED', bg: '#F5F3FF', icon: 'people-outline'           },
  Security:    { color: '#0F172A', bg: '#F1F5F9', icon: 'shield-checkmark-outline' },
  Maintenance: { color: '#059669', bg: '#ECFDF5', icon: 'construct-outline'        },
};

// ── Icons grid ────────────────────────────────────────────────────────────────
const ICONS = [
  'shield-checkmark-outline', 'alert-circle-outline', 'medical-outline',
  'flame-outline', 'people-outline', 'construct-outline',
  'call-outline', 'car-outline', 'home-outline',
  'lock-closed-outline', 'bandage-outline', 'water-outline',
];
const CATEGORIES = ['Emergency', 'Medical', 'Counseling', 'Security', 'Maintenance'];
const sanitisePhone = (t) => t.replace(/[^\d\s+\-()]/g, '');
const EMPTY = {
  title: '', description: '', phone_number: '', alternative_phone_number: '',
  category: 'Emergency', is_available_24_7: true, operating_hours: '', icon_name: 'shield-checkmark-outline',
};

// ── Import helpers ─────────────────────────────────────────────────────────────
const normalise         = (s) => String(s ?? '').toLowerCase().replace(/[\s_\-.]/g, '');
const extractHeaderKeys = (cell) => {
  const raw = String(cell ?? '');
  const keys = [];
  [...raw.matchAll(/\(([^)]+)\)/g)].forEach((m) => keys.push(m[1].trim()));
  keys.push(raw);
  const bp = raw.split('(')[0].trim();
  if (bp && bp !== raw) keys.push(bp);
  return keys;
};
const findCol = (headers, keys) => {
  for (const h of headers) {
    for (const c of extractHeaderKeys(h))
      for (const k of keys)
        if (normalise(c) === normalise(k)) return h;
  }
  return null;
};
const smartParseSheet = (data, knownColMap) => {
  const wb  = XLSX.read(data, { type: 'array' });
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
  if (!raw.length) return { rows: [], headerIdx: 0 };
  const allKnown = Object.values(knownColMap).flat().map(normalise);
  let headerIdx = 0;
  for (let i = 0; i < Math.min(raw.length, 10); i++) {
    const cands = (raw[i] || []).flatMap((c) => extractHeaderKeys(String(c))).map(normalise);
    if (allKnown.filter((k) => cands.includes(k)).length >= 2) { headerIdx = i; break; }
  }
  const headerRow = (raw[headerIdx] || []).map(String);
  const rows = raw.slice(headerIdx + 1)
    .filter((r) => r.some((c) => String(c).trim() !== ''))
    .map((row) => { const o = {}; headerRow.forEach((k, i) => { o[k] = row[i] ?? ''; }); return o; });
  return { rows, headerIdx };
};
const EC_COL_MAP = {
  title: ['title','name','service'], description: ['description','desc','notes'],
  phone_number: ['phonenumber','phone','number'], alternative_phone_number: ['alternativephonenumber','altphone'],
  category: ['category','type'], is_available_24_7: ['isavailable247','available247','247'],
  operating_hours: ['operatinghours','hours'], icon_name: ['iconname','icon'],
};
const VALID_CATS = CATEGORIES;
const parseBool = (v) => typeof v === 'boolean' ? v : !['false','0','no','off'].includes(String(v).toLowerCase().trim());
const parseECSheet = (rows, headerIdx) => {
  const valid = [], errors = [];
  rows.forEach((row, idx) => {
    const hs = Object.keys(row), get = (k) => { const c = findCol(hs, k); return c ? String(row[c] ?? '').trim() : ''; };
    const title = get(EC_COL_MAP.title), phone = get(EC_COL_MAP.phone_number);
    const cat = get(EC_COL_MAP.category), is247r = get(EC_COL_MAP.is_available_24_7);
    const rowErr = [];
    if (!title) rowErr.push('title required');
    if (!phone) rowErr.push('phone_number required');
    if (cat && !VALID_CATS.includes(cat)) rowErr.push(`invalid category "${cat}"`);
    if (rowErr.length) { errors.push({ row: headerIdx + idx + 2, reason: rowErr.join(', ') }); return; }
    valid.push({ title, description: get(EC_COL_MAP.description) || null, phone_number: phone,
      alternative_phone_number: get(EC_COL_MAP.alternative_phone_number) || null,
      category: VALID_CATS.includes(cat) ? cat : 'Emergency',
      is_available_24_7: is247r === '' ? true : parseBool(is247r),
      operating_hours: null, icon_name: get(EC_COL_MAP.icon_name) || 'shield-checkmark-outline' });
  });
  return { valid, errors };
};

// ─────────────────────────────────────────────────────────────────────────────
export default function ManageEmergencyContactsScreen({ navigation }) {
  const [contacts,       setContacts]       = useState([]);
  const [showModal,      setShowModal]      = useState(false);
  const [showActionSheet,setShowActionSheet]= useState(false);
  const [form,           setForm]           = useState(EMPTY);
  const [editingId,      setEditingId]      = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [filterCat,      setFilterCat]      = useState('All');
  const [errors,         setErrors]         = useState({});
  const [showImport,     setShowImport]     = useState(false);
  const [importPreview,  setImportPreview]  = useState({ valid: [], errors: [] });
  const [importing,      setImporting]      = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const hoursAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsub = subscribeToEmergencyContacts((d) => setContacts(d || []));
    return () => { try { unsub?.(); } catch (_) {} };
  }, []);

  useEffect(() => {
    Animated.timing(hoursAnim, {
      toValue: form.is_available_24_7 ? 0 : 1, duration: 300,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start();
  }, [form.is_available_24_7]);

  const displayed = useMemo(
    () => filterCat === 'All' ? contacts : contacts.filter((c) => c.category === filterCat),
    [contacts, filterCat]
  );

  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); if (errors[k]) setErrors((p) => ({ ...p, [k]: null })); };
  const openAdd  = () => { setForm(EMPTY); setEditingId(null); setErrors({}); setShowModal(true); };
  const openEdit = (c) => {
    setForm({ title: c.title||'', description: c.description||'', phone_number: c.phone_number||'',
      alternative_phone_number: c.alternative_phone_number||'', category: c.category||'Emergency',
      is_available_24_7: c.is_available_24_7 !== false, operating_hours: c.operating_hours||'',
      icon_name: c.icon_name||'shield-checkmark-outline' });
    setEditingId(c.id); setErrors({}); setShowModal(true);
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim())        e.title        = 'Title is required';
    if (!form.phone_number.trim()) e.phone_number = 'Phone number is required';
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = { title: form.title.trim(), description: form.description.trim() || null,
      phone_number: form.phone_number.trim(), alternative_phone_number: form.alternative_phone_number.trim() || null,
      category: form.category, is_available_24_7: form.is_available_24_7,
      operating_hours: form.is_available_24_7 ? null : (form.operating_hours.trim() || null),
      icon_name: form.icon_name };
    try {
      editingId ? await updateEmergencyContact(editingId, payload) : await addEmergencyContact(payload);
      setShowModal(false);
    } catch (err) { Alert.alert('Error', err?.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  const handleDelete = (c) => {
    Alert.alert('Delete Contact', `Remove "${c.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteEmergencyContact(c.id); }
        catch (err) { Alert.alert('Error', err?.message); }
      }},
    ]);
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv','*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      setImportFileName(file.name || 'file');
      const response = await fetch(file.uri);
      const data = new Uint8Array(await response.arrayBuffer());
      const { rows, headerIdx } = smartParseSheet(data, EC_COL_MAP);
      if (!rows.length) { Alert.alert('Empty file', 'No data rows found.'); return; }
      setImportPreview(parseECSheet(rows, headerIdx));
      setShowImport(true);
    } catch (err) { Alert.alert('Import error', err?.message || 'Could not read file.'); }
  };

  const handleConfirmImport = async () => {
    if (!importPreview.valid.length) return;
    setImporting(true);
    let ok = 0, fail = 0;
    for (const row of importPreview.valid) {
      try { await addEmergencyContact(row); ok++; } catch { fail++; }
    }
    setImporting(false); setShowImport(false);
    Alert.alert('Import complete', `${ok} imported${fail ? `, ${fail} failed` : ''}.`);
  };

  const hoursStyle = {
    height: hoursAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 110] }),
    opacity: hoursAnim, overflow: 'hidden',
  };
  const canGoBack = navigation?.canGoBack?.();

  // ── Contact card ─────────────────────────────────────────────────────────────
  const renderContact = ({ item }) => {
    const cfg = CAT_CFG[item.category] || CAT_CFG.Security;
    return (
      <View style={s.card}>
        <View style={[s.cardBar, { backgroundColor: cfg.color }]} />
        <View style={s.cardContent}>
          <View style={s.cardRow}>
            <View style={[s.catPill, { backgroundColor: cfg.bg, borderColor: cfg.color + '40' }]}>
              <Ionicons name={cfg.icon} size={11} color={cfg.color} />
              <Text style={[s.catPillTxt, { color: cfg.color }]}>{item.category}</Text>
            </View>
            <View style={[s.availPill, { backgroundColor: item.is_available_24_7 ? '#ECFDF5' : '#F1F5F9' }]}>
              <View style={[s.availDot, { backgroundColor: item.is_available_24_7 ? '#10B981' : '#9CA3AF' }]} />
              <Text style={[s.availTxt, { color: item.is_available_24_7 ? '#059669' : '#6B7280' }]}>
                {item.is_available_24_7 ? '24 / 7' : 'Hours only'}
              </Text>
            </View>
          </View>
          <Text style={s.cardTitle}>{item.title}</Text>
          {item.description ? <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text> : null}
          <View style={s.phoneRow}>
            <View style={s.phonePill}>
              <Ionicons name="call-outline" size={12} color={SLATE} />
              <Text style={s.phoneTxt}>{item.phone_number}</Text>
            </View>
            {item.alternative_phone_number ? (
              <View style={[s.phonePill, { backgroundColor: '#F1F5F9' }]}>
                <Text style={[s.phoneTxt, { color: MUTED }]}>{item.alternative_phone_number}</Text>
              </View>
            ) : null}
          </View>
          {!item.is_available_24_7 && item.operating_hours ? (
            <Text style={s.hoursLabel}>{item.operating_hours}</Text>
          ) : null}
          <View style={s.cardActions}>
            <TouchableOpacity style={s.editBtn} onPress={() => openEdit(item)} activeOpacity={0.85}>
              <Ionicons name="pencil-outline" size={13} color={SLATE} />
              <Text style={s.editTxt}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(item)} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={13} color="#DC2626" />
              <Text style={s.deleteTxt}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <ScreenWrapper backgroundColor={BG} statusBarStyle="light-content">

      {/* ── HEADER ── */}
      <View style={s.header}>
        <View style={s.headerTop}>
          {canGoBack && (
            <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.headerEye}>ADMIN</Text>
            <Text style={s.headerTitle}>Emergency Contacts</Text>
          </View>
          <View style={s.headerRight}>
            <TouchableOpacity style={s.iconBtn} onPress={() => setShowActionSheet(true)} activeOpacity={0.85}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={handlePickFile} activeOpacity={0.85}>
              <Ionicons name="cloud-upload-outline" size={18} color="rgba(255,255,255,0.85)" />
            </TouchableOpacity>
          </View>
        </View>
        {/* Glassmorphism search */}
        <View style={s.searchGlass}>
          <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.7)" />
          <Text style={s.searchPlaceholder}>Search contacts…</Text>
        </View>
      </View>

      {/* ── FILTER CHIPS ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        {['All', ...CATEGORIES].map((cat) => {
          const active = filterCat === cat;
          const cc     = CHIP[cat] || CHIP.All;
          return (
            <TouchableOpacity
              key={cat}
              style={[s.chip, { backgroundColor: active ? cc.bg : SURFACE, borderColor: active ? cc.border : BORDER }]}
              onPress={() => setFilterCat(cat)}
              activeOpacity={0.8}
            >
              <Text style={[s.chipTxt, { color: active ? cc.text : MUTED, fontWeight: active ? '700' : '500' }]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── LIST ── */}
      <FlatList
        data={displayed}
        keyExtractor={(item, i) => item.id || String(i)}
        renderItem={renderContact}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIconWrap}>
              <View style={s.emptyGlow} />
              <Ionicons name="call-outline" size={44} color="#D1D5DB" />
            </View>
            <Text style={s.emptyTitle}>No contacts yet</Text>
            <Text style={s.emptySub}>
              Get started by adding your first emergency contact manually, or import them all in bulk using a CSV or Excel template.
            </Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowActionSheet(true)} activeOpacity={0.85}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={s.emptyBtnTxt}>Add Contact</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ════════════ ADD ACTION SHEET ════════════ */}
      <Modal visible={showActionSheet} transparent animationType="slide" onRequestClose={() => setShowActionSheet(false)}>
        <View style={s.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setShowActionSheet(false)} />
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Add Contact</Text>
            <Text style={s.sheetSub}>How would you like to add?</Text>

            <TouchableOpacity style={s.sheetOption} onPress={() => { setShowActionSheet(false); openAdd(); }} activeOpacity={0.85}>
              <View style={s.sheetOptionIcon}>
                <Ionicons name="create-outline" size={22} color={SLATE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetOptionTitle}>Add Manually</Text>
                <Text style={s.sheetOptionSub}>Fill in the form with details</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={LIGHT} />
            </TouchableOpacity>

            <TouchableOpacity style={s.sheetOption} onPress={() => { setShowActionSheet(false); handlePickFile(); }} activeOpacity={0.85}>
              <View style={s.sheetOptionIcon}>
                <Ionicons name="document-outline" size={22} color={SLATE} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.sheetOptionTitle}>Upload Template</Text>
                <Text style={s.sheetOptionSub}>Import from Excel or CSV</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={LIGHT} />
            </TouchableOpacity>

            <TouchableOpacity style={s.sheetCancel} onPress={() => setShowActionSheet(false)}>
              <Text style={s.sheetCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ════════════ IMPORT PREVIEW MODAL ════════════ */}
      <Modal visible={showImport} transparent animationType="slide" onRequestClose={() => setShowImport(false)}>
        <View style={s.sheetOverlay}>
          <View style={[s.sheet, { maxHeight: '88%' }]}>
            <View style={s.sheetHandle} />
            <View style={s.importHeader}>
              <View>
                <Text style={s.sheetTitle}>Import Preview</Text>
                <Text style={s.importFile} numberOfLines={1}>{importFileName}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowImport(false)} style={s.closeBtn}>
                <Ionicons name="close" size={18} color={MUTED} />
              </TouchableOpacity>
            </View>
            <View style={s.importStats}>
              <View style={[s.statChip, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
                <Text style={[s.statTxt, { color: '#059669' }]}>{importPreview.valid.length} valid</Text>
              </View>
              {importPreview.errors.length > 0 && (
                <View style={[s.statChip, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="alert-circle-outline" size={14} color="#DC2626" />
                  <Text style={[s.statTxt, { color: '#DC2626' }]}>{importPreview.errors.length} skipped</Text>
                </View>
              )}
            </View>
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              <View style={[s.importRow, s.importRowHead]}>
                {['Title','Phone','Category','24/7'].map((h) => <Text key={h} style={[s.importCell, s.importCellHead]}>{h}</Text>)}
              </View>
              {importPreview.valid.slice(0, 10).map((r, i) => (
                <View key={i} style={[s.importRow, i % 2 === 1 && { backgroundColor: '#FAFAFA' }]}>
                  <Text style={s.importCell} numberOfLines={1}>{r.title}</Text>
                  <Text style={s.importCell} numberOfLines={1}>{r.phone_number}</Text>
                  <Text style={s.importCell} numberOfLines={1}>{r.category}</Text>
                  <Text style={[s.importCell, { color: r.is_available_24_7 ? '#059669' : MUTED }]}>
                    {r.is_available_24_7 ? 'Yes' : 'No'}
                  </Text>
                </View>
              ))}
              {importPreview.errors.length > 0 && (
                <View style={s.errWrap}>
                  <Text style={s.errTitle}>Skipped rows:</Text>
                  {importPreview.errors.map((e, i) => <Text key={i} style={s.errRow}>Row {e.row}: {e.reason}</Text>)}
                </View>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[s.importBtn, (!importPreview.valid.length || importing) && { opacity: 0.45 }]}
              onPress={handleConfirmImport} disabled={!importPreview.valid.length || importing} activeOpacity={0.85}
            >
              <Ionicons name="cloud-upload-outline" size={16} color={CHARCOAL} />
              <Text style={s.importBtnTxt}>{importing ? 'Importing…' : `Import ${importPreview.valid.length} Contacts`}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ════════════ ADD / EDIT FORM MODAL ════════════ */}
      <Modal visible={showModal} animationType="slide" transparent={false} onRequestClose={() => setShowModal(false)}>
        <ScreenWrapper backgroundColor={BG} statusBarStyle="dark-content">
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>

            {/* Modal header */}
            <View style={s.formHeader}>
              <TouchableOpacity style={s.formClose} onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={s.formHeaderSub}>EMERGENCY CONTACTS</Text>
                <Text style={s.formHeaderTitle}>{editingId ? 'Edit Contact' : 'New Contact'}</Text>
              </View>
            </View>

            <View style={s.formBody}>
              {/* Icon selector */}
              <Text style={s.fieldLabel}>Icon</Text>
              <View style={s.iconGrid}>
                {ICONS.map((name) => (
                  <TouchableOpacity
                    key={name}
                    style={[s.iconOpt, form.icon_name === name && s.iconOptActive]}
                    onPress={() => set('icon_name', name)} activeOpacity={0.8}
                  >
                    <Ionicons name={name} size={20} color={form.icon_name === name ? '#FFFFFF' : MUTED} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title */}
              <Text style={s.fieldLabel}>Title <Text style={s.req}>*</Text></Text>
              <TextInput
                style={[s.input, errors.title && s.inputErr]}
                placeholder="e.g. Campus Fire Wardens"
                placeholderTextColor={LIGHT}
                value={form.title} onChangeText={(v) => set('title', v)}
              />
              {errors.title ? <Text style={s.errMsg}>{errors.title}</Text> : null}

              {/* Description */}
              <Text style={[s.fieldLabel, { marginTop: 16 }]}>Description</Text>
              <TextInput
                style={[s.input, s.textarea]}
                placeholder="Brief description of the service…"
                placeholderTextColor={LIGHT}
                value={form.description} onChangeText={(v) => set('description', v)}
                multiline numberOfLines={3} textAlignVertical="top"
              />

              {/* Category */}
              <Text style={[s.fieldLabel, { marginTop: 16 }]}>Category <Text style={s.req}>*</Text></Text>
              <View style={s.pickerWrap}>
                <Picker selectedValue={form.category} onValueChange={(v) => set('category', v)}
                  style={{ height: Platform.OS === 'ios' ? 140 : 50, color: DARK }}>
                  {CATEGORIES.map((c) => <Picker.Item key={c} label={c} value={c} />)}
                </Picker>
              </View>

              {/* Phones */}
              <View style={s.phonesGrid}>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Phone <Text style={s.req}>*</Text></Text>
                  <TextInput
                    style={[s.input, errors.phone_number && s.inputErr]}
                    placeholder="+233 24 000 0000" placeholderTextColor={LIGHT}
                    value={form.phone_number} keyboardType="phone-pad"
                    onChangeText={(v) => set('phone_number', sanitisePhone(v))}
                  />
                  {errors.phone_number ? <Text style={s.errMsg}>{errors.phone_number}</Text> : null}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.fieldLabel}>Alt. Phone</Text>
                  <TextInput
                    style={s.input} placeholder="+233 24 000 0001" placeholderTextColor={LIGHT}
                    value={form.alternative_phone_number} keyboardType="phone-pad"
                    onChangeText={(v) => set('alternative_phone_number', sanitisePhone(v))}
                  />
                </View>
              </View>

              {/* 24/7 toggle */}
              <View style={s.toggleRow}>
                <View>
                  <Text style={s.toggleLabel}>Available 24 / 7</Text>
                  <Text style={s.toggleSub}>Off to specify operating hours</Text>
                </View>
                <Switch value={form.is_available_24_7} onValueChange={(v) => set('is_available_24_7', v)}
                  trackColor={{ false: BORDER, true: CHARCOAL }} thumbColor={form.is_available_24_7 ? GOLD : '#FFFFFF'} />
              </View>

              {/* Operating hours (animated) */}
              <Animated.View style={hoursStyle}>
                <Text style={[s.fieldLabel, { marginTop: 4 }]}>Operating Hours</Text>
                <TextInput style={s.input} placeholder="Mon – Fri  8:00 AM – 5:00 PM"
                  placeholderTextColor={LIGHT} value={form.operating_hours}
                  onChangeText={(v) => set('operating_hours', v)} />
              </Animated.View>

              {/* Save */}
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.5 }]}
                onPress={handleSave} disabled={saving} activeOpacity={0.85}
              >
                <Ionicons name={editingId ? 'checkmark-circle-outline' : 'add-circle-outline'} size={18} color={CHARCOAL} />
                <Text style={s.saveBtnTxt}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Contact'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </ScreenWrapper>
      </Modal>
    </ScreenWrapper>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Header
  header:        { backgroundColor: CHARCOAL, paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16 },
  headerTop:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  backBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  headerEye:     { fontSize: 10, fontWeight: '700', color: GOLD, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 },
  headerTitle:   { fontSize: 26, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
  headerRight:   { flexDirection: 'row', gap: 8 },
  iconBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  searchGlass:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  searchPlaceholder: { fontSize: 14, color: 'rgba(255,255,255,0.55)' },

  // Chips
  chipRow:  { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  chip:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipTxt:  { fontSize: 13 },

  // List
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },

  // Card
  card:        { flexDirection: 'row', backgroundColor: SURFACE, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6' },
  cardBar:     { width: 4 },
  cardContent: { flex: 1, padding: 14 },
  cardRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  catPill:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  catPillTxt:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  availPill:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  availDot:    { width: 6, height: 6, borderRadius: 3 },
  availTxt:    { fontSize: 11, fontWeight: '600' },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 4 },
  cardDesc:    { fontSize: 12, color: MUTED, lineHeight: 17, marginBottom: 10 },
  phoneRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  phonePill:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: BORDER },
  phoneTxt:    { fontSize: 12, fontWeight: '600', color: SLATE },
  hoursLabel:  { fontSize: 11, color: MUTED, marginBottom: 8 },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: BORDER },
  editTxt:     { fontSize: 12, fontWeight: '600', color: SLATE },
  deleteBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  deleteTxt:   { fontSize: 12, fontWeight: '600', color: '#DC2626' },

  // Empty state
  empty:       { flex: 1, alignItems: 'center', paddingTop: 64, paddingHorizontal: 32, gap: 14 },
  emptyIconWrap:{ width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  emptyGlow:   { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: '#F3F4F6', shadowColor: '#9CA3AF', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 0 }, elevation: 0 },
  emptyTitle:  { fontSize: 20, fontWeight: '700', color: DARK, textAlign: 'center' },
  emptySub:    { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
  emptyBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2563EB', paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, marginTop: 4 },
  emptyBtnTxt: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Action sheet
  sheetOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36 },
  sheetHandle:     { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 10, marginBottom: 20 },
  sheetTitle:      { fontSize: 18, fontWeight: '700', color: DARK, marginBottom: 4 },
  sheetSub:        { fontSize: 13, color: MUTED, marginBottom: 20 },
  sheetOption:     { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: BORDER, marginBottom: 10 },
  sheetOptionIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: SURFACE, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  sheetOptionTitle:{ fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 2 },
  sheetOptionSub:  { fontSize: 12, color: MUTED },
  sheetCancel:     { alignItems: 'center', paddingVertical: 14 },
  sheetCancelTxt:  { fontSize: 14, fontWeight: '600', color: MUTED },

  // Import modal
  importHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  importFile:   { fontSize: 12, color: MUTED, marginTop: 3 },
  importStats:  { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statTxt:      { fontSize: 12, fontWeight: '700' },
  closeBtn:     { width: 30, height: 30, borderRadius: 8, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
  importRow:    { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  importRowHead:{ borderBottomWidth: 2, borderBottomColor: BORDER, backgroundColor: '#F9FAFB' },
  importCell:   { flex: 1, fontSize: 12, color: DARK, paddingHorizontal: 4 },
  importCellHead:{ fontWeight: '700', fontSize: 11, color: MUTED, textTransform: 'uppercase' },
  errWrap:      { marginTop: 12, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12 },
  errTitle:     { fontSize: 12, fontWeight: '700', color: '#DC2626', marginBottom: 6 },
  errRow:       { fontSize: 12, color: '#991B1B', marginBottom: 2 },
  importBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 14, backgroundColor: '#2563EB', marginTop: 16 },
  importBtnTxt: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

  // Form
  formHeader:    { backgroundColor: CHARCOAL, paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  formClose:     { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  formHeaderSub: { fontSize: 10, fontWeight: '700', color: GOLD, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 },
  formHeaderTitle:{ fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  formBody:      { paddingHorizontal: 20, paddingTop: 24 },
  fieldLabel:    { fontSize: 13, fontWeight: '600', color: SLATE, marginBottom: 7 },
  req:           { color: '#DC2626' },
  input:         { backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 10, fontSize: 14, color: DARK },
  inputErr:      { borderColor: '#DC2626', backgroundColor: '#FFF5F5' },
  textarea:      { minHeight: 80, textAlignVertical: 'top' },
  errMsg:        { fontSize: 12, color: '#DC2626', marginTop: 4 },
  pickerWrap:    { backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, overflow: 'hidden' },
  phonesGrid:    { flexDirection: 'row', gap: 12, marginTop: 16 },
  iconGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  iconOpt:       { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  iconOptActive: { backgroundColor: '#2563EB', borderColor: '#1D4ED8' },
  toggleRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: SURFACE, borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: BORDER },
  toggleLabel:   { fontSize: 14, fontWeight: '600', color: DARK },
  toggleSub:     { fontSize: 12, color: MUTED, marginTop: 2 },
  saveBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 14, backgroundColor: '#2563EB', marginTop: 24 },
  saveBtnTxt:    { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
});
