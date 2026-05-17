import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import CustomButton from '../../components/CustomButton';
import { COLORS } from '../../utils/constants';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

const LocationDetailsScreen = ({ navigation, route }) => {
  // Get location from route params, with fallback to mock data
  const defaultLocation = {
    name: "Engineering Block - Lecture Hall A",
    type: "classroom",
    building: "Engineering Block",
    floor: "2nd Floor",
    description: "Main lecture hall for engineering students. Equipped with modern AV systems, air conditioning, and capacity for 200 students.",
    openingHours: {
      weekdays: "7:00 AM - 10:00 PM",
      weekends: "8:00 AM - 6:00 PM"
    },
    features: ["Air Conditioned", "Projector", "WiFi", "Wheelchair Accessible", "Power Outlets"]
  };

  const routeLocation = route?.params?.location;
  const routeId = route?.params?.id;
  const returnTo = route?.params?.returnTo;
  const returnParams = route?.params?.returnParams;
  const isBuildingsMode = route?.params?.mode === 'buildings' || returnParams?.mode === 'buildings';
  const accentColor = isBuildingsMode ? '#EA580C' : '#7C3AED';
  const accentDark = isBuildingsMode ? '#C2410C' : '#5B21B6';
  const accentSoft = isBuildingsMode ? '#FFF7ED' : '#FAF5FF';
  const accentBorder = isBuildingsMode ? 'rgba(249, 115, 22, 0.16)' : 'rgba(124, 58, 237, 0.12)';
  const headerColor = isBuildingsMode ? '#EA580C' : '#6D28D9';
  const headerGlowColor = isBuildingsMode ? 'rgba(251, 146, 60, 0.42)' : 'rgba(168, 85, 247, 0.42)';
  const backButtonColor = isBuildingsMode ? 'rgba(154, 52, 18, 0.3)' : 'rgba(88, 28, 135, 0.3)';

  const [location, setLocation] = useState(routeLocation || null);
  const [loading, setLoading] = useState(Boolean(routeId) && !routeLocation);

  useEffect(() => {
    let cancelled = false;

    const fetchLocationById = async (id) => {
      setLoading(true);
      try {
        const ref = doc(db, 'locations', id);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          if (!cancelled) {
            setLocation(null);
            Alert.alert('Not found', 'This location was not found in the database.');
          }
          return;
        }

        const data = snap.data() || {};
        const normalized = {
          id: snap.id,
          ...data,
          name: data.name || data.names || data.title || 'Location',
          names: data.names || data.name || data.title || 'Location',
          type: data.type || data.category,
          category: data.category || data.type,
          coordinates: data.coordinates || {
            latitude: data.latitude,
            longitude: data.longitude,
          },
        };

        if (!cancelled) setLocation(normalized);
      } catch (e) {
        console.log('LocationDetailsScreen: error loading location', e);
        if (!cancelled) {
          setLocation(null);
          Alert.alert('Error', 'Unable to load this location right now.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (routeLocation) {
      setLocation(routeLocation);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    if (routeId) {
      fetchLocationById(routeId);
      return () => {
        cancelled = true;
      };
    }

    setLocation(null);
    setLoading(false);
    return () => {
      cancelled = true;
    };
  }, [routeId, routeLocation]);

  const resolvedLocation = location || defaultLocation;

  const mapLocation = useMemo(() => {
    if (!resolvedLocation?.coordinates) return null;

    const latitude = resolvedLocation.coordinates.latitude;
    const longitude = resolvedLocation.coordinates.longitude;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;

    return {
      id: resolvedLocation.id,
      name: resolvedLocation.name || resolvedLocation.names || 'Location',
      latitude,
      longitude,
    };
  }, [resolvedLocation]);

  const handleOpenMap = () => {
    if (!mapLocation) {
      Alert.alert('Unavailable', 'This location does not have valid coordinates.');
      return;
    }

    const state = navigation.getState?.();
    const routeNames = state?.routeNames || [];

    if (routeNames.includes('StudentTabs')) {
      navigation.navigate('StudentTabs', {
        screen: 'Map',
        params: {
          selectedLocation: mapLocation,
        },
      });
      return;
    }

    if (routeNames.includes('GuestTabs')) {
      navigation.navigate('GuestTabs', {
        screen: 'Map',
        params: {
          selectedLocation: mapLocation,
        },
      });
      return;
    }

    navigation.navigate('Map', { selectedLocation: mapLocation });
  };

  const handleBack = () => {
    if (returnTo === 'Search') {
      const state = navigation.getState?.();
      const routeNames = state?.routeNames || [];

      if (routeNames.includes('GuestTabs')) {
        navigation.navigate('GuestTabs', {
          screen: 'Search',
          params: returnParams,
        });
        return;
      }

      navigation.navigate('Search', returnParams);
      return;
    }

    navigation.goBack();
  };

  return (
    <ScreenWrapper backgroundColor={COLORS.light} statusBarStyle="dark-content">
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading location...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero header */}
          <View style={styles.headerWrapper}>
            <View style={[styles.header, { backgroundColor: headerColor }]}>
              <View style={[styles.headerGlow, { backgroundColor: headerGlowColor }]} />
              <TouchableOpacity
                onPress={handleBack}
                style={[styles.backButton, { backgroundColor: backButtonColor }]}
              >
                <Ionicons name="arrow-back" size={22} color={COLORS.white} />
              </TouchableOpacity>

              <View style={styles.imagePlaceholder}>
                <Ionicons name="business" size={42} color={accentColor} />
              </View>
            </View>
          </View>

          {/* Location card */}
          <View style={styles.content}>
            <View style={styles.titleRow}>
              <View style={styles.titleLeft}>
                {resolvedLocation.type && (
                  <View style={[styles.typeBadge, { backgroundColor: accentSoft, borderColor: accentBorder }]}>
                    <Text style={[styles.typeText, { color: accentColor }]}>{resolvedLocation.type.toUpperCase()}</Text>
                  </View>
                )}
                <Text style={styles.locationName}>{resolvedLocation.name || "Location"}</Text>
              </View>
            </View>

            {resolvedLocation.building && (
              <View style={styles.detailRow}>
                <Ionicons name="business-outline" size={18} color={isBuildingsMode ? accentColor : '#6B7280'} />
                <Text style={styles.detailText}>{resolvedLocation.building}</Text>
              </View>
            )}

            {resolvedLocation.floor && (
              <View style={styles.detailRow}>
                <Ionicons name="layers-outline" size={18} color={isBuildingsMode ? accentColor : '#6B7280'} />
                <Text style={styles.detailText}>{resolvedLocation.floor}</Text>
              </View>
            )}

            {resolvedLocation.coordinates && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={18} color={isBuildingsMode ? accentColor : '#6B7280'} />
                <Text style={styles.detailText}>
                  {`${resolvedLocation.coordinates.latitude?.toFixed(4)}, ${resolvedLocation.coordinates.longitude?.toFixed(4)}`}
                </Text>
              </View>
            )}

            {/* Description */}
            {resolvedLocation.description && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: accentDark }]}>Description</Text>
                <Text style={styles.descriptionText}>{resolvedLocation.description}</Text>
              </View>
            )}

            {/* Opening Hours */}
            {resolvedLocation.openingHours && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: accentDark }]}>Opening Hours</Text>
                <View style={[styles.hoursContainer, { backgroundColor: accentSoft, borderColor: accentBorder }]}>
                  {resolvedLocation.openingHours.weekdays && (
                    <View style={styles.hoursRow}>
                      <Text style={[styles.hoursDay, { color: accentDark }]}>Weekdays</Text>
                      <Text style={[styles.hoursTime, { color: accentColor }]}>{resolvedLocation.openingHours.weekdays}</Text>
                    </View>
                  )}
                  {resolvedLocation.openingHours.weekends && (
                    <View style={styles.hoursRow}>
                      <Text style={[styles.hoursDay, { color: accentDark }]}>Weekends</Text>
                      <Text style={[styles.hoursTime, { color: accentColor }]}>{resolvedLocation.openingHours.weekends}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Features */}
            {resolvedLocation.features && resolvedLocation.features.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: accentDark }]}>Features & Amenities</Text>
                <View style={styles.featuresGrid}>
                  {resolvedLocation.features.map((feature, index) => (
                    <View key={index} style={[styles.featureTag, { backgroundColor: accentSoft, borderColor: accentBorder }]}>
                      <Ionicons name="checkmark-circle" size={16} color={accentColor} />
                      <Text style={[styles.featureText, { color: accentDark }]}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              <CustomButton
                title="Get Directions"
                onPress={handleOpenMap}
                variant="primary"
                icon={<Ionicons name="navigate" size={20} color={COLORS.white} />}
                style={[styles.actionButton, { backgroundColor: accentColor }]}
              />
              <CustomButton
                title="View on Map"
                onPress={handleOpenMap}
                variant="outline"
                icon={<Ionicons name="map" size={20} color={accentColor} />}
                style={[styles.actionButtonOutline, { backgroundColor: accentSoft, borderColor: accentBorder }]}
                textStyle={[styles.actionButtonOutlineText, { color: accentColor }]}
              />
            </View>
          </View>
        </ScrollView>
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.muted,
    fontSize: 14,
    fontWeight: '500',
  },
  headerWrapper: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  header: {
    height: 140,
    borderRadius: 24,
    paddingTop: 48,
    paddingHorizontal: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  headerGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    top: -40,
    right: -40,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 14,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 24,
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    marginTop: -28,
    marginHorizontal: 20,
    padding: 18,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.12)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleLeft: {
    flex: 1,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 6,
    borderWidth: 1,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  section: {
    marginTop: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5B21B6',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#4C1D95',
    lineHeight: 22,
  },
  hoursContainer: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.10)',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  hoursDay: {
    fontSize: 14,
    fontWeight: '500',
    color: '#5B21B6',
  },
  hoursTime: {
    fontSize: 14,
    color: '#7C3AED',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  featureTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.10)',
  },
  featureText: {
    fontSize: 13,
    color: '#4C1D95',
    marginLeft: 6,
  },
  actions: {
    marginTop: 26,
    marginBottom: 4,
    gap: 12,
  },
  actionButton: {
    width: '100%',
    borderRadius: 14,
  },
  actionButtonOutline: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.24)',
  },
  actionButtonOutlineText: {
    color: '#7C3AED',
  },
});

export default LocationDetailsScreen;