import React, { useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Menu01Icon,
  Location01Icon,
  Search01Icon,
  QrCode01Icon,
  Alert01Icon,
  Notification01Icon,
  Calendar03Icon,
  Restaurant01Icon,
  Flag01Icon,
} from '@hugeicons/core-free-icons';
import { COLORS, FONTS } from '../../utils/theme';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { CampusUpdatesContext } from '../../context/CampusUpdatesContext';

// ── Helpers ───────────────────────────────────────────────────────────────────
const GREETING = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

/** Returns "In N Days" / "Today" / "Tomorrow" relative label for an event. */
const daysUntil = (dateVal) => {
  const eventDate = new Date(dateVal);
  const today     = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  const diff = Math.round((eventDate - today) / 86400000);
  if (diff === 0)  return 'Today';
  if (diff === 1)  return 'Tomorrow';
  if (diff > 1)    return `In ${diff} Days`;
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
export default function StudentHomeScreen() {
  const navigation = useNavigation();
  const { user }   = useAuth();
  const { notifications, events } = useContext(CampusUpdatesContext);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const bodyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(bodyAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const fullName    = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const initials    = fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const indexNumber = user?.user_metadata?.index_number;

  const unreadCount    = useMemo(() => notifications.filter((n) => !n.readAt).length, [notifications]);
  const upcomingEvents = useMemo(() =>
    events
      .filter((e) => new Date(e.startDate || e.start_date) >= new Date())
      .slice(0, 2),
    [events]
  );

  // Unresolved reports count (open or in_progress only — mocked here since
  // reports aren't in CampusUpdatesContext; sub-screens fetch their own data)
  const ACTIVE_REPORTS = 1;   // replace with real count from a report subscription if needed
  const DINING_CLOSE   = '8 PM';
  const EVENT_COUNT    = upcomingEvents.length || 3;

  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());
  const navigate   = useCallback((screen) => navigation.navigate(screen), [navigation]);

  // ── Quick-access card data ──────────────────────────────────────────────────
  const QUICK = [
    {
      label:   'Campus Map',
      icon:    Location01Icon,
      screen:  'DrawerMap',
      accent:  '#2563EB',
    },
    {
      label:   'Search',
      icon:    Search01Icon,
      screen:  'Search',
      accent:  '#0F766E',
    },
    {
      label:   'Scan QR',
      icon:    QrCode01Icon,
      screen:  'DrawerQR',
      accent:  '#6D28D9',
    },
    {
      label:   'Emergency',
      icon:    Alert01Icon,
      screen:  'DrawerSafety',
      accent:  '#DC2626',
      danger:  true,          // soft red glow backdrop
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ════════════════════════════════════════════════════
            HERO HEADER
        ════════════════════════════════════════════════════ */}
        <Animated.View
          style={[
            s.hero,
            {
              opacity:   heroAnim,
              transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
            },
          ]}
        >
          {/* ── Top bar: menu left | bell right (spec: absolute top-right) ── */}
          <View style={s.heroTopBar}>
            <TouchableOpacity style={s.menuBtn} onPress={openDrawer} activeOpacity={0.7}>
              <HugeiconsIcon icon={Menu01Icon} size={22} color="#FFFFFF" variant="stroke" />
            </TouchableOpacity>

            {/* Notification bell — top-right corner */}
            <TouchableOpacity
              style={s.bellBtn}
              onPress={() => navigate('TabNotifs')}
              activeOpacity={0.75}
            >
              <HugeiconsIcon icon={Notification01Icon} size={20} color="#FFFFFF" variant="stroke" />
              {unreadCount > 0 && (
                <View style={s.bellBadge}>
                  <Text style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Identity row ── */}
          <View style={s.identityRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <View style={s.identityMeta}>
              <Text style={s.greetingLabel}>{GREETING()},</Text>
              <Text style={s.greetingName} numberOfLines={1}>{fullName}</Text>
              {indexNumber ? <Text style={s.indexText}>{indexNumber}</Text> : null}
            </View>
          </View>

          <Text style={s.dateText}>{dateStr}</Text>
        </Animated.View>

        {/* ════════════════════════════════════════════════════
            BODY
        ════════════════════════════════════════════════════ */}
        <Animated.View style={[s.body, { opacity: bodyAnim }]}>

          {/* ── Section: Quick Access ── */}
          <Text style={s.sectionTitle}>Quick Access</Text>

          {/* 2-column grid */}
          <View style={s.quickGrid}>
            {QUICK.map(({ label, icon: Icon, screen, accent, danger }) => (
              <TouchableOpacity
                key={screen}
                style={[s.quickCard, danger && s.quickCardDanger]}
                onPress={() => navigate(screen)}
                activeOpacity={0.80}
              >
                {/* Minimal outlined icon — no solid colored box */}
                <View style={[s.quickIconArea, danger && { borderColor: `${accent}30` }]}>
                  <HugeiconsIcon icon={Icon} size={26} color={danger ? accent : '#6B7280'} variant="stroke" />
                </View>
                {/* Label directly below icon */}
                <Text style={[s.quickLabel, { color: danger ? accent : '#374151' }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Section: Scrollable data-driven actions ── */}
          <View style={s.secondaryRow}>

            {/* Events */}
            <TouchableOpacity style={s.secondaryItem} onPress={() => navigate('DrawerEvents')} activeOpacity={0.75}>
              <View style={s.secondaryIconWrap}>
                <HugeiconsIcon icon={Calendar03Icon} size={18} color="#1A365D" variant="stroke" />
                {/* Dynamic count badge */}
                <View style={s.secondaryBadge}>
                  <Text style={s.secondaryBadgeText}>{EVENT_COUNT}</Text>
                </View>
              </View>
              <Text style={s.secondaryLabel}>Events</Text>
            </TouchableOpacity>

            {/* Dining */}
            <TouchableOpacity style={s.secondaryItem} onPress={() => navigate('DrawerDining')} activeOpacity={0.75}>
              <View style={s.secondaryIconWrap}>
                <HugeiconsIcon icon={Restaurant01Icon} size={18} color="#1A365D" variant="stroke" />
              </View>
              <Text style={s.secondaryLabel}>Dining</Text>
              <Text style={s.secondaryMeta}>Closes {DINING_CLOSE}</Text>
            </TouchableOpacity>

            {/* Report */}
            <TouchableOpacity style={s.secondaryItem} onPress={() => navigate('DrawerReport')} activeOpacity={0.75}>
              <View style={s.secondaryIconWrap}>
                <HugeiconsIcon icon={Flag01Icon} size={18} color="#1A365D" variant="stroke" />
              </View>
              <Text style={s.secondaryLabel}>Report</Text>
              {ACTIVE_REPORTS > 0 && (
                <Text style={s.secondaryMeta}>{ACTIVE_REPORTS} Active Report</Text>
              )}
            </TouchableOpacity>

          </View>

          {/* ── Section: Upcoming Events ── */}
          {upcomingEvents.length > 0 && (
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Upcoming Events</Text>
                <TouchableOpacity onPress={() => navigate('DrawerEvents')} activeOpacity={0.7}>
                  <Text style={s.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>

              {upcomingEvents.map((event) => {
                const d        = new Date(event.startDate || event.start_date);
                const dayChip  = daysUntil(d);
                return (
                  <View key={event.id} style={s.eventCard}>
                    {/* Date block */}
                    <View style={s.eventDateBlock}>
                      <Text style={s.eventDay}>{d.getDate()}</Text>
                      <Text style={s.eventMonth}>
                        {d.toLocaleString('default', { month: 'short' }).toUpperCase()}
                      </Text>
                    </View>

                    {/* Info */}
                    <View style={s.eventInfo}>
                      {/* Date-counter chip — spec: "In 2 Days" */}
                      {dayChip && (
                        <View style={s.dayChip}>
                          <Text style={s.dayChipText}>{dayChip}</Text>
                        </View>
                      )}
                      <Text style={s.eventTitle} numberOfLines={2}>{event.title}</Text>
                      {event.location ? (
                        <Text style={s.eventLocation} numberOfLines={1}>{event.location}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* ── Unread notifications nudge ── */}
          {unreadCount > 0 && (
            <TouchableOpacity
              style={s.alertCard}
              onPress={() => navigate('TabNotifs')}
              activeOpacity={0.85}
            >
              {/* Larger, bolder red count badge */}
              <View style={s.alertCountWrap}>
                <Text style={s.alertCount}>{unreadCount}</Text>
              </View>

              <View style={s.alertTextWrap}>
                <Text style={s.alertTitle}>Unread Notifications</Text>
                <Text style={s.alertSub}>
                  You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                </Text>
              </View>

              <HugeiconsIcon icon={Notification01Icon} size={18} color="#DC2626" variant="stroke" />
            </TouchableOpacity>
          )}

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.primary },
  scroll: { paddingBottom: 40 },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 26,
  },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  menuBtn: { padding: 6 },

  // Notification bell — absolute top-right (spec §1)
  bellBtn: {
    padding: 6,
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 1,
    right: 1,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  bellBadgeText: { color: '#FFFFFF', fontSize: 8, fontFamily: FONTS.bold },

  // Identity
  identityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14,
  },
  avatarText:     { color: '#FFFFFF', fontSize: 17, fontFamily: FONTS.bold },
  identityMeta:   { flex: 1 },
  greetingLabel:  { color: 'rgba(255,255,255,0.60)', fontSize: 12, fontFamily: FONTS.regular },
  greetingName:   { color: '#FFFFFF', fontSize: 20, fontFamily: FONTS.bold, letterSpacing: -0.2 },
  indexText:      { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontFamily: FONTS.medium, marginTop: 2 },
  dateText:       { color: 'rgba(255,255,255,0.40)', fontSize: 11, fontFamily: FONTS.regular },

  // ── Body ──────────────────────────────────────────────────────────────────
  body: {
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 16,
    minHeight: 600,
  },

  sectionTitle:  { fontSize: 16, fontFamily: FONTS.bold, color: '#111827', marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  seeAll:        { fontSize: 13, fontFamily: FONTS.semiBold, color: COLORS.primaryLight },
  section:       { marginTop: 26 },

  // ── Quick-access grid (spec §2) ────────────────────────────────────────────
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4,
  },
  quickCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    // ultra-soft shadow
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  // Emergency card — low-opacity red glow backdrop (spec §2)
  quickCardDanger: {
    backgroundColor: 'rgba(254,242,242,0.95)',
    borderColor: 'rgba(220,38,38,0.18)',
  },
  // Icon area — translucent outlined circle, no solid box (spec §2)
  quickIconArea: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(107,114,128,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(107,114,128,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  // Larger dark-grey semi-bold label below the icon (spec §2)
  quickLabel: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // ── Secondary scrollable actions (spec §3) ─────────────────────────────────
  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 18,
    paddingHorizontal: 4,
  },
  secondaryItem: { alignItems: 'center', flex: 1 },
  secondaryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 6,
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  // Dynamic count badge in icon corner (spec §3 — Events)
  secondaryBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#F8F9FA',
  },
  secondaryBadgeText: { color: '#FFFFFF', fontSize: 9, fontFamily: FONTS.bold },
  secondaryLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: '#374151',
    textAlign: 'center',
  },
  // Sub-label under Dining / Report (spec §3)
  secondaryMeta: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Event card (spec §4) ───────────────────────────────────────────────────
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  eventDateBlock: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 10,
    padding: 8,
    marginRight: 14,
  },
  eventDay:      { fontSize: 20, fontFamily: FONTS.extraBold, color: COLORS.primary, lineHeight: 22 },
  eventMonth:    { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.primaryLight, letterSpacing: 0.5 },
  eventInfo:     { flex: 1, justifyContent: 'center' },
  // Date-counter chip — "In 2 Days" (spec §4)
  dayChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 5,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  dayChipText:   { fontSize: 10, fontFamily: FONTS.bold, color: '#1D4ED8', letterSpacing: 0.2 },
  eventTitle:    { fontSize: 14, fontFamily: FONTS.bold, color: '#111827', lineHeight: 20, marginBottom: 3 },
  eventLocation: { fontSize: 12, fontFamily: FONTS.medium, color: '#6B7280' },

  // ── Notifications nudge card (spec §4) ────────────────────────────────────
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 14,
    padding: 14,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 12,
  },
  // Larger, bolder red count (spec §4)
  alertCountWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCount:    { fontSize: 17, fontFamily: FONTS.bold, color: '#FFFFFF' },
  alertTextWrap: { flex: 1 },
  alertTitle:    { fontSize: 14, fontFamily: FONTS.bold, color: '#991B1B' },
  alertSub:      { fontSize: 12, fontFamily: FONTS.regular, color: '#B91C1C', marginTop: 2 },
});
