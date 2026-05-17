import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { COLORS } from '../../utils/constants';
import { subscribeToDining } from '../../services/databaseService';
import { useNavigation } from '@react-navigation/native';

const mockDiningOptions = [
  {
    id: '1',
    name: 'Main Cafeteria',
    type: 'Cafeteria',
    location: 'Student Center, Level 2',
    hours: '7:00 AM - 8:00 PM',
    icon: 'restaurant-outline',
    rating: 4.2,
    phone: '+1 (234) 567-8901',
    cuisine: 'Diverse cuisines',
    description: 'The main cafeteria offers a wide variety of food options including vegetarian, vegan, and international cuisines. It features multiple serving stations and comfortable seating areas.',
  },
  {
    id: '2',
    name: 'Coffee Corner',
    type: 'Cafe',
    location: 'Library Entrance',
    hours: '7:00 AM - 6:00 PM',
    icon: 'cafe-outline',
    rating: 4.5,
    phone: '+1 (234) 567-8902',
    cuisine: 'Coffee & Pastries',
    description: 'Cozy cafe serving artisan coffee, espresso drinks, pastries, and light snacks. Perfect for studying or casual meetings with friends.',
  },
  {
    id: '3',
    name: 'Express Food Court',
    type: 'Food Court',
    location: 'Student Center, Ground Floor',
    hours: '11:00 AM - 9:00 PM',
    icon: 'fast-food-outline',
    rating: 3.8,
    phone: '+1 (234) 567-8903',
    cuisine: 'Fast Food & Casual',
    description: 'Quick service food court with multiple vendors offering pizza, burgers, Asian cuisine, salads, and more. Great for quick lunch or dinner.',
  },
  {
    id: '4',
    name: 'Dining Commons',
    type: 'Restaurant',
    location: 'Residential Area',
    hours: '6:00 AM - 10:00 PM',
    icon: 'utensils-outline',
    rating: 4.3,
    phone: '+1 (234) 567-8904',
    cuisine: 'Multi-cuisine',
    description: 'Full-service dining hall with all-you-can-eat options available. Spacious seating, themed dinners, and nutritionist-approved meal plans available.',
  },
];

const diningFilters = ['All', 'Cafeteria', 'Cafe', 'Food Court', 'Restaurant'];

const DiningScreen = () => {
  const navigation = useNavigation();
  const [diningOptions, setDiningOptions] = useState(mockDiningOptions);
  const [selectedDining, setSelectedDining] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToDining((items) => {
      if (Array.isArray(items) && items.length > 0) {
        setDiningOptions(items);
      } else {
        setDiningOptions(mockDiningOptions);
      }
    });

    return () => {
      try {
        unsubscribe && unsubscribe();
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, []);

  const handleViewDetails = (item) => {
    setSelectedDining(item);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedDining(null);
  };

  const handleGetDirections = (item) => {
    const latitude = item.coordinates?.latitude ?? item.latitude;
    const longitude = item.coordinates?.longitude ?? item.longitude;

    const selectedLocation =
      typeof latitude === 'number' && typeof longitude === 'number'
        ? {
            id: item.id,
            name: item.name || item.location || 'Dining Location',
            latitude,
            longitude,
          }
        : null;

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
  };

  const filteredDiningOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const filter = selectedFilter.toLowerCase();

    return diningOptions.filter((item) => {
      const fields = [item.name, item.type, item.location, item.hours, item.cuisine, item.description]
        .map((value) => (value || '').toString().toLowerCase());

      const matchesQuery = !query || fields.some((value) => value.includes(query));
      const matchesFilter = filter === 'all' || (item.type || '').toString().toLowerCase() === filter;

      return matchesQuery && matchesFilter;
    });
  }, [diningOptions, searchQuery, selectedFilter]);

  const renderDiningCard = ({ item }) => (
    <TouchableOpacity style={styles.card} activeOpacity={0.86} onPress={() => handleViewDetails(item)}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIconWrap}>
          <View style={styles.iconContainer}>
            <Ionicons name={item.icon} size={24} color={COLORS.primary} />
          </View>
          <View style={styles.iconAccentDot} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardType}>{item.type}</Text>
        </View>
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={14} color="#F59E0B" />
          <Text style={styles.ratingText}>{item.rating}</Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detail}>
          <Ionicons name="location-outline" size={16} color={COLORS.muted} />
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
        <View style={styles.detail}>
          <Ionicons name="time-outline" size={16} color={COLORS.muted} />
          <Text style={styles.detailText}>{item.hours}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.cardFooterText}>Tap for menu, contact, and directions</Text>
        <View style={styles.viewButton}>
          <Text style={styles.viewButtonText}>View Details</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable showsVerticalScrollIndicator>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroEyebrow}>Campus Dining</Text>
            <Text style={styles.headerTitle}>Dining Options</Text>
            <Text style={styles.headerSubtitle}>Find dining facilities, hours, and contact details on campus.</Text>
          </View>
          <View style={styles.heroIconWrap}>
            <Ionicons name="restaurant" size={26} color={COLORS.white} />
          </View>
        </View>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatPill}>
            <Ionicons name="list-outline" size={14} color={COLORS.white} />
            <Text style={styles.heroStatText}>{filteredDiningOptions.length} spots</Text>
          </View>
          <View style={styles.heroStatPillSecondary}>
            <Ionicons name="sparkles-outline" size={14} color={COLORS.primary} />
            <Text style={styles.heroStatTextSecondary}>Quick browse</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={COLORS.muted} style={styles.searchIcon} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search dining options..."
          placeholderTextColor={COLORS.muted}
          style={styles.searchInput}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton} activeOpacity={0.8}>
            <Ionicons name="close-circle" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.dropdownSection}>
        <Text style={styles.dropdownLabel}>Category</Text>
        <TouchableOpacity
          style={styles.dropdownTrigger}
          onPress={() => setShowFilterDropdown((current) => !current)}
          activeOpacity={0.85}
        >
          <View style={styles.dropdownTriggerContent}>
            <View style={styles.dropdownIconWrap}>
              <Ionicons name="grid-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.dropdownTextWrap}>
              <Text style={styles.dropdownValueLabel}>Selected category</Text>
              <Text style={styles.dropdownValue}>{selectedFilter}</Text>
            </View>
          </View>
          <Ionicons
            name={showFilterDropdown ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.primary}
          />
        </TouchableOpacity>

        {showFilterDropdown && (
          <View style={styles.dropdownMenu}>
            {diningFilters.map((filter) => {
              const isActive = selectedFilter === filter;

              return (
                <TouchableOpacity
                  key={filter}
                  style={[styles.dropdownOption, isActive && styles.dropdownOptionActive]}
                  onPress={() => {
                    setSelectedFilter(filter);
                    setShowFilterDropdown(false);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.dropdownOptionText, isActive && styles.dropdownOptionTextActive]}>
                    {filter}
                  </Text>
                  {isActive ? <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <FlatList
        data={filteredDiningOptions}
        renderItem={renderDiningCard}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="restaurant-outline" size={48} color={COLORS.muted} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No matching dining options' : 'No dining options yet'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try a different keyword or clear the search.' : 'Dining options will appear here when available.'}
            </Text>
          </View>
        }
      />

      <Modal visible={showDetailModal} animationType="slide" transparent={false} onRequestClose={closeDetailModal}>
        <ScreenWrapper backgroundColor="#F3F8FF" statusBarStyle="dark-content">
          <ScrollView style={styles.detailContainer} showsVerticalScrollIndicator={false}>
            {selectedDining && (
              <View style={styles.detailContent}>
                <View style={styles.detailTopBar}>
                  <TouchableOpacity style={styles.detailCloseButton} onPress={closeDetailModal} activeOpacity={0.85}>
                    <Ionicons name="close" size={20} color={COLORS.dark} />
                  </TouchableOpacity>
                  <Text style={styles.detailHeaderTitle}>Dining Details</Text>
                  <View style={styles.detailCloseSpacer} />
                </View>

                <View style={styles.detailHeroCard}>
                  <View style={styles.detailIconSection}>
                    <View style={styles.detailIconContainer}>
                      <Ionicons name={selectedDining.icon} size={40} color={COLORS.white} />
                    </View>
                    <View style={styles.detailRatingSection}>
                      <Text style={styles.detailName}>{selectedDining.name}</Text>
                      <Text style={styles.detailType}>{selectedDining.type}</Text>
                      <View style={styles.detailRating}>
                        <Ionicons name="star" size={18} color="#FDB022" />
                        <Text style={styles.detailRatingValue}>{selectedDining.rating}</Text>
                        <Text style={styles.detailRatingMeta}>Visitor rating</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailHeroMetaRow}>
                    <View style={styles.detailHeroMetaPill}>
                      <Ionicons name="time-outline" size={14} color={COLORS.white} />
                      <Text style={styles.detailHeroMetaText}>{selectedDining.hours}</Text>
                    </View>
                    <View style={styles.detailHeroMetaPillSecondary}>
                      <Ionicons name="location-outline" size={14} color={COLORS.primary} />
                      <Text style={styles.detailHeroMetaTextSecondary} numberOfLines={1}>
                        {selectedDining.location}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.detailSectionGrid}>
                  <View style={styles.detailInfoCard}>
                    <View style={styles.detailInfoRow}>
                      <Ionicons name="folder-outline" size={20} color={COLORS.primary} />
                      <View style={styles.detailInfoText}>
                        <Text style={styles.detailInfoLabel}>Type</Text>
                        <Text style={styles.detailInfoValue}>{selectedDining.type}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailInfoCard}>
                    <View style={styles.detailInfoRow}>
                      <Ionicons name="location-outline" size={20} color={COLORS.primary} />
                      <View style={styles.detailInfoText}>
                        <Text style={styles.detailInfoLabel}>Location</Text>
                        <Text style={styles.detailInfoValue}>{selectedDining.location}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailInfoCard}>
                    <View style={styles.detailInfoRow}>
                      <Ionicons name="time-outline" size={20} color={COLORS.primary} />
                      <View style={styles.detailInfoText}>
                        <Text style={styles.detailInfoLabel}>Hours</Text>
                        <Text style={styles.detailInfoValue}>{selectedDining.hours}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailInfoCard}>
                    <View style={styles.detailInfoRow}>
                      <Ionicons name="call-outline" size={20} color={COLORS.primary} />
                      <View style={styles.detailInfoText}>
                        <Text style={styles.detailInfoLabel}>Phone</Text>
                        <Text style={styles.detailInfoValue}>{selectedDining.phone}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailInfoCard}>
                    <View style={styles.detailInfoRow}>
                      <Ionicons name="restaurant-outline" size={20} color={COLORS.primary} />
                      <View style={styles.detailInfoText}>
                        <Text style={styles.detailInfoLabel}>Cuisine</Text>
                        <Text style={styles.detailInfoValue}>{selectedDining.cuisine}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.detailDescriptionCard}>
                  <Text style={styles.detailDescriptionTitle}>About</Text>
                  <Text style={styles.detailDescriptionText}>{selectedDining.description}</Text>
                </View>

                <TouchableOpacity
                  style={styles.directionsButton}
                  onPress={() => handleGetDirections(selectedDining)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="navigate-outline" size={18} color={COLORS.white} />
                  <Text style={styles.directionsButtonText}>Get Directions</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </ScreenWrapper>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.dark,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  dropdownSection: {
    marginBottom: 16,
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  dropdownTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownTextWrap: {
    flex: 1,
  },
  dropdownValueLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  dropdownValue: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
  },
  dropdownMenu: {
    marginTop: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  dropdownOptionActive: {
    backgroundColor: '#EEF4FF',
  },
  dropdownOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  dropdownOptionTextActive: {
    color: COLORS.primary,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  cardType: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    color: '#92400E',
  },
  cardDetails: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.muted,
    marginLeft: 8,
  },
  viewButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  detailContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  detailHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  detailContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  detailIconSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    gap: 16,
  },
  detailIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  detailRatingSection: {
    flex: 1,
  },
  detailName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 8,
  },
  detailRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailRatingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FDB022',
  },
  detailInfoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailInfoText: {
    flex: 1,
  },
  detailInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  detailInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  detailDescriptionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  detailDescriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 12,
  },
  detailDescriptionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  directionsButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
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
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EEF9',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  cardIconWrap: {
    position: 'relative',
    marginRight: 12,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconAccentDot: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34D399',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    color: '#92400E',
  },
  cardDetails: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F7',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardFooterText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.muted,
  },
  viewButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewButtonText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
  detailContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  detailTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 14,
  },
  detailCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  detailCloseSpacer: {
    width: 38,
    height: 38,
  },
  detailHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
  },
  detailContent: {
    paddingBottom: 30,
  },
  detailHeroCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 18,
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  detailIconSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  detailIconContainer: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  detailRatingSection: {
    flex: 1,
  },
  detailName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 4,
  },
  detailType: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  detailRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  detailRatingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FDB022',
  },
  detailRatingMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
    fontWeight: '600',
  },
  detailHeroMetaRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  detailHeroMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  detailHeroMetaPillSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    flexShrink: 1,
  },
  detailHeroMetaText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  detailHeroMetaTextSecondary: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    maxWidth: 220,
  },
  detailSectionGrid: {
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  detailInfoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EEF9',
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailInfoText: {
    flex: 1,
  },
  detailInfoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  detailInfoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.dark,
    lineHeight: 22,
  },
  detailDescriptionCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EEF9',
  },
  detailDescriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 10,
  },
  detailDescriptionText: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 22,
  },
  directionsButton: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  directionsButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});

export default DiningScreen;
