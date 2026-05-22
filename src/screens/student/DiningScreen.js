import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { subscribeToDining } from '../../services/databaseService';

// ── Tokens ────────────────────────────────────────────────────────────────────
const NAVY   = '#1A365D';
const GOLD   = '#C5A047';
const GOLD_S = 'rgba(197,160,71,0.10)';
const BG     = '#F8FAFC';
const SURFACE= '#FFFFFF';
const SLATE  = '#1E293B';
const MUTED  = '#64748B';
const LIGHT  = '#94A3B8';
const BORDER = '#E2E8F0';

const MOCK = [
  { id: '1', name: 'Main Cafeteria',     type: 'Cafeteria',   location: 'Student Center, Level 2', hours: '7:00 AM – 8:00 PM', icon: 'restaurant-outline', description: 'Wide variety of local and international cuisines with multiple serving stations.' },
  { id: '2', name: 'Coffee Corner',      type: 'Cafe',        location: 'Library Entrance',         hours: '7:00 AM – 6:00 PM', icon: 'cafe-outline',       description: 'Artisan coffee, pastries, and light snacks. Perfect for studying.' },
  { id: '3', name: 'Express Food Court', type: 'Food Court',  location: 'Student Center, GF',       hours: '11:00 AM – 9:00 PM',icon: 'fast-food-outline', description: 'Multiple vendors offering pizza, burgers, Asian cuisine and salads.' },
  { id: '4', name: 'Dining Commons',     type: 'Restaurant',  location: 'Residential Area',         hours: '6:00 AM – 10:00 PM',icon: 'restaurant-outline', description: 'Full-service restaurant serving breakfast, lunch, and dinner daily.' },
];

const TYPE_CFG = {
  Cafeteria:    { color: NAVY,      bg: '#EDF1F8',  border: 'rgba(26,54,93,0.18)' },
  Cafe:         { color: '#D97706', bg: '#FEF3C7',  border: '#FDE68A' },
  'Food Court': { color: '#7C3AED', bg: '#EDE9FE',  border: '#DDD6FE' },
  Restaurant:   { color: '#059669', bg: '#D1FAE5',  border: '#A7F3D0' },
};

// ── Checks if a place is open based on its hours string ──────────────────────
const isOpenNow = (hoursStr) => {
  if (!hoursStr) return null;
  try {
    const now = new Date();
    const cur = now.getHours() * 60 + now.getMinutes();
    const match = hoursStr.match(/(\d+):(\d+)\s*(AM|PM).*?(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return null;
    const toMins = (h, m, period) => {
      let hr = parseInt(h);
      if (period.toUpperCase() === 'PM' && hr !== 12) hr += 12;
      if (period.toUpperCase() === 'AM' && hr === 12) hr = 0;
      return hr * 60 + parseInt(m);
    };
    const open  = toMins(match[1], match[2], match[3]);
    const close = toMins(match[4], match[5], match[6]);
    return cur >= open && cur < close;
  } catch (_) { return null; }
};

// ── Dining card ───────────────────────────────────────────────────────────────
function DiningCard({ item, onPress }) {
  const tc     = TYPE_CFG[item.type] || { color: NAVY, bg: '#EDF1F8', border: BORDER };
  const open   = isOpenNow(item.hours || item.operating_hours);

  return (
    <TouchableOpacity style={st.card} onPress={onPress} activeOpacity={0.87}>
      <View style={[st.cardAccent, { backgroundColor: tc.color }]} />
      <View style={st.cardBody}>
        {/* Top row */}
        <View style={st.cardTopRow}>
          <View style={[st.cardIconWrap, { backgroundColor: tc.color + '16' }]}>
            <Ionicons name={item.icon || 'restaurant-outline'} size={22} color={tc.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.cardName} numberOfLines={1}>{item.name}</Text>
            <View style={[st.typeBadge, { backgroundColor: tc.bg, borderColor: tc.border }]}>
              <Text style={[st.typeBadgeText, { color: tc.color }]}>{item.type}</Text>
            </View>
          </View>
          {/* Open/Closed status */}
          {open !== null && (
            <View style={[st.statusBadge, open ? st.statusOpen : st.statusClosed]}>
              <View style={[st.statusDot, { backgroundColor: open ? '#10B981' : LIGHT }]} />
              <Text style={[st.statusText, { color: open ? '#059669' : MUTED }]}>
                {open ? 'Open Now' : 'Closed'}
              </Text>
            </View>
          )}
        </View>

        {/* Meta rows */}
        <View style={st.metaBlock}>
          {item.location && (
            <View style={st.metaRow}>
              <Ionicons name="location-outline" size={12} color={LIGHT} />
              <Text style={st.metaText}>{item.location}</Text>
            </View>
          )}
          {(item.hours || item.operating_hours) && (
            <View style={st.metaRow}>
              <Ionicons name="time-outline" size={12} color={LIGHT} />
              <Text style={st.metaText}>{item.hours || item.operating_hours}</Text>
            </View>
          )}
        </View>

        {/* Description preview */}
        {item.description ? (
          <Text style={st.cardDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}

        {/* Footer */}
        <View style={st.cardFooter}>
          <View style={st.viewDetailRow}>
            <Text style={st.viewDetailText}>View details</Text>
            <Ionicons name="chevron-forward" size={13} color={GOLD} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function DiningScreen({ navigation }) {
  const [items,    setItems]    = useState([]);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const unsub = subscribeToDining((data) => {
      setItems(data?.length ? data : MOCK);
    });
    return () => { try { unsub?.(); } catch (_) {} };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      [i.name, i.type, i.location, i.description].some((v) => (v || '').toLowerCase().includes(q))
    );
  }, [items, search]);

  const openCount = useMemo(() => items.filter((i) => isOpenNow(i.hours || i.operating_hours) === true).length, [items]);

  const canGoBack = navigation?.canGoBack?.();

  return (
    <ScreenWrapper backgroundColor={BG} statusBarStyle="light-content">
      {/* ── Header ── */}
      <View style={st.header}>
        <View style={st.headerGoldBar} />
        <View style={st.headerContent}>
          {canGoBack && (
            <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={st.headerEyebrow}>CAMPUS</Text>
            <Text style={st.headerTitle}>Dining</Text>
          </View>
          <View style={st.headerIconWrap}>
            <Ionicons name="restaurant-outline" size={22} color={GOLD} />
          </View>
        </View>
        <Text style={st.headerSub}>
          {openCount > 0
            ? `${openCount} location${openCount > 1 ? 's' : ''} open right now`
            : 'Campus cafeterias, cafés and dining facilities'}
        </Text>
      </View>

      {/* ── Hours info strip ── */}
      <View style={st.infoStrip}>
        <Ionicons name="time-outline" size={13} color={GOLD} />
        <Text style={st.infoText}>General hours: Mon – Sat · 7 AM – 9 PM</Text>
      </View>

      {/* ── Search ── */}
      <View style={st.searchWrap}>
        <Ionicons name="search-outline" size={16} color={LIGHT} />
        <TextInput
          style={st.searchInput}
          placeholder="Search dining, cafés…"
          placeholderTextColor={LIGHT}
          value={search}
          onChangeText={setSearch}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={LIGHT} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* ── Section label ── */}
      <View style={st.sectionHeader}>
        <View style={st.sectionDot} />
        <Text style={st.sectionTitle}>All Locations</Text>
        <Text style={st.sectionCount}>{filtered.length}</Text>
      </View>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.list}
        renderItem={({ item }) => (
          <DiningCard item={item} onPress={() => setSelected(item)} />
        )}
        ListEmptyComponent={
          <View style={st.empty}>
            <View style={st.emptyIcon}>
              <Ionicons name="restaurant-outline" size={28} color={LIGHT} />
            </View>
            <Text style={st.emptyTitle}>No results found</Text>
            <Text style={st.emptySub}>Try a different search term.</Text>
          </View>
        }
      />

      {/* ── Detail bottom sheet ── */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={st.backdrop}>
          <TouchableOpacity style={{ flex: 1 }} onPress={() => setSelected(null)} />
          <View style={st.sheet}>
            {/* Handle */}
            <View style={st.sheetHandle} />
            {/* Gold accent divider */}
            <View style={st.sheetGoldBar} />

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* Sheet header */}
              <View style={st.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={st.sheetName}>{selected?.name}</Text>
                  {selected?.type && (
                    <View style={[
                      st.typeBadge,
                      { backgroundColor: (TYPE_CFG[selected.type]?.bg || '#EDF1F8'), borderColor: (TYPE_CFG[selected.type]?.border || BORDER), marginTop: 6 },
                    ]}>
                      <Text style={[st.typeBadgeText, { color: TYPE_CFG[selected.type]?.color || NAVY }]}>{selected.type}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity style={st.sheetCloseBtn} onPress={() => setSelected(null)}>
                  <Ionicons name="close" size={18} color={MUTED} />
                </TouchableOpacity>
              </View>

              {/* Open/closed status */}
              {(() => {
                const open = isOpenNow(selected?.hours || selected?.operating_hours);
                if (open === null) return null;
                return (
                  <View style={[st.sheetStatusRow, open ? st.statusOpen : st.statusClosed]}>
                    <View style={[st.statusDot, { backgroundColor: open ? '#10B981' : LIGHT }]} />
                    <Text style={[st.statusText, { color: open ? '#059669' : MUTED, fontSize: 13 }]}>
                      {open ? 'Open Now' : 'Closed'}
                    </Text>
                  </View>
                );
              })()}

              {/* Info rows */}
              <View style={st.sheetInfoBlock}>
                {selected?.location && (
                  <View style={st.sheetInfoRow}>
                    <View style={st.sheetInfoIcon}>
                      <Ionicons name="location-outline" size={16} color={NAVY} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.sheetInfoLabel}>Location</Text>
                      <Text style={st.sheetInfoValue}>{selected.location}</Text>
                    </View>
                  </View>
                )}
                {(selected?.hours || selected?.operating_hours) && (
                  <View style={st.sheetInfoRow}>
                    <View style={st.sheetInfoIcon}>
                      <Ionicons name="time-outline" size={16} color={NAVY} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.sheetInfoLabel}>Operating Hours</Text>
                      <Text style={st.sheetInfoValue}>{selected?.hours || selected?.operating_hours}</Text>
                    </View>
                  </View>
                )}
              </View>

              {selected?.description ? (
                <Text style={st.sheetDesc}>{selected.description}</Text>
              ) : null}

              {/* Navigate CTA */}
              {(selected?.latitude && selected?.longitude) ? (
                <TouchableOpacity style={st.navigateBtn} activeOpacity={0.85} onPress={() => {
                  setSelected(null);
                  navigation.navigate('Map', {
                    selectedLocation: { id: selected.id, name: selected.name, latitude: selected.latitude, longitude: selected.longitude },
                  });
                }}>
                  <Ionicons name="navigate-outline" size={18} color={NAVY} />
                  <Text style={st.navigateBtnText}>Navigate to Location</Text>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const st = StyleSheet.create({
  // ── Header ──────────────────────────────────────────────────────────────────
  header:         { backgroundColor: NAVY, paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  headerGoldBar:  { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: GOLD },
  headerContent:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  backBtn:        { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  headerEyebrow:  { fontSize: 10, fontWeight: '800', letterSpacing: 2.5, color: GOLD, textTransform: 'uppercase' },
  headerTitle:    { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerSub:      { fontSize: 12, color: 'rgba(255,255,255,0.65)', letterSpacing: 0.2 },
  headerIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(197,160,71,0.16)', justifyContent: 'center', alignItems: 'center' },

  // ── Info strip ───────────────────────────────────────────────────────────────
  infoStrip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 14, backgroundColor: GOLD_S, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: 'rgba(197,160,71,0.22)' },
  infoText:  { fontSize: 12, color: '#92400E', fontWeight: '600', flex: 1 },

  // ── Search ──────────────────────────────────────────────────────────────────
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, backgroundColor: SURFACE, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  searchInput: { flex: 1, fontSize: 14, color: SLATE, padding: 0 },

  // ── Section header ───────────────────────────────────────────────────────────
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  sectionDot:    { width: 4, height: 16, borderRadius: 2, backgroundColor: GOLD },
  sectionTitle:  { fontSize: 15, fontWeight: '800', color: SLATE, flex: 1, letterSpacing: -0.2 },
  sectionCount:  { fontSize: 12, fontWeight: '600', color: LIGHT },

  // ── Cards ────────────────────────────────────────────────────────────────────
  list:        { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  card:        { backgroundColor: SURFACE, borderRadius: 20, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cardAccent:  { height: 3 },
  cardBody:    { padding: 16 },
  cardTopRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIconWrap:{ width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardName:    { fontSize: 15, fontWeight: '800', color: SLATE, marginBottom: 5, letterSpacing: -0.2 },
  typeBadge:   { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  typeBadgeText:{ fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  statusOpen:  { backgroundColor: '#ECFDF5' },
  statusClosed:{ backgroundColor: '#F1F5F9' },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusText:  { fontSize: 11, fontWeight: '700' },
  metaBlock:   { gap: 5, marginBottom: 8 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText:    { fontSize: 12, color: MUTED },
  cardDesc:    { fontSize: 12, color: LIGHT, lineHeight: 18, marginBottom: 12 },
  cardFooter:  { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  viewDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  viewDetailText:{ fontSize: 12, fontWeight: '700', color: GOLD },

  // ── Empty ────────────────────────────────────────────────────────────────────
  empty:      { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: SLATE },
  emptySub:   { fontSize: 13, color: LIGHT },

  // ── Bottom sheet ─────────────────────────────────────────────────────────────
  backdrop:       { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet:          { backgroundColor: SURFACE, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 40, maxHeight: '78%' },
  sheetHandle:    { width: 40, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginTop: 12 },
  sheetGoldBar:   { height: 2, backgroundColor: GOLD, marginHorizontal: -20, marginTop: 16, marginBottom: 20 },
  sheetHeader:    { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  sheetName:      { fontSize: 22, fontWeight: '800', color: SLATE, letterSpacing: -0.3 },
  sheetCloseBtn:  { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  sheetStatusRow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, marginBottom: 16 },
  sheetInfoBlock: { gap: 0, marginBottom: 16, backgroundColor: BG, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  sheetInfoRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderBottomColor: BORDER },
  sheetInfoIcon:  { width: 34, height: 34, borderRadius: 10, backgroundColor: '#EDF1F8', justifyContent: 'center', alignItems: 'center' },
  sheetInfoLabel: { fontSize: 10, fontWeight: '700', color: LIGHT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  sheetInfoValue: { fontSize: 14, fontWeight: '600', color: SLATE },
  sheetDesc:      { fontSize: 14, color: MUTED, lineHeight: 22, marginBottom: 20 },
  navigateBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, backgroundColor: GOLD, borderRadius: 16, marginTop: 4 },
  navigateBtnText:{ fontSize: 15, fontWeight: '800', color: NAVY },
});
