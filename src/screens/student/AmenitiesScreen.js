import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { subscribeToAmenities } from '../../services/databaseService';

const NAVY  = '#1A365D';
const GOLD  = '#C5A047';
const BG    = '#F8F9FA';

const CATEGORY_COLORS = {
  Sports:      { color: '#059669', icon: 'football-outline'     },
  Library:     { color: '#2563EB', icon: 'library-outline'      },
  Health:      { color: '#E53E3E', icon: 'medkit-outline'        },
  IT:          { color: '#7C3AED', icon: 'laptop-outline'        },
  Recreation:  { color: '#D97706', icon: 'bicycle-outline'       },
  Default:     { color: NAVY,      icon: 'star-outline'          },
};

const getCat = (item) => {
  const cat = (item.category || item.type || '').trim();
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.Default;
};

const MOCK = [
  { id: '1', name: 'Sports Complex',   category: 'Sports',     description: 'Full-size gym, basketball courts and pool.',      operating_hours: '6AM – 10PM', latitude: 5.6502, longitude: -0.1862 },
  { id: '2', name: 'Main Library',     category: 'Library',    description: 'Over 50,000 volumes, silent study zones, Wi-Fi.', operating_hours: '8AM – 8PM',  latitude: 5.6505, longitude: -0.1858 },
  { id: '3', name: 'Health Centre',    category: 'Health',     description: 'On-campus clinic staffed by qualified nurses.',    operating_hours: '9AM – 4PM',  latitude: 5.6499, longitude: -0.1865 },
  { id: '4', name: 'IT Resource Lab',  category: 'IT',         description: '120 computers with internet and printing.',        operating_hours: '8AM – 8PM',  latitude: 5.6507, longitude: -0.1855 },
];

export default function AmenitiesScreen({ navigation }) {
  const [amenities, setAmenities] = useState([]);
  const [search,    setSearch]    = useState('');

  useEffect(() => {
    const unsub = subscribeToAmenities((data) => setAmenities(data?.length ? data : MOCK));
    return () => { try { unsub?.(); } catch (_) {} };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return amenities;
    return amenities.filter((i) =>
      [i.name, i.category, i.type, i.description].some((v) => (v || '').toLowerCase().includes(q))
    );
  }, [amenities, search]);

  const handleDirections = (item) => {
    const lat = item.latitude ?? item.coordinates?.latitude;
    const lng = item.longitude ?? item.coordinates?.longitude;
    if (typeof lat === 'number' && typeof lng === 'number') {
      const loc = { id: item.id, name: item.name, latitude: lat, longitude: lng };
      try { navigation.navigate('Map', { selectedLocation: loc }); } catch (_) {}
    }
  };

  const canGoBack = navigation?.canGoBack?.();

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
            <Text style={styles.headerTitle}>Amenities</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="fitness-outline" size={24} color={GOLD} />
          </View>
        </View>
        <Text style={styles.headerSub}>Sports, libraries, health and campus facilities.</Text>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={GOLD} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search amenities…"
            placeholderTextColor="#A0AEC0"
            value={search}
            onChangeText={setSearch}
          />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color="#A0AEC0" /></TouchableOpacity> : null}
        </View>
      </View>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const cfg = getCat(item);
          const hasCoords = typeof (item.latitude ?? item.coordinates?.latitude) === 'number';
          return (
            <View style={styles.card}>
              <View style={styles.cardGoldBar} />
              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <View style={[styles.cardIconWrap, { backgroundColor: `${cfg.color}14` }]}>
                    <Ionicons name={item.icon_name || cfg.icon} size={22} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    <View style={[styles.catBadge, { backgroundColor: `${cfg.color}14` }]}>
                      <Text style={[styles.catBadgeText, { color: cfg.color }]}>{item.category || item.type || 'Facility'}</Text>
                    </View>
                  </View>
                </View>

                {item.description ? <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text> : null}

                <View style={styles.cardFooter}>
                  {item.operating_hours ? (
                    <View style={styles.hoursRow}>
                      <Ionicons name="time-outline" size={13} color="#718096" />
                      <Text style={styles.hoursText}>{item.operating_hours}</Text>
                    </View>
                  ) : <View />}
                  {hasCoords && (
                    <TouchableOpacity style={styles.directionsBtn} onPress={() => handleDirections(item)} activeOpacity={0.85}>
                      <Ionicons name="navigate-outline" size={14} color={NAVY} />
                      <Text style={styles.directionsBtnText}>Directions</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={36} color={GOLD} />
            <Text style={styles.emptyText}>No amenities found</Text>
          </View>
        }
      />
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

  searchWrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  searchBar:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(26,54,93,0.10)' },
  searchInput:{ flex: 1, fontSize: 14, color: '#2D3748', padding: 0 },

  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  card: { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(26,54,93,0.08)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  cardGoldBar:  { height: 3, backgroundColor: GOLD },
  cardBody:     { padding: 14 },
  cardTopRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  cardIconWrap: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardName:     { fontSize: 15, fontWeight: '700', color: '#2D3748', marginBottom: 5 },
  catBadge:     { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catBadgeText: { fontSize: 11, fontWeight: '700' },
  cardDesc:     { fontSize: 12, color: '#718096', lineHeight: 17, marginBottom: 12 },
  cardFooter:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hoursRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  hoursText:    { fontSize: 12, color: '#718096' },
  directionsBtn:{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#EDF1F8' },
  directionsBtnText:{ fontSize: 12, fontWeight: '700', color: NAVY },

  empty:     { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 14, color: '#718096' },
});
