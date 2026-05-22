import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
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

const CAT_CFG = {
  Emergency:   { color: '#DC2626', bg: '#FEF2F2', icon: 'alert-circle-outline'    },
  Medical:     { color: '#2563EB', bg: '#EFF6FF', icon: 'medkit-outline'           },
  Counseling:  { color: '#7C3AED', bg: '#F5F3FF', icon: 'people-outline'           },
  Security:    { color: '#0F172A', bg: '#F1F5F9', icon: 'shield-checkmark-outline' },
  Maintenance: { color: '#059669', bg: '#ECFDF5', icon: 'construct-outline'        },
};

const call = (number) => {
  const cleaned = `tel:${number.replace(/\s/g, '')}`;
  Linking.canOpenURL(cleaned)
    .then((ok) => { if (ok) Linking.openURL(cleaned); else Alert.alert('Cannot call', 'This device cannot make phone calls.'); })
    .catch(() => Alert.alert('Error', 'Could not initiate the call.'));
};

export default function GuestEmergencyScreen({ navigation }) {
  const [contacts, setContacts] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    supabase
      .from('safety_and_support')
      .select('id, title, description, phone_number, alternative_phone_number, category, is_available_24_7, operating_hours, icon_name')
      .order('category')
      .order('title')
      .then(({ data, error }) => {
        if (data) setContacts(data);
      })
      .finally(() => setLoading(false));
  }, []);

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) =>
      (c.title        || '').toLowerCase().includes(q) ||
      (c.description  || '').toLowerCase().includes(q) ||
      (c.category     || '').toLowerCase().includes(q) ||
      (c.phone_number || '').toLowerCase().includes(q)
    );
  }, [contacts, search]);

  return (
    <ScreenWrapper backgroundColor={BG} statusBarStyle="dark-content">
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={SLATE} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerEye}>CAMPUS</Text>
          <Text style={s.headerTitle}>Emergency & Support</Text>
        </View>
        <View style={[s.headerBadge, { backgroundColor: '#FEF2F2' }]}>
          <Ionicons name="call" size={13} color="#DC2626" />
          <Text style={[s.headerBadgeText, { color: '#DC2626' }]}>{contacts.length}</Text>
        </View>
      </View>

      {/* ── SOS banner ── */}
      <View style={s.sosBanner}>
        <View style={s.sosBannerLeft}>
          <Ionicons name="warning-outline" size={18} color="#DC2626" />
          <Text style={s.sosBannerText}>In a life-threatening emergency, call the national line immediately.</Text>
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={LIGHT} />
        <TextInput
          style={s.searchInput}
          placeholder="Search contacts, category…"
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

      {/* ── Contacts list ── */}
      {loading ? (
        <View style={s.center}><ActivityIndicator color="#DC2626" size="large" /></View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="call-outline" size={44} color={LIGHT} />
              <Text style={s.emptyTitle}>No contacts found</Text>
              <Text style={s.emptySub}>{contacts.length === 0 ? 'No contacts have been added yet.' : 'Try a different search.'}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const cfg = CAT_CFG[item.category] || CAT_CFG.Security;
            return (
              <View style={s.card}>
                {/* Left bar */}
                <View style={[s.cardBar, { backgroundColor: cfg.color }]} />
                <View style={s.cardBody}>
                  {/* Category badge + availability */}
                  <View style={s.cardTopRow}>
                    <View style={[s.catBadge, { backgroundColor: cfg.bg, borderColor: cfg.color + '40' }]}>
                      <Ionicons name={cfg.icon} size={10} color={cfg.color} />
                      <Text style={[s.catBadgeText, { color: cfg.color }]}>{item.category}</Text>
                    </View>
                    <View style={[
                      s.availBadge,
                      item.is_available_24_7 ? s.availBadgeOn : s.availBadgeOff,
                    ]}>
                      <View style={[s.availDot, { backgroundColor: item.is_available_24_7 ? '#10B981' : LIGHT }]} />
                      <Text style={[s.availText, { color: item.is_available_24_7 ? '#059669' : MUTED }]}>
                        {item.is_available_24_7 ? '24 / 7' : 'Limited hours'}
                      </Text>
                    </View>
                  </View>

                  {/* Title */}
                  <Text style={s.cardTitle}>{item.title}</Text>

                  {/* Description */}
                  {item.description ? (
                    <Text style={s.cardDesc} numberOfLines={2}>{item.description}</Text>
                  ) : null}

                  {/* Hours if not 24/7 */}
                  {!item.is_available_24_7 && item.operating_hours ? (
                    <View style={s.hoursRow}>
                      <Ionicons name="time-outline" size={12} color={MUTED} />
                      <Text style={s.hoursText}>{item.operating_hours}</Text>
                    </View>
                  ) : null}

                  {/* Phone numbers */}
                  <View style={s.phoneRow}>
                    <TouchableOpacity
                      style={s.callBtn}
                      onPress={() => call(item.phone_number)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="call-outline" size={14} color={SURFACE} />
                      <Text style={s.callBtnText}>{item.phone_number}</Text>
                    </TouchableOpacity>

                    {item.alternative_phone_number ? (
                      <TouchableOpacity
                        style={s.callBtnAlt}
                        onPress={() => call(item.alternative_phone_number)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="call-outline" size={13} color={MUTED} />
                        <Text style={s.callBtnAltText}>{item.alternative_phone_number}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          }}
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
  headerBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  headerBadgeText: { fontSize: 13, fontWeight: '700' },

  sosBanner:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginHorizontal: 16, marginTop: 14, backgroundColor: '#FEF2F2', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  sosBannerLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 },
  sosBannerText: { fontSize: 12, color: '#9B2335', fontWeight: '600', flex: 1, lineHeight: 17 },

  searchRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 14, marginBottom: 4, backgroundColor: SURFACE, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: BORDER },
  searchInput: { flex: 1, fontSize: 14, color: SLATE, padding: 0 },

  list:   { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  empty:  { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: SLATE },
  emptySub:   { fontSize: 13, color: MUTED, textAlign: 'center', maxWidth: 220 },

  card:        { flexDirection: 'row', backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  cardBar:     { width: 4 },
  cardBody:    { flex: 1, padding: 14 },
  cardTopRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 8 },
  catBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  catBadgeText:{ fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  availBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  availBadgeOn: { backgroundColor: '#ECFDF5' },
  availBadgeOff:{ backgroundColor: '#F1F5F9' },
  availDot:    { width: 6, height: 6, borderRadius: 3 },
  availText:   { fontSize: 10, fontWeight: '700' },
  cardTitle:   { fontSize: 15, fontWeight: '700', color: SLATE, marginBottom: 4 },
  cardDesc:    { fontSize: 12, color: MUTED, lineHeight: 17, marginBottom: 8 },
  hoursRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  hoursText:   { fontSize: 11, color: MUTED },
  phoneRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  callBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DC2626', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  callBtnText: { fontSize: 13, fontWeight: '700', color: SURFACE },
  callBtnAlt:  { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: BORDER },
  callBtnAltText:{ fontSize: 12, fontWeight: '600', color: MUTED },
});
