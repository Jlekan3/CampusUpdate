import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../context/AuthContext';
import { COLORS, USER_ROLES } from '../../utils/constants';
import { subscribeToLocations, subscribeToBuildings } from '../../services/databaseService';
import CustomButton from '../../components/CustomButton';

const STORAGE_KEY = 'guest-dashboard-mode';

const GUEST_SEARCH_THEMES = {
  light: {
    background: COLORS.light,
    card: COLORS.white,
    cardBorder: 'rgba(37, 99, 235, 0.14)',
    textPrimary: COLORS.dark,
    textMuted: COLORS.muted,
    divider: '#E0E7FF',
    emptyBackground: '#EFF6FF',
    emptyBorder: 'rgba(37, 99, 235, 0.10)',
  },
  dark: {
    background: '#0F172A',
    card: '#1E293B',
    cardBorder: 'rgba(96, 165, 250, 0.18)',
    textPrimary: '#F8FAFC',
    textMuted: '#94A3B8',
    divider: 'rgba(96, 165, 250, 0.2)',
    emptyBackground: '#0C1929',
    emptyBorder: 'rgba(96, 165, 250, 0.2)',
  },
};

const SearchLocationsScreen = ({ navigation, route }) => {
  const { userRole } = useAuth();
  const initialMode = route?.params?.mode === 'buildings' ? 'buildings' : 'locations';
  const [mode, setMode] = useState(initialMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState([]);
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guestThemeMode, setGuestThemeMode] = useState('light');

  const isGuest = userRole === USER_ROLES.GUEST;
  const guestTheme = GUEST_SEARCH_THEMES[guestThemeMode] || GUEST_SEARCH_THEMES.light;
  const isGuestDark = isGuest && guestThemeMode === 'dark';
  const mutedTextColor = isGuest ? guestTheme.textMuted : COLORS.muted;

  useEffect(() => {
    const paramMode = route?.params?.mode === 'buildings' ? 'buildings' : 'locations';
    setMode(paramMode);
  }, [route?.params?.mode]);

  useEffect(() => {
    if (!isGuest) return undefined;
    let isMounted = true;

    const loadGuestTheme = async () => {
      try {
        const savedMode = await AsyncStorage.getItem(STORAGE_KEY);
        if (isMounted && (savedMode === 'light' || savedMode === 'dark')) {
          setGuestThemeMode(savedMode);
        }
      } catch (error) {
        console.log('SearchLocationsScreen theme load error', error);
      }
    };

    loadGuestTheme();
    const unsubscribe = navigation?.addListener?.('focus', loadGuestTheme);

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isGuest, navigation]);

   useEffect(() => {
    // Subscribe to Firestore based on current mode
    setLoading(true);
    let unsubscribe;

    if (mode === 'buildings') {
      unsubscribe = subscribeToBuildings((items) => {
        setLocations(items || []);
        setLoading(false);
      });
    } else {
      unsubscribe = subscribeToLocations((items) => {
        setLocations(items || []);
        setLoading(false);
      });
    }

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [mode]);

  useEffect(() => {
    const initialQuery = route?.params?.initialQuery;
    if (typeof initialQuery === 'string' && initialQuery.trim()) {
      setSearchQuery(initialQuery.trim());
    }
  }, [route?.params?.initialQuery]);

  // Filter locations based on search query
  useEffect(() => {
    // Buildings mode: show all buildings when search is empty, filter by name/description when typed
    if (mode === 'buildings') {
      if (!searchQuery.trim()) {
        setFilteredLocations(locations);
        return;
      }

      const query = searchQuery.trim().toLowerCase();
      const results = locations.filter((building) => {
        const name = (building.name || '').toLowerCase();
        const description = (building.description || '').toLowerCase();
        return name.includes(query) || description.includes(query);
      });

      setFilteredLocations(results);
      return;
    }

    // Default locations mode: keep existing exact+partial search behaviour
    if (!searchQuery.trim()) {
      setFilteredLocations([]);
    } else {
      const query = searchQuery.trim().toLowerCase();
      // First try to find exact matches on key fields
      const exactMatches = locations.filter((location) => {
        const name = (location.name || location.names || '').toLowerCase();
        const building = (location.building || '').toLowerCase();
        const type = (location.type || location.category || '').toLowerCase();

        return (
          (name && name === query) ||
          (building && building === query) ||
          (type && type === query)
        );
      });

      if (exactMatches.length > 0) {
        setFilteredLocations(exactMatches);
        return;
      }

      // Otherwise fall back to broader "contains" search
      const partialMatches = locations.filter((location) => {
        const name = (location.name || location.names || '').toLowerCase();
        const building = (location.building || '').toLowerCase();
        const description = (location.description || '').toLowerCase();
        const type = (location.type || location.category || '').toLowerCase();

        return (
          name.includes(query) ||
          building.includes(query) ||
          description.includes(query) ||
          type.includes(query)
        );
      });

      setFilteredLocations(partialMatches);
    }
  }, [searchQuery, locations, mode]);

  const handleLocationPress = (location) => {
    navigation.navigate('LocationDetails', {
      id: location?.id,
      returnTo: 'Search',
      returnParams: {
        mode,
        initialQuery: searchQuery,
      },
    });
  };

  const handleGetDirections = (item) => {
    const latitude =
      (item.coordinates && typeof item.coordinates.latitude === 'number'
        ? item.coordinates.latitude
        : item.latitude);
    const longitude =
      (item.coordinates && typeof item.coordinates.longitude === 'number'
        ? item.coordinates.longitude
        : item.longitude);

    let selectedLocation = null;

    // If we have valid coordinates, pass them to center the map on this building.
    if (typeof latitude === 'number' && typeof longitude === 'number') {
      selectedLocation = {
        id: item.id,
        name: item.name || item.names,
        latitude,
        longitude,
      };
    } else {
      // No coordinates yet — still open the campus map, just without a specific marker.
      Alert.alert('Note', 'This building has no saved coordinates yet. Showing campus map.');
    }

    const state = navigation.getState?.();
    const routeNames = state?.routeNames || [];

    // 1) If the current navigator has a direct Map route (guest tabs), use it.
    if (routeNames.includes('Map')) {
      navigation.navigate('Map', { selectedLocation });
      return;
    }

    // 2) If we're in the student stack, delegate to the StudentTabs Map.
    if (routeNames.includes('StudentTabs')) {
      navigation.navigate('StudentTabs', {
        screen: 'Map',
        params: { selectedLocation },
      });
      return;
    }

    // 3) If we're in the guest stack (above the tabs), delegate to GuestTabs Map.
    if (routeNames.includes('GuestTabs')) {
      navigation.navigate('GuestTabs', {
        screen: 'Map',
        params: { selectedLocation },
      });
      return;
    }

    // 4) Fallback: try a plain Map navigate.
    navigation.navigate('Map', { selectedLocation });
  };

  const renderListHeader = () => null;

  const renderLocationItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.resultCard,
        isGuest && { backgroundColor: guestTheme.card, borderColor: guestTheme.cardBorder },
      ]}
      onPress={() => handleLocationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.resultHeader}>
        <View style={styles.iconContainer}>
          <Ionicons 
            name={mode === 'buildings' ? 'business-outline' : (item.icon || 'location-outline')} 
            size={24} 
            color={COLORS.primary} 
          />
        </View>
        <View style={styles.resultContent}>
          <Text style={[styles.resultTitle, isGuest && { color: guestTheme.textPrimary }]}>{item.name || item.names}</Text>
          {(mode === 'buildings' || item.building || item.category || item.type) && (
            <Text style={[styles.resultSubtitle, isGuest && { color: guestTheme.textMuted }]}>
              {mode === 'buildings' ? 'Building' : (item.building || item.category || item.type)}
              {mode !== 'buildings' && item.floor ? ` - ${item.floor}` : ''}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={mutedTextColor} />
      </View>

      {item.description && (
        <Text style={[styles.resultDescription, isGuest && { color: guestTheme.textMuted }]} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={[styles.resultMeta, isGuest && { borderTopColor: guestTheme.divider }]}>
        {item.coordinates && (
          <View style={styles.metaItem}>
            <Ionicons name="location-outline" size={14} color={mutedTextColor} />
            <Text style={[styles.resultMetaText, isGuest && { color: guestTheme.textMuted }]}>
              {`${item.coordinates.latitude?.toFixed(4)}, ${item.coordinates.longitude?.toFixed(4)}`}
            </Text>
          </View>
        )}
        {(item.type || item.category) && (
          <View style={styles.metaItem}>
            <Ionicons name="information-circle-outline" size={14} color={mutedTextColor} />
            <Text style={[styles.resultMetaText, isGuest && { color: guestTheme.textMuted }]}>{item.type || item.category}</Text>
          </View>
        )}
      </View>

      {mode === 'buildings' && (
        <View style={{ marginTop: 10 }}>
          <CustomButton
            title="Get Directions"
            onPress={() => handleGetDirections(item)}
            variant="outline"
          />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (loading) {
      return (
        <View style={[
          styles.emptyContainer,
          isGuest && { backgroundColor: guestTheme.emptyBackground, borderColor: guestTheme.emptyBorder },
        ]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.emptyText, isGuest && { color: guestTheme.textMuted }]}>Loading locations...</Text>
        </View>
      );
    }

    if (!searchQuery.trim() && mode !== 'buildings') {
      return (
        <View style={[
          styles.emptyContainer,
          isGuest && { backgroundColor: guestTheme.emptyBackground, borderColor: guestTheme.emptyBorder },
        ]}>
          <Ionicons name="search-outline" size={64} color={mutedTextColor} />
          <Text style={[styles.emptyTitle, isGuest && { color: guestTheme.textPrimary }]}>Search Locations</Text>
          <Text style={[styles.emptySubtext, isGuest && { color: guestTheme.textMuted }]}>
            Enter a location name or building to get started
          </Text>
        </View>
      );
    }

    return (
      <View style={[
        styles.emptyContainer,
        isGuest && { backgroundColor: guestTheme.emptyBackground, borderColor: guestTheme.emptyBorder },
      ]}>
        <Ionicons name="close-circle-outline" size={64} color={mutedTextColor} />
        <Text style={[styles.emptyTitle, isGuest && { color: guestTheme.textPrimary }]}>No Results Found</Text>
        <Text style={[styles.emptySubtext, isGuest && { color: guestTheme.textMuted }]}>
          Try searching with different keywords
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, isGuest && { backgroundColor: guestTheme.background }]}
    >
      <ScreenWrapper
        backgroundColor={isGuest ? guestTheme.background : COLORS.light}
        statusBarStyle={isGuestDark ? 'light-content' : 'dark-content'}
      >
        <View style={styles.contentWrapper}>
          <View style={[
            styles.heroHeader,
            mode === 'buildings' ? styles.heroHeaderOrange : styles.heroHeaderPurple,
          ]}>
            <View style={[
              styles.heroGlow,
              mode === 'buildings' ? styles.heroGlowOrange : styles.heroGlowPurple,
            ]} />

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            </TouchableOpacity>

            <View style={styles.headerTextWrapper}>
              <Text style={styles.headerTitle}>{mode === 'buildings' ? 'Find Buildings' : 'Search Locations'}</Text>
              <Text style={styles.headerSubtitle}>
                {mode === 'buildings'
                  ? 'Browse and search campus buildings.'
                  : 'Quickly find classrooms, offices, and key facilities.'}
              </Text>
            </View>

            <View style={[
              styles.headerIconBadge,
              mode === 'buildings' ? styles.headerIconBadgeOrange : styles.headerIconBadgePurple,
            ]}>
              <Ionicons name={mode === 'buildings' ? 'business-outline' : 'search-outline'} size={24} color={COLORS.white} />
            </View>
          </View>

          <View
            style={[
              styles.searchCard,
              isGuest && { backgroundColor: guestTheme.card, borderColor: guestTheme.cardBorder },
            ]}
          >
            <View style={[
              styles.searchContainer,
              isGuestDark
                ? (mode === 'buildings' ? styles.searchContainerDarkOrange : styles.searchContainerDarkPurple)
                : (mode === 'buildings' ? styles.searchContainerOrange : styles.searchContainerPurple),
            ]}>
              <Ionicons name="search-outline" size={20} color={mode === 'buildings' ? '#1E40AF' : '#2563EB'} />
              <TextInput
                style={[styles.searchInput, isGuest && { color: guestTheme.textPrimary }]}
                  placeholder={mode === 'buildings' ? 'Search by building name...' : 'Search by name or building...'}
                placeholderTextColor={isGuest ? guestTheme.textMuted : COLORS.muted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close-circle" size={20} color={mode === 'buildings' ? '#1E40AF' : '#2563EB'} />
                </TouchableOpacity>
              )}
            </View>

            {searchQuery.trim() && !loading && (
              <View style={styles.resultsInfo}>
                <Text style={[
                  styles.resultsInfoText,
                  mode === 'buildings' ? styles.resultsInfoTextOrange : styles.resultsInfoTextPurple,
                ]}>
                  {filteredLocations.length}
                  {filteredLocations.length === 1 ? ' result' : ' results'} found
                </Text>
              </View>
            )}

            <FlatList
              data={filteredLocations}
              keyExtractor={(item) => item.id}
              renderItem={renderLocationItem}
              ListEmptyComponent={renderEmptyState}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator
              persistentScrollbar
              indicatorStyle={isGuestDark ? 'white' : 'default'}
              scrollIndicatorInsets={{ right: 1 }}
              style={styles.resultsList}
            />
          </View>
        </View>
      </ScreenWrapper>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    padding: 16,
    marginBottom: 18,
    overflow: 'hidden',
  },
  heroHeaderPurple: {
    backgroundColor: COLORS.primary,
  },
  heroHeaderOrange: {
    backgroundColor: COLORS.primary,
  },
  heroGlow: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    top: -40,
    right: -40,
  },
  heroGlowPurple: {
    backgroundColor: 'rgba(37, 99, 235, 0.42)',
  },
  heroGlowOrange: {
    backgroundColor: 'rgba(3, 105, 161, 0.42)',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(88, 28, 135, 0.28)',
  },
  headerTextWrapper: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  headerIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconBadgePurple: {
    backgroundColor: 'rgba(88, 28, 135, 0.46)',
  },
  headerIconBadgeOrange: {
    backgroundColor: 'rgba(154, 52, 18, 0.42)',
  },
  searchCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    shadowColor: '#1E40AF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.14)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    marginBottom: 12,
    height: 46,
    borderWidth: 1,
  },
  searchContainerPurple: {
    backgroundColor: COLORS.white,
    borderColor: 'rgba(0,0,0,0)',
  },
  searchContainerOrange: {
    backgroundColor: COLORS.white,
    borderColor: 'rgba(0,0,0,0)',
  },
  searchContainerDarkPurple: {
    backgroundColor: COLORS.primary + '22',
    borderColor: 'rgba(0,0,0,0.12)',
  },
  searchContainerDarkOrange: {
    backgroundColor: COLORS.primary + '22',
    borderColor: 'rgba(0,0,0,0.12)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.dark,
  },
  resultsInfo: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  resultsInfoText: {
    fontSize: 13,
    fontWeight: '500',
  },
  resultsInfoTextPurple: {
    color: '#1E40AF',
  },
  resultsInfoTextOrange: {
    color: '#0369A1',
  },
  resultsList: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
    paddingRight: 6,
  },
  resultCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.14)',
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  resultDescription: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 16,
    marginBottom: 8,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  resultMetaText: {
    fontSize: 12,
    color: COLORS.muted,
    marginLeft: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.10)',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.muted,
    fontWeight: '500',
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 20,
  },
});

export default SearchLocationsScreen;
