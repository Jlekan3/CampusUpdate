import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToUserFavorites,
  subscribeToLocations,
  removeFavorite,
} from '../../services/databaseService';

const FAVORITE_COLOR = '#F43F5E';

const FavoritesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.id || user?.isAnonymous) {
      setFavorites([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const unsubFav = subscribeToUserFavorites(user.id, (items) => {
      setFavorites(items || []);
      setLoading(false);
      setRefreshing(false);
    });

    const unsubLoc = subscribeToLocations(setLocations);

    return () => {
      try {
        unsubFav?.();
        unsubLoc?.();
      } catch (error) {
        // ignore
      }
    };
  }, [user?.id]);

  const locationMap = useMemo(() => {
    return (locations || []).reduce((acc, loc) => {
      if (loc?.id) acc[loc.id] = loc;
      return acc;
    }, {});
  }, [locations]);

  const savedPlaces = useMemo(() => {
    return favorites
      .map((fav) => {
        const location = locationMap[fav.locationId];
        if (!location) return null;

        return {
          favouriteId: fav.id,
          locationId: fav.locationId,
          name: location.name || location.names || 'Campus location',
          description: location.description || location.building || location.type || 'Saved campus location',
          location,
        };
      })
      .filter(Boolean);
  }, [favorites, locationMap]);

  const handleOpen = (item) => {
    navigation.navigate('LocationDetails', {
      id: item.locationId,
      location: item.location,
    });
  };

  const handleRemove = (item) => {
    Alert.alert('Remove favorite', `Remove "${item.name}" from your favorites?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeFavorite(item.favouriteId).catch((error) => {
            Alert.alert('Error', error?.message || 'Could not remove favorite.');
          });
        },
      },
    ]);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  if (!user?.id || user?.isAnonymous) {
    return (
      <ScreenWrapper backgroundColor="#F3F8FF" statusBarStyle="dark-content">
        <View style={styles.container}>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Favorites</Text>
            <Text style={styles.heroSubtitle}>Sign in to save and access your favourite campus places.</Text>
          </View>
          <View style={styles.emptyStateCard}>
            <Ionicons name="heart-outline" size={40} color="#C5A047" />
            <Text style={styles.emptyTitle}>Sign in required</Text>
            <Text style={styles.emptyText}>
              Favorites are available to registered students and staff. Create an account or log in to start saving places.
            </Text>
          </View>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper backgroundColor="#F3F8FF" statusBarStyle="dark-content">
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroTitle}>Favorites</Text>
              <Text style={styles.heroSubtitle}>
                Your saved places for quick access across campus.
              </Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="heart" size={20} color={COLORS.white} />
            </View>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIconWrap}>
            <Ionicons name="heart" size={20} color={FAVORITE_COLOR} />
          </View>
          <View style={styles.summaryTextWrap}>
            <Text style={styles.summaryTitle}>Saved places</Text>
            <Text style={styles.summarySubtitle}>Tap the heart on any location to save it here.</Text>
          </View>
          <View style={styles.summaryCountPill}>
            <Text style={styles.summaryCountText}>{savedPlaces.length}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={FAVORITE_COLOR} />
          </View>
        ) : (
          <FlatList
            data={savedPlaces}
            keyExtractor={(item) => item.favouriteId}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={FAVORITE_COLOR} />
            }
            contentContainerStyle={savedPlaces.length === 0 ? styles.emptyContainer : styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <View style={styles.itemAccent} />
                <View style={styles.itemBody}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemIconWrap}>
                      <Ionicons name="location" size={18} color={FAVORITE_COLOR} />
                    </View>
                    <View style={styles.itemTextWrap}>
                      <Text style={styles.itemTitle}>{item.name}</Text>
                      <Text style={styles.itemSubtitle} numberOfLines={2}>
                        {item.description}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRemove(item)}
                      style={styles.removeButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="heart" size={22} color={FAVORITE_COLOR} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.openButton}
                    activeOpacity={0.8}
                    onPress={() => handleOpen(item)}
                  >
                    <Text style={styles.openButtonText}>View details</Text>
                    <Ionicons name="chevron-forward" size={16} color={FAVORITE_COLOR} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyStateCard}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="heart-outline" size={34} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyTitle}>No favorites yet</Text>
                <Text style={styles.emptyText}>
                  Open a location and tap the heart icon to save it for quick access.
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionButton}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Map')}
                >
                  <Ionicons name="map-outline" size={16} color={COLORS.white} />
                  <Text style={styles.emptyActionText}>Explore map</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12, paddingHorizontal: 20 },
  heroCard: {
    backgroundColor: FAVORITE_COLOR,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  heroGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    top: -70,
    right: -45,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.92)',
    maxWidth: 280,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryTextWrap: { flex: 1 },
  summaryTitle: { fontSize: 15, fontWeight: '800', color: COLORS.dark },
  summarySubtitle: { marginTop: 2, fontSize: 12, color: '#64748B', lineHeight: 17 },
  summaryCountPill: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 10,
    backgroundColor: '#FFE4E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCountText: { color: FAVORITE_COLOR, fontSize: 14, fontWeight: '800' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 20 },
  item: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  itemAccent: { width: 6, backgroundColor: FAVORITE_COLOR },
  itemBody: { flex: 1, padding: 14 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF1F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  itemTextWrap: { flex: 1, paddingRight: 8 },
  itemTitle: { fontWeight: '800', color: COLORS.dark, fontSize: 15 },
  itemSubtitle: { marginTop: 4, color: '#64748B', fontSize: 12, lineHeight: 18 },
  removeButton: { padding: 4 },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 12,
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#F9A8D4',
  },
  openButtonText: { color: FAVORITE_COLOR, fontSize: 12, fontWeight: '800' },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', paddingBottom: 18 },
  emptyStateCard: {
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#FFE4E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: COLORS.dark },
  emptyText: {
    marginTop: 6,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    fontSize: 13,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: FAVORITE_COLOR,
  },
  emptyActionText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
});

export default FavoritesScreen;
