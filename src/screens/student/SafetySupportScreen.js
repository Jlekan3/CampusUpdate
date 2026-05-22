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

// ── Tokens ────────────────────────────────────────────────────────────────────
const NAVY   = '#1A365D';
const GOLD   = '#C5A047';
const RED    = '#DC2626';
const BG     = '#F8FAFC';
const SURFACE= '#FFFFFF';
const SLATE  = '#1E293B';
const MUTED  = '#64748B';
const LIGHT  = '#94A3B8';
const BORDER = '#E2E8F0';

// ── Quick-dial top actions ────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    id:     'security',
    label:  'Campus\nSecurity',
    icon:   'shield-outline',
    color:  RED,
    bg:     '#FEF2F2',
    border: '#FECACA',
    number: CAMPUS_EMERGENCY_CONTACTS.find(c => c.id === 'security')?.number,
  },
  {
    id:     'health',
    label:  'Campus\nClinic',
    icon:   'medkit-outline',
    color:  '#0891B2',
    bg:     '#F0F9FF',
    border: '#BAE6FD',
    number: CAMPUS_EMERGENCY_CONTACTS.find(c => c.id === 'health')?.number,
  },
  {
    id:     'national',
    label:  'Emergency\n112',
    icon:   'call-outline',
    color:  RED,
    bg:     '#FEF2F2',
    border: '#FECACA',
    number: '112',
  },
  {
    id:     'counsel',
    label:  'Student\nAffairs',
    icon:   'people-outline',
    color:  '#7C3AED',
    bg:     '#F5F3FF',
    border: '#DDD6FE',
    number: CAMPUS_EMERGENCY_CONTACTS.find(c => c.id === 'counseling')?.number,
  },
];

const handleCall = (number) => {
  if (!number) return;
  Linking.openURL(`tel:${number.replace(/\D/g, '')}`);
};

// ── Contact card ──────────────────────────────────────────────────────────────
function ContactCard({ item }) {
  return (
    <TouchableOpacity
      style={st.card}
      onPress={() => handleCall(item.number)}
      activeOpacity={0.87}
    >
      <View style={[st.cardBar, { backgroundColor: item.color }]} />
      <View style={[st.cardIconWrap, { backgroundColor: item.color + '14' }]}>
        <Ionicons name={item.icon} size={22} color={item.color} />
      </View>
      <View style={st.cardBody}>
        <Text style={st.cardTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={st.cardDesc} numberOfLines={2}>{item.description}</Text>
        ) : null}
        {item.number ? (
          <View style={st.numberRow}>
            <Ionicons name="call-outline" size={12} color={item.color} />
            <Text style={[st.cardNumber, { color: item.color }]}>{item.number}</Text>
          </View>
        ) : null}
      </View>
      <View style={[st.callChip, { backgroundColor: item.color + '12', borderColor: item.color + '30' }]}>
        <Ionicons name="call" size={14} color={item.color} />
        <Text style={[st.callChipText, { color: item.color }]}>Call</Text>
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function SafetySupportScreen({ navigation }) {
  const [search, setSearch] = useState('');

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
            <Text style={st.headerTitle}>Safety & Support</Text>
          </View>
          <View style={st.headerIconWrap}>
            <Ionicons name="shield-checkmark-outline" size={22} color={GOLD} />
          </View>
        </View>
        <Text style={st.headerSub}>Emergency contacts and campus support services</Text>
      </View>

      {/* ── SOS top banner ── */}
      <View style={st.sosBanner}>
        <View style={st.sosLeft}>
          <View style={st.sosPulse}>
            <Ionicons name="warning-outline" size={18} color={RED} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.sosTitle}>Life-threatening emergency?</Text>
            <Text style={st.sosSub}>Dial National Emergency Line 112 immediately</Text>
          </View>
        </View>
        <TouchableOpacity style={st.sosCallBtn} onPress={() => handleCall('112')} activeOpacity={0.85}>
          <Ionicons name="call" size={14} color="#fff" />
          <Text style={st.sosCallText}>Call 112</Text>
        </TouchableOpacity>
      </View>

      {/* ── Quick-dial grid ── */}
      <View style={st.quickSection}>
        <View style={st.sectionHeader}>
          <View style={st.sectionDot} />
          <Text style={st.sectionTitle}>Quick Dial</Text>
        </View>
        <View style={st.quickGrid}>
          {QUICK_ACTIONS.map((qa) => (
            <TouchableOpacity
              key={qa.id}
              style={[st.quickCard, { backgroundColor: qa.bg, borderColor: qa.border }]}
              onPress={() => handleCall(qa.number)}
              activeOpacity={0.85}
            >
              <View style={[st.quickIconBox, { backgroundColor: qa.color + '16' }]}>
                <Ionicons name={qa.icon} size={24} color={qa.color} />
              </View>
              <Text style={[st.quickLabel, { color: qa.color }]}>{qa.label}</Text>
              <View style={[st.quickCallBadge, { backgroundColor: qa.color }]}>
                <Ionicons name="call" size={10} color="#fff" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Search ── */}
      <View style={st.searchWrap}>
        <Ionicons name="search-outline" size={16} color={LIGHT} />
        <TextInput
          style={st.searchInput}
          placeholder="Search contacts…"
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

      {/* ── All contacts label ── */}
      <View style={st.sectionHeaderInline}>
        <View style={st.sectionDot} />
        <Text style={st.sectionTitle}>All Contacts</Text>
        <Text style={st.sectionCount}>{filtered.length}</Text>
      </View>

      {/* ── Contact list ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.list}
        renderItem={({ item }) => <ContactCard item={item} />}
        ListEmptyComponent={
          <View style={st.empty}>
            <View style={st.emptyIcon}>
              <Ionicons name="search-outline" size={28} color={LIGHT} />
            </View>
            <Text style={st.emptyTitle}>No contacts found</Text>
            <Text style={st.emptySub}>Try a different search term.</Text>
          </View>
        }
      />
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
  headerSub:      { fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  headerIconWrap: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(197,160,71,0.16)', justifyContent: 'center', alignItems: 'center' },

  // ── SOS banner ──────────────────────────────────────────────────────────────
  sosBanner:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 14, backgroundColor: '#FFF5F5', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#FECACA' },
  sosLeft:    { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  sosPulse:   { width: 38, height: 38, borderRadius: 12, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  sosTitle:   { fontSize: 13, fontWeight: '800', color: RED, marginBottom: 2 },
  sosSub:     { fontSize: 11, color: '#EF4444', lineHeight: 15 },
  sosCallBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: RED, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
  sosCallText:{ fontSize: 12, fontWeight: '800', color: '#fff' },

  // ── Quick-dial ───────────────────────────────────────────────────────────────
  quickSection:      { paddingTop: 16 },
  sectionHeader:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  sectionHeaderInline:{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  sectionDot:        { width: 4, height: 16, borderRadius: 2, backgroundColor: GOLD },
  sectionTitle:      { fontSize: 15, fontWeight: '800', color: SLATE, flex: 1, letterSpacing: -0.2 },
  sectionCount:      { fontSize: 12, fontWeight: '600', color: LIGHT },
  quickGrid:         { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  quickCard:         { flex: 1, borderRadius: 18, borderWidth: 1, padding: 14, alignItems: 'center', gap: 8, position: 'relative', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  quickIconBox:      { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  quickLabel:        { fontSize: 10, fontWeight: '800', textAlign: 'center', lineHeight: 14, letterSpacing: 0.2 },
  quickCallBadge:    { position: 'absolute', top: 10, right: 10, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },

  // ── Search ──────────────────────────────────────────────────────────────────
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 6, backgroundColor: SURFACE, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  searchInput: { flex: 1, fontSize: 14, color: SLATE, padding: 0 },

  // ── Cards ────────────────────────────────────────────────────────────────────
  list:        { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  card:        { flexDirection: 'row', alignItems: 'center', backgroundColor: SURFACE, borderRadius: 18, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  cardBar:     { width: 4, alignSelf: 'stretch' },
  cardIconWrap:{ width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginLeft: 12, marginVertical: 14 },
  cardBody:    { flex: 1, paddingVertical: 14, paddingHorizontal: 10 },
  cardTitle:   { fontSize: 14, fontWeight: '800', color: SLATE, marginBottom: 3, letterSpacing: -0.1 },
  cardDesc:    { fontSize: 11, color: MUTED, lineHeight: 16, marginBottom: 5 },
  numberRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardNumber:  { fontSize: 13, fontWeight: '700' },
  callChip:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, borderWidth: 1, marginRight: 12 },
  callChipText:{ fontSize: 12, fontWeight: '700' },

  // ── Empty ────────────────────────────────────────────────────────────────────
  empty:      { alignItems: 'center', paddingTop: 48, gap: 10 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: SLATE },
  emptySub:   { fontSize: 13, color: LIGHT },
});
