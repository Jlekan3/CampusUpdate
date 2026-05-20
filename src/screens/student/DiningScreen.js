import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
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

const NAVY = '#1A365D';
const GOLD = '#C5A047';
const BG   = '#F8F9FA';

const MOCK = [
  { id: '1', name: 'Main Cafeteria',    type: 'Cafeteria',  location: 'Student Center, Level 2', hours: '7:00 AM – 8:00 PM', icon: 'restaurant-outline', description: 'Wide variety of local and international cuisines with multiple serving stations.' },
  { id: '2', name: 'Coffee Corner',     type: 'Cafe',       location: 'Library Entrance',         hours: '7:00 AM – 6:00 PM', icon: 'cafe-outline',        description: 'Artisan coffee, pastries, and light snacks. Perfect for studying.' },
  { id: '3', name: 'Express Food Court',type: 'Food Court', location: 'Student Center, GF',       hours: '11:00 AM – 9:00 PM',icon: 'fast-food-outline',  description: 'Multiple vendors offering pizza, burgers, Asian cuisine and salads.' },
  { id: '4', name: 'Dining Commons',    type: 'Restaurant', location: 'Residential Area',         hours: '6:00 AM – 10:00 PM',icon: 'restaurant-outline', description: 'Full-service restaurant serving breakfast, lunch, and dinner daily.' },
];

const TYPE_COLORS = {
  Cafeteria:  { color: NAVY,      bg: '#EDF1F8' },
  Cafe:       { color: '#D97706', bg: '#FEF3C7' },
  'Food Court':{ color: '#7C3AED', bg: '#EDE9FE' },
  Restaurant: { color: '#059669', bg: '#D1FAE5' },
};

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
            <Text style={styles.headerTitle}>Dining</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="restaurant-outline" size={24} color={GOLD} />
          </View>
        </View>
        <Text style={styles.headerSub}>Campus cafeterias, cafés and dining facilities.</Text>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={GOLD} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search dining options…"
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
          const tc = TYPE_COLORS[item.type] || { color: NAVY, bg: '#EDF1F8' };
          return (
            <TouchableOpacity style={styles.card} onPress={() => setSelected(item)} activeOpacity={0.85}>
              <View style={styles.cardGoldBar} />
              <View style={styles.cardBody}>
                <View style={styles.cardTopRow}>
                  <View style={[styles.cardIconWrap, { backgroundColor: `${tc.color}14` }]}>
                    <Ionicons name={item.icon || 'restaurant-outline'} size={22} color={tc.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName}>{item.name}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: tc.bg }]}>
                      <Text style={[styles.typeBadgeText, { color: tc.color }]}>{item.type}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#A0AEC0" />
                </View>
                <View style={styles.cardMeta}>
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={13} color="#718096" />
                    <Text style={styles.metaText}>{item.location}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={13} color="#718096" />
                    <Text style={styles.metaText}>{item.hours || item.operating_hours}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={36} color={GOLD} />
            <Text style={styles.emptyText}>No results found</Text>
          </View>
        }
      />

      {/* ── Detail modal ── */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={[styles.modalGoldBar, { backgroundColor: GOLD }]} />
            <View style={styles.modalHandle} />
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalName}>{selected?.name}</Text>
                  <Text style={styles.modalType}>{selected?.type}</Text>
                </View>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelected(null)}>
                  <Ionicons name="close" size={20} color="#718096" />
                </TouchableOpacity>
              </View>
              <View style={styles.modalInfoRow}>
                <Ionicons name="location-outline" size={15} color={NAVY} />
                <Text style={styles.modalInfoText}>{selected?.location}</Text>
              </View>
              <View style={styles.modalInfoRow}>
                <Ionicons name="time-outline" size={15} color={NAVY} />
                <Text style={styles.modalInfoText}>{selected?.hours || selected?.operating_hours}</Text>
              </View>
              {selected?.description ? (
                <Text style={styles.modalDesc}>{selected.description}</Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  cardTopRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  cardIconWrap: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  cardName:     { fontSize: 15, fontWeight: '700', color: '#2D3748', marginBottom: 5 },
  typeBadge:    { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeBadgeText:{ fontSize: 11, fontWeight: '700' },
  cardMeta:     { gap: 5 },
  metaRow:      { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText:     { fontSize: 12, color: '#718096' },

  empty:     { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 14, color: '#718096' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet:    { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingBottom: 36, maxHeight: '70%', overflow: 'hidden' },
  modalGoldBar:  { height: 3, marginHorizontal: -20 },
  modalHandle:   { width: 44, height: 4, borderRadius: 2, backgroundColor: '#CBD5E0', alignSelf: 'center', marginTop: 10, marginBottom: 16 },
  modalHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  modalName:     { fontSize: 20, fontWeight: '800', color: '#2D3748' },
  modalType:     { fontSize: 13, color: '#718096', marginTop: 4 },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  modalInfoRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  modalInfoText: { fontSize: 14, color: '#2D3748' },
  modalDesc:     { fontSize: 14, color: '#4A5568', lineHeight: 22, marginTop: 12 },
});
