import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import ScreenWrapper from '../../components/ScreenWrapper';

const STORAGE_KEY = 'guest-dashboard-mode';
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

// ── Palette ─────────────────────────────────────────────────────────────────
const P = {
  navy:    '#1A365D',
  navyDk:  '#0F2444',
  gold:    '#C5A047',
  goldSoft:'rgba(197,160,71,0.14)',
  blue:    '#2563EB',
  blueMid: '#1D4ED8',
};

const THEMES = {
  light: {
    bg:          '#F4F7FB',
    surface:     '#FFFFFF',
    surfaceAlt:  '#EDF1F9',
    text:        '#1A2744',
    muted:       '#5C6B8A',
    border:      'rgba(26,54,93,0.09)',
    heroText:    '#FFFFFF',
    heroMuted:   'rgba(255,255,255,0.70)',
    pillBg:      'rgba(255,255,255,0.13)',
    pillBorder:  'rgba(255,255,255,0.26)',
    statusBar:   'dark-content',
  },
  dark: {
    bg:          '#080F1E',
    surface:     '#0D1A30',
    surfaceAlt:  '#111E33',
    text:        '#DDE5F5',
    muted:       '#7E8EAD',
    border:      'rgba(197,160,71,0.14)',
    heroText:    '#FFFFFF',
    heroMuted:   'rgba(255,255,255,0.62)',
    pillBg:      'rgba(255,255,255,0.09)',
    pillBorder:  'rgba(255,255,255,0.18)',
    statusBar:   'light-content',
  },
};

const HERO_PILLS = [
  { id: 'nav',    icon: 'navigate-outline',         label: 'Live map ready'  },
  { id: 'access', icon: 'shield-checkmark-outline', label: 'Guest access'    },
  { id: 'hours',  icon: 'time-outline',             label: '9 AM – 4 PM'    },
];

const PRIMARY = [
  { id: 'search',    title: 'Search',      subtitle: 'Find classrooms, offices & services',    icon: 'search-outline',    color: P.blue,    route: 'Search',    cta: 'Search now'  },
  { id: 'map',       title: 'Campus Map',  subtitle: 'Navigate with the full interactive map', icon: 'map-outline',       color: P.gold,    route: 'Map',       cta: 'Open map'    },
  { id: 'favorites', title: 'Favorites',   subtitle: 'Quick access to your saved places',      icon: 'heart-outline',     color: P.blue,    route: 'Favorites', cta: 'View saved'  },
  { id: 'qr',        title: 'Scan QR',     subtitle: 'Open a campus location instantly',       icon: 'qr-code-outline',   color: P.gold,    route: 'QRScanner', cta: 'Scan now'    },
];

const UTILITIES = [
  { id: 'buildings',  title: 'All Buildings',   subtitle: 'Browse and navigate to any building',      icon: 'business-outline',          color: P.blue,  route: 'Search', params: { mode: 'buildings' } },
  { id: 'directions', title: 'Get Directions',  subtitle: 'Step-by-step to any campus location',      icon: 'navigate-circle-outline',   color: P.gold,  route: 'Map'    },
  { id: 'events',     title: 'Campus Events',   subtitle: "Discover what's happening on campus today", icon: 'calendar-outline',          color: P.blue,  route: 'Search' },
];

const ALL = [...PRIMARY, ...UTILITIES];

const GuestHomeScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [mode, setMode] = useState('light');

  const heroAnim    = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;
  const cardAnims   = useRef(ALL.map(() => new Animated.Value(0))).current;

  // Load persisted theme
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => { if (alive && (v === 'light' || v === 'dark')) setMode(v); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Persist theme
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  }, [mode]);

  // Entrance sequence — all useNativeDriver:true (opacity + translateY only)
  useEffect(() => {
    const seq = Animated.sequence([
      Animated.timing(heroAnim,    { toValue: 1, duration: 460, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.stagger(65, cardAnims.map((a) =>
        Animated.timing(a, { toValue: 1, duration: 310, useNativeDriver: true })
      )),
    ]);
    seq.start();
    return () => seq.stop();
  }, []);

  const t = THEMES[mode] || THEMES.light;

  const heroSlide    = heroAnim.interpolate({ inputRange: [0, 1], outputRange: [-22, 0] });
  const contentSlide = contentAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  const cardStyle = (i) => ({
    opacity:   cardAnims[i],
    transform: [{ translateY: cardAnims[i].interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
  });

  const handleNav = (item) => {
    if (item.route === 'QRScanner') {
      navigation.getParent?.()?.navigate('QRScanner');
      return;
    }
    navigation.navigate(item.route, item.params);
  };

  return (
    <ScreenWrapper backgroundColor={t.bg} statusBarStyle={t.statusBar}>
      {/* Background decoration */}
      <View style={[styles.bgOrb1, { backgroundColor: P.goldSoft }]} />
      <View style={[styles.bgOrb2, { backgroundColor: mode === 'dark' ? 'rgba(37,99,235,0.07)' : 'rgba(37,99,235,0.04)' }]} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── HERO — full-bleed edge-to-edge ───────────────────────────── */}
        <Animated.View style={[styles.hero, { backgroundColor: P.navy }, { opacity: heroAnim, transform: [{ translateY: heroSlide }] }]}>
          <View style={styles.heroGoldBar} />
          <View style={styles.heroOrbA} />
          <View style={styles.heroOrbB} />

          {/* Top row */}
          <View style={styles.heroTopRow}>
            <View style={styles.heroBrand}>
              <View style={styles.heroCrest}>
                <Ionicons name="school-outline" size={26} color={P.gold} />
              </View>
              <View>
                <Text style={styles.heroEyebrow}>RMU CAMPUS</Text>
                <Text style={[styles.heroTitle, { color: t.heroText }]}>Guest Portal</Text>
              </View>
            </View>
            <View style={styles.heroActions}>
              <TouchableOpacity
                style={styles.heroIconBtn}
                onPress={() => setMode((m) => (m === 'dark' ? 'light' : 'dark'))}
                activeOpacity={0.8}
              >
                <Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroIconBtn} onPress={logout} activeOpacity={0.8}>
                <Ionicons name="log-out-outline" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Description */}
          <Text style={[styles.heroDesc, { color: t.heroMuted }]}>
            Navigate, search, and explore campus services without an account.
          </Text>

          {/* Status pills */}
          <View style={styles.heroPillRow}>
            {HERO_PILLS.map((p) => (
              <View key={p.id} style={[styles.heroPill, { backgroundColor: t.pillBg, borderColor: t.pillBorder }]}>
                <Ionicons name={p.icon} size={13} color={P.gold} />
                <Text style={[styles.heroPillText, { color: t.heroText }]}>{p.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── BODY — padded content below the hero ─────────────────────── */}
        <View style={styles.body}>

          {/* Info cards row */}
          <Animated.View style={[styles.infoRow, { opacity: contentAnim, transform: [{ translateY: contentSlide }] }]}>
            <View style={[styles.infoCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              <View style={[styles.infoStripe, { backgroundColor: P.gold }]} />
              <View style={[styles.infoIconBox, { backgroundColor: P.goldSoft }]}>
                <Ionicons name="ribbon-outline" size={19} color={P.gold} />
              </View>
              <Text style={[styles.infoTitle, { color: t.text }]}>Getting Started</Text>
              <Text style={[styles.infoBody, { color: t.muted }]}>
                Search for a building, then tap for directions or map view.
              </Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              <View style={[styles.infoStripe, { backgroundColor: P.blue }]} />
              <View style={[styles.infoIconBox, { backgroundColor: `${P.blue}14` }]}>
                <Ionicons name="time-outline" size={19} color={P.blue} />
              </View>
              <Text style={[styles.infoTitle, { color: t.text }]}>Campus Hours</Text>
              <Text style={[styles.infoBody, { color: t.muted }]}>
                Open weekdays{'\n'}9 AM – 4 PM
              </Text>
            </View>
          </Animated.View>

          {/* Quick actions */}
          <Text style={[styles.eyebrow, { color: P.gold }]}>Explore</Text>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Quick Actions</Text>

          <View style={styles.primaryGrid}>
            {PRIMARY.map((item, i) => (
              <AnimatedTouchable
                key={item.id}
                style={[styles.primaryCard, { backgroundColor: t.surface, borderColor: t.border }, cardStyle(i)]}
                onPress={() => handleNav(item)}
                activeOpacity={0.82}
              >
                <View style={[styles.primaryTopBar, { backgroundColor: item.color }]} />
                <View style={[styles.primaryIconBox, { backgroundColor: `${item.color}18` }]}>
                  <Ionicons name={item.icon} size={28} color={item.color} />
                </View>
                <Text style={[styles.primaryLabel, { color: t.text }]}>{item.title}</Text>
                <Text style={[styles.primarySub, { color: t.muted }]}>{item.subtitle}</Text>
                <View style={styles.primaryCta}>
                  <Text style={[styles.primaryCtaText, { color: item.color }]}>{item.cta}</Text>
                  <Ionicons name="arrow-forward" size={14} color={item.color} />
                </View>
              </AnimatedTouchable>
            ))}
          </View>

          {/* Visitor utilities */}
          <Text style={[styles.eyebrow, { color: P.gold }]}>Tools</Text>
          <Text style={[styles.sectionTitle, { color: t.text }]}>Visitor Utilities</Text>

          <View style={styles.utilList}>
            {UTILITIES.map((item, i) => (
              <AnimatedTouchable
                key={item.id}
                style={[styles.utilCard, { backgroundColor: t.surface, borderColor: t.border }, cardStyle(PRIMARY.length + i)]}
                onPress={() => handleNav(item)}
                activeOpacity={0.82}
              >
                <View style={[styles.utilIconBox, { backgroundColor: `${item.color}18` }]}>
                  <Ionicons name={item.icon} size={22} color={item.color} />
                </View>
                <View style={styles.utilText}>
                  <Text style={[styles.utilTitle, { color: t.text }]}>{item.title}</Text>
                  <Text style={[styles.utilSub, { color: t.muted }]}>{item.subtitle}</Text>
                </View>
                <View style={[styles.utilArrow, { backgroundColor: `${item.color}14` }]}>
                  <Ionicons name="arrow-forward" size={16} color={item.color} />
                </View>
              </AnimatedTouchable>
            ))}
          </View>

          {/* Footer note */}
          <View style={[styles.footer, { backgroundColor: t.surfaceAlt, borderColor: t.border }]}>
            <Ionicons name="information-circle-outline" size={16} color={t.muted} style={{ marginTop: 1 }} />
            <Text style={[styles.footerText, { color: t.muted }]}>
              Sign in or register for full campus access — events, announcements, and personalised features.
            </Text>
          </View>

        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  // Scroll: no horizontal padding — hero handles its own
  scroll: { paddingBottom: 40 },

  // Background orbs
  bgOrb1: { position: 'absolute', width: 320, height: 320, borderRadius: 160, top: -110, right: -130 },
  bgOrb2: { position: 'absolute', width: 200, height: 200, borderRadius: 100, bottom: 100, left: -80 },

  // ── Hero — full-bleed, no side radius, flush left & right
  hero: {
    paddingTop: 54,
    paddingBottom: 30,
    paddingHorizontal: 22,
    overflow: 'hidden',
    backgroundColor: P.navy,
    // rounded only at the bottom
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    shadowColor: '#060F1E',
    shadowOpacity: 0.34,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
    marginBottom: 0,
  },
  heroGoldBar: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 4,
    backgroundColor: P.gold,
  },
  heroOrbA: {
    position: 'absolute',
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: P.gold,
    opacity: 0.09,
    top: -80, right: -80,
  },
  heroOrbB: {
    position: 'absolute',
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: P.blue,
    opacity: 0.09,
    bottom: -60, left: -50,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  heroBrand:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroCrest: {
    width: 52, height: 52, borderRadius: 17,
    backgroundColor: 'rgba(197,160,71,0.18)',
    borderWidth: 1, borderColor: 'rgba(197,160,71,0.40)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroEyebrow: {
    fontSize: 10, fontWeight: '800', letterSpacing: 2.2,
    textTransform: 'uppercase', color: P.gold, marginBottom: 3,
  },
  heroTitle:   { fontSize: 26, fontWeight: '800', letterSpacing: 0.2 },
  heroActions: { flexDirection: 'row', gap: 10 },
  heroIconBtn: {
    width: 38, height: 38, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)',
    justifyContent: 'center', alignItems: 'center',
  },
  heroDesc: { fontSize: 14, lineHeight: 22, marginBottom: 18 },
  heroPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 13, paddingVertical: 8,
    borderRadius: 22, borderWidth: 1,
  },
  heroPillText: { fontSize: 12, fontWeight: '600' },

  // ── Body — padded content below the hero
  body: { paddingHorizontal: 16, paddingTop: 22 },

  // ── Info row
  infoRow: { flexDirection: 'row', gap: 14, marginBottom: 28 },
  infoCard: {
    flex: 1, borderRadius: 22, padding: 16, paddingTop: 20,
    borderWidth: 1, overflow: 'hidden',
    shadowColor: '#060F1E', shadowOpacity: 0.07, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  infoStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  infoIconBox: {
    width: 40, height: 40, borderRadius: 13,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  infoTitle: { fontSize: 14, fontWeight: '800', marginBottom: 6 },
  infoBody:  { fontSize: 12, lineHeight: 18 },

  // ── Section headers
  eyebrow:      { fontSize: 11, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase', marginBottom: 4 },
  sectionTitle: { fontSize: 22, fontWeight: '800', letterSpacing: 0.2, marginBottom: 16 },

  // ── Primary action cards — 2-col, expanded to fill body width
  primaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginBottom: 28 },
  primaryCard: {
    // flex: 1 with a minWidth so they pair up in rows of 2
    flex: 1,
    minWidth: '45%',
    borderRadius: 22, padding: 18, paddingTop: 22,
    borderWidth: 1, minHeight: 196, overflow: 'hidden',
    shadowColor: '#060F1E', shadowOpacity: 0.08, shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 }, elevation: 4,
  },
  primaryTopBar:  { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  primaryIconBox: { width: 54, height: 54, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  primaryLabel:   { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  primarySub:     { fontSize: 12, lineHeight: 17 },
  primaryCta:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14 },
  primaryCtaText: { fontSize: 13, fontWeight: '700' },

  // ── Utility cards (full-width list)
  utilList: { gap: 12, marginBottom: 24 },
  utilCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 20, borderWidth: 1,
    shadowColor: '#060F1E', shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }, elevation: 2,
  },
  utilIconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  utilText:    { flex: 1 },
  utilTitle:   { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  utilSub:     { fontSize: 12, lineHeight: 17 },
  utilArrow:   { width: 34, height: 34, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },

  // ── Footer
  footer: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 16, borderRadius: 18, borderWidth: 1,
  },
  footerText: { flex: 1, fontSize: 12, lineHeight: 19 },
});

export default GuestHomeScreen;
