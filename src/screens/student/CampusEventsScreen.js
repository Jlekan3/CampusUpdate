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
  Dimensions,
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

const { width: W } = Dimensions.get('window');
const NAVY   = '#1A365D';
const GOLD   = '#C5A047';
const GOLD_S = 'rgba(197,160,71,0.12)';
const BG     = '#F8FAFC';
const SURFACE= '#FFFFFF';
const SLATE  = '#1E293B';
const MUTED  = '#64748B';
const LIGHT  = '#94A3B8';
const BORDER = '#E2E8F0';

const CAT_ACCENT = {
  Academic:  '#2563EB',
  Social:    '#7C3AED',
  Sports:    '#059669',
  Cultural:  '#D97706',
  Workshop:  '#0891B2',
  default:   NAVY,
};

const REMINDER_OPTIONS = [
  { id: '0',    label: 'At event time',     minutes: 0    },
  { id: '30',   label: '30 minutes before', minutes: 30   },
  { id: '60',   label: '1 hour before',     minutes: 60   },
  { id: '1440', label: '1 day before',      minutes: 1440 },
];

const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v?.toDate === 'function') return v.toDate();
  const d = new Date(v); return isNaN(d) ? null : d;
};

const fmtTime = (v) => {
  const d = toDate(v);
  if (!d) return null;
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const getDaysUntil = (v) => {
  const d = toDate(v);
  if (!d) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const ev = new Date(d); ev.setHours(0, 0, 0, 0);
  const diff = Math.round((ev - today) / 86400000);
  if (diff < 0)  return null;
  if (diff === 0) return { label: 'Today',     color: '#DC2626', bg: '#FEE2E2' };
  if (diff === 1) return { label: 'Tomorrow',  color: '#D97706', bg: '#FEF3C7' };
  if (diff <= 7)  return { label: `In ${diff} Days`, color: NAVY, bg: '#EFF6FF' };
  return { label: `In ${diff} Days`, color: MUTED, bg: '#F1F5F9' };
};

const getDateBadge = (v) => {
  const d = toDate(v);
  if (!d) return null;
  return {
    day: d.getDate(),
    month: d.toLocaleDateString([], { month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString([], { weekday: 'short' }).toUpperCase(),
  };
};

// ── Featured Event Card (horizontal carousel) ─────────────────────────────────
function FeaturedCard({ item, onRSVP, rsvpd }) {
  const date   = getDateBadge(item.startDate || item.date);
  const time   = fmtTime(item.startDate || item.date);
  const cd     = getDaysUntil(item.startDate || item.date);
  const accent = CAT_ACCENT[item.category] || CAT_ACCENT.default;

  return (
    <TouchableOpacity style={st.featCard} activeOpacity={0.93}>
      <View style={[st.featAccentBar, { backgroundColor: accent }]} />
      <View style={st.featBody}>
        <View style={st.featTopRow}>
          {date && (
            <View style={st.featDateBadge}>
              <Text style={st.featDateDay}>{date.day}</Text>
              <Text style={st.featDateMonth}>{date.month}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            {cd && (
              <View style={[st.countdownChip, { backgroundColor: cd.bg }]}>
                <View style={[st.countdownDot, { backgroundColor: cd.color }]} />
                <Text style={[st.countdownText, { color: cd.color }]}>{cd.label}</Text>
              </View>
            )}
            {item.category && (
              <Text style={[st.featCat, { color: accent }]}>{item.category.toUpperCase()}</Text>
            )}
          </View>
          <View style={[st.featStarBadge, { backgroundColor: GOLD_S }]}>
            <Ionicons name="star" size={12} color={GOLD} />
            <Text style={st.featStarText}>Featured</Text>
          </View>
        </View>

        <Text style={st.featTitle} numberOfLines={2}>{item.title || 'Campus Event'}</Text>

        {time && (
          <View style={st.featMeta}>
            <Ionicons name="time-outline" size={13} color={MUTED} />
            <Text style={st.featMetaText}>{time}</Text>
          </View>
        )}
        {item.location && (
          <View style={st.featMeta}>
            <Ionicons name="location-outline" size={13} color={MUTED} />
            <Text style={st.featMetaText} numberOfLines={1}>{item.location}</Text>
          </View>
        )}

        <View style={st.featFooter}>
          {item.attendee_count > 0 && (
            <View style={st.attendeeRow}>
              <Ionicons name="people-outline" size={13} color={MUTED} />
              <Text style={st.attendeeText}>{item.attendee_count} attending</Text>
            </View>
          )}
          <TouchableOpacity
            style={[st.featRsvp, rsvpd && st.featRsvpActive]}
            onPress={() => onRSVP(item)}
            activeOpacity={0.85}
          >
            <Ionicons name={rsvpd ? 'checkmark-circle' : 'calendar-outline'} size={14} color={rsvpd ? '#fff' : NAVY} />
            <Text style={[st.featRsvpText, rsvpd && st.featRsvpTextActive]}>
              {rsvpd ? 'RSVP\'d' : 'RSVP'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Regular Event Card ────────────────────────────────────────────────────────
function EventCard({ item, onRSVP, rsvpd }) {
  const date   = getDateBadge(item.startDate || item.date);
  const time   = fmtTime(item.startDate || item.date);
  const cd     = getDaysUntil(item.startDate || item.date);
  const accent = CAT_ACCENT[item.category] || CAT_ACCENT.default;

  return (
    <View style={st.card}>
      {/* Left date badge */}
      {date ? (
        <View style={st.dateBadge}>
          <Text style={st.dateBadgeDay}>{date.day}</Text>
          <Text style={st.dateBadgeMonth}>{date.month}</Text>
        </View>
      ) : (
        <View style={[st.dateBadge, { backgroundColor: GOLD_S }]}>
          <Ionicons name="calendar-outline" size={20} color={GOLD} />
        </View>
      )}

      {/* Right content */}
      <View style={st.cardContent}>
        {/* Top row: category + countdown */}
        <View style={st.cardTopRow}>
          {item.category && (
            <View style={[st.catChip, { backgroundColor: accent + '18' }]}>
              <Ionicons name={EVENT_CATEGORY_ICONS[item.category] || 'calendar-outline'} size={10} color={accent} />
              <Text style={[st.catChipText, { color: accent }]}>{item.category}</Text>
            </View>
          )}
          {cd && (
            <View style={[st.countdownChipSm, { backgroundColor: cd.bg }]}>
              <Text style={[st.countdownTextSm, { color: cd.color }]}>{cd.label}</Text>
            </View>
          )}
        </View>

        <Text style={st.cardTitle} numberOfLines={2}>{item.title || 'Campus Event'}</Text>

        {item.description ? (
          <Text style={st.cardDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}

        {/* Meta */}
        <View style={st.metaBlock}>
          {time && (
            <View style={st.metaRow}>
              <Ionicons name="time-outline" size={12} color={LIGHT} />
              <Text style={st.metaText}>{time}</Text>
            </View>
          )}
          {item.location && (
            <View style={st.metaRow}>
              <Ionicons name="location-outline" size={12} color={LIGHT} />
              <Text style={st.metaText} numberOfLines={1}>{item.location}</Text>
            </View>
          )}
          {item.organizer && (
            <View style={st.metaRow}>
              <Ionicons name="person-outline" size={12} color={LIGHT} />
              <Text style={st.metaText} numberOfLines={1}>{item.organizer}</Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={st.cardFooter}>
          {item.attendee_count > 0 && (
            <View style={st.attendeeRow}>
              <Ionicons name="people-outline" size={12} color={MUTED} />
              <Text style={st.attendeeText}>{item.attendee_count}</Text>
            </View>
          )}
          <TouchableOpacity
            style={[st.rsvpBtn, rsvpd && st.rsvpBtnActive]}
            onPress={() => onRSVP(item)}
            activeOpacity={0.85}
          >
            <Ionicons name={rsvpd ? 'checkmark-circle' : 'calendar-outline'} size={13} color={rsvpd ? '#fff' : NAVY} />
            <Text style={[st.rsvpText, rsvpd && st.rsvpTextActive]}>{rsvpd ? 'RSVP\'d' : 'RSVP'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Left accent bar */}
      <View style={[st.cardAccentBar, { backgroundColor: accent }]} />
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
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

  const featured = useMemo(() => visible.filter((e) => e.is_featured), [visible]);

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
      showToast(`RSVP confirmed — ${reminder.label}`);
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

  const ListHeader = () => (
    <>
      {/* ── Search ── */}
      <View style={st.searchWrap}>
        <Ionicons name="search-outline" size={16} color={LIGHT} />
        <TextInput
          style={st.searchInput}
          placeholder="Search events, locations…"
          placeholderTextColor={LIGHT}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={LIGHT} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Category chips ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipRow}>
        {CATS.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[st.chip, category === cat && st.chipActive]}
            onPress={() => setCategory(cat)}
            activeOpacity={0.8}
          >
            {cat !== 'All' && (
              <Ionicons
                name={EVENT_CATEGORY_ICONS[cat] || 'calendar-outline'}
                size={11}
                color={category === cat ? '#fff' : MUTED}
              />
            )}
            <Text style={[st.chipText, category === cat && st.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Featured carousel ── */}
      {featured.length > 0 && (
        <View style={st.featSection}>
          <View style={st.sectionHeader}>
            <View style={st.sectionDot} />
            <Text style={st.sectionTitle}>Featured Events</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.featScroll}>
            {featured.map((item) => (
              <FeaturedCard
                key={item.id}
                item={item}
                onRSVP={handleRSVP}
                rsvpd={isInterested(item.id)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── All events label ── */}
      <View style={st.sectionHeader}>
        <View style={st.sectionDot} />
        <Text style={st.sectionTitle}>
          {category === 'All' ? 'All Events' : category}
          {filtered.length > 0 && <Text style={st.sectionCount}>  {filtered.length}</Text>}
        </Text>
      </View>
    </>
  );

  return (
    <ScreenWrapper backgroundColor={BG} statusBarStyle="light-content">
      {/* ── Header ── */}
      <View style={st.header}>
        <View style={st.headerGoldBar} />
        <View style={st.headerContent}>
          {canGoBack && (
            <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={st.headerEyebrow}>CAMPUS</Text>
            <Text style={st.headerTitle}>Events</Text>
          </View>
          <View style={st.headerIconWrap}>
            <Ionicons name="calendar-outline" size={22} color={GOLD} />
          </View>
        </View>
        <Text style={st.headerSub}>Academic · Social · Cultural events on campus</Text>
      </View>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item, i) => item.id || String(i)}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.list}
        ListHeaderComponent={<ListHeader />}
        renderItem={({ item }) => (
          <EventCard item={item} onRSVP={handleRSVP} rsvpd={isInterested(item.id)} />
        )}
        ListEmptyComponent={
          <View style={st.empty}>
            <View style={st.emptyIcon}>
              <Ionicons name="calendar-outline" size={36} color={GOLD} />
            </View>
            <Text style={st.emptyTitle}>{eventsLoading ? 'Loading events…' : 'No events found'}</Text>
            <Text style={st.emptySub}>{eventsLoading ? 'Please wait…' : 'Check back soon for upcoming campus events.'}</Text>
          </View>
        }
      />

      {/* ── Toast ── */}
      {!!toast && (
        <Animated.View style={[st.toast, { opacity: fadeAnim }]}>
          <Ionicons name="checkmark-circle" size={16} color={GOLD} />
          <Text style={st.toastText}>{toast}</Text>
        </Animated.View>
      )}

      {/* ── Reminder bottom sheet ── */}
      <Modal visible={showReminder} transparent animationType="slide" onRequestClose={() => setShowReminder(false)}>
        <View style={st.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowReminder(false)} />
          <View style={st.sheet}>
            <View style={st.sheetHandle} />
            <View style={st.sheetGoldBar} />
            <Text style={st.sheetTitle}>Set a Reminder</Text>
            <Text style={st.sheetSub} numberOfLines={2}>{selected?.title}</Text>
            <View style={st.reminderList}>
              {REMINDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[st.reminderRow, reminder?.id === opt.id && st.reminderRowActive]}
                  onPress={() => setReminder(opt)}
                  activeOpacity={0.85}
                >
                  <View style={[st.radioOuter, reminder?.id === opt.id && st.radioOuterActive]}>
                    {reminder?.id === opt.id && <View style={st.radioInner} />}
                  </View>
                  <Text style={[st.reminderText, reminder?.id === opt.id && st.reminderTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[st.confirmBtn, !reminder && st.confirmBtnDisabled]}
              onPress={confirmReminder}
              disabled={!reminder}
              activeOpacity={0.85}
            >
              <Text style={st.confirmBtnText}>Confirm RSVP</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.cancelLink} onPress={() => setShowReminder(false)}>
              <Text style={st.cancelLinkText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Cancel modal ── */}
      <Modal visible={showCancel} transparent animationType="fade" onRequestClose={() => setShowCancel(false)}>
        <View style={st.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowCancel(false)} />
          <View style={[st.sheet, { borderRadius: 24 }]}>
            <View style={st.sheetHandle} />
            <View style={[st.sheetGoldBar, { backgroundColor: '#E53E3E' }]} />
            <Text style={st.sheetTitle}>Remove RSVP?</Text>
            <Text style={st.sheetSub}>{selected?.title}</Text>
            <TouchableOpacity style={[st.confirmBtn, { backgroundColor: '#E53E3E' }]} onPress={confirmCancel} activeOpacity={0.85}>
              <Text style={st.confirmBtnText}>Yes, Remove</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.cancelLink} onPress={() => setShowCancel(false)}>
              <Text style={st.cancelLinkText}>Keep RSVP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const st = StyleSheet.create({
  // ── Header ──────────────────────────────────────────────────────────────────
  header:         { backgroundColor: NAVY, paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  headerGoldBar:  { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: GOLD },
  headerContent:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  backBtn:        { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  headerEyebrow:  { fontSize: 10, fontWeight: '800', letterSpacing: 2.5, color: GOLD, textTransform: 'uppercase' },
  headerTitle:    { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerSub:      { fontSize: 12, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.2 },
  headerIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(197,160,71,0.16)', justifyContent: 'center', alignItems: 'center' },

  // ── Search ──────────────────────────────────────────────────────────────────
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 16, marginBottom: 12, backgroundColor: SURFACE, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  searchInput: { flex: 1, fontSize: 14, color: SLATE, padding: 0 },

  // ── Category chips ───────────────────────────────────────────────────────────
  chipRow:        { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  chip:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  chipActive:     { backgroundColor: NAVY, borderColor: NAVY },
  chipText:       { fontSize: 12, fontWeight: '600', color: MUTED },
  chipTextActive: { color: '#fff', fontWeight: '700' },

  // ── Section headers ──────────────────────────────────────────────────────────
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  sectionDot:    { width: 4, height: 16, borderRadius: 2, backgroundColor: GOLD },
  sectionTitle:  { fontSize: 15, fontWeight: '800', color: SLATE, letterSpacing: -0.2 },
  sectionCount:  { fontSize: 13, fontWeight: '600', color: MUTED },

  // ── Featured carousel ────────────────────────────────────────────────────────
  featSection: { marginBottom: 4 },
  featScroll:  { paddingHorizontal: 16, paddingBottom: 4, gap: 12 },
  featCard: {
    width: W * 0.76,
    backgroundColor: SURFACE,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  featAccentBar: { height: 3 },
  featBody:      { padding: 16 },
  featTopRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  featDateBadge: { width: 46, height: 50, borderRadius: 12, backgroundColor: GOLD_S, borderWidth: 1, borderColor: 'rgba(197,160,71,0.25)', justifyContent: 'center', alignItems: 'center' },
  featDateDay:   { fontSize: 20, fontWeight: '900', color: NAVY, lineHeight: 22 },
  featDateMonth: { fontSize: 9,  fontWeight: '800', color: GOLD, letterSpacing: 1 },
  featCat:       { fontSize: 10, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 },
  featStarBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  featStarText:  { fontSize: 10, fontWeight: '700', color: GOLD },
  featTitle:     { fontSize: 16, fontWeight: '800', color: SLATE, marginBottom: 8, letterSpacing: -0.2 },
  featMeta:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  featMetaText:  { fontSize: 12, color: MUTED },
  featFooter:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  featRsvp:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#EDF1F8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: BORDER },
  featRsvpActive:{ backgroundColor: NAVY, borderColor: NAVY },
  featRsvpText:  { fontSize: 12, fontWeight: '700', color: NAVY },
  featRsvpTextActive: { color: '#fff' },

  // ── Countdown chips ──────────────────────────────────────────────────────────
  countdownChip:   { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 4 },
  countdownDot:    { width: 5, height: 5, borderRadius: 3 },
  countdownText:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.2 },
  countdownChipSm: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  countdownTextSm: { fontSize: 10, fontWeight: '700' },

  // ── Regular event card ───────────────────────────────────────────────────────
  card: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    marginHorizontal: 16,
  },
  cardAccentBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  dateBadge:     { width: 56, backgroundColor: GOLD_S, borderRightWidth: 1, borderRightColor: 'rgba(197,160,71,0.18)', justifyContent: 'center', alignItems: 'center', padding: 8 },
  dateBadgeDay:  { fontSize: 22, fontWeight: '900', color: NAVY, lineHeight: 26 },
  dateBadgeMonth:{ fontSize: 9,  fontWeight: '800', color: GOLD, letterSpacing: 0.8 },
  cardContent:   { flex: 1, padding: 14, paddingLeft: 16 },
  cardTopRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' },
  catChip:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  catChipText:   { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
  cardTitle:     { fontSize: 15, fontWeight: '800', color: SLATE, marginBottom: 4, letterSpacing: -0.2 },
  cardDesc:      { fontSize: 12, color: MUTED, lineHeight: 18, marginBottom: 8 },
  metaBlock:     { gap: 3, marginBottom: 10 },
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText:      { fontSize: 11, color: LIGHT },
  cardFooter:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  attendeeRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attendeeText:  { fontSize: 11, color: MUTED, fontWeight: '600' },
  rsvpBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#EDF1F8', borderWidth: 1, borderColor: BORDER },
  rsvpBtnActive: { backgroundColor: NAVY, borderColor: NAVY },
  rsvpText:      { fontSize: 12, fontWeight: '700', color: NAVY },
  rsvpTextActive:{ color: '#fff' },

  // ── List ────────────────────────────────────────────────────────────────────
  list:  { paddingBottom: 40, gap: 10 },
  empty: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 40, gap: 10 },
  emptyIcon:  { width: 72, height: 72, borderRadius: 24, backgroundColor: GOLD_S, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: SLATE },
  emptySub:   { fontSize: 13, color: LIGHT, textAlign: 'center', lineHeight: 19 },

  // ── Toast ───────────────────────────────────────────────────────────────────
  toast:     { position: 'absolute', bottom: 36, left: 24, right: 24, backgroundColor: NAVY, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
  toastText: { color: '#fff', fontWeight: '700', fontSize: 13, flex: 1 },

  // ── Bottom sheet ────────────────────────────────────────────────────────────
  backdrop:    { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: SURFACE, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 40, overflow: 'hidden' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 12, marginBottom: 0 },
  sheetGoldBar:{ height: 2, backgroundColor: GOLD, marginHorizontal: -20, marginTop: 16, marginBottom: 20 },
  sheetTitle:  { fontSize: 20, fontWeight: '800', color: SLATE, marginBottom: 4, letterSpacing: -0.2 },
  sheetSub:    { fontSize: 13, color: MUTED, marginBottom: 20, lineHeight: 19 },
  reminderList:{ gap: 8, marginBottom: 24 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, backgroundColor: BG, borderWidth: 1, borderColor: BORDER },
  reminderRowActive:  { backgroundColor: GOLD_S, borderColor: 'rgba(197,160,71,0.35)' },
  reminderText:       { fontSize: 14, color: MUTED },
  reminderTextActive: { fontWeight: '700', color: NAVY },
  radioOuter:         { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: BORDER, justifyContent: 'center', alignItems: 'center' },
  radioOuterActive:   { borderColor: GOLD },
  radioInner:         { width: 10, height: 10, borderRadius: 5, backgroundColor: GOLD },
  confirmBtn:         { height: 52, borderRadius: 16, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmBtnText:     { fontSize: 15, fontWeight: '800', color: NAVY },
  cancelLink:         { alignItems: 'center', paddingVertical: 8 },
  cancelLinkText:     { fontSize: 14, fontWeight: '600', color: LIGHT },
});
