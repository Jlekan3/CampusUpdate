import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { COLORS } from '../../utils/constants';
import { subscribeToAmenities } from '../../services/databaseService';
import { useNavigation } from '@react-navigation/native';

const AmenitiesScreen = () => {
  const navigation = useNavigation();
  const [amenities, setAmenities] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const openDirections = (item) => {
    const latitude =
      item.coordinates?.latitude ??
      (typeof item.location === 'object' ? item.location?.latitude : undefined);
    const longitude =
      item.coordinates?.longitude ??
      (typeof item.location === 'object' ? item.location?.longitude : undefined);

    if (typeof latitude === 'number' && typeof longitude === 'number') {
      const selectedLocation = {
        id: item.id,
        name: item.name || 'Amenity',
        latitude,
        longitude,
      };

      const state = navigation.getState?.();
      const routeNames = state?.routeNames || [];

      if (routeNames.includes('Map')) {
        navigation.navigate('Map', { selectedLocation });
        return;
      }

      if (routeNames.includes('StudentTabs')) {
        navigation.navigate('StudentTabs', {
          screen: 'Map',
          params: { selectedLocation },
        });
        return;
      }

      if (routeNames.includes('GuestTabs')) {
        navigation.navigate('GuestTabs', {
          screen: 'Map',
          params: { selectedLocation },
        });
        return;
      }

      navigation.navigate('Map', { selectedLocation });
      return;
    }

    const query = encodeURIComponent([item.name, item.description].filter(Boolean).join(' '));

    if (Platform.OS === 'web') {
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
      return;
    }

    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const filteredAmenities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return amenities;

    return amenities.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const description = (item.description || '').toLowerCase();
      const iconName = (item.icon_name || '').toLowerCase();

      return name.includes(query) || description.includes(query) || iconName.includes(query);
    });
  }, [amenities, searchQuery]);

  const visibleCount = filteredAmenities.length;

  useEffect(() => {
    console.log('AmenitiesScreen: Setting up subscription to amenities...');
    const unsubscribe = subscribeToAmenities((items) => {
      console.log('AmenitiesScreen: Received amenities snapshot, count:', items?.length || 0);
      setAmenities(items || []);
    });

    return () => {
      console.log('AmenitiesScreen: Cleaning up subscription');
      try {
        unsubscribe && unsubscribe();
      } catch (e) {
        console.error('AmenitiesScreen: Error during cleanup:', e);
      }
    };
  }, []);

  const renderAmenityCard = (item) => (
    <TouchableOpacity key={item.id} style={styles.amenityCard} onPress={() => openDirections(item)} activeOpacity={0.85}>
      <View style={styles.amenityCardTopRow}>
        <View style={styles.amenityIconContainer}>
          <Ionicons name={item.icon_name || 'fitness-outline'} size={24} color={COLORS.primary} />
        </View>
        <View style={styles.amenityBadge}>
          <Ionicons name="navigate-outline" size={12} color={COLORS.primary} />
          <Text style={styles.amenityBadgeText}>Open</Text>
        </View>
      </View>
      <Text style={styles.amenityTitle}>{item.name || 'Unnamed Amenity'}</Text>
      <Text style={styles.amenityDescription}>{item.description || 'No description available'}</Text>
      <View style={styles.directionHintRow}>
        <Ionicons name="navigate-outline" size={14} color={COLORS.primary} />
        <Text style={styles.directionHintText}>Get directions</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable showsVerticalScrollIndicator>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroEyebrow}>Student Dashboard</Text>
            <Text style={styles.headerTitle}>Campus Amenities</Text>
            <Text style={styles.headerSubtitle}>Explore facilities, services, and spaces across campus.</Text>
          </View>
          <View style={styles.heroIconWrap}>
            <Ionicons name="fitness-outline" size={26} color={COLORS.white} />
          </View>
        </View>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatPill}>
            <Ionicons name="grid-outline" size={14} color={COLORS.white} />
            <Text style={styles.heroStatText}>{amenities.length} total</Text>
          </View>
          <View style={styles.heroStatPillSecondary}>
            <Ionicons name="search-outline" size={14} color={COLORS.primary} />
            <Text style={styles.heroStatTextSecondary}>{visibleCount} visible</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color={COLORS.muted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search amenities..."
            placeholderTextColor={COLORS.muted}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchButton}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.searchMetaRow}>
          <Text style={styles.searchMetaText}>
            {searchQuery ? 'Filtered results' : 'Browse campus spaces'}
          </Text>
          <Text style={styles.searchMetaCount}>{visibleCount} shown</Text>
        </View>
      </View>

      <View style={styles.amenitiesGrid}>
        {filteredAmenities.length > 0 ? (
          filteredAmenities.map((item) => renderAmenityCard(item))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="fitness-outline" size={48} color={COLORS.muted} />
            <Text style={styles.emptyStateTitle}>
              {searchQuery ? 'No matching amenities' : 'No Amenities Yet'}
            </Text>
            <Text style={styles.emptyStateText}>
              {searchQuery
                ? 'Try a different keyword or clear the search.'
                : 'Amenities will be added by administrators soon.'}
            </Text>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#1E293B',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 6,
    lineHeight: 20,
  },
  heroIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  heroStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroStatPillSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.white,
  },
  heroStatText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  heroStatTextSecondary: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.dark,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchMetaText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
  },
  searchMetaCount: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  amenityCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EEF9',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  amenityCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amenityIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amenityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF4FF',
  },
  amenityBadgeText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '700',
  },
  amenityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 6,
  },
  amenityDescription: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: 12,
  },
  directionHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  directionHintText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

export default AmenitiesScreen;
