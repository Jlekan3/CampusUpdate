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
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import {
  subscribeToCampusRules,
  addCampusRule,
  updateCampusRule,
  deleteCampusRule,
} from '../../services/databaseService';

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
});
