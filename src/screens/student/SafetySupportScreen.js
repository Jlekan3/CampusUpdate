import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { CAMPUS_EMERGENCY_CONTACTS } from '../../utils/constants';

const NAVY  = '#1A365D';
const GOLD  = '#C5A047';
const RED   = '#E53E3E';
const BG    = '#F8F9FA';

const QUICK_ACTIONS = [
  { id: 'security', label: 'Security',       icon: 'shield-outline',   color: RED,       number: CAMPUS_EMERGENCY_CONTACTS.find(c => c.id === 'security')?.number },
  { id: 'health',   label: 'Campus Clinic',  icon: 'medkit-outline',   color: '#D69E2E', number: CAMPUS_EMERGENCY_CONTACTS.find(c => c.id === 'health')?.number },
  { id: 'national', label: 'Emergency 112',  icon: 'call-outline',     color: RED,       number: '112' },
  { id: 'counsel',  label: 'Student Affairs',icon: 'people-outline',   color: '#7C3AED', number: CAMPUS_EMERGENCY_CONTACTS.find(c => c.id === 'counseling')?.number },
];

export default function SafetySupportScreen({ navigation }) {
  const [search, setSearch] = useState('');

  const handleCall = (number) => {
    if (!number) return;
    Linking.openURL(`tel:${number.replace(/\D/g, '')}`);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CAMPUS_EMERGENCY_CONTACTS;
    return CAMPUS_EMERGENCY_CONTACTS.filter((c) =>
      [c.title, c.number, c.description].some((v) => (v || '').toLowerCase().includes(q))
    );
  }, [search]);

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
            <Text style={styles.headerTitle}>Safety & Support</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-checkmark-outline" size={24} color={GOLD} />
          </View>
        </View>
        <Text style={styles.headerSub}>Emergency contacts and campus support services.</Text>
      </View>

      {/* ── SOS Quick row ── */}
      <View style={styles.quickRow}>
        {QUICK_ACTIONS.map((qa) => (
          <TouchableOpacity
            key={qa.id}
            style={styles.quickCard}
            onPress={() => handleCall(qa.number)}
            activeOpacity={0.85}
          >
            <View style={[styles.quickIconBox, { backgroundColor: `${qa.color}18` }]}>
              <Ionicons name={qa.icon} size={22} color={qa.color} />
            </View>
            <Text style={styles.quickLabel}>{qa.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={GOLD} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search contacts…"
            placeholderTextColor="#A0AEC0"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color="#A0AEC0" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── Contact list ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => handleCall(item.number)} activeOpacity={0.85}>
            <View style={[styles.cardLeftBar, { backgroundColor: item.color }]} />
            <View style={[styles.cardIconWrap, { backgroundColor: `${item.color}14` }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.description}</Text>
              <Text style={[styles.cardNumber, { color: item.color }]}>{item.number}</Text>
            </View>
            <View style={[styles.callChip, { backgroundColor: `${item.color}14`, borderColor: `${item.color}30` }]}>
              <Ionicons name="call-outline" size={14} color={item.color} />
              <Text style={[styles.callChipText, { color: item.color }]}>Call</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={36} color={GOLD} />
            <Text style={styles.emptyText}>No contacts found</Text>
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

  quickRow:  { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, gap: 10 },
  quickCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, alignItems: 'center', paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(26,54,93,0.08)', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  quickIconBox:{ width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickLabel: { fontSize: 11, fontWeight: '700', color: '#2D3748', textAlign: 'center' },

  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBar:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(26,54,93,0.10)' },
  searchInput:{ flex: 1, fontSize: 14, color: '#2D3748', padding: 0 },

  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(26,54,93,0.08)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  cardLeftBar:  { width: 4, alignSelf: 'stretch' },
  cardIconWrap: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginLeft: 4 },
  cardBody:     { flex: 1, paddingVertical: 14 },
  cardTitle:    { fontSize: 15, fontWeight: '700', color: '#2D3748', marginBottom: 3 },
  cardDesc:     { fontSize: 12, color: '#718096', lineHeight: 17, marginBottom: 4 },
  cardNumber:   { fontSize: 13, fontWeight: '700' },
  callChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1, marginRight: 12 },
  callChipText: { fontSize: 12, fontWeight: '700' },

  empty:     { flex: 1, alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 14, color: '#718096' },
});
