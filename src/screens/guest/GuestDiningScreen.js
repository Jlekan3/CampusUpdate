import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { supabase } from '../../config/supabase';

// ── Tokens ────────────────────────────────────────────────────────────────────
const NAVY   = '#1A365D';
const GOLD   = '#C5A047';
const SLATE  = '#1E293B';
const MUTED  = '#64748B';
const LIGHT  = '#94A3B8';
const BG     = '#F8F9FA';
const SURFACE= '#FFFFFF';
const BORDER = '#E2E8F0';
const AMBER  = '#D97706';

export default function GuestDiningScreen({ navigation }) {
  const [dining,   setDining]  = useState([]);
  const [loading,  setLoading] = useState(true);
  const [search,   setSearch]  = useState('');

  useEffect(() => {
    supabase
      .from('dining')
      .select('id, name, description, operating_hours, image_url, latitude, longitude')
      .order('name')
      .then(({ data }) => { if (data) setDining(data); })
      .finally(() => setLoading(false));
  }, []);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dining;
    return dining.filter((d) => (d.name + (d.description || '')).toLowerCase().includes(q));
  }, [dining, search]);

  const handleOpenOnMap = useCallback((item) => {
    if (!item.latitude || !item.longitude) return;
    navigation.navigate('GuestTabs', {
      screen: 'Map',
      params: {
        selectedLocation: { id: item.id, name: item.name, latitude: item.latitude, longitude: item.longitude },
        autoRoute: true,
      },
    });
  }, [navigation]);

  return (
    <ScreenWrapper backgroundColor={BG} statusBarStyle="dark-content">
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={SLATE} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerEye}>CAMPUS</Text>
          <Text style={s.headerTitle}>Dining & Cafeterias</Text>
        </View>
        <View style={s.headerBadge}>
          <Ionicons name="restaurant-outline" size={13} color={AMBER} />
          <Text style={[s.headerBadgeText, { color: AMBER }]}>{dining.length} hubs</Text>
        </View>
      </View>

      {/* ── Search ── */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={LIGHT} />
        <TextInput
          style={s.searchInput}
          placeholder="Search dining options…"
          placeholderTextColor={LIGHT}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={LIGHT} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Info strip ── */}
      <View style={s.infoStrip}>
        <Ionicons name="time-outline" size={13} color={AMBER} />
        <Text style={s.infoText}>Campus cafeterias are generally open Mon – Sat · 7 AM – 9 PM</Text>
      </View>

      {/* ── List ── */}
      {loading ? (
        <View style={s.center}><ActivityIndicator color={AMBER} size="large" /></View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="restaurant-outline" size={44} color={LIGHT} />
              <Text style={s.emptyTitle}>No dining options found</Text>
              <Text style={s.emptySub}>{dining.length === 0 ? 'No outlets have been added yet.' : 'Try a different search.'}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={s.card}
              activeOpacity={0.85}
              onPress={() => handleOpenOnMap(item)}
              disabled={!item.latitude || !item.longitude}
            >
              {/* Gold top stripe */}
              <View style={s.cardStripe} />
              <View style={s.cardBody}>
                {/* Icon + Name row */}
                <View style={s.cardTopRow}>
                  <View style={s.cardIconWrap}>
                    <Ionicons name="restaurant-outline" size={20} color={AMBER} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle} numberOfLines={1}>{item.name}</Text>
                    {item.operating_hours ? (
                      <View style={s.hoursRow}>
                        <Ionicons name="time-outline" size={12} color={MUTED} />
                        <Text style={s.hoursText}>{item.operating_hours}</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={s.openBadge}>
                    <View style={s.openDot} />
                    <Text style={s.openText}>Open</Text>
                  </View>
                </View>

                {/* Description */}
                {item.description ? (
                  <Text style={s.cardDesc} numberOfLines={3}>{item.description}</Text>
                ) : null}

                {/* View on Map button */}
                {(item.latitude && item.longitude) ? (
                  <View style={s.mapBtnRow}>
                    <Ionicons name="navigate-outline" size={13} color={NAVY} />
                    <Text style={s.mapBtnText}>View on Map & Get Directions</Text>
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  header:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:         { width: 36, height: 36, borderRadius: 10, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  headerEye:       { fontSize: 10, fontWeight: '700', color: GOLD, letterSpacing: 1.5, textTransform: 'uppercase' },
  headerTitle:     { fontSize: 22, fontWeight: '800', color: SLATE, letterSpacing: -0.3 },
  headerBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFBEB', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#FDE68A' },
  headerBadgeText: { fontSize: 12, fontWeight: '700' },

  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 14, backgroundColor: SURFACE, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: BORDER },
  searchInput: { flex: 1, fontSize: 14, color: SLATE, padding: 0 },

  infoStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 10, marginBottom: 2, backgroundColor: '#FFFBEB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#FDE68A' },
  infoText:  { fontSize: 11, color: '#92400E', flex: 1, lineHeight: 16 },

  list:   { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  empty:  { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle:{ fontSize: 17, fontWeight: '700', color: SLATE },
  emptySub:  { fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: 220 },

  card:        { backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  cardStripe:  { height: 3, backgroundColor: AMBER },
  cardBody:    { padding: 14 },
  cardTopRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  cardIconWrap:{ width: 42, height: 42, borderRadius: 12, backgroundColor: '#FFFBEB', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FDE68A' },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: SLATE, flex: 1, paddingTop: 2 },
  hoursRow:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  hoursText:   { fontSize: 11, color: MUTED },
  openBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 2 },
  openDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  openText:    { fontSize: 10, fontWeight: '700', color: '#059669' },
  cardDesc:    { fontSize: 13, color: MUTED, lineHeight: 19 },
  mapBtnRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#BFDBFE' },
  mapBtnText:  { fontSize: 12, fontWeight: '700', color: NAVY },
});
