import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToUserFavorites,
  subscribeToLocations,
  removeFavorite,
} from '../../services/databaseService';

const NAVY = '#1A365D';
const GOLD = '#C5A047';
const BG   = '#F8F9FA';
const RED  = '#E11D48';

export default function FavoritesScreen({ navigation }) {
  const { user } = useAuth();
  const [favorites,   setFavorites]   = useState([]);
  const [locations,   setLocations]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);

  useEffect(() => {
    if (!user?.id || user?.isAnonymous) { setFavorites([]); setLoading(false); return; }
    setLoading(true);
    const unsubFav = subscribeToUserFavorites(user.id, (items) => {
      setFavorites(items || []); setLoading(false); setRefreshing(false);
    });
    const unsubLoc = subscribeToLocations(setLocations);
    return () => { try { unsubFav?.(); unsubLoc?.(); } catch (_) {} };
  }, [user?.id]);

  const locationMap = useMemo(
    () => (locations || []).reduce((acc, loc) => { if (loc?.id) acc[loc.id] = loc; return acc; }, {}),
    [locations]
  );

  const savedPlaces = useMemo(() =>
    favorites.map((fav) => {
      const loc = locationMap[fav.locationId];
      if (!loc) return null;
      return { favouriteId: fav.id, locationId: fav.locationId, name: loc.name || 'Campus location', description: loc.description || loc.building || '', location: loc };
    }).filter(Boolean),
    [favorites, locationMap]
  );

  const handleRemove = (item) => {
    Alert.alert('Remove Favourite', `Remove "${item.name}" from favourites?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFavorite(item.favouriteId).catch(() => {}) },
    ]);
  };

  const handleOpen = (item) => navigation.navigate('LocationDetails', { id: item.locationId, location: item.location });

  const canGoBack = navigation?.canGoBack?.();

  // ── Not signed in ──────────────────────────────────────────────────────────
  if (!user?.id || user?.isAnonymous) {
    return (
      <ScreenWrapper backgroundColor={BG} statusBarStyle="light-content">
        <View style={styles.header}>
          <View style={styles.headerGoldBar} />
          <View style={styles.headerContent}>
            {canGoBack && (
              <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.headerEyebrow}>CAMPUS</Text>
              <Text style={styles.headerTitle}>Favourites</Text>
            </View>
            <View style={styles.headerIcon}><Ionicons name="heart" size={24} color={GOLD} /></View>
          </View>
          <Text style={styles.headerSub}>Your saved campus places for quick access.</Text>
        </View>
        <View style={styles.emptyBlock}>
          <View style={styles.emptyIconWrap}><Ionicons name="heart-outline" size={44} color={GOLD} /></View>
          <Text style={styles.emptyTitle}>Sign in required</Text>
          <Text style={styles.emptySub}>Favourites are available to registered students and staff. Log in to save places.</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper backgroundColor={BG} statusBarStyle="light-content">
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerGoldBar} />
        <View style={styles.headerContent}>
          {canGoBack && (
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>CAMPUS</Text>
            <Text style={styles.headerTitle}>Favourites</Text>
          </View>
          <View style={styles.headerIcon}><Ionicons name="heart" size={24} color={GOLD} /></View>
        </View>
        <Text style={styles.headerSub}>Your saved campus places for quick access.</Text>
      </View>

      {/* ── Count banner ── */}
      <View style={styles.countBar}>
        <Ionicons name="bookmark-outline" size={16} color={NAVY} />
        <Text style={styles.countText}>
          {savedPlaces.length} saved {savedPlaces.length === 1 ? 'place' : 'places'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={GOLD} />
        </View>
      ) : (
        <FlatList
          data={savedPlaces}
          keyExtractor={(item) => item.favouriteId}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 600); }} tintColor={GOLD} />}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardGoldBar} />
              <View style={styles.cardBody}>
                <View style={styles.cardRow}>
                  <View style={styles.cardIconWrap}>
                    <Ionicons name="location" size={20} color={RED} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.cardSub} numberOfLines={2}>{item.description}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRemove(item)} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="heart" size={22} color={RED} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.viewBtn} onPress={() => handleOpen(item)} activeOpacity={0.85}>
                  <Text style={styles.viewBtnText}>View details</Text>
                  <Ionicons name="arrow-forward" size={14} color={NAVY} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyBlock}>
              <View style={styles.emptyIconWrap}><Ionicons name="heart-outline" size={44} color={GOLD} /></View>
              <Text style={styles.emptyTitle}>No favourites yet</Text>
              <Text style={styles.emptySub}>Open a location and tap the heart icon to save it here.</Text>
              <TouchableOpacity style={styles.exploreBtn} onPress={() => navigation.navigate('Map')} activeOpacity={0.85}>
                <Ionicons name="map-outline" size={16} color="#fff" />
                <Text style={styles.exploreBtnText}>Explore Campus Map</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header:          { backgroundColor: NAVY, paddingTop: 52, paddingBottom: 22, paddingHorizontal: 20 },
  headerGoldBar:   { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: GOLD },
  headerContent:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  backBtn:         { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  headerEyebrow:   { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: GOLD, textTransform: 'uppercase' },
  headerTitle:     { fontSize: 26, fontWeight: '800', color: '#fff' },
  headerSub:       { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  headerIcon:      { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(197,160,71,0.18)', justifyContent: 'center', alignItems: 'center' },

  countBar:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: 'rgba(26,54,93,0.08)' },
  countText:  { fontSize: 14, fontWeight: '700', color: NAVY },
  loadingWrap:{ flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:       { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },

  card:         { backgroundColor: '#fff', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(26,54,93,0.08)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  cardGoldBar:  { height: 3, backgroundColor: GOLD },
  cardBody:     { padding: 14 },
  cardRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  cardIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF0F3', justifyContent: 'center', alignItems: 'center' },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: '#2D3748', marginBottom: 4 },
  cardSub:      { fontSize: 12, color: '#718096', lineHeight: 17 },
  removeBtn:    { padding: 4 },
  viewBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: '#EDF1F8' },
  viewBtnText:  { fontSize: 13, fontWeight: '700', color: NAVY },

  emptyBlock:   { flex: 1, alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 12 },
  emptyIconWrap:{ width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(197,160,71,0.12)', justifyContent: 'center', alignItems: 'center' },
  emptyTitle:   { fontSize: 20, fontWeight: '800', color: '#2D3748' },
  emptySub:     { fontSize: 13, color: '#718096', textAlign: 'center', lineHeight: 19 },
  exploreBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, backgroundColor: NAVY, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  exploreBtnText:{ fontSize: 14, fontWeight: '700', color: '#fff' },
});
