import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import ScreenWrapper from '../../components/ScreenWrapper';

const STORAGE_KEY = 'guest-dashboard-mode';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const FONT = {
  display: Platform.select({ ios: 'Georgia', android: 'serif' }),
  heading: Platform.select({ ios: 'AvenirNext-DemiBold', android: 'sans-serif-medium' }),
  body: Platform.select({ ios: 'AvenirNext-Regular', android: 'sans-serif' }),
};

const THEMES = {
  light: {
    background: '#F8FAFF',
    hero: '#0B1B3B',
    heroSoft: '#1D4ED8',
    panel: '#FFFFFF',
    panelAlt: '#F1F5FF',
    textPrimary: '#0B1B3B',
    textMuted: '#5B6B8A',
    surfaceBorder: 'rgba(11, 27, 59, 0.12)',
    accent: '#0B1B3B',
    accentSoft: 'rgba(11, 27, 59, 0.12)',
    crest: 'rgba(255, 255, 255, 0.18)',
    crestBorder: 'rgba(255, 255, 255, 0.3)',
    heroText: '#FFFFFF',
    heroMuted: 'rgba(255, 255, 255, 0.78)',
    heroPillBg: 'rgba(255, 255, 255, 0.14)',
    heroPillBorder: 'rgba(255, 255, 255, 0.3)',
  },
  dark: {
    background: '#071224',
    hero: '#0B1B3B',
    heroSoft: '#1D4ED8',
    panel: '#0B162E',
    panelAlt: '#0E1A33',
    textPrimary: '#F8FAFC',
    textMuted: '#C7D2FE',
    surfaceBorder: 'rgba(148, 163, 184, 0.2)',
    accent: '#FFFFFF',
    accentSoft: 'rgba(255, 255, 255, 0.1)',
    crest: 'rgba(255, 255, 255, 0.12)',
    crestBorder: 'rgba(255, 255, 255, 0.24)',
    heroText: '#FFFFFF',
    heroMuted: 'rgba(255, 255, 255, 0.74)',
    heroPillBg: 'rgba(255, 255, 255, 0.12)',
    heroPillBorder: 'rgba(255, 255, 255, 0.24)',
  },
};

const heroHighlights = [
  {
    id: 'routes',
    icon: 'navigate-outline',
    label: 'Map routes ready',
  },
  {
    id: 'access',
    icon: 'shield-checkmark-outline',
    label: 'Guest access enabled',
  },
];

const visitorNotes = [
  'Open directions with one tap',
  'Explore campus services freely',
];

const primaryActions = [
  {
    id: 'search',
    title: 'Search Locations',
    description: 'Find classrooms, offices, labs, and services fast.',
    icon: 'search-outline',
    color: '#1D4ED8',
    route: 'Search',
    cta: 'Start search',
  },
  {
    id: 'map',
    title: 'Campus Map',
    description: 'Navigate with the full campus map in seconds.',
    icon: 'map-outline',
    color: '#0B1B3B',
    route: 'Map',
    cta: 'Open map',
  },
  {
    id: 'favorites',
    title: 'Favorites',
    description: 'Save places you visit often for quick access.',
    icon: 'heart-outline',
    color: '#E11D48',
    route: 'Favorites',
    cta: 'View saved',
  },
  {
    id: 'qr',
    title: 'Scan QR',
    description: 'Open a location instantly from a campus QR code.',
    icon: 'qr-code-outline',
    color: '#0F766E',
    route: 'QRScanner',
    cta: 'Scan now',
  },
];

const secondaryActions = [
  {
    id: 'buildings',
    title: 'Find Buildings',
    description: 'Browse buildings and jump to directions.',
    icon: 'business-outline',
    color: '#1E3A8A',
    route: 'Search',
    params: { mode: 'buildings' },
  },
];

const actionSequence = [...primaryActions, ...secondaryActions];

const GuestHomeScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const [mode, setMode] = useState('light');
  const heroAnim = useRef(new Animated.Value(0)).current;
  const noticeAnim = useRef(new Animated.Value(0)).current;
  const actionAnims = useRef(actionSequence.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const savedMode = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && (savedMode === 'light' || savedMode === 'dark')) {
          setMode(savedMode);
        }
      } catch (error) {
        console.log('GuestHomeScreen theme load error', error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, mode).catch((error) => {
      console.log('GuestHomeScreen theme save error', error);
    });
  }, [mode]);

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.timing(heroAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      Animated.timing(noticeAnim, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.stagger(
        90,
        actionAnims.map((anim) =>
          Animated.timing(anim, {
            toValue: 1,
            duration: 320,
            useNativeDriver: true,
          })
        )
      ),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [actionAnims, heroAnim, noticeAnim]);

  const theme = THEMES[mode] || THEMES.light;
  const heroAnimStyle = {
    opacity: heroAnim,
    transform: [
      {
        translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
      },
    ],
  };
  const noticeAnimStyle = {
    opacity: noticeAnim,
    transform: [
      {
        translateY: noticeAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
      },
    ],
  };

  const getActionAnimStyle = (index) => ({
    opacity: actionAnims[index],
    transform: [
      {
        translateY: actionAnims[index].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }),
      },
    ],
  });

  const handleFeaturePress = (feature) => {
    if (feature.route === 'QRScanner') {
      const parent = navigation.getParent?.();
      if (parent) {
        parent.navigate('QRScanner');
        return;
      }
    }

    navigation.navigate(feature.route, feature.params);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <ScreenWrapper backgroundColor={theme.background} statusBarStyle={mode === 'dark' ? 'light-content' : 'dark-content'}>
      <View style={[styles.bgHalo, { backgroundColor: theme.accentSoft }]} />
      <View style={[styles.bgRing, { borderColor: theme.accentSoft }]} />
      <View style={[styles.bgSweep, { backgroundColor: theme.accentSoft }]} />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View style={[styles.heroCard, { backgroundColor: theme.hero }, heroAnimStyle]}>
          <View style={[styles.heroGlow, { backgroundColor: theme.heroSoft }]} />
          <View style={styles.heroTopRow}>
            <View style={styles.heroBrandRow}>
              <View style={[styles.crestBadge, { backgroundColor: theme.crest, borderColor: theme.crestBorder }]}>
                <Ionicons name="school-outline" size={26} color={theme.heroText} />
              </View>
              <View>
                <Text style={[styles.heroEyebrow, { color: theme.heroMuted }]}>RMU CAMPUS</Text>
                <Text style={[styles.heroTitle, { color: theme.heroText }]}>Guest Access</Text>
              </View>
            </View>
            <View style={styles.heroHeaderActions}>
              <TouchableOpacity
                style={[styles.iconButton, { borderColor: theme.crestBorder }]}
                onPress={() => setMode((current) => (current === 'dark' ? 'light' : 'dark'))}
                activeOpacity={0.85}
              >
                <Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={16} color={theme.heroText} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconButton, { borderColor: theme.crestBorder }]} onPress={handleLogout} activeOpacity={0.85}>
                <Ionicons name="log-out-outline" size={16} color={theme.heroText} />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={[styles.heroSubtext, { color: theme.heroMuted }]}>
            Modern campus guidance for visitors. Navigate, search, and explore services without signing in.
          </Text>

          <View style={styles.heroPills}>
            {heroHighlights.map((item) => (
              <View key={item.id} style={[styles.heroPill, { backgroundColor: theme.heroPillBg, borderColor: theme.heroPillBorder }]}>
                <Ionicons name={item.icon} size={16} color={theme.heroText} />
                <Text style={[styles.heroPillText, { color: theme.heroText }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[styles.noticeCard, { backgroundColor: theme.panel, borderColor: theme.surfaceBorder }, noticeAnimStyle]}>
          <View style={styles.noticeHeader}>
            <Ionicons name="ribbon-outline" size={18} color={theme.accent} />
            <Text style={[styles.noticeTitle, { color: theme.textPrimary }]}>Visitor Orientation</Text>
          </View>
          <Text style={[styles.noticeBody, { color: theme.textMuted }]}>Start with Search to locate a building, then tap a result for directions or the map.</Text>
          <View style={styles.noticeChips}>
            {visitorNotes.map((note) => (
              <View key={note} style={[styles.noticeChip, { backgroundColor: theme.accentSoft, borderColor: theme.surfaceBorder }] }>
                <Text style={[styles.noticeChipText, { color: theme.textPrimary }]}>{note}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={[styles.hoursCard, { backgroundColor: theme.panel, borderColor: theme.surfaceBorder }]}>
          <View style={styles.hoursHeader}>
            <View style={[styles.hoursIconWrap, { backgroundColor: theme.accentSoft, borderColor: theme.surfaceBorder }]}>
              <Ionicons name="time-outline" size={18} color={theme.accent} />
            </View>
            <Text style={[styles.hoursTitle, { color: theme.textPrimary }]}>Working Hours</Text>
          </View>
          <Text style={[styles.hoursBody, { color: theme.textMuted }]}>School working hours are from 9 AM to 4 PM.</Text>
        </View>

        <Text style={[styles.sectionEyebrow, { color: theme.textMuted }]}>Explore</Text>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Quick Actions</Text>
        <View style={styles.primaryGrid}>
          {primaryActions.map((action, index) => (
            <AnimatedTouchable
              key={action.id}
              style={[
                styles.primaryCard,
                { backgroundColor: theme.panel, borderColor: theme.surfaceBorder },
                getActionAnimStyle(index),
              ]}
              onPress={() => handleFeaturePress(action)}
              activeOpacity={0.85}
            >
              <View style={[styles.primaryIcon, { backgroundColor: `${action.color}1F` }]}>
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={[styles.primaryTitle, { color: theme.textPrimary }]}>{action.title}</Text>
              <Text style={[styles.primarySubtitle, { color: theme.textMuted }]}>{action.description}</Text>
              <View style={styles.primaryFooter}>
                <Text style={[styles.primaryCta, { color: action.color }]}>{action.cta}</Text>
                <Ionicons name="arrow-forward" size={16} color={action.color} />
              </View>
            </AnimatedTouchable>
          ))}
        </View>

        <Text style={[styles.sectionEyebrow, { color: theme.textMuted }]}>Tools</Text>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Visitor Utilities</Text>
        <View style={styles.secondaryList}>
          {secondaryActions.map((action, index) => (
            <AnimatedTouchable
              key={action.id}
              style={[
                styles.secondaryCard,
                { backgroundColor: theme.panelAlt, borderColor: theme.surfaceBorder },
                getActionAnimStyle(primaryActions.length + index),
              ]}
              onPress={() => handleFeaturePress(action)}
              activeOpacity={0.85}
            >
              <View style={[styles.secondaryIconWrap, { backgroundColor: `${action.color}1A` }]}>
                <Ionicons name={action.icon} size={22} color={action.color} />
              </View>
              <View style={styles.secondaryTextWrap}>
                <Text style={[styles.secondaryTitle, { color: theme.textPrimary }]}>{action.title}</Text>
                <Text style={[styles.secondarySubtitle, { color: theme.textMuted }]}>{action.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
            </AnimatedTouchable>
          ))}
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  bgHalo: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    top: -120,
    right: -140,
    opacity: 0.6,
  },
  bgRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1,
    top: 140,
    left: -120,
    opacity: 0.5,
  },
  bgSweep: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 48,
    bottom: -60,
    right: -40,
    opacity: 0.25,
  },
  heroCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 18,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroGlow: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    opacity: 0.28,
    top: -60,
    right: -50,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  crestBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroEyebrow: {
    fontSize: 10,
    letterSpacing: 1.8,
    fontWeight: '700',
    textTransform: 'uppercase',
    fontFamily: FONT.heading,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: FONT.display,
    fontWeight: '700',
  },
  heroSubtext: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14,
    fontFamily: FONT.body,
  },
  heroPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    gap: 8,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
  },
  heroPillText: {
    fontSize: 12,
    fontFamily: FONT.heading,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    marginBottom: 18,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  noticeTitle: {
    fontSize: 15,
    fontFamily: FONT.heading,
  },
  noticeBody: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FONT.body,
  },
  noticeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  noticeChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  noticeChipText: {
    fontSize: 11,
    fontFamily: FONT.heading,
  },
  hoursCard: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    marginBottom: 18,
  },
  hoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  hoursIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoursTitle: {
    fontSize: 15,
    fontFamily: FONT.heading,
  },
  hoursBody: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: FONT.body,
  },
  sectionEyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 4,
    fontFamily: FONT.heading,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FONT.display,
    fontWeight: '700',
    marginBottom: 14,
  },
  primaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 18,
    gap: 14,
  },
  primaryCard: {
    width: '47%',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    minHeight: 168,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  primaryIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryTitle: {
    fontSize: 15,
    fontFamily: FONT.heading,
    marginBottom: 6,
  },
  primarySubtitle: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: FONT.body,
  },
  primaryFooter: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  primaryCta: {
    fontSize: 12,
    fontFamily: FONT.heading,
  },
  secondaryList: {
    gap: 12,
    marginBottom: 14,
  },
  secondaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  secondaryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  secondaryTextWrap: {
    flex: 1,
  },
  secondaryTitle: {
    fontSize: 14,
    fontFamily: FONT.heading,
    marginBottom: 4,
  },
  secondarySubtitle: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: FONT.body,
  },
});

export default GuestHomeScreen;
