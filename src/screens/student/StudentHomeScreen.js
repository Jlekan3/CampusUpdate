import React, { useEffect, useRef, useContext, useCallback, useMemo } from 'react';
import {
  Image,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Menu01Icon,
  Location01Icon,
  Restaurant01Icon,
  Alert01Icon,
  Flag01Icon,
} from '@hugeicons/core-free-icons';
import { FONTS } from '../../utils/theme';
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
  const { events } = useContext(CampusUpdatesContext);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const bodyAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(heroAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(bodyAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const fullName  = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student';
  const avatarUrl = user?.user_metadata?.avatar_url || null;

  const upcomingEvents = useMemo(() =>
    events
      .filter((e) => new Date(e.startDate || e.start_date) >= new Date())
      .slice(0, 2),
    [events]
  );

  const navigate    = useCallback((screen) => navigation.navigate(screen), [navigation]);
  const openDrawer  = useCallback(() => navigation.dispatch(DrawerActions.openDrawer()), [navigation]);


  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ════════════════════════════════════════════════════
            HERO HEADER
        ════════════════════════════════════════════════════ */}
        <Animated.View
          style={{
            opacity:   heroAnim,
            transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }}
        >
          <View style={s.headerTopContainer}>

            {/* Left: Avatar + Greeting */}
            <View style={s.leftProfileGreetingGroup}>
              <TouchableOpacity style={s.avatarClickWrapper} activeOpacity={0.85}>
                <Image
                  source={{ uri: avatarUrl || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(fullName) + '&background=1A365D&color=fff&size=150' }}
                  style={s.studentHeroAvatarPic}
                />
                <View style={s.activeStatusIndicatorDot} />
              </TouchableOpacity>

              <View style={s.greetingTextColumn}>
                <Text style={s.timeMutedGreeting}>{GREETING()},</Text>
                <Text style={s.studentNamePrimary} numberOfLines={1}>{fullName}</Text>
                <Text style={s.systemSubtext}>RMU Mobile Navigation System</Text>
              </View>
            </View>

            {/* Right: Menu button */}
            <TouchableOpacity style={s.menuIconButtonEnclosure} onPress={openDrawer} activeOpacity={0.7}>
              <HugeiconsIcon icon={Menu01Icon} size={22} color="#1A365D" variant="stroke" />
            </TouchableOpacity>

          </View>
        </Animated.View>

        {/* ════════════════════════════════════════════════════
            BODY
        ════════════════════════════════════════════════════ */}
        <Animated.View style={[s.body, { opacity: bodyAnim }]}>

          {/* ── Quick Access header ── */}
          <View style={s.sectionHeader}>
            <View>
              <Text style={s.sectionTitle}>Quick Access</Text>
              <Text style={s.sectionDesc}>Navigate key campus services</Text>
            </View>
          </View>

          {/* ── BENTO GRID QUICK ACCESS SECTION ── */}
          <View style={s.gridContainer}>

            {/* Campus Map */}
            <TouchableOpacity
              style={s.gridCard}
              onPress={() => navigate('DrawerMap')}
              activeOpacity={0.9}
            >
              <View style={[s.iconBubble, { backgroundColor: '#EFF6FF' }]}>
                <HugeiconsIcon icon={Location01Icon} size={24} color="#1A365D" variant="stroke" />
              </View>
              <View style={s.cardTextContent}>
                <Text style={s.cardTitle}>Campus Map</Text>
                <Text style={s.cardSubtitle}>Find halls, departments & facilities</Text>
              </View>
            </TouchableOpacity>

            {/* Dining & Food */}
            <TouchableOpacity
              style={s.gridCard}
              onPress={() => navigate('DrawerDining')}
              activeOpacity={0.9}
            >
              <View style={[s.iconBubble, { backgroundColor: '#FEF3C7' }]}>
                <HugeiconsIcon icon={Restaurant01Icon} size={24} color="#C5A047" variant="stroke" />
              </View>
              <View style={s.cardTextContent}>
                <Text style={s.cardTitle}>Dining & Food</Text>
                <Text style={s.cardSubtitle}>Cafeteria timetables</Text>
              </View>
            </TouchableOpacity>

            {/* Emergency */}
            <TouchableOpacity
              style={s.gridCard}
              onPress={() => navigate('DrawerSafety')}
              activeOpacity={0.9}
            >
              <View style={[s.iconBubble, { backgroundColor: '#FEE2E2' }]}>
                <HugeiconsIcon icon={Alert01Icon} size={24} color="#E53E3E" variant="stroke" />
              </View>
              <View style={s.cardTextContent}>
                <Text style={s.cardTitle}>Emergency</Text>
                <Text style={s.cardSubtitle}>Safety & support contacts</Text>
              </View>
            </TouchableOpacity>

            {/* Campus Rules */}
            <TouchableOpacity
              style={s.gridCard}
              onPress={() => navigate('DrawerRules')}
              activeOpacity={0.9}
            >
              <View style={[s.iconBubble, { backgroundColor: '#E0F2FE' }]}>
                <HugeiconsIcon icon={Flag01Icon} size={24} color="#0284C7" variant="stroke" />
              </View>
              <View style={s.cardTextContent}>
                <Text style={s.cardTitle}>Rules</Text>
                <Text style={s.cardSubtitle}>Campus policies & conduct</Text>
              </View>
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

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: { paddingBottom: 40 },

  // ── Hero header ───────────────────────────────────────────────────────────
  headerTopContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 20,
  },
  leftProfileGreetingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  avatarClickWrapper: {
    position: 'relative',
    shadowColor: '#1A365D',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  studentHeroAvatarPic: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#E2E8F0',
  },
  activeStatusIndicatorDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  greetingTextColumn:  { flex: 1, justifyContent: 'center' },
  timeMutedGreeting:   { fontSize: 12, fontFamily: FONTS.medium, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.6 },
  studentNamePrimary:  { fontSize: 20, fontFamily: FONTS.bold, color: '#1A365D', letterSpacing: -0.4, marginVertical: 1 },
  systemSubtext:       { fontSize: 12, fontFamily: FONTS.regular, color: '#C5A047', fontWeight: '500' },
  menuIconButtonEnclosure: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26,54,93,0.08)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },

  // ── Body ──────────────────────────────────────────────────────────────────
  body: {
    paddingTop: 24,
    paddingHorizontal: 16,
    minHeight: 600,
  },

  sectionTitle:  { fontSize: 16, fontFamily: FONTS.bold, color: '#1A365D', marginBottom: 2 },
  sectionDesc:   { fontSize: 12, fontFamily: FONTS.regular, color: '#64748B', marginBottom: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  seeAll:        { fontSize: 13, fontFamily: FONTS.semiBold, color: '#2563EB' },
  section:       { marginTop: 26 },

  // ── Quick-access grid ──────────────────────────────────────────────────────
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4,
  },
  quickCard: {
    width: '47%',
    backgroundColor: '#1A365D',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
    shadowColor: '#1A365D',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  quickCardDanger: {
    backgroundColor: '#DC2626',
    shadowColor: '#DC2626',
  },
  quickIconArea: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickLabel: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // ── Secondary scrollable actions ───────────────────────────────────────────
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
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 6,
    position: 'relative',
    shadowColor: '#2563EB',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
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
    borderColor: '#FFFFFF',
  },
  secondaryBadgeText: { color: '#FFFFFF', fontSize: 9, fontFamily: FONTS.bold },
  secondaryLabel: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: '#1A365D',
    textAlign: 'center',
  },
  secondaryMeta: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },

  // ── Event card ─────────────────────────────────────────────────────────────
  eventCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    shadowColor: '#2563EB',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  eventDateBlock: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
    padding: 8,
    marginRight: 14,
  },
  eventDay:      { fontSize: 20, fontFamily: FONTS.extraBold, color: '#1A365D', lineHeight: 22 },
  eventMonth:    { fontSize: 11, fontFamily: FONTS.bold, color: '#2563EB', letterSpacing: 0.5 },
  eventInfo:     { flex: 1, justifyContent: 'center' },
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
  eventTitle:    { fontSize: 14, fontFamily: FONTS.bold, color: '#1A365D', lineHeight: 20, marginBottom: 3 },
  eventLocation: { fontSize: 12, fontFamily: FONTS.medium, color: '#64748B' },

  // ── Quick access grid (2×2 equal cards) ───────────────────────────────────
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginVertical: 16,
  },
  gridCard: {
    width: '47%',
    height: 130,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(26,54,93,0.06)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  iconBubble:     { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTextContent:{ justifyContent: 'flex-end' },
  cardTitle:      { fontSize: 14, fontWeight: '700', color: '#1A365D' },
  cardSubtitle:   { fontSize: 11, color: '#64748B', marginTop: 2, lineHeight: 14 },
});
