import React, { useEffect, useRef, useContext, useCallback } from 'react';
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

const GREETING = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const QUICK_ACTIONS = [
  { label: 'Campus Map', icon: Location01Icon, screen: 'DrawerMap',    color: '#1A365D', bg: '#EFF6FF' },
  { label: 'Search',     icon: Search01Icon, screen: 'Search',       color: '#0F766E', bg: '#F0FDFA' },
  { label: 'Scan QR',    icon: QrCode01Icon, screen: 'DrawerQR',     color: '#6D28D9', bg: '#F5F3FF' },
  { label: 'Emergency',  icon: Alert01Icon,  screen: 'DrawerSafety', color: '#DC2626', bg: '#FEF2F2' },
];

const SECONDARY_ACTIONS = [
  { label: 'Events',   icon: Calendar03Icon,   screen: 'DrawerEvents'  },
  { label: 'Dining',   icon: Restaurant01Icon, screen: 'DrawerDining'  },
  { label: 'Report',   icon: Flag01Icon,       screen: 'DrawerReport'  },
];

export default function StudentHomeScreen() {
  const navigation = useNavigation();
  const { user }   = useAuth();
  const { notifications, events } = useContext(CampusUpdatesContext);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const bodyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(bodyAnim, { toValue: 1, duration: 320, useNativeDriver: true }),
    ]).start();
  }, []);

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const initials = fullName.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const indexNumber = user?.user_metadata?.index_number;

  const unreadCount = notifications.filter((n) => !n.readAt).length;
  const upcomingEvents = events
    .filter((e) => new Date(e.startDate || e.start_date) >= new Date())
    .slice(0, 2);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const openDrawer = () => navigation.dispatch(DrawerActions.openDrawer());
  const navigate = useCallback((screen) => navigation.navigate(screen), [navigation]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#1A365D" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Hero ── */}
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: heroAnim,
              transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <TouchableOpacity style={styles.menuBtn} onPress={openDrawer} activeOpacity={0.7}>
              <HugeiconsIcon icon={Menu01Icon} size={24} color="#FFFFFF" variant="stroke" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.notifBtn} onPress={() => navigate('TabNotifs')} activeOpacity={0.7}>
              <HugeiconsIcon icon={Notification01Icon} size={22} color="#FFFFFF" variant="stroke" />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.greetingRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.greetingMeta}>
              <Text style={styles.greetingLabel}>{GREETING()},</Text>
              <Text style={styles.greetingName} numberOfLines={1}>{fullName}</Text>
              {indexNumber ? <Text style={styles.indexText}>{indexNumber}</Text> : null}
            </View>
          </View>

          <Text style={styles.dateText}>{dateStr}</Text>
        </Animated.View>

        {/* ── Body ── */}
        <Animated.View style={[styles.body, { opacity: bodyAnim }]}>

          {/* Quick Access */}
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map(({ label, icon: Icon, screen, color, bg }) => (
              <TouchableOpacity
                key={screen}
                style={[styles.quickCard, { backgroundColor: bg }]}
                onPress={() => navigate(screen)}
                activeOpacity={0.8}
              >
                <View style={[styles.quickIconWrap, { backgroundColor: color }]}>
                  <HugeiconsIcon icon={Icon} size={22} color="#FFFFFF" variant="stroke" />
                </View>
                <Text style={[styles.quickLabel, { color }]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Secondary actions */}
          <View style={styles.secondaryRow}>
            {SECONDARY_ACTIONS.map(({ label, icon: Icon, screen }) => (
              <TouchableOpacity
                key={screen}
                style={styles.secondaryItem}
                onPress={() => navigate(screen)}
                activeOpacity={0.75}
              >
                <View style={styles.secondaryIconWrap}>
                  <HugeiconsIcon icon={Icon} size={20} color="#1A365D" variant="stroke" />
                </View>
                <Text style={styles.secondaryLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Upcoming Events */}
          {upcomingEvents.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Upcoming Events</Text>
                <TouchableOpacity onPress={() => navigate('DrawerEvents')} activeOpacity={0.7}>
                  <Text style={styles.seeAll}>See all</Text>
                </TouchableOpacity>
              </View>
              {upcomingEvents.map((event) => {
                const d = new Date(event.startDate || event.start_date);
                return (
                  <View key={event.id} style={styles.eventCard}>
                    <View style={styles.eventDateBlock}>
                      <Text style={styles.eventDay}>{d.getDate()}</Text>
                      <Text style={styles.eventMonth}>
                        {d.toLocaleString('default', { month: 'short' }).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>
                      {event.location ? (
                        <Text style={styles.eventLocation} numberOfLines={1}>{event.location}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Unread alerts nudge */}
          {unreadCount > 0 && (
            <TouchableOpacity
              style={styles.alertsCard}
              onPress={() => navigate('TabNotifs')}
              activeOpacity={0.85}
            >
              <HugeiconsIcon icon={Notification01Icon} size={20} color="#1A365D" variant="stroke" />
              <Text style={styles.alertsText}>
                You have{' '}
                <Text style={styles.alertsBold}>
                  {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                </Text>
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.primary },
  scrollContent: { paddingBottom: 32 },

  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuBtn: { padding: 6 },
  notifBtn: { padding: 6, position: 'relative' },
  notifBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  notifBadgeText: { color: '#FFFFFF', fontSize: 9, fontFamily: FONTS.bold },

  greetingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontFamily: FONTS.bold },
  greetingMeta: { flex: 1 },
  greetingLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontFamily: FONTS.regular },
  greetingName: { color: '#FFFFFF', fontSize: 20, fontFamily: FONTS.bold, letterSpacing: -0.2 },
  indexText: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: FONTS.medium, marginTop: 2 },
  dateText: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontFamily: FONTS.regular },

  body: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 16,
    minHeight: 600,
  },

  sectionTitle: { fontSize: 17, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAll: { fontSize: 14, fontFamily: FONTS.semiBold, color: COLORS.primaryLight },
  section: { marginTop: 24 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  quickCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickLabel: { fontSize: 14, fontFamily: FONTS.bold },

  secondaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  secondaryItem: { alignItems: 'center' },
  secondaryIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  secondaryLabel: { fontSize: 12, fontFamily: FONTS.semiBold, color: COLORS.textSecondary, textAlign: 'center' },

  eventCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
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
  eventDay: { fontSize: 20, fontFamily: FONTS.extraBold, color: COLORS.primary, lineHeight: 22 },
  eventMonth: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.primaryLight, letterSpacing: 0.5 },
  eventInfo: { flex: 1, justifyContent: 'center' },
  eventTitle: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginBottom: 3, lineHeight: 20 },
  eventLocation: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary },

  alertsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryMuted,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    gap: 10,
  },
  alertsText: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textSecondary, flex: 1 },
  alertsBold: { fontFamily: FONTS.bold, color: COLORS.primary },
});
