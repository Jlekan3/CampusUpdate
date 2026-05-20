import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Animated, Easing, FlatList, LayoutAnimation, Modal,
  Platform, ScrollView, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import {
  subscribeToCampusRules,
  addCampusRule,
  updateCampusRule,
  deleteCampusRule,
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

// ── Filter chip colors per category ──────────────────────────────────────────
const CHIP = {
  All:                { bg: CHARCOAL,  text: '#FFFFFF', border: CHARCOAL  },
  Academic:           { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
  Residential:        { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' },
  'Traffic & Parking':{ bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  'Code of Conduct':  { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' },
};

// ── Severity config ───────────────────────────────────────────────────────────
const SEV = {
  info:     { label: 'Info',     color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', icon: 'information-circle-outline' },
  warning:  { label: 'Warning', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: 'warning-outline'            },
  critical: { label: 'Critical',color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', icon: 'alert-circle-outline'       },
};

const CATEGORIES = ['Academic', 'Residential', 'Traffic & Parking', 'Code of Conduct'];
const EMPTY = { title: '', description: '', category: 'Academic', severity: 'info', is_active: true };

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
  for (const h of headers) for (const c of extractHeaderKeys(h)) for (const k of keys)
    if (normalise(c) === normalise(k)) return h;
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
const RULES_COL_MAP = {
  title: ['title','name','rule'], description: ['description','desc','detail','content'],
  category: ['category','cat','type'], severity: ['severity','level','priority'],
  is_active: ['isactive','active','live','enabled','published'],
};
const VALID_SEVS = ['info', 'warning', 'critical'];
const parseBool = (v) => typeof v === 'boolean' ? v : !['false','0','no','off','inactive'].includes(String(v).toLowerCase().trim());
const parseRulesSheet = (rows, headerIdx = 0) => {
  const valid = [], errors = [];
  rows.forEach((row, idx) => {
    const hs = Object.keys(row), get = (k) => { const c = findCol(hs, k); return c ? String(row[c] ?? '').trim() : ''; };
    const title = get(RULES_COL_MAP.title), desc = get(RULES_COL_MAP.description);
    const cat = get(RULES_COL_MAP.category), sev = get(RULES_COL_MAP.severity).toLowerCase();
    const rowErr = [];
    if (!title) rowErr.push('title required');
    if (!desc)  rowErr.push('description required');
    if (sev && !VALID_SEVS.includes(sev)) rowErr.push(`invalid severity "${sev}"`);
    if (rowErr.length) { errors.push({ row: headerIdx + idx + 2, reason: rowErr.join(', ') }); return; }
    valid.push({ title, description: desc, category: CATEGORIES.includes(cat) ? cat : 'Academic',
      severity: VALID_SEVS.includes(sev) ? sev : 'info', is_active: parseBool(get(RULES_COL_MAP.is_active) || 'true') });
  });
  return { valid, errors };
};

// ─────────────────────────────────────────────────────────────────────────────
export default function ManageCampusRulesScreen({ navigation }) {
  const [rules,          setRules]          = useState([]);
  const [showModal,      setShowModal]      = useState(false);
  const [showActionSheet,setShowActionSheet]= useState(false);
  const [form,           setForm]           = useState(EMPTY);
  const [editingId,      setEditingId]      = useState(null);
  const [saving,         setSaving]         = useState(false);
  const [filterCat,      setFilterCat]      = useState('All');
  const [search,         setSearch]         = useState('');
  const [errors,         setErrors]         = useState({});
  const [showImport,     setShowImport]     = useState(false);
  const [importPreview,  setImportPreview]  = useState({ valid: [], errors: [] });
  const [importing,      setImporting]      = useState(false);
  const [importFileName, setImportFileName] = useState('');

  const shakeTitle = useRef(new Animated.Value(0)).current;
  const shakeDesc  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsub = subscribeToCampusRules((items) => setRules(items || []));
    return () => { try { unsub?.(); } catch (_) {} };
  }, []);

  const displayed = useMemo(() => {
    let items = filterCat === 'All' ? rules : rules.filter((r) => r.category === filterCat);
    const q = search.trim().toLowerCase();
    if (q) items = items.filter((r) => (r.title + r.description).toLowerCase().includes(q));
    return items;
  }, [rules, filterCat, search]);

  const shake = (anim) => Animated.sequence([
    Animated.timing(anim, { toValue: 8,  duration: 55, useNativeDriver: true, easing: Easing.linear }),
    Animated.timing(anim, { toValue: -8, duration: 55, useNativeDriver: true, easing: Easing.linear }),
    Animated.timing(anim, { toValue: 4,  duration: 45, useNativeDriver: true, easing: Easing.linear }),
    Animated.timing(anim, { toValue: 0,  duration: 35, useNativeDriver: true, easing: Easing.linear }),
  ]).start();

  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); if (errors[k]) setErrors((p) => ({ ...p, [k]: null })); };
  const openAdd  = () => { setForm(EMPTY); setEditingId(null); setErrors({}); setShowModal(true); };
  const openEdit = (rule) => {
    setForm({ title: rule.title||'', description: rule.description||'', category: rule.category||'Academic',
      severity: rule.severity||'info', is_active: rule.is_active !== false });
    setEditingId(rule.id); setErrors({}); setShowModal(true);
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim())       { e.title       = 'Title is required';       shake(shakeTitle); }
    if (!form.description.trim()) { e.description = 'Description is required'; shake(shakeDesc);  }
    setErrors(e); return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    const payload = { title: form.title.trim(), description: form.description.trim(),
      category: form.category, severity: form.severity, is_active: form.is_active };
    console.log('[ManageCampusRulesScreen] Submission payload:', JSON.stringify(payload, null, 2));
    try {
      editingId ? await updateCampusRule(editingId, payload) : await addCampusRule(payload);
      setShowModal(false);
    } catch (err) { Alert.alert('Error', err?.message || 'Could not save.'); }
    finally { setSaving(false); }
  };

  const handleDelete = (rule) => {
    Alert.alert('Delete Rule', `Remove "${rule.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteCampusRule(rule.id); } catch (err) { Alert.alert('Error', err?.message); }
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
      const data = new Uint8Array(await (await fetch(file.uri)).arrayBuffer());
      const { rows, headerIdx } = smartParseSheet(data, RULES_COL_MAP);
      if (!rows.length) { Alert.alert('Empty file', 'No data rows found.'); return; }
      setImportPreview(parseRulesSheet(rows, headerIdx));
      setShowImport(true);
    } catch (err) { Alert.alert('Import error', err?.message || 'Could not read file.'); }
  };

  const handleConfirmImport = async () => {
    if (!importPreview.valid.length) return;
    setImporting(true);
    let ok = 0, fail = 0;
    for (const row of importPreview.valid) { try { await addCampusRule(row); ok++; } catch { fail++; } }
    setImporting(false); setShowImport(false);
    Alert.alert('Import complete', `${ok} rule${ok !== 1 ? 's' : ''} imported${fail ? `, ${fail} failed` : ''}.`);
  };

  const canGoBack = navigation?.canGoBack?.();

  // ── Rule card ──────────────────────────────────────────────────────────────
  const renderRule = ({ item }) => {
    const sev = SEV[item.severity] || SEV.info;
    const cc  = CHIP[item.category] || CHIP.Academic;
    return (
      <View style={s.card}>
        <View style={[s.cardBar, { backgroundColor: sev.color }]} />
        <View style={s.cardContent}>
          <View style={s.cardRow}>
            {/* Severity badge */}
            <View style={[s.sevBadge, { backgroundColor: sev.bg, borderColor: sev.border }]}>
              <Ionicons name={sev.icon} size={11} color={sev.color} />
              <Text style={[s.sevBadgeTxt, { color: sev.color }]}>{sev.label}</Text>
            </View>
            {/* Category badge */}
            <View style={[s.catBadge, { backgroundColor: cc.bg, borderColor: cc.border }]}>
              <Text style={[s.catBadgeTxt, { color: cc.text }]}>{item.category}</Text>
            </View>
            {/* Active badge */}
            <View style={[s.activeBadge, item.is_active !== false ? s.activeBadgeOn : s.activeBadgeOff]}>
              <View style={[s.activeDot, { backgroundColor: item.is_active !== false ? '#10B981' : '#9CA3AF' }]} />
              <Text style={[s.activeTxt, { color: item.is_active !== false ? '#059669' : '#6B7280' }]}>
                {item.is_active !== false ? 'Live' : 'Hidden'}
              </Text>
            </View>
          </View>
          <Text style={s.cardTitle}>{item.title}</Text>
          <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>
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
            <Text style={s.headerTitle}>Campus Rules</Text>
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
          <TextInput
            style={s.searchInput}
            placeholder="Search rules…"
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.55)" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── FILTER CHIPS ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        {['All', ...CATEGORIES].map((cat) => {
          const active = filterCat === cat;
          const cc = CHIP[cat] || CHIP.All;
          return (
            <TouchableOpacity
              key={cat}
              style={[s.chip, { backgroundColor: active ? cc.bg : SURFACE, borderColor: active ? cc.border : BORDER }]}
              onPress={() => setFilterCat(cat)} activeOpacity={0.8}
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
        renderItem={renderRule}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <View style={s.emptyIconWrap}>
              <View style={s.emptyGlow} />
              <Ionicons name="shield-outline" size={44} color="#D1D5DB" />
            </View>
            <Text style={s.emptyTitle}>No rules yet</Text>
            <Text style={s.emptySub}>
              Get started by adding your first rule manually, or import them all in bulk using a CSV or Excel template.
            </Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setShowActionSheet(true)} activeOpacity={0.85}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={s.emptyBtnTxt}>Add Rule</Text>
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
            <Text style={s.sheetTitle}>Add Rule</Text>
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

      {/* ════════════ IMPORT PREVIEW ════════════ */}
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
            <ScrollView style={{ maxHeight: 260 }} showsVerticalScrollIndicator={false}>
              <View style={[s.importRow, s.importRowHead]}>
                {['Title','Category','Severity','Active'].map((h) => <Text key={h} style={[s.importCell, s.importCellHead]}>{h}</Text>)}
              </View>
              {importPreview.valid.slice(0, 10).map((r, i) => (
                <View key={i} style={[s.importRow, i % 2 === 1 && { backgroundColor: '#FAFAFA' }]}>
                  <Text style={s.importCell} numberOfLines={1}>{r.title}</Text>
                  <Text style={s.importCell} numberOfLines={1}>{r.category}</Text>
                  <View style={[s.importSev, { backgroundColor: (SEV[r.severity]||SEV.info).bg }]}>
                    <Text style={[s.importSevTxt, { color: (SEV[r.severity]||SEV.info).color }]}>{r.severity}</Text>
                  </View>
                  <Text style={[s.importCell, { color: r.is_active ? '#059669' : MUTED }]}>{r.is_active ? 'Yes' : 'No'}</Text>
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
              <Text style={s.importBtnTxt}>{importing ? 'Importing…' : `Import ${importPreview.valid.length} Rule${importPreview.valid.length !== 1 ? 's' : ''}`}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ════════════ ADD / EDIT FORM MODAL ════════════ */}
      <Modal visible={showModal} animationType="slide" transparent={false} onRequestClose={() => setShowModal(false)}>
        <ScreenWrapper backgroundColor={BG} statusBarStyle="dark-content">
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 48 }}>

            <View style={s.formHeader}>
              <TouchableOpacity style={s.formClose} onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={s.formHeaderSub}>CAMPUS RULES</Text>
                <Text style={s.formHeaderTitle}>{editingId ? 'Edit Rule' : 'New Rule'}</Text>
              </View>
            </View>

            <View style={s.formBody}>
              {/* Title */}
              <Text style={s.fieldLabel}>Title <Text style={s.req}>*</Text></Text>
              <Animated.View style={{ transform: [{ translateX: shakeTitle }] }}>
                <TextInput
                  style={[s.input, errors.title && s.inputErr]}
                  placeholder="e.g. No Smoking on Campus Grounds"
                  placeholderTextColor={LIGHT}
                  value={form.title} onChangeText={(v) => set('title', v)}
                />
                {errors.title ? (
                  <View style={s.errMsgRow}>
                    <Ionicons name="alert-circle-outline" size={12} color="#DC2626" />
                    <Text style={s.errMsg}>{errors.title}</Text>
                  </View>
                ) : null}
              </Animated.View>

              {/* Description */}
              <Text style={[s.fieldLabel, { marginTop: 16 }]}>Description <Text style={s.req}>*</Text></Text>
              <Animated.View style={{ transform: [{ translateX: shakeDesc }] }}>
                <TextInput
                  style={[s.input, s.textarea, errors.description && s.inputErr]}
                  placeholder="Provide a clear description of this rule and the consequences of breaching it."
                  placeholderTextColor={LIGHT}
                  value={form.description} onChangeText={(v) => set('description', v)}
                  multiline numberOfLines={4} textAlignVertical="top"
                />
                {errors.description ? (
                  <View style={s.errMsgRow}>
                    <Ionicons name="alert-circle-outline" size={12} color="#DC2626" />
                    <Text style={s.errMsg}>{errors.description}</Text>
                  </View>
                ) : null}
              </Animated.View>

              {/* Category */}
              <Text style={[s.fieldLabel, { marginTop: 16 }]}>Category</Text>
              <View style={s.catGrid}>
                {CATEGORIES.map((cat) => {
                  const active = form.category === cat;
                  const cc = CHIP[cat];
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[s.catOpt, { backgroundColor: active ? cc.bg : SURFACE, borderColor: active ? cc.border : BORDER }]}
                      onPress={() => set('category', cat)} activeOpacity={0.85}
                    >
                      <Text style={[s.catOptTxt, { color: active ? cc.text : MUTED, fontWeight: active ? '700' : '500' }]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Severity */}
              <Text style={[s.fieldLabel, { marginTop: 16 }]}>Severity</Text>
              <View style={s.sevRow}>
                {Object.entries(SEV).map(([key, cfg]) => {
                  const active = form.severity === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[s.sevOpt, {
                        backgroundColor: active ? cfg.color : SURFACE,
                        borderColor: active ? cfg.color : BORDER,
                        shadowColor: active ? cfg.color : 'transparent',
                      }]}
                      onPress={() => set('severity', key)} activeOpacity={0.85}
                    >
                      <View style={[s.sevRadio, { borderColor: active ? '#FFFFFF' : cfg.color }]}>
                        {active && <View style={[s.sevFill, { backgroundColor: '#FFFFFF' }]} />}
                      </View>
                      <Ionicons name={cfg.icon} size={15} color={active ? '#FFFFFF' : cfg.color} />
                      <Text style={[s.sevLabel, { color: active ? '#FFFFFF' : cfg.color }]}>{cfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={s.sevHint}>
                {form.severity === 'info'     && 'Informational — general guidance, no penalty.'}
                {form.severity === 'warning'  && 'Warning — violation may lead to disciplinary action.'}
                {form.severity === 'critical' && 'Critical — serious breach with severe consequences.'}
              </Text>

              {/* is_active toggle */}
              <View style={s.toggleRow}>
                <View style={s.toggleLeft}>
                  <View style={[s.toggleIconWrap, { backgroundColor: form.is_active ? '#ECFDF5' : '#F1F5F9' }]}>
                    <Ionicons name={form.is_active ? 'eye-outline' : 'eye-off-outline'} size={16}
                      color={form.is_active ? '#059669' : '#9CA3AF'} />
                  </View>
                  <View>
                    <Text style={s.toggleLabel}>Rule is Live</Text>
                    <Text style={s.toggleSub}>{form.is_active ? 'Visible to all users' : 'Hidden — not shown to users'}</Text>
                  </View>
                </View>
                <Switch value={form.is_active} onValueChange={(v) => set('is_active', v)}
                  trackColor={{ false: BORDER, true: CHARCOAL }} thumbColor={form.is_active ? GOLD : '#FFFFFF'} />
              </View>

              {/* Save */}
              <TouchableOpacity
                style={[s.saveBtn, saving && { opacity: 0.5 }]}
                onPress={handleSave} disabled={saving} activeOpacity={0.85}
              >
                <Ionicons name={editingId ? 'checkmark-circle-outline' : 'add-circle-outline'} size={18} color={CHARCOAL} />
                <Text style={s.saveBtnTxt}>{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Rule'}</Text>
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
  header:        { backgroundColor: CHARCOAL, paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16 },
  headerTop:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  backBtn:       { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  headerEye:     { fontSize: 10, fontWeight: '700', color: GOLD, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 },
  headerTitle:   { fontSize: 26, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.2 },
  headerRight:   { flexDirection: 'row', gap: 8 },
  iconBtn:       { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  searchGlass:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  searchInput:   { flex: 1, fontSize: 14, color: '#FFFFFF', padding: 0 },

  chipRow:  { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  chip:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipTxt:  { fontSize: 13 },

  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },

  // Card
  card:        { flexDirection: 'row', backgroundColor: SURFACE, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2, borderWidth: 1, borderColor: '#F3F4F6' },
  cardBar:     { width: 4 },
  cardContent: { flex: 1, padding: 14 },
  cardRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  sevBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  sevBadgeTxt: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  catBadge:    { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  catBadgeTxt: { fontSize: 11, fontWeight: '600' },
  activeBadge:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  activeBadgeOn:  { backgroundColor: '#ECFDF5' },
  activeBadgeOff: { backgroundColor: '#F1F5F9' },
  activeDot:   { width: 6, height: 6, borderRadius: 3 },
  activeTxt:   { fontSize: 11, fontWeight: '600' },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 4 },
  cardDesc:    { fontSize: 12, color: MUTED, lineHeight: 17, marginBottom: 12 },
  cardActions: { flexDirection: 'row', gap: 8 },
  editBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: BORDER },
  editTxt:     { fontSize: 12, fontWeight: '600', color: SLATE },
  deleteBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  deleteTxt:   { fontSize: 12, fontWeight: '600', color: '#DC2626' },

  // Empty state
  empty:        { flex: 1, alignItems: 'center', paddingTop: 64, paddingHorizontal: 32, gap: 14 },
  emptyIconWrap:{ width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center' },
  emptyGlow:    { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: '#F3F4F6', shadowColor: '#9CA3AF', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } },
  emptyTitle:   { fontSize: 20, fontWeight: '700', color: DARK, textAlign: 'center' },
  emptySub:     { fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 20 },
  emptyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: CHARCOAL, paddingHorizontal: 20, paddingVertical: 11, borderRadius: 12, marginTop: 4 },
  emptyBtnTxt:  { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  // Action sheet
  sheetOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:            { backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 36 },
  sheetHandle:      { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 10, marginBottom: 20 },
  sheetTitle:       { fontSize: 18, fontWeight: '700', color: DARK, marginBottom: 4 },
  sheetSub:         { fontSize: 13, color: MUTED, marginBottom: 20 },
  sheetOption:      { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 14, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: BORDER, marginBottom: 10 },
  sheetOptionIcon:  { width: 44, height: 44, borderRadius: 12, backgroundColor: SURFACE, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  sheetOptionTitle: { fontSize: 15, fontWeight: '700', color: DARK, marginBottom: 2 },
  sheetOptionSub:   { fontSize: 12, color: MUTED },
  sheetCancel:      { alignItems: 'center', paddingVertical: 14 },
  sheetCancelTxt:   { fontSize: 14, fontWeight: '600', color: MUTED },

  // Import
  importHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  importFile:   { fontSize: 12, color: MUTED, marginTop: 3 },
  importStats:  { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statTxt:      { fontSize: 12, fontWeight: '700' },
  closeBtn:     { width: 30, height: 30, borderRadius: 8, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center' },
  importRow:    { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center' },
  importRowHead:{ borderBottomWidth: 2, borderBottomColor: BORDER, backgroundColor: '#F9FAFB' },
  importCell:   { flex: 1, fontSize: 12, color: DARK, paddingHorizontal: 4 },
  importCellHead:{ fontWeight: '700', fontSize: 11, color: MUTED, textTransform: 'uppercase' },
  importSev:    { flex: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginHorizontal: 4 },
  importSevTxt: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  errWrap:      { marginTop: 12, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12 },
  errTitle:     { fontSize: 12, fontWeight: '700', color: '#DC2626', marginBottom: 6 },
  errRow:       { fontSize: 12, color: '#991B1B', marginBottom: 2 },
  importBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 14, backgroundColor: GOLD, marginTop: 16 },
  importBtnTxt: { fontSize: 15, fontWeight: '800', color: CHARCOAL },

  // Form modal
  formHeader:     { backgroundColor: CHARCOAL, paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  formClose:      { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  formHeaderSub:  { fontSize: 10, fontWeight: '700', color: GOLD, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2 },
  formHeaderTitle:{ fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  formBody:       { paddingHorizontal: 20, paddingTop: 24 },
  fieldLabel:     { fontSize: 13, fontWeight: '600', color: SLATE, marginBottom: 7 },
  req:            { color: '#DC2626' },
  input:          { backgroundColor: SURFACE, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 13 : 10, fontSize: 14, color: DARK },
  inputErr:       { borderColor: '#DC2626', backgroundColor: '#FFF5F5' },
  textarea:       { minHeight: 90, textAlignVertical: 'top' },
  errMsgRow:      { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  errMsg:         { fontSize: 12, color: '#DC2626' },
  catGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catOpt:         { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5 },
  catOptTxt:      { fontSize: 13 },

  // Severity radio
  sevRow:   { flexDirection: 'row', gap: 10 },
  sevOpt:   { flex: 1, borderRadius: 14, borderWidth: 2, paddingVertical: 12, paddingHorizontal: 8, alignItems: 'center', gap: 5, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  sevRadio: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  sevFill:  { width: 7, height: 7, borderRadius: 4 },
  sevLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3, textAlign: 'center' },
  sevHint:  { fontSize: 12, color: MUTED, textAlign: 'center', marginTop: 8, fontStyle: 'italic', lineHeight: 17 },

  // Toggle
  toggleRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: SURFACE, borderRadius: 12, padding: 14, marginTop: 16, borderWidth: 1, borderColor: BORDER },
  toggleLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  toggleIconWrap:{ width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  toggleLabel:   { fontSize: 14, fontWeight: '600', color: DARK },
  toggleSub:     { fontSize: 12, color: MUTED, marginTop: 2 },

  saveBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 14, backgroundColor: GOLD, marginTop: 24 },
  saveBtnTxt: { fontSize: 15, fontWeight: '800', color: CHARCOAL },
});
