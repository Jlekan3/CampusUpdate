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
} from '../../services/databaseService';

// Animated count-up hook
const useCountUp = (target, duration = 1000) => {
  const animVal = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    Animated.timing(animVal, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    const listener = animVal.addListener(({ value }) => setDisplayed(Math.round(value)));
    return () => animVal.removeListener(listener);
  }, [target]);

  return displayed;
};

// Individual animated stat card
const StatCard = ({ item, anim }) => {
  const count = useCountUp(item.value);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY }], width: '48%', marginBottom: 12 }}>
      <View style={[styles.statCard, { backgroundColor: item.bg, borderColor: item.borderColor }]}>
        <View style={[styles.statIconWrap, { backgroundColor: item.color + '22' }]}>
          <Ionicons name={item.icon} size={20} color={item.color} />
        </View>
        <Text style={[styles.statCount, { color: item.color }]}>{count}</Text>
        <Text style={styles.statTitle}>{item.title}</Text>
        <View style={[styles.trendChip, { backgroundColor: item.color + '18' }]}>
          <Ionicons name="pulse-outline" size={10} color={item.color} />
          <Text style={[styles.trendText, { color: item.color }]}>Live</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const QUICK_ACTIONS = [
  { label: 'Campus Structure', icon: 'business-outline',       color: ADMIN_THEME.primary,        nav: 'CampusStructure' },
  { label: 'Campus Content',   icon: 'location-outline',        color: '#2563EB',                  nav: 'CampusContent' },
  { label: 'Issues Reported & Analytics', icon: 'bar-chart-outline', color: ADMIN_THEME.success, nav: 'ReportsAnalytics' },
  { label: 'Control Centre',   icon: 'shield-outline',          color: '#DC2626',                  nav: 'ControlCentre' },
  { label: 'Emergency Contacts', icon: 'call-outline',          color: '#E53E3E',                  nav: 'EmergencyContacts' },
  { label: 'Campus Rules',       icon: 'document-text-outline', color: ADMIN_THEME.info,            nav: 'ManageCampusRules'  },
];

const AdminDashboard = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();

  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [reports, setReports] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // 8 entrance animations
  const cardAnims = useRef([...Array(QUICK_ACTIONS.length)].map(() => new Animated.Value(0))).current;
  const heroAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Stagger entrance
    Animated.sequence([
      Animated.timing(heroAnim, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.stagger(70, cardAnims.map((a) => Animated.timing(a, { toValue: 1, duration: 380, easing: Easing.out(Easing.back(1.1)), useNativeDriver: false }))),
    ]).start();
  }, []);

  useEffect(() => {
    const subs = [
      subscribeToUsers((items) => setUsers(items || [])),
      subscribeToEvents((items) => setEvents(items || [])),
      subscribeToIssueReports((items) => setReports(items || [])),
      subscribeToNotifications((items) => setNotifications(items || [])),
    ];
    return () => subs.forEach((unsub) => { try { unsub?.(); } catch (e) {} });
  }, []);

  const unreadReportCount = useMemo(() => {
    return reports.reduce((count, r) => {
      const role = (r?.reporterRole || '').toString().toLowerCase();
      const isStudentOrStaff = role.includes('student') || role.includes('staff') || role.includes('faculty');
      return isStudentOrStaff && !r?.adminReadAt ? count + 1 : count;
    }, 0);
  }, [reports]);

  const statCards = useMemo(() => [
    {
      id: 'students',
      title: 'Students',
      value: users.filter((u) => u.role === 'student').length,
      icon: 'school-outline',
      color: ADMIN_THEME.info,
      bg: '#EBF8FF',
      borderColor: '#BEE3F8',
    },
    {
      id: 'staff',
      title: 'Staff',
      value: users.filter((u) => ['faculty', 'staff'].includes(u.role)).length,
      icon: 'briefcase-outline',
      color: ADMIN_THEME.primary,
      bg: '#EBF0FF',
      borderColor: '#C3DAFE',
    },
    {
      id: 'guests',
      title: 'Guests',
      value: users.filter((u) => u.role === 'guest').length,
      icon: 'person-outline',
      color: '#6B46C1',
      bg: '#FAF5FF',
      borderColor: '#D6BCFA',
    },
    {
      id: 'events',
      title: 'Active Events',
      value: events.length,
      icon: 'calendar-outline',
      color: ADMIN_THEME.success,
      bg: '#F0FFF4',
      borderColor: '#C6F6D5',
    },
    {
      id: 'emergency',
      title: 'Emergency',
      value: reports.filter((r) => {
        const cat = (r.category || '').toLowerCase();
        const priority = (r.priority || '').toLowerCase();
        return cat === 'emergency' || priority === 'high' || priority === 'critical';
      }).length,
      icon: 'alert-circle-outline',
      color: ADMIN_THEME.danger,
      bg: '#FFF5F5',
      borderColor: '#FED7D7',
    },
    {
      id: 'announcements',
      title: 'Announcements',
      value: notifications.length,
      icon: 'megaphone-outline',
      color: ADMIN_THEME.warning,
      bg: '#FFFBEB',
      borderColor: '#FDE68A',
    },
    {
      id: 'inProgress',
      title: 'Issues In Progress',
      value: reports.filter((r) => r.status === 'in_progress').length,
      icon: 'time-outline',
      color: '#2563EB',
      bg: '#EFF6FF',
      borderColor: '#BFDBFE',
    },
    {
      id: 'activeToday',
      title: 'Active Today',
      value: users.filter((u) => {
        const last = u.lastLoginAt;
        if (!last) return false;
        const d = last instanceof Date ? last : (last?.toDate ? last.toDate() : new Date(last));
        return !isNaN(d.getTime()) && Date.now() - d.getTime() < 86400000;
      }).length,
      icon: 'pulse-outline',
      color: ADMIN_THEME.statusAvailable,
      bg: '#E6FFFA',
      borderColor: '#B2F5EA',
    },
  ], [users, events, reports, notifications]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const heroTranslate = heroAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] });

  return (
    <ScreenWrapper backgroundColor={colors.background} statusBarStyle="light-content">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Hero Card */}
        <Animated.View style={[styles.heroCard, { opacity: heroAnim, transform: [{ translateY: heroTranslate }] }]}>
          <View style={styles.heroGoldBar} />
          {/* Gold glow orb */}
          <View style={styles.heroGoldOrb} />
          <View style={styles.heroNavyOrb} />

          {/* Header row */}
          <View style={styles.heroHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroGreeting}>{greeting()},</Text>
              <Text style={styles.heroName} numberOfLines={1}>
                {user?.displayName || user?.email?.split('@')[0] || 'Admin'}
              </Text>
              <Text style={styles.heroSub}>RMU Campus Administration</Text>
            </View>
            <View style={styles.heroActions}>
              <TouchableOpacity
                style={styles.heroIconBtn}
                onPress={() => navigation.navigate('AdminTabs', { screen: 'Reports' })}
              >
                <Ionicons name="notifications-outline" size={20} color="#fff" />
                {unreadReportCount > 0 && (
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>{unreadReportCount > 9 ? '9+' : unreadReportCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroIconBtn}
                onPress={() => navigation.navigate('ControlCentre', { initialTab: 'Settings' })}
              >
                <Ionicons name="settings-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

        </Animated.View>

        {/* Stats Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Campus Overview</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>
          <Text style={[styles.sectionSub, { color: colors.textMuted }]}>Real-time campus statistics</Text>

          <View style={styles.statsGrid}>
            {statCards.map((item, i) => (
              <StatCard key={item.id} item={item} anim={cardAnims[i]} />
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textDark }]}>Quick Actions</Text>
          <Text style={[styles.sectionSub, { color: colors.textMuted }]}>Jump to any admin module</Text>

          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.actionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate(action.nav)}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIconWrap, { backgroundColor: action.color + '18' }]}>
                  <Ionicons name={action.icon} size={22} color={action.color} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.textDark }]}>{action.label}</Text>
                <View style={[styles.actionArrow, { backgroundColor: action.color + '14' }]}>
                  <Ionicons name="arrow-forward" size={12} color={action.color} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info banner */}
        <View style={styles.infoBanner}>
          <View style={styles.infoBannerAccent} />
          <View style={[styles.infoBannerIcon, { backgroundColor: ADMIN_THEME.accent }]}>
            <Ionicons name="compass-outline" size={22} color={ADMIN_THEME.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoBannerTitle}>Smart Campus Platform</Text>
            <Text style={styles.infoBannerText}>
              Manage campus structure, content, reports, and emergency alerts from four unified modules.
            </Text>
          </View>
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 32 },

  // Hero
  heroCard: {
    backgroundColor: ADMIN_THEME.primary,
    marginHorizontal: 0,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  heroGoldBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 4,
    backgroundColor: ADMIN_THEME.accent,
  },
  heroGoldOrb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(197,160,71,0.12)',
    top: -60,
    right: -60,
  },
  heroNavyOrb: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -40,
    left: -40,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  heroGreeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
  },
  heroName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  heroSub: {
    fontSize: 13,
    color: ADMIN_THEME.accent,
    marginTop: 3,
    fontWeight: '600',
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  heroIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  heroBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#E53E3E',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: ADMIN_THEME.primary,
  },
  heroBadgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  heroPillRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  heroPillGold: {
    backgroundColor: 'rgba(197,160,71,0.22)',
    borderColor: 'rgba(197,160,71,0.4)',
  },
  heroPillText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
  },

  // Sections
  section: {
    paddingHorizontal: 16,
    paddingTop: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSub: {
    fontSize: 13,
    marginBottom: 14,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FFF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C6F6D5',
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#38A169' },
  liveText: { fontSize: 11, fontWeight: '700', color: '#38A169' },

  // Stat cards grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statCount: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
    marginTop: 2,
    marginBottom: 8,
  },
  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  trendText: { fontSize: 10, fontWeight: '700' },

  // Quick actions
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  actionCard: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  actionArrow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-end',
  },

  // Info banner
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: ADMIN_THEME.primary,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 24,
    alignItems: 'center',
    gap: 14,
    overflow: 'hidden',
  },
  infoBannerAccent: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 3,
    backgroundColor: ADMIN_THEME.accent,
  },
  infoBannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  infoBannerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 17,
  },
});

export default AdminDashboard;
