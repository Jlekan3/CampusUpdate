import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import ScreenWrapper from '../../components/ScreenWrapper';

// ── Design tokens ─────────────────────────────────────────────────────────────
const NAVY   = '#1A365D';
const GOLD   = '#C5A047';
const SLATE  = '#1E293B';   // large headings
const DARK   = '#334155';   // body text
const MUTED  = '#64748B';   // subtitles
const LIGHT  = '#94A3B8';   // hints
const BG     = '#F8F9FA';   // page background
const SURFACE= '#FFFFFF';
const BORDER = '#E2E8F0';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 48) / 2;   // 2-col grid with 16px edge + 16px gap

// ── Mini map preview (SVG-less vector art) ────────────────────────────────────
function MapThumbnail() {
  return (
    <View style={th.root}>
      {/* Road grid */}
      <View style={[th.road, th.roadV, { left: '30%' }]} />
      <View style={[th.road, th.roadV, { left: '65%' }]} />
      <View style={[th.road, th.roadH, { top: '35%'  }]} />
      <View style={[th.road, th.roadH, { top: '65%'  }]} />
      {/* Building blocks */}
      <View style={[th.block, { top: '8%',  left: '5%',  width: 22, height: 22, backgroundColor: '#93C5FD' }]} />
      <View style={[th.block, { top: '8%',  left: '38%', width: 18, height: 28, backgroundColor: '#6EE7B7' }]} />
      <View style={[th.block, { top: '42%', left: '5%',  width: 20, height: 18, backgroundColor: '#FDE68A' }]} />
      <View style={[th.block, { top: '42%', left: '38%', width: 24, height: 20, backgroundColor: '#93C5FD' }]} />
      <View style={[th.block, { top: '72%', left: '38%', width: 20, height: 18, backgroundColor: '#C4B5FD' }]} />
      <View style={[th.block, { top: '8%',  left: '72%', width: 20, height: 30, backgroundColor: '#FCA5A5' }]} />
      <View style={[th.block, { top: '42%', left: '72%', width: 20, height: 22, backgroundColor: '#6EE7B7' }]} />
      {/* Location pin */}
      <View style={th.pinWrap}>
        <View style={th.pinHead} />
        <View style={th.pinTail} />
      </View>
    </View>
  );
}
const th = StyleSheet.create({
  root:   { width: '100%', height: 80, backgroundColor: '#EFF6FF', borderRadius: 12, overflow: 'hidden', position: 'relative' },
  road:   { position: 'absolute', backgroundColor: '#DBEAFE' },
  roadV:  { width: 4, top: 0, bottom: 0 },
  roadH:  { height: 4, left: 0, right: 0 },
  block:  { position: 'absolute', borderRadius: 4 },
  pinWrap:{ position: 'absolute', top: '30%', left: '54%', alignItems: 'center' },
  pinHead:{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#DC2626', borderWidth: 2, borderColor: '#FFFFFF' },
  pinTail:{ width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#DC2626', marginTop: -1 },
});

// ── Rules snippet preview ─────────────────────────────────────────────────────
function RulesSnippet() {
  const RULES = ['Academic Integrity', 'Campus Conduct', 'Safety & Security'];
  return (
    <View style={rp.root}>
      {RULES.map((r, i) => (
        <View key={i} style={rp.row}>
          <View style={rp.dot} />
          <Text style={rp.txt} numberOfLines={1}>{r}</Text>
        </View>
      ))}
    </View>
  );
}
const rp = StyleSheet.create({
  root: { width: '100%' },
  row:  { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  dot:  { width: 5, height: 5, borderRadius: 3, backgroundColor: NAVY + '50' },
  txt:  { fontSize: 11, color: MUTED, flex: 1 },
});

// ─────────────────────────────────────────────────────────────────────────────
export default function GuestHomeScreen({ navigation }) {
  const { logout } = useAuth();

  // Staggered entrance animations
  const fadeHeader = useRef(new Animated.Value(0)).current;
  const fadeBanner = useRef(new Animated.Value(0)).current;
  const fadeCards  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeHeader, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.timing(fadeBanner, { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(fadeCards,  { toValue: 1, duration: 340, useNativeDriver: true }),
    ]).start();
  }, []);

  const goTo = (route, params) => {
    if (route === 'QRScanner') {
      navigation.getParent?.()?.navigate('QRScanner');
      return;
    }
    navigation.navigate(route, params);
  };

  // ── Feature cards data ──────────────────────────────────────────────────────
  const CARDS = [
    {
      id: 'map',
      title: 'Interactive Map',
      sub: 'Explore campus in real time',
      icon: 'map-outline',
      accent: '#2563EB',
      accentBg: '#EFF6FF',
      preview: <MapThumbnail />,
      route: 'Map',
    },
    {
      id: 'rules',
      title: 'Campus Rules',
      sub: 'Policies & student tiers',
      icon: 'shield-checkmark-outline',
      accent: '#7C3AED',
      accentBg: '#F5F3FF',
      preview: <RulesSnippet />,
      route: 'Search',
    },
    {
      id: 'emergency',
      title: 'Emergency & Support',
      sub: 'Ghana Toll-Free Dispatch',
      icon: 'call-outline',
      accent: '#DC2626',
      accentBg: '#FEF2F2',
      preview: null,
      route: 'Search',
    },
    {
      id: 'dining',
      title: 'Dining & Cafeterias',
      sub: '5 Open Campus Hubs',
      icon: 'restaurant-outline',
      accent: '#D97706',
      accentBg: '#FFFBEB',
      preview: null,
      route: 'Search',
    },
  ];

  return (
    <ScreenWrapper backgroundColor={BG} statusBarStyle="dark-content">
      <StatusBar barStyle="dark-content" backgroundColor={BG} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >

        {/* ══════════════════════════════════════════════════════════
            1. WELCOME HEADER — light, open, editorial
        ══════════════════════════════════════════════════════════ */}
        <Animated.View style={[styles.header, { opacity: fadeHeader }]}>
          {/* Top bar: brand mark + actions */}
          <View style={styles.headerTopBar}>
            <View style={styles.brandMark}>
              <View style={styles.brandIcon}>
                <Ionicons name="school-outline" size={18} color={NAVY} />
              </View>
              <Text style={styles.brandLabel}>RMU</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => goTo('Search')} activeOpacity={0.8}>
                <Ionicons name="search-outline" size={18} color={SLATE} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconBtn} onPress={logout} activeOpacity={0.8}>
                <Ionicons name="log-out-outline" size={18} color={SLATE} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Greeting block */}
          <View style={styles.greetingBlock}>
            <Text style={styles.greetingTitle}>Welcome to{'\n'}Campus Network</Text>
            <Text style={styles.greetingSubtitle}>
              Explore our campus structure, dining, and maps.{' '}
              <Text style={styles.greetingSubtitleAccent}>
                Sign in to access personal academic portals.
              </Text>
            </Text>
          </View>

          {/* Decorative pill tags */}
          <View style={styles.pillRow}>
            {['🗺 Interactive Map', '🏛 Departments', '🍽 Dining', '🏠 Hostels'].map((tag) => (
              <View key={tag} style={styles.pill}>
                <Text style={styles.pillText}>{tag}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════
            2. CONTEXTUAL AUTH BANNER
        ══════════════════════════════════════════════════════════ */}
        <Animated.View style={{ opacity: fadeBanner }}>
          <View style={styles.authBanner}>
            {/* Left: lock icon + copy */}
            <View style={styles.authLeft}>
              <View style={styles.authIconWrap}>
                <Ionicons name="lock-open-outline" size={20} color={NAVY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.authBannerTitle}>Unlock full student features</Text>
                <Text style={styles.authBannerSub}>Events · Grades · Notifications</Text>
              </View>
            </View>
            {/* CTA button */}
            <TouchableOpacity style={styles.authBtn} onPress={logout} activeOpacity={0.85}>
              <Text style={styles.authBtnText}>Sign In</Text>
              <Ionicons name="arrow-forward" size={13} color="#fff" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════
            3. QUICK ACCESS EXPLORER
        ══════════════════════════════════════════════════════════ */}
        <Animated.View style={{ opacity: fadeCards }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <Text style={styles.sectionSub}>No account required</Text>
          </View>

          {/* 2-column card grid */}
          <View style={styles.cardGrid}>
            {CARDS.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={[styles.card, { width: CARD_W }]}
                onPress={() => goTo(card.route)}
                activeOpacity={0.88}
              >
                {/* Icon badge */}
                <View style={[styles.cardIconBadge, { backgroundColor: card.accentBg }]}>
                  <Ionicons name={card.icon} size={22} color={card.accent} />
                </View>

                {/* Preview area — map thumbnail / rules snippet / custom */}
                {card.preview ? (
                  <View style={styles.cardPreview}>
                    {card.preview}
                  </View>
                ) : card.id === 'emergency' ? (
                  <View style={[styles.cardPreviewFill, { backgroundColor: '#FEF2F2' }]}>
                    <View style={styles.emergencyBadge}>
                      <Ionicons name="call" size={20} color="#DC2626" />
                      <Text style={styles.emergencyBadgeText}>SOS</Text>
                    </View>
                    <Text style={styles.emergencyLines}>Ghana National Emergency</Text>
                    <Text style={styles.emergencyNumber}>191 · 193 · 999</Text>
                  </View>
                ) : (
                  <View style={[styles.cardPreviewFill, { backgroundColor: '#FFFBEB' }]}>
                    <View style={styles.diningHub}>
                      <View style={styles.diningCount}>
                        <Text style={styles.diningCountNum}>5</Text>
                        <Text style={styles.diningCountLabel}>Open</Text>
                      </View>
                      <View style={styles.diningDots}>
                        {['#FCD34D','#FDE68A','#FCD34D'].map((c, i) => (
                          <View key={i} style={[styles.diningDot, { backgroundColor: c }]} />
                        ))}
                      </View>
                      <Text style={styles.diningLabel}>Campus Hubs</Text>
                    </View>
                  </View>
                )}

                {/* Card footer */}
                <View style={styles.cardFooter}>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardSub}>{card.sub}</Text>
                </View>

                {/* Arrow indicator */}
                <View style={[styles.cardArrow, { backgroundColor: card.accentBg }]}>
                  <Ionicons name="arrow-forward" size={11} color={card.accent} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════
            4. FOOTER NOTE
        ══════════════════════════════════════════════════════════ */}
        <View style={styles.footer}>
          <Ionicons name="information-circle-outline" size={14} color={LIGHT} />
          <Text style={styles.footerText}>
            You are browsing as a guest. Sign in or register for full campus access — events, announcements, and personalised features.
          </Text>
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scroll: { paddingBottom: 40 },

  // ── 1. Welcome header
  header: {
    backgroundColor: SURFACE,
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  brandMark:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandIcon:    { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EDF1F8', justifyContent: 'center', alignItems: 'center' },
  brandLabel:   { fontSize: 15, fontWeight: '800', color: NAVY, letterSpacing: 1.5 },
  headerActions:{ flexDirection: 'row', gap: 8 },
  headerIconBtn:{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },

  greetingBlock: { marginBottom: 18 },
  greetingTitle: { fontSize: 30, fontWeight: '800', color: SLATE, lineHeight: 36, letterSpacing: -0.5, marginBottom: 10 },
  greetingSubtitle:       { fontSize: 14, color: MUTED, lineHeight: 21 },
  greetingSubtitleAccent: { color: NAVY, fontWeight: '600' },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:    { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: BORDER },
  pillText:{ fontSize: 11, fontWeight: '600', color: DARK },

  // ── 2. Auth banner
  authBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: 'rgba(26,54,93,0.04)',
    borderWidth: 1,
    borderColor: `${GOLD}60`,
    borderRadius: 18,
    padding: 14,
  },
  authLeft:       { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  authIconWrap:   { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(26,54,93,0.08)', justifyContent: 'center', alignItems: 'center' },
  authBannerTitle:{ fontSize: 13, fontWeight: '700', color: NAVY, marginBottom: 2 },
  authBannerSub:  { fontSize: 11, color: MUTED },
  authBtn:        { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: NAVY, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  authBtnText:    { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  // ── 3. Section header
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 16, paddingTop: 24, paddingBottom: 14 },
  sectionTitle:  { fontSize: 18, fontWeight: '800', color: SLATE, letterSpacing: -0.2 },
  sectionSub:    { fontSize: 12, color: LIGHT, fontWeight: '600' },

  // ── 3. Card grid
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 16 },

  card: {
    backgroundColor: SURFACE,
    borderRadius: 20,        // rounded-2xl
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    // ultra-soft shadow (shadow-sm)
    shadowColor: '#0A1628',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardIconBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', margin: 14, marginBottom: 10, alignSelf: 'flex-start' },

  // Preview area (map / rules)
  cardPreview:     { marginHorizontal: 14, marginBottom: 10, borderRadius: 12, overflow: 'hidden' },
  cardPreviewFill: { marginHorizontal: 14, marginBottom: 10, borderRadius: 12, height: 80, justifyContent: 'center', alignItems: 'center' },

  // Emergency preview
  emergencyBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  emergencyBadgeText: { fontSize: 12, fontWeight: '800', color: '#DC2626', letterSpacing: 1 },
  emergencyLines:     { fontSize: 10, color: '#9B2335', fontWeight: '600', textAlign: 'center' },
  emergencyNumber:    { fontSize: 13, fontWeight: '800', color: '#DC2626', textAlign: 'center', letterSpacing: 0.5, marginTop: 2 },

  // Dining preview
  diningHub:       { alignItems: 'center', gap: 4 },
  diningCount:     { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  diningCountNum:  { fontSize: 28, fontWeight: '800', color: '#D97706', lineHeight: 32 },
  diningCountLabel:{ fontSize: 11, fontWeight: '700', color: '#D97706' },
  diningDots:      { flexDirection: 'row', gap: 4 },
  diningDot:       { width: 6, height: 6, borderRadius: 3 },
  diningLabel:     { fontSize: 10, color: MUTED, fontWeight: '600' },

  // Card footer
  cardFooter: { paddingHorizontal: 14, paddingBottom: 14 },
  cardTitle:  { fontSize: 13, fontWeight: '700', color: SLATE, marginBottom: 2 },
  cardSub:    { fontSize: 11, color: MUTED, lineHeight: 15 },

  // Arrow chip
  cardArrow: { position: 'absolute', top: 14, right: 14, width: 24, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  // ── 4. Footer
  footer:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 20, marginTop: 28, paddingTop: 20, borderTopWidth: 1, borderTopColor: BORDER },
  footerText: { flex: 1, fontSize: 12, color: LIGHT, lineHeight: 18 },
});
