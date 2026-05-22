import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { ADMIN_THEME } from '../../utils/constants';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToIssueReports,
  subscribeToUsers,
  subscribeToEvents,
  subscribeToNotifications,
  subscribeToBuildings,
  subscribeToDining,
} from '../../services/databaseService';

// ── Safe local theme — never undefined even before ThemeContext hydrates ──────
const buildTheme = (isDark) => ({
  bg:          isDark ? ADMIN_THEME.darkBackground : ADMIN_THEME.background,
  surface:     isDark ? ADMIN_THEME.darkSurface     : ADMIN_THEME.surface,
  border:      isDark ? ADMIN_THEME.darkBorder      : ADMIN_THEME.border,
  textPrimary: isDark ? ADMIN_THEME.darkText        : ADMIN_THEME.textDark,
  textMuted:   isDark ? ADMIN_THEME.darkMuted       : ADMIN_THEME.textMuted,
  cardShadow:  isDark ? '#000' : '#0A1628',
});

// ── Animated count-up hook ────────────────────────────────────────────────────
const useCountUp = (target, duration = 900) => {
  const animVal = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    Animated.timing(animVal, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    const id = animVal.addListener(({ value }) => setDisplayed(Math.round(value)));
    return () => animVal.removeListener(id);
  }, [target]);
  return displayed;
};

// ── Stat card (resilient icon container — never collapses) ────────────────────
const StatCard = ({ item, anim, theme }) => {
  const count = useCountUp(item.value);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });

  return (
    <Animated.View
      style={[
        st.statWrap,
        { opacity: anim, transform: [{ translateY }] },
      ]}
    >
      <View
        style={[
          st.statCard,
          {
            backgroundColor: theme.surface,
            borderColor:      theme.border,
            shadowColor:      theme.cardShadow,
          },
        ]}
      >
        {/* Left accent bar */}
        <View style={[st.statAccentBar, { backgroundColor: item.color }]} />

        <View style={st.statInner}>
          {/* Icon enclosure — explicit 44×44 so it never collapses */}
          <View
            style={[
              st.statIconBox,
              {
                width:           44,
                height:          44,
                borderRadius:    14,
                backgroundColor: item.color + '1A',
                justifyContent:  'center',
                alignItems:      'center',
              },
            ]}
          >
            <Ionicons name={item.icon} size={22} color={item.color} />
          </View>

          {/* Metrics */}
          <Text style={[st.statCount, { color: item.color }]}>{count}</Text>
          <Text style={[st.statLabel, { color: theme.textMuted }]}>{item.title}</Text>

          {/* Live chip */}
          <View style={[st.liveChip, { backgroundColor: item.color + '14' }]}>
            <View style={[st.liveDot, { backgroundColor: item.color }]} />
            <Text style={[st.liveChipText, { color: item.color }]}>Live</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// ── Quick-action card ─────────────────────────────────────────────────────────
const ActionCard = ({ action, anim, onPress, theme }) => {
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });

  return (
    <Animated.View style={[st.actionWrap, { opacity: anim, transform: [{ translateY }] }]}>
      <TouchableOpacity
        style={[
          st.actionCard,
          {
            backgroundColor: theme.surface,
            borderColor:      theme.border,
            shadowColor:      theme.cardShadow,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        {/* Icon enclosure — explicit 52×52 with defensive backgroundColor */}
        <View
          style={{
            width:           52,
            height:          52,
            borderRadius:    16,
            backgroundColor: action.color + '18',
            justifyContent:  'center',
            alignItems:      'center',
            marginBottom:    10,
          }}
        >
          <Ionicons name={action.icon} size={26} color={action.color} />
        </View>

        <Text style={[st.actionLabel, { color: theme.textPrimary }]} numberOfLines={2}>
          {action.label}
        </Text>
        <Text style={[st.actionSub, { color: theme.textMuted }]} numberOfLines={1}>
          {action.sub}
        </Text>

        {/* Arrow badge */}
        <View
          style={[
            st.actionArrow,
            {
              backgroundColor: action.color + '14',
              width:  28,
              height: 28,
              borderRadius: 14,
              justifyContent: 'center',
              alignItems: 'center',
              marginTop: 10,
              alignSelf: 'flex-end',
            },
          ]}
        >
          <Ionicons name="arrow-forward" size={13} color={action.color} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
const AdminDashboard = ({ navigation }) => {
  const { isDarkMode } = useTheme();
  const theme = buildTheme(isDarkMode);
  const { user } = useAuth();

  // Live data
  const [users,         setUsers]         = useState([]);
  const [events,        setEvents]        = useState([]);
  const [reports,       setReports]       = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [buildings,     setBuildings]     = useState([]);
  const [dining,        setDining]        = useState([]);

  useEffect(() => {
    const subs = [
      subscribeToUsers((d)         => setUsers(d         || [])),
      subscribeToEvents((d)        => setEvents(d        || [])),
      subscribeToIssueReports((d)  => setReports(d       || [])),
      subscribeToNotifications((d) => setNotifications(d || [])),
      subscribeToBuildings((d)     => setBuildings(d     || [])),
      subscribeToDining((d)        => setDining(d        || [])),
    ];
    return () => subs.forEach((u) => { try { u?.(); } catch (_) {} });
  }, []);

  const unreadCount = useMemo(() =>
    reports.reduce((c, r) => {
      const role = (r?.reporterRole || '').toLowerCase();
      return (role.includes('student') || role.includes('staff') || role.includes('faculty')) && !r?.adminReadAt
        ? c + 1 : c;
    }, 0),
  [reports]);

  // ── Stat cards ──────────────────────────────────────────────────────────────
  const statCards = useMemo(() => [
    {
      id:    'students',
      title: 'Students',
      value:  users.filter((u) => u.role === 'student' && !u.is_anonymous).length,
      icon:   'school-outline',
      color:  ADMIN_THEME.info,
    },
    {
      id:    'staff',
      title: 'Staff',
      value:  users.filter((u) => ['faculty', 'staff'].includes(u.role)).length,
      icon:   'briefcase-outline',
      color:  ADMIN_THEME.primary,
    },
    {
      id:    'guests',
      title: 'Guests',
      value:  users.filter((u) => u.role === 'guest' || u.is_anonymous).length,
      icon:   'person-circle-outline',
      color:  '#7C3AED',
    },
    {
      id:    'events',
      title: 'Events',
      value:  events.length,
      icon:   'calendar-outline',
      color:  ADMIN_THEME.success,
    },
    {
      id:    'buildings',
      title: 'Buildings',
      value:  buildings.length,
      icon:   'business-outline',
      color:  '#0891B2',
    },
    {
      id:    'dining',
      title: 'Dining Hubs',
      value:  dining.length,
      icon:   'fast-food-outline',
      color:  '#D97706',
    },
    {
      id:    'alerts',
      title: 'Open Reports',
      value:  reports.filter((r) => r.status === 'open' || r.status === 'in_progress').length,
      icon:   'alert-circle-outline',
      color:  ADMIN_THEME.danger,
    },
    {
      id:    'notices',
      title: 'Announcements',
      value:  notifications.length,
      icon:   'megaphone-outline',
      color:  ADMIN_THEME.warning,
    },
  ], [users, events, reports, notifications, buildings, dining]);

  // ── Quick actions ────────────────────────────────────────────────────────────
  const QUICK_ACTIONS = useMemo(() => [
    {
      label: 'Manage Users',
      sub:   'Students & Staff',
      icon:  'people-circle-outline',
      color: ADMIN_THEME.primary,
      nav:   'CampusStructure',
    },
    {
      label: 'Buildings & Locations',
      sub:   'Facilities & Maps',
      icon:  'business-outline',
      color: '#0891B2',
      nav:   'CampusContent',
    },
    {
      label: 'Events & Notifications',
      sub:   'Announcements',
      icon:  'calendar-outline',
      color: ADMIN_THEME.success,
      nav:   'CampusContent',
    },
    {
      label: 'Dining & Rules',
      sub:   'Cafeterias & Policies',
      icon:  'fast-food-outline',
      color: '#D97706',
      nav:   'CampusContent',
    },
    {
      label: 'Analytics & Reports',
      sub:   'Issues & Metrics',
      icon:  'bar-chart-outline',
      color: '#7C3AED',
      nav:   'ReportsAnalytics',
    },
    {
      label: 'Emergency & Support',
      sub:   'Contacts & Safety',
      icon:  'call-outline',
      color: '#DC2626',
      nav:   'EmergencyContacts',
    },
    {
      label: 'Control Centre',
      sub:   'Admin Settings',
      icon:  'shield-checkmark-outline',
      color: ADMIN_THEME.danger,
      nav:   'ControlCentre',
    },
  ], []);

  // ── Animations ───────────────────────────────────────────────────────────────
  const heroAnim  = useRef(new Animated.Value(0)).current;
  const cardAnims = useRef(statCards.map(() => new Animated.Value(0))).current;
  const actionAnims = useRef(QUICK_ACTIONS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroAnim, {
        toValue: 1, duration: 420,
        easing: Easing.out(Easing.cubic), useNativeDriver: false,
      }),
      Animated.stagger(55, [
        ...cardAnims.map((a) =>
          Animated.timing(a, { toValue: 1, duration: 360, easing: Easing.out(Easing.back(1.05)), useNativeDriver: false })
        ),
        ...actionAnims.map((a) =>
          Animated.timing(a, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: false })
        ),
      ]),
    ]).start();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const heroTranslate = heroAnim.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] });
  const adminName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Admin';

  return (
    <ScreenWrapper
      backgroundColor={isDarkMode ? ADMIN_THEME.darkBackground : ADMIN_THEME.background}
      statusBarStyle="light-content"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.scroll}
      >

        {/* ══ Hero card ══════════════════════════════════════════════════════ */}
        <Animated.View
          style={[st.hero, { opacity: heroAnim, transform: [{ translateY: heroTranslate }] }]}
        >
          {/* Gold top bar */}
          <View style={st.heroGoldBar} />
          {/* Decorative orbs */}
          <View style={st.heroOrbGold} />
          <View style={st.heroOrbNavy} />

          {/* Header row */}
          <View style={st.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={st.heroGreeting}>{greeting()},</Text>
              <Text style={st.heroName} numberOfLines={1}>{adminName}</Text>
              <Text style={st.heroRole}>RMU Campus Administration</Text>
            </View>

            <View style={st.heroBtnRow}>
              {/* Notification bell */}
              <TouchableOpacity
                style={st.heroBtn}
                onPress={() => navigation.navigate('AdminTabs', { screen: 'Reports' })}
                activeOpacity={0.85}
              >
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                {unreadCount > 0 && (
                  <View style={st.heroNotifBadge}>
                    <Text style={st.heroNotifText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Settings */}
              <TouchableOpacity
                style={st.heroBtn}
                onPress={() => navigation.navigate('ControlCentre', { initialTab: 'Settings' })}
                activeOpacity={0.85}
              >
                <Ionicons name="settings-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Status pills */}
          <View style={st.heroPillRow}>
            <View style={st.heroPill}>
              <Ionicons name="people-outline" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={st.heroPillText}>{users.length} Users</Text>
            </View>
            <View style={[st.heroPill, st.heroPillGold]}>
              <Ionicons name="pulse-outline" size={12} color={ADMIN_THEME.accent} />
              <Text style={[st.heroPillText, { color: ADMIN_THEME.accent }]}>Live Data</Text>
            </View>
            <View style={st.heroPill}>
              <Ionicons name="calendar-outline" size={12} color="rgba(255,255,255,0.85)" />
              <Text style={st.heroPillText}>{events.length} Events</Text>
            </View>
          </View>
        </Animated.View>

        {/* ══ Campus Overview stats ══════════════════════════════════════════ */}
        <View style={st.section}>
          <View style={st.sectionHeaderRow}>
            <View>
              <Text style={[st.sectionTitle, { color: theme.textPrimary }]}>Campus Overview</Text>
              <Text style={[st.sectionSub, { color: theme.textMuted }]}>Real-time campus statistics</Text>
            </View>
            <View style={st.liveBadge}>
              <View style={st.liveBadgeDot} />
              <Text style={st.liveBadgeText}>Live</Text>
            </View>
          </View>

          <View style={st.statsGrid}>
            {statCards.map((item, i) => (
              <StatCard
                key={item.id}
                item={item}
                anim={cardAnims[i] || new Animated.Value(1)}
                theme={theme}
              />
            ))}
          </View>
        </View>

        {/* ══ Quick Actions ══════════════════════════════════════════════════ */}
        <View style={st.section}>
          <Text style={[st.sectionTitle, { color: theme.textPrimary }]}>Quick Actions</Text>
          <Text style={[st.sectionSub, { color: theme.textMuted }]}>Jump to any admin module</Text>

          <View style={st.actionsGrid}>
            {QUICK_ACTIONS.map((action, i) => (
              <ActionCard
                key={action.label}
                action={action}
                anim={actionAnims[i] || new Animated.Value(1)}
                onPress={() => navigation.navigate(action.nav)}
                theme={theme}
              />
            ))}
          </View>
        </View>

        {/* ══ Smart Campus info banner ═══════════════════════════════════════ */}
        <View style={st.infoBanner}>
          <View style={st.infoBannerBar} />
          {/* Icon enclosure — explicit 52×52 */}
          <View
            style={{
              width:           52,
              height:          52,
              borderRadius:    16,
              backgroundColor: ADMIN_THEME.accent,
              justifyContent:  'center',
              alignItems:      'center',
            }}
          >
            <Ionicons name="compass-outline" size={24} color={ADMIN_THEME.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.infoBannerTitle}>Smart Campus Platform</Text>
            <Text style={st.infoBannerSub}>
              Manage campus structure, content, reports, and emergency alerts from four unified modules.
            </Text>
          </View>
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  scroll: { paddingBottom: 40 },

  // ── Hero ────────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: ADMIN_THEME.primary,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 22,
    overflow: 'hidden',
  },
  heroGoldBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 4, backgroundColor: ADMIN_THEME.accent,
  },
  heroOrbGold: {
    position: 'absolute',
    width: 220, height: 220, borderRadius: 110,
    backgroundColor: 'rgba(197,160,71,0.11)',
    top: -70, right: -70,
  },
  heroOrbNavy: {
    position: 'absolute',
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -50, left: -40,
  },
  heroRow:     { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  heroGreeting:{ fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  heroName:    { fontSize: 25, fontWeight: '800', color: '#fff', marginTop: 2, letterSpacing: -0.3 },
  heroRole:    { fontSize: 13, color: ADMIN_THEME.accent, marginTop: 3, fontWeight: '600' },
  heroBtnRow:  { flexDirection: 'row', gap: 8, marginTop: 4 },
  heroBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', overflow: 'visible',
  },
  heroNotifBadge: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 17, height: 17, borderRadius: 9,
    backgroundColor: '#E53E3E',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: ADMIN_THEME.primary,
  },
  heroNotifText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  heroPillRow:   { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6,
  },
  heroPillGold: {
    backgroundColor: 'rgba(197,160,71,0.18)',
    borderColor: 'rgba(197,160,71,0.35)',
  },
  heroPillText: { color: 'rgba(255,255,255,0.88)', fontSize: 11, fontWeight: '600' },

  // ── Sections ────────────────────────────────────────────────────────────────
  section:        { paddingHorizontal: 16, paddingTop: 24 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  sectionTitle:   { fontSize: 18, fontWeight: '800', letterSpacing: -0.2 },
  sectionSub:     { fontSize: 13, marginTop: 2 },

  // Live badge
  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F0FFF4',
    borderWidth: 1, borderColor: '#C6F6D5',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  liveBadgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#38A169' },
  liveBadgeText: { fontSize: 11, fontWeight: '700', color: '#38A169' },

  // ── Stat grid ───────────────────────────────────────────────────────────────
  statsGrid:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  statWrap:   { width: '48.5%', marginBottom: 12 },
  statCard: {
    borderRadius: 18, borderWidth: 1,
    overflow: 'hidden',
    shadowOpacity: 0.05, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2,
    flexDirection: 'row',
  },
  statAccentBar: { width: 4 },
  statInner:  { flex: 1, padding: 13 },
  statIconBox:{ marginBottom: 10 },
  statCount:  { fontSize: 28, fontWeight: '800', lineHeight: 34, letterSpacing: -0.5 },
  statLabel:  { fontSize: 11, fontWeight: '600', marginTop: 2, marginBottom: 8 },
  liveChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  liveDot:      { width: 5, height: 5, borderRadius: 3 },
  liveChipText: { fontSize: 10, fontWeight: '700' },

  // ── Action grid ─────────────────────────────────────────────────────────────
  actionsGrid:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  actionWrap:   { width: '48%' },
  actionCard: {
    borderRadius: 18, borderWidth: 1, padding: 16,
    shadowOpacity: 0.05, shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  actionLabel:  { fontSize: 14, fontWeight: '800', letterSpacing: -0.1 },
  actionSub:    { fontSize: 11, marginTop: 3 },
  actionArrow:  {},

  // ── Info banner ─────────────────────────────────────────────────────────────
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: ADMIN_THEME.primary,
    borderRadius: 20, padding: 16,
    marginHorizontal: 16, marginTop: 24,
    overflow: 'hidden',
  },
  infoBannerBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 3, backgroundColor: ADMIN_THEME.accent,
  },
  infoBannerTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 4 },
  infoBannerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.72)', lineHeight: 17 },
});

export default AdminDashboard;
