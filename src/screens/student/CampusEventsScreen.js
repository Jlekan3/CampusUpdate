import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Animated,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { EVENT_CATEGORIES, EVENT_CATEGORY_ICONS } from '../../utils/constants';
import { CampusUpdatesContext } from '../../context/CampusUpdatesContext';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToUserEventInterests,
  saveUserEventInterest,
  removeUserEventInterest,
} from '../../services/databaseService';

const NAVY = '#1A365D';
const GOLD = '#C5A047';
const BG   = '#F8F9FA';

const REMINDER_OPTIONS = [
  { id: '0',    label: 'At event time',   minutes: 0 },
  { id: '30',   label: '30 minutes before', minutes: 30 },
  { id: '60',   label: '1 hour before',   minutes: 60 },
  { id: '1440', label: '1 day before',    minutes: 1440 },
];

const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v); return isNaN(d) ? null : d;
};

const fmtDate = (v) => {
  const d = toDate(v);
  if (!d) return null;
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
};

const fmtTime = (v) => {
  const d = toDate(v);
  if (!d) return null;
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export default function CampusEventsScreen({ navigation }) {
  const { events, eventsLoading } = useContext(CampusUpdatesContext);
  const { user, userRole }        = useAuth();

  const [search,       setSearch]       = useState('');
  const [category,     setCategory]     = useState('All');
  const [interests,    setInterests]    = useState({});
  const [selected,     setSelected]     = useState(null);
  const [showReminder, setShowReminder] = useState(false);
  const [showCancel,   setShowCancel]   = useState(false);
  const [reminder,     setReminder]     = useState(null);
  const [toast,        setToast]        = useState('');
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeToUserEventInterests(user.id, (map) => setInterests(map || {}));
    return () => { try { unsub?.(); } catch (_) {} };
  }, [user?.id]);

  const showToast = (msg) => {
    setToast(msg);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start(() => setToast(''));
  };

  const visible = useMemo(() => {
    const staffLike = ['admin', 'faculty', 'staff'];
    return events.filter((e) => {
      const aud = (e.audience || 'everyone').toLowerCase();
      if (aud !== 'staff') return true;
      return staffLike.some((r) => (userRole || '').toLowerCase().includes(r));
    });
  }, [events, userRole]);

  const filtered = useMemo(() => {
    let items = category === 'All' ? visible : visible.filter((e) => e.category === category);
    const q = search.trim().toLowerCase();
    if (q) items = items.filter((e) => [e.title, e.category, e.location].some((v) => (v || '').toLowerCase().includes(q)));
    return items;
  }, [visible, category, search]);

  const isInterested = (id) => !!interests[id];

  const handleRSVP = (event) => {
    if (isInterested(event.id)) {
      setSelected(event); setShowCancel(true);
    } else {
      setSelected(event); setReminder(null); setShowReminder(true);
    }
  };

  const confirmReminder = async () => {
    if (!selected || !reminder) return;
    try {
      if (user?.id) await saveUserEventInterest(user.id, selected.id);
      setShowReminder(false);
      showToast(`✓ RSVP'd — ${reminder.label}`);
    } catch (_) {
      Alert.alert('Error', 'Could not save RSVP. Please try again.');
    }
  };

  const confirmCancel = async () => {
    if (!selected) return;
    try {
      if (user?.id) await removeUserEventInterest(user.id, selected.id);
      setShowCancel(false);
      showToast(`Removed RSVP for ${selected.title}`);
    } catch (_) {
      Alert.alert('Error', 'Could not remove RSVP.');
    }
  };

  const canGoBack = navigation?.canGoBack?.();
  const CATS = ['All', ...EVENT_CATEGORIES];

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
            <Text style={styles.headerEyebrow}>CAMPUS</Text>
            <Text style={styles.headerTitle}>Events</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="calendar-outline" size={24} color={GOLD} />
          </View>
        </View>
        <Text style={styles.headerSub}>Upcoming academic and social events on campus.</Text>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={GOLD} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events…"
            placeholderTextColor="#A0AEC0"
            value={search}
            onChangeText={setSearch}
          />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color="#A0AEC0" /></TouchableOpacity> : null}
        </View>
      </View>

      {/* ── Category chips ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {CATS.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, category === cat && styles.chipActive]}
            onPress={() => setCategory(cat)}
            activeOpacity={0.8}
          >
            {cat !== 'All' && (
              <Ionicons
                name={EVENT_CATEGORY_ICONS[cat] || 'calendar-outline'}
                size={13}
                color={category === cat ? '#fff' : '#718096'}
              />
            )}
            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Events list ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item, i) => item.id || String(i)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const rsvp = isInterested(item.id);
          const date = fmtDate(item.startDate || item.date || item.createdAt);
          const time = fmtTime(item.startDate || item.date);
          return (
            <View style={styles.card}>
              <View style={styles.cardGoldBar} />
              <View style={styles.cardBody}>
                {/* Category chip */}
                {item.category && (
                  <View style={styles.catRow}>
                    <Ionicons name={EVENT_CATEGORY_ICONS[item.category] || 'calendar-outline'} size={13} color={GOLD} />
                    <Text style={styles.catText}>{item.category}</Text>
                  </View>
                )}
                <Text style={styles.cardTitle}>{item.title || item.name || 'Campus Event'}</Text>
                {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}

                <View style={styles.cardMeta}>
                  {date && (
                    <View style={styles.metaRow}>
                      <Ionicons name="calendar-outline" size={13} color="#718096" />
                      <Text style={styles.metaText}>{date}{time ? `  ·  ${time}` : ''}</Text>
                    </View>
                  )}
                  {item.location && (
                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={13} color="#718096" />
                      <Text style={styles.metaText}>{item.location}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.rsvpBtn, rsvp && styles.rsvpBtnActive]}
                  onPress={() => handleRSVP(item)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={rsvp ? 'checkmark-circle' : 'calendar-outline'} size={16} color={rsvp ? '#fff' : NAVY} />
                  <Text style={[styles.rsvpBtnText, rsvp && styles.rsvpBtnTextActive]}>
                    {rsvp ? 'RSVP\'d' : 'RSVP'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={GOLD} />
            <Text style={styles.emptyTitle}>{eventsLoading ? 'Loading events…' : 'No events found'}</Text>
            <Text style={styles.emptySub}>{eventsLoading ? '' : 'Check back soon for upcoming campus events.'}</Text>
          </View>
        }
      />

      {/* ── Toast ── */}
      {!!toast && (
        <Animated.View style={[styles.toast, { opacity: fadeAnim }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      {/* ── Reminder modal ── */}
      <Modal visible={showReminder} transparent animationType="slide" onRequestClose={() => setShowReminder(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalGoldBar} />
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Set a Reminder</Text>
            <Text style={styles.modalSub}>{selected?.title}</Text>
            <View style={styles.reminderList}>
              {REMINDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.reminderRow, reminder?.id === opt.id && styles.reminderRowActive]}
                  onPress={() => setReminder(opt)}
                  activeOpacity={0.85}
                >
                  <Ionicons name={reminder?.id === opt.id ? 'radio-button-on' : 'radio-button-off'} size={20} color={reminder?.id === opt.id ? GOLD : '#A0AEC0'} />
                  <Text style={[styles.reminderText, reminder?.id === opt.id && styles.reminderTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.confirmBtn, !reminder && styles.confirmBtnDisabled]} onPress={confirmReminder} disabled={!reminder} activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>Confirm RSVP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelLink} onPress={() => setShowReminder(false)}>
              <Text style={styles.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Cancel modal ── */}
      <Modal visible={showCancel} transparent animationType="fade" onRequestClose={() => setShowCancel(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { borderRadius: 24 }]}>
            <View style={styles.modalGoldBar} />
            <Text style={[styles.modalTitle, { marginTop: 20 }]}>Remove RSVP?</Text>
            <Text style={styles.modalSub}>{selected?.title}</Text>
            <TouchableOpacity style={[styles.confirmBtn, { backgroundColor: '#E53E3E' }]} onPress={confirmCancel} activeOpacity={0.85}>
              <Text style={styles.confirmBtnText}>Yes, Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelLink} onPress={() => setShowCancel(false)}>
              <Text style={styles.cancelLinkText}>Keep RSVP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header:          { backgroundColor: NAVY, paddingTop: 52, paddingBottom: 22, paddingHorizontal: 20 },
  headerGoldBar:   { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: GOLD },
  headerContent:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  backBtn:         { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  headerEyebrow:   { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: GOLD, textTransform: 'uppercase' },
  headerTitle:     { fontSize: 26, fontWeight: '800', color: '#fff' },
  headerSub:       { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  headerIcon:      { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(197,160,71,0.18)', justifyContent: 'center', alignItems: 'center' },

  searchWrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  searchBar:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(26,54,93,0.10)' },
  searchInput:{ flex: 1, fontSize: 14, color: '#2D3748', padding: 0 },

  chipRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  chip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(26,54,93,0.12)' },
  chipActive:    { backgroundColor: NAVY, borderColor: NAVY },
  chipText:      { fontSize: 12, fontWeight: '600', color: '#718096' },
  chipTextActive:{ color: '#fff' },

  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(26,54,93,0.08)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardGoldBar: { height: 3, backgroundColor: GOLD },
  cardBody:    { padding: 16 },
  catRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  catText:     { fontSize: 11, fontWeight: '700', color: GOLD, textTransform: 'uppercase', letterSpacing: 0.5 },
  cardTitle:   { fontSize: 16, fontWeight: '800', color: '#2D3748', marginBottom: 6 },
  cardDesc:    { fontSize: 13, color: '#718096', lineHeight: 18, marginBottom: 12 },
  cardMeta:    { gap: 5, marginBottom: 14 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText:    { fontSize: 12, color: '#718096' },
  rsvpBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 13, backgroundColor: '#EDF1F8', borderWidth: 1, borderColor: 'rgba(26,54,93,0.14)' },
  rsvpBtnActive:    { backgroundColor: NAVY, borderColor: NAVY },
  rsvpBtnText:      { fontSize: 13, fontWeight: '700', color: NAVY },
  rsvpBtnTextActive:{ color: '#fff' },

  empty:      { flex: 1, alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748' },
  emptySub:   { fontSize: 13, color: '#718096', textAlign: 'center', maxWidth: 240 },

  toast:     { position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: NAVY, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
  toastText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  modalBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet:     { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 36, overflow: 'hidden' },
  modalGoldBar:   { height: 3, backgroundColor: GOLD, marginHorizontal: -20 },
  modalHandle:    { width: 44, height: 4, borderRadius: 2, backgroundColor: '#CBD5E0', alignSelf: 'center', marginTop: 10, marginBottom: 16 },
  modalTitle:     { fontSize: 20, fontWeight: '800', color: '#2D3748', marginBottom: 6 },
  modalSub:       { fontSize: 13, color: '#718096', marginBottom: 20 },
  reminderList:   { gap: 6, marginBottom: 20 },
  reminderRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: '#F8F9FA', borderWidth: 1, borderColor: 'rgba(26,54,93,0.08)' },
  reminderRowActive:    { backgroundColor: 'rgba(197,160,71,0.10)', borderColor: 'rgba(197,160,71,0.30)' },
  reminderText:         { fontSize: 14, color: '#4A5568' },
  reminderTextActive:   { fontWeight: '700', color: NAVY },
  confirmBtn:           { height: 52, borderRadius: 16, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  confirmBtnDisabled:   { opacity: 0.45 },
  confirmBtnText:       { fontSize: 15, fontWeight: '800', color: NAVY },
  cancelLink:           { alignItems: 'center', paddingVertical: 6 },
  cancelLinkText:       { fontSize: 14, fontWeight: '600', color: '#718096' },
});
