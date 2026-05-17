import React, { useMemo, useState } from 'react';
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

const mockAmenities = [
  {
    id: '1',
    name: 'Football Park',
    icon: 'football-outline',
    description: 'Full-sized football field',
  },
  {
    id: '2',
    name: 'Basketball Court',
    icon: 'basketball-outline',
    description: 'Indoor and outdoor courts',
  },
  {
    id: '3',
    name: 'Study Spaces',
    icon: 'library-outline',
    description: 'Quiet and collaborative areas',
  },
  {
    id: '4',
    name: 'Volleyball Court',
    icon: 'volleyball-outline',
    description: 'Sand and indoor courts',
  },
  {
    id: '5',
    name: 'Pool',
    icon: 'water-outline',
    description: 'Olympic-size swimming pool',
  },
  {
    id: '6',
    name: 'Parking',
    icon: 'car-outline',
    description: 'Student and visitor parking',
  },
];

const DiningAndAmenitiesScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('dining');
  const [selectedDining, setSelectedDining] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  const openDirections = (item) => {
    const latitude = item.coordinates?.latitude ?? item.latitude;
    const longitude = item.coordinates?.longitude ?? item.longitude;

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
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;

    if (Platform.OS === 'web') {
      window.open(mapsUrl, '_blank');
      return;
    }

    Linking.openURL(mapsUrl);
  };

  const filteredDiningOptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return mockDiningOptions;

    return mockDiningOptions.filter((item) => {
      const fields = [item.name, item.type, item.location, item.hours, item.cuisine, item.description]
        .map((value) => (value || '').toString().toLowerCase());

      return fields.some((value) => value.includes(query));
    });
  }, [searchQuery]);

  const renderDiningCard = ({ item }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon} size={24} color={COLORS.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          <Text style={styles.cardType}>{item.type}</Text>
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

      <TouchableOpacity style={styles.viewButton} onPress={() => handleViewDetails(item)}>
        <Text style={styles.viewButtonText}>View Details</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderAmenityCard = ({ item }) => (
    <TouchableOpacity style={styles.amenityCard} onPress={() => openDirections(item)} activeOpacity={0.85}>
      <View style={styles.amenityIconContainer}>
        <Ionicons name={item.icon} size={28} color={COLORS.primary} />
      </View>
      <Text style={styles.amenityTitle}>{item.name}</Text>
      <Text style={styles.amenityDescription}>{item.description}</Text>
      <View style={styles.directionHintRow}>
        <Ionicons name="navigate-outline" size={14} color={COLORS.primary} />
        <Text style={styles.directionHintText}>Get directions</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dining & Amenities</Text>
        <Text style={styles.headerSubtitle}>Find what you need on campus</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dining' && styles.tabActive]}
          onPress={() => setActiveTab('dining')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'dining' && styles.tabTextActive,
            ]}
          >
            Dining
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'amenities' && styles.tabActive]}
          onPress={() => setActiveTab('amenities')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'amenities' && styles.tabTextActive,
            ]}
          >
            Amenities
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'dining' ? (
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
      ) : null}

      <ScrollView showsVerticalScrollIndicator={true}>
        {activeTab === 'dining' ? (
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
        ) : (
          <View style={styles.amenitiesGrid}>
            {mockAmenities.map((item) => (
              <View key={item.id} style={styles.amenityColumn}>
                {renderAmenityCard({ item })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Dining Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={false}
        onRequestClose={closeDetailModal}
      >
        <ScreenWrapper backgroundColor="#1e40af" statusBarStyle="light-content">
          <ScrollView style={styles.detailContainer} showsVerticalScrollIndicator={false}>
            {/* Detail Header */}
            <View style={styles.detailHeader}>
              <TouchableOpacity onPress={closeDetailModal}>
                <Ionicons name="close" size={28} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.detailHeaderTitle}>Details</Text>
              <View style={{ width: 28 }} />
            </View>

            {selectedDining && (
              <View style={styles.detailContent}>
                {/* Icon and Rating */}
                <View style={styles.detailIconSection}>
                  <View style={styles.detailIconContainer}>
                    <Ionicons name={selectedDining.icon} size={48} color={COLORS.white} />
                  </View>
                  <View style={styles.detailRatingSection}>
                    <Text style={styles.detailName}>{selectedDining.name}</Text>
                    <View style={styles.detailRating}>
                      <Ionicons name="star" size={18} color="#FDB022" />
                      <Text style={styles.detailRatingValue}>{selectedDining.rating}</Text>
                    </View>
                  </View>
                </View>

                {/* Detail Information Cards */}
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

                {/* Description */}
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
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.muted,
  },
  tabTextActive: {
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
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  amenityColumn: {
    width: '48%',
    marginBottom: 12,
  },
  amenityCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  amenityIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: COLORS.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  amenityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    textAlign: 'center',
    marginBottom: 4,
  },
  amenityDescription: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 8,
  },
  directionHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  directionHintText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  /* Detail Modal Styles */
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
});

export default DiningAndAmenitiesScreen;
