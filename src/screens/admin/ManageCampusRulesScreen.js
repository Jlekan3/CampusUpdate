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

// ── Import helpers ────────────────────────────────────────────────────────────
const normalise = (s) => String(s ?? '').toLowerCase().replace(/[\s_\-().]/g, '');

const RULES_COL_MAP = {
  title:       ['title', 'name', 'rule'],
  description: ['description', 'desc', 'detail', 'content'],
  category:    ['category', 'cat', 'type', 'section'],
  severity:    ['severity', 'level', 'priority', 'importance'],
  is_active:   ['isactive', 'active', 'live', 'enabled', 'published'],
};

const VALID_CATEGORIES = ['Academic', 'Residential', 'Traffic & Parking', 'Code of Conduct'];
const VALID_SEVERITIES = ['info', 'warning', 'critical'];

const parseBool = (v) => {
  if (typeof v === 'boolean') return v;
  return !['false', '0', 'no', 'off', 'inactive', 'hidden'].includes(String(v).toLowerCase().trim());
};

const findCol = (headers, keys) => {
  for (const k of keys) {
    const found = headers.find((h) => normalise(h) === normalise(k));
    if (found) return found;
  }
  return null;
};

const parseRulesSheet = (rows) => {
  const valid = []; const errors = [];
  rows.forEach((row, idx) => {
    const headers = Object.keys(row);
    const get = (keys) => {
      const col = findCol(headers, keys);
      return col ? String(row[col] ?? '').trim() : '';
    };
    const title       = get(RULES_COL_MAP.title);
    const description = get(RULES_COL_MAP.description);
    const category    = get(RULES_COL_MAP.category);
    const severity    = get(RULES_COL_MAP.severity).toLowerCase();
    const is_active   = parseBool(get(RULES_COL_MAP.is_active) || 'true');

    const rowErrors = [];
    if (!title)                                              rowErrors.push('title required');
    if (!description)                                        rowErrors.push('description required');
    if (category && !VALID_CATEGORIES.includes(category))   rowErrors.push(`invalid category "${category}"`);
    if (severity && !VALID_SEVERITIES.includes(severity))   rowErrors.push(`invalid severity "${severity}"`);

    if (rowErrors.length) {
      errors.push({ row: idx + 2, reason: rowErrors.join(', ') });
    } else {
      valid.push({
        title,
        description,
        category:  VALID_CATEGORIES.includes(category) ? category : 'Academic',
        severity:  VALID_SEVERITIES.includes(severity) ? severity : 'info',
        is_active,
      });
    }
  });
  return { valid, errors };
};

// ── Brand tokens ─────────────────────────────────────────────────────────────
const NAVY = '#1A365D';
const GOLD = '#C5A047';
const BG   = '#F8F9FA';

// ── Severity config ───────────────────────────────────────────────────────────
const SEV = {
  info:     { label: 'Info',     color: '#2563EB', bg: '#DBEAFE', ring: '#93C5FD', icon: 'information-circle-outline' },
  warning:  { label: 'Warning', color: '#D97706', bg: '#FEF3C7', ring: '#FCD34D', icon: 'warning-outline'            },
  critical: { label: 'Critical',color: '#DC2626', bg: '#FEE2E2', ring: '#FCA5A5', icon: 'alert-circle-outline'       },
};

// ── Category options ──────────────────────────────────────────────────────────
const CATEGORIES = ['Academic', 'Residential', 'Traffic & Parking', 'Code of Conduct'];

// ── Blank form ────────────────────────────────────────────────────────────────
const EMPTY = {
  title:       '',
  description: '',
  category:    'Academic',
  severity:    'info',
  is_active:   true,
};

// ─────────────────────────────────────────────────────────────────────────────
export default function ManageCampusRulesScreen({ navigation }) {
  const [rules,     setRules]     = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [filterCat, setFilterCat] = useState('All');
  const [search,    setSearch]    = useState('');
  const [errors,    setErrors]    = useState({});

  // Import state
  const [showImport,     setShowImport]     = useState(false);
  const [importPreview,  setImportPreview]  = useState({ valid: [], errors: [] });
  const [importing,      setImporting]      = useState(false);
  const [importFileName, setImportFileName] = useState('');

  // Shake animation refs for invalid fields
  const shakeTitle = useRef(new Animated.Value(0)).current;
  const shakeDesc  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsub = subscribeToCampusRules((items) => setRules(items || []));
    return () => { try { unsub?.(); } catch (_) {} };
  }, []);

  // ── Filtered list ───────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let items = filterCat === 'All' ? rules : rules.filter((r) => r.category === filterCat);
    const q   = search.trim().toLowerCase();
    if (q) items = items.filter((r) => (r.title + r.description).toLowerCase().includes(q));
    return items;
  }, [rules, filterCat, search]);

  // ── Shake helper ────────────────────────────────────────────────────────────
  const shake = (anim) => {
    Animated.sequence([
      Animated.timing(anim, { toValue: 8,  duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(anim, { toValue: -8, duration: 60, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(anim, { toValue: 6,  duration: 50, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(anim, { toValue: -6, duration: 50, useNativeDriver: true, easing: Easing.linear }),
      Animated.timing(anim, { toValue: 0,  duration: 40, useNativeDriver: true, easing: Easing.linear }),
    ]).start();
  };

  // ── Form helpers ────────────────────────────────────────────────────────────
  const set = (key, value) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: null }));
  };

  const openAdd = () => {
    setForm(EMPTY); setEditingId(null); setErrors({}); setShowModal(true);
  };

  const openEdit = (rule) => {
    setForm({
      title:       rule.title       || '',
      description: rule.description || '',
      category:    rule.category    || 'Academic',
      severity:    rule.severity    || 'info',
      is_active:   rule.is_active !== false,
    });
    setEditingId(rule.id);
    setErrors({});
    setShowModal(true);
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const errs = {};
    if (!form.title.trim())       { errs.title       = 'Title is required';       shake(shakeTitle); }
    if (!form.description.trim()) { errs.description = 'Description is required'; shake(shakeDesc);  }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      title:       form.title.trim(),
      description: form.description.trim(),
      category:    form.category,
      severity:    form.severity,
      is_active:   form.is_active,
    };

    // Required by spec: log submission payload
    console.log('[ManageCampusRulesScreen] Submission payload:', JSON.stringify(payload, null, 2));

    try {
      if (editingId) {
        await updateCampusRule(editingId, payload);
        console.log('[ManageCampusRulesScreen] ✓ Rule updated:', editingId);
      } else {
        const newId = await addCampusRule(payload);
        console.log('[ManageCampusRulesScreen] ✓ Rule created:', newId);
      }
      setShowModal(false);
    } catch (err) {
      console.error('[ManageCampusRulesScreen] ✗ Save failed:', err?.message);
      Alert.alert('Error', err?.message || 'Could not save rule.');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = (rule) => {
    Alert.alert(
      'Delete Rule',
      `Remove "${rule.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            try { await deleteCampusRule(rule.id); }
            catch (err) { Alert.alert('Error', err?.message || 'Could not delete.'); }
          },
        },
      ]
    );
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
      const workbook    = XLSX.read(data, { type: 'array' });
      const sheet       = workbook.Sheets[workbook.SheetNames[0]];
      const rows        = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (!rows.length) { Alert.alert('Empty file', 'No data rows found in the spreadsheet.'); return; }
      setImportPreview(parseRulesSheet(rows));
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
      try { await addCampusRule(row); ok++; }
      catch { fail++; }
    }
    setImporting(false);
    setShowImport(false);
    Alert.alert('Import complete', `${ok} rule${ok !== 1 ? 's' : ''} imported${fail ? `, ${fail} failed` : ''}.`);
  };

  const canGoBack = navigation?.canGoBack?.();

  // ── Rule card ───────────────────────────────────────────────────────────────
  const renderRule = ({ item }) => {
    const sev = SEV[item.severity] || SEV.info;
    return (
      <View style={styles.card}>
        <View style={[styles.cardLeftBar, { backgroundColor: sev.color }]} />
        <View style={styles.cardBody}>
          {/* Top row */}
          <View style={styles.cardTopRow}>
            <View style={[styles.sevBadge, { backgroundColor: sev.bg }]}>
              <Ionicons name={sev.icon} size={12} color={sev.color} />
              <Text style={[styles.sevBadgeText, { color: sev.color }]}>{sev.label}</Text>
            </View>
            {item.category ? (
              <View style={styles.catBadge}>
                <Text style={styles.catBadgeText}>{item.category}</Text>
              </View>
            ) : null}
            <View style={[styles.activeBadge, item.is_active !== false ? styles.activeBadgeOn : styles.activeBadgeOff]}>
              <View style={[styles.activeDot, { backgroundColor: item.is_active !== false ? '#059669' : '#9CA3AF' }]} />
              <Text style={[styles.activeBadgeText, { color: item.is_active !== false ? '#059669' : '#9CA3AF' }]}>
                {item.is_active !== false ? 'Live' : 'Hidden'}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>

          {/* Description preview */}
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

          {/* Actions */}
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)} activeOpacity={0.85}>
              <Ionicons name="pencil-outline" size={14} color={NAVY} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={14} color="#DC2626" />
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
        <View style={styles.headerRow}>
          {canGoBack && (
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>ADMIN</Text>
            <Text style={styles.headerTitle}>Campus Rules</Text>
          </View>
          <TouchableOpacity style={styles.importBtn} onPress={handlePickFile} activeOpacity={0.85}>
            <Ionicons name="cloud-upload-outline" size={16} color="rgba(255,255,255,0.85)" />
            <Text style={styles.importBtnText}>Import</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color={NAVY} />
            <Text style={styles.addBtnText}>Add Rule</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.headerSub}>Create and manage campus rules and policies.</Text>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={17} color={GOLD} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search rules…"
            placeholderTextColor="#A0AEC0"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={17} color="#A0AEC0" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── Category filter chips ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {['All', ...CATEGORIES].map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, filterCat === cat && styles.chipActive]}
            onPress={() => setFilterCat(cat)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, filterCat === cat && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Rules list ── */}
      <FlatList
        data={displayed}
        keyExtractor={(item, i) => item.id || String(i)}
        renderItem={renderRule}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="shield-outline" size={48} color={GOLD} />
            <Text style={styles.emptyTitle}>No rules yet</Text>
            <Text style={styles.emptySub}>Tap "Add Rule" to create the first campus rule.</Text>
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

            {/* Header */}
            <View style={styles.importSheetHeader}>
              <View>
                <Text style={styles.importSheetTitle}>Import Preview</Text>
                <Text style={styles.importSheetFile} numberOfLines={1}>{importFileName}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowImport(false)} style={styles.importCloseBtn}>
                <Ionicons name="close" size={20} color="#718096" />
              </TouchableOpacity>
            </View>

            {/* Stats row */}
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

            {/* Template hint */}
            <View style={styles.importHint}>
              <Ionicons name="information-circle-outline" size={14} color={GOLD} />
              <Text style={styles.importHintText}>
                Expected columns: <Text style={{ fontWeight: '700' }}>title*,  description*,  category,  severity,  is_active</Text>
              </Text>
            </View>

            {/* Preview rows */}
            <ScrollView style={styles.importPreviewScroll} showsVerticalScrollIndicator={false}>
              {/* Column headers */}
              <View style={[styles.importRow, styles.importRowHeader]}>
                {['Title', 'Category', 'Severity', 'Active'].map((h) => (
                  <Text key={h} style={[styles.importCell, styles.importCellHeader]}>{h}</Text>
                ))}
              </View>
              {importPreview.valid.slice(0, 10).map((row, i) => (
                <View key={i} style={[styles.importRow, i % 2 === 0 && styles.importRowAlt]}>
                  <Text style={styles.importCell} numberOfLines={1}>{row.title}</Text>
                  <Text style={styles.importCell} numberOfLines={1}>{row.category || '—'}</Text>
                  <View style={[styles.importSevBadge, { backgroundColor: SEV[row.severity]?.bg || '#DBEAFE' }]}>
                    <Text style={[styles.importSevText, { color: SEV[row.severity]?.color || '#2563EB' }]}>{row.severity}</Text>
                  </View>
                  <Text style={[styles.importCell, { color: row.is_active ? '#059669' : '#9CA3AF' }]}>
                    {row.is_active ? 'Yes' : 'No'}
                  </Text>
                </View>
              ))}
              {importPreview.valid.length > 10 && (
                <Text style={styles.importMore}>+{importPreview.valid.length - 10} more rows…</Text>
              )}

              {/* Skipped rows */}
              {importPreview.errors.length > 0 && (
                <View style={styles.importErrorsWrap}>
                  <Text style={styles.importErrorsTitle}>Skipped rows:</Text>
                  {importPreview.errors.map((e, i) => (
                    <Text key={i} style={styles.importErrorRow}>Row {e.row}: {e.reason}</Text>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Confirm button */}
            <TouchableOpacity
              style={[styles.importConfirmBtn, (!importPreview.valid.length || importing) && { opacity: 0.5 }]}
              onPress={handleConfirmImport}
              disabled={!importPreview.valid.length || importing}
              activeOpacity={0.85}
            >
              <Ionicons name="cloud-upload-outline" size={18} color={NAVY} />
              <Text style={styles.importConfirmText}>
                {importing ? 'Importing…' : `Import ${importPreview.valid.length} Rule${importPreview.valid.length !== 1 ? 's' : ''}`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════════
          FORM MODAL
      ════════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowModal(false)}
      >
        <ScreenWrapper backgroundColor={BG} statusBarStyle="dark-content">
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalScroll}
          >
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalGoldBar} />
              <View style={styles.modalHeaderRow}>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalEyebrow}>CAMPUS RULES</Text>
                  <Text style={styles.modalTitle}>{editingId ? 'Edit Rule' : 'New Rule'}</Text>
                </View>
              </View>
            </View>

            {/* ── Form card ── */}
            <View style={styles.formCard}>

              {/* Title */}
              <Text style={styles.label}>
                Title <Text style={styles.req}>*</Text>
              </Text>
              <Animated.View style={{ transform: [{ translateX: shakeTitle }] }}>
                <TextInput
                  style={[styles.input, errors.title && styles.inputError]}
                  placeholder="e.g. No Smoking on Campus Grounds"
                  placeholderTextColor="#A0AEC0"
                  value={form.title}
                  onChangeText={(v) => set('title', v)}
                  returnKeyType="next"
                />
                {errors.title ? (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
                    <Text style={styles.errorMsg}>{errors.title}</Text>
                  </View>
                ) : null}
              </Animated.View>

              {/* Description */}
              <Text style={[styles.label, { marginTop: 18 }]}>
                Description <Text style={styles.req}>*</Text>
              </Text>
              <Animated.View style={{ transform: [{ translateX: shakeDesc }] }}>
                <TextInput
                  style={[styles.input, styles.textarea, errors.description && styles.inputError]}
                  placeholder="Provide a clear and detailed description of this rule and the consequences of breaching it."
                  placeholderTextColor="#A0AEC0"
                  value={form.description}
                  onChangeText={(v) => set('description', v)}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                {errors.description ? (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={13} color="#DC2626" />
                    <Text style={styles.errorMsg}>{errors.description}</Text>
                  </View>
                ) : null}
              </Animated.View>

              {/* Category */}
              <Text style={[styles.label, { marginTop: 18 }]}>Category</Text>
              <View style={styles.catGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catOption, form.category === cat && styles.catOptionActive]}
                    onPress={() => set('category', cat)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.catOptionText, form.category === cat && styles.catOptionTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── Severity — Radio group ── */}
              <Text style={[styles.label, { marginTop: 18 }]}>Severity</Text>
              <View style={styles.sevRow}>
                {Object.entries(SEV).map(([key, cfg]) => {
                  const active = form.severity === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.sevOption,
                        {
                          borderColor:      active ? cfg.color : cfg.ring,
                          backgroundColor:  active ? cfg.color : cfg.bg,
                          shadowColor:      active ? cfg.color : 'transparent',
                        },
                      ]}
                      onPress={() => set('severity', key)}
                      activeOpacity={0.85}
                    >
                      {/* Outer ring indicator */}
                      <View style={[styles.sevRadio, { borderColor: active ? '#fff' : cfg.color }]}>
                        {active && <View style={[styles.sevRadioFill, { backgroundColor: '#fff' }]} />}
                      </View>
                      <View style={styles.sevTextWrap}>
                        <Ionicons name={cfg.icon} size={16} color={active ? '#fff' : cfg.color} />
                        <Text style={[styles.sevLabel, { color: active ? '#fff' : cfg.color }]}>
                          {cfg.label}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.sevHint}>
                {form.severity === 'info'     && 'Informational — general guidance, no penalty.'}
                {form.severity === 'warning'  && 'Warning — violation may result in disciplinary action.'}
                {form.severity === 'critical' && 'Critical — serious breach with severe consequences.'}
              </Text>

              {/* ── is_active toggle ── */}
              <View style={styles.toggleCard}>
                <View style={styles.toggleLeft}>
                  <View style={[styles.toggleIconWrap, { backgroundColor: form.is_active ? '#D1FAE5' : '#F1F5F9' }]}>
                    <Ionicons
                      name={form.is_active ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={form.is_active ? '#059669' : '#9CA3AF'}
                    />
                  </View>
                  <View>
                    <Text style={styles.toggleLabel}>Rule is Live</Text>
                    <Text style={styles.toggleSub}>
                      {form.is_active ? 'Visible to all students and staff' : 'Hidden — not shown to users'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={form.is_active}
                  onValueChange={(v) => set('is_active', v)}
                  trackColor={{ false: '#CBD5E0', true: NAVY }}
                  thumbColor={form.is_active ? GOLD : '#fff'}
                />
              </View>

              {/* ── Payload preview (dev) ── */}
              <View style={styles.payloadBox}>
                <View style={styles.payloadHeader}>
                  <Ionicons name="code-slash-outline" size={14} color={GOLD} />
                  <Text style={styles.payloadTitle}>Submission Payload</Text>
                </View>
                <Text style={styles.payloadCode}>
                  {JSON.stringify(
                    {
                      title:       form.title.trim()       || '(required)',
                      description: form.description.trim() || '(required)',
                      category:    form.category,
                      severity:    form.severity,
                      is_active:   form.is_active,
                    },
                    null,
                    2,
                  )}
                </Text>
              </View>

              {/* ── Submit ── */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={editingId ? 'checkmark-circle-outline' : 'add-circle-outline'}
                  size={20}
                  color={NAVY}
                />
                <Text style={styles.saveBtnText}>
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Rule'}
                </Text>
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
  // ── Header
  header:        { backgroundColor: NAVY, paddingTop: 52, paddingBottom: 22, paddingHorizontal: 20 },
  headerGoldBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: GOLD },
  headerRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  backBtn:       { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  headerEyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: GOLD, textTransform: 'uppercase' },
  headerTitle:   { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSub:     { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  addBtn:        { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: GOLD, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  addBtnText:    { fontSize: 13, fontWeight: '800', color: NAVY },

  // ── Search + filter
  searchWrap:  { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(26,54,93,0.10)', shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1 },
  searchInput: { flex: 1, fontSize: 14, color: '#2D3748', padding: 0 },
  filterRow:   { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  chip:           { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(26,54,93,0.12)' },
  chipActive:     { backgroundColor: NAVY, borderColor: NAVY },
  chipText:       { fontSize: 12, fontWeight: '600', color: '#718096' },
  chipTextActive: { color: '#fff' },

  // ── Rule card
  list:          { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  card:          { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(26,54,93,0.08)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardLeftBar:   { width: 4 },
  cardBody:      { flex: 1, padding: 14 },
  cardTopRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  sevBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  sevBadgeText:  { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  catBadge:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#EDF1F8' },
  catBadgeText:  { fontSize: 11, fontWeight: '600', color: NAVY },
  activeBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  activeBadgeOn: { backgroundColor: '#D1FAE5' },
  activeBadgeOff:{ backgroundColor: '#F1F5F9' },
  activeDot:     { width: 6, height: 6, borderRadius: 3 },
  activeBadgeText:{ fontSize: 11, fontWeight: '700' },
  cardTitle:     { fontSize: 15, fontWeight: '700', color: '#2D3748', marginBottom: 5 },
  cardDesc:      { fontSize: 12, color: '#718096', lineHeight: 17, marginBottom: 12 },
  cardActions:   { flexDirection: 'row', gap: 8 },
  editBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#EDF1F8' },
  editBtnText:   { fontSize: 12, fontWeight: '700', color: NAVY },
  deleteBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#FEE2E2' },
  deleteBtnText: { fontSize: 12, fontWeight: '700', color: '#DC2626' },

  // ── Empty
  empty:      { flex: 1, alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748' },
  emptySub:   { fontSize: 13, color: '#718096', textAlign: 'center', maxWidth: 240 },

  // ── Modal structure
  modalScroll:     { paddingBottom: 48 },
  modalHeader:     { backgroundColor: NAVY, paddingTop: 52, paddingBottom: 22, paddingHorizontal: 20, position: 'relative' },
  modalGoldBar:    { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: GOLD },
  modalHeaderRow:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  closeBtn:        { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  modalEyebrow:    { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: GOLD, textTransform: 'uppercase' },
  modalTitle:      { fontSize: 22, fontWeight: '800', color: '#fff' },

  // ── Form card
  formCard:   { marginHorizontal: 16, marginTop: 20, backgroundColor: '#fff', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3, borderWidth: 1, borderColor: 'rgba(26,54,93,0.07)' },

  // ── Fields
  label:      { fontSize: 13, fontWeight: '700', color: '#2D3748', marginBottom: 8 },
  req:        { color: '#DC2626' },
  input: {
    backgroundColor: '#F8F9FA', borderRadius: 14, borderWidth: 1.5,
    borderColor: 'rgba(26,54,93,0.13)',
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    fontSize: 14, color: '#2D3748',
  },
  inputError: { borderColor: '#DC2626', backgroundColor: '#FFF5F5' },
  textarea:   { minHeight: 100, textAlignVertical: 'top' },
  errorRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  errorMsg:   { fontSize: 12, color: '#DC2626' },

  // ── Category chip grid
  catGrid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catOption:          { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: '#F8F9FA', borderWidth: 1.5, borderColor: 'rgba(26,54,93,0.12)' },
  catOptionActive:    { backgroundColor: NAVY, borderColor: NAVY },
  catOptionText:      { fontSize: 13, fontWeight: '600', color: '#718096' },
  catOptionTextActive:{ color: '#fff' },

  // ── Severity radio group
  sevRow:      { flexDirection: 'row', gap: 10 },
  sevOption: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 6,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  sevRadio:     { width: 18, height: 18, borderRadius: 9, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  sevRadioFill: { width: 8, height: 8, borderRadius: 4 },
  sevTextWrap:  { alignItems: 'center', gap: 3 },
  sevLabel:     { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  sevHint:      { fontSize: 12, color: '#718096', marginTop: 8, lineHeight: 17, textAlign: 'center', fontStyle: 'italic' },

  // ── Toggle
  toggleCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 16, padding: 14, marginTop: 18, borderWidth: 1, borderColor: 'rgba(26,54,93,0.10)' },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  toggleIconWrap:{ width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  toggleLabel:{ fontSize: 14, fontWeight: '700', color: '#2D3748' },
  toggleSub:  { fontSize: 12, color: '#718096', marginTop: 2 },

  // ── Payload preview
  payloadBox:    { marginTop: 18, backgroundColor: '#0F1C2E', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: 'rgba(197,160,71,0.20)' },
  payloadHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  payloadTitle:  { fontSize: 12, fontWeight: '700', color: GOLD, textTransform: 'uppercase', letterSpacing: 0.8 },
  payloadCode:   { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 12, color: '#86EFAC', lineHeight: 18 },

  // ── Save button
  saveBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 16, backgroundColor: GOLD, marginTop: 22 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText:     { fontSize: 16, fontWeight: '800', color: NAVY },

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
  importSevBadge:      { flex: 1, alignSelf: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginHorizontal: 4 },
  importSevText:       { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  importMore:          { fontSize: 12, color: '#718096', textAlign: 'center', paddingVertical: 8, fontStyle: 'italic' },
  importErrorsWrap:    { marginTop: 12, backgroundColor: '#FFF5F5', borderRadius: 12, padding: 12 },
  importErrorsTitle:   { fontSize: 12, fontWeight: '700', color: '#DC2626', marginBottom: 6 },
  importErrorRow:      { fontSize: 12, color: '#9B2335', marginBottom: 3 },
  importConfirmBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 54, borderRadius: 16, backgroundColor: GOLD },
  importConfirmText:   { fontSize: 15, fontWeight: '800', color: NAVY },
});
