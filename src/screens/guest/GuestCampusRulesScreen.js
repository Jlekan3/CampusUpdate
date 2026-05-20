import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { supabase } from '../../config/supabase';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ── Tokens ────────────────────────────────────────────────────────────────────
const NAVY   = '#1A365D';
const GOLD   = '#C5A047';
const SLATE  = '#1E293B';
const MUTED  = '#64748B';
const LIGHT  = '#94A3B8';
const BG     = '#F8F9FA';
const SURFACE= '#FFFFFF';
const BORDER = '#E2E8F0';

const SEV = {
  critical: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Critical' },
  warning:  { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Warning'  },
  info:     { color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE', label: 'Info'     },
};

const CATEGORIES = ['All', 'Academic', 'Residential', 'Traffic & Parking', 'Code of Conduct'];

const CAT_COLOR = {
  Academic:            '#2563EB',
  Residential:         '#7C3AED',
  'Traffic & Parking': '#D97706',
  'Code of Conduct':   '#059669',
};

export default function GuestCampusRulesScreen({ navigation }) {
  const [rules,    setRules]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('All');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    supabase
      .from('campus_rules')
      .select('id, title, description, category, severity')
      .eq('is_active', true)
      .order('category')
      .then(({ data }) => { if (data) setRules(data); })
      .finally(() => setLoading(false));
  }, []);

  const displayed = useMemo(() => {
    let items = filter === 'All' ? rules : rules.filter((r) => r.category === filter);
    const q = search.trim().toLowerCase();
    if (q) items = items.filter((r) => (r.title + r.description).toLowerCase().includes(q));
    return items;
  }, [rules, filter, search]);

  const toggle = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <ScreenWrapper backgroundColor={BG} statusBarStyle="dark-content">
      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={SLATE} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerEye}>CAMPUS</Text>
          <Text style={s.headerTitle}>Campus Rules</Text>
        </View>
        <View style={s.headerBadge}>
          <Text style={s.headerBadgeText}>{rules.length}</Text>
        </View>
      </View>

      {/* ── Search ── */}
      <View style={s.searchRow}>
        <Ionicons name="search-outline" size={16} color={LIGHT} />
        <TextInput
          style={s.searchInput}
          placeholder="Search rules…"
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

      {/* ── Category filter chips ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
        {CATEGORIES.map((cat) => {
          const active = filter === cat;
          const accent = cat === 'All' ? NAVY : (CAT_COLOR[cat] || NAVY);
          return (
            <TouchableOpacity
              key={cat}
              style={[s.chip, active && { backgroundColor: accent, borderColor: accent }]}
              onPress={() => setFilter(cat)}
              activeOpacity={0.8}
            >
              <Text style={[s.chipText, active && { color: '#fff', fontWeight: '700' }]}>{cat}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── List ── */}
      {loading ? (
        <View style={s.center}><ActivityIndicator color={NAVY} size="large" /></View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="shield-outline" size={44} color={LIGHT} />
              <Text style={s.emptyTitle}>No rules found</Text>
              <Text style={s.emptySub}>Try a different search or category.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const sev      = SEV[item.severity] || SEV.info;
            const isOpen   = expanded === item.id;
            const catColor = CAT_COLOR[item.category] || NAVY;
            return (
              <TouchableOpacity style={s.card} onPress={() => toggle(item.id)} activeOpacity={0.85}>
                {/* Severity left bar */}
                <View style={[s.cardBar, { backgroundColor: sev.color }]} />
                <View style={s.cardBody}>
                  {/* Top row: badges */}
                  <View style={s.badgeRow}>
                    <View style={[s.sevBadge, { backgroundColor: sev.bg, borderColor: sev.border }]}>
                      <Text style={[s.sevBadgeText, { color: sev.color }]}>{sev.label}</Text>
                    </View>
                    {item.category && (
                      <View style={[s.catBadge, { backgroundColor: catColor + '14' }]}>
                        <Text style={[s.catBadgeText, { color: catColor }]}>{item.category}</Text>
                      </View>
                    )}
                  </View>
                  {/* Title */}
                  <Text style={s.cardTitle}>{item.title}</Text>
                  {/* Expandable description */}
                  {isOpen && item.description ? (
                    <Text style={s.cardDesc}>{item.description}</Text>
                  ) : null}
                </View>
                <Ionicons
                  name={isOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={LIGHT}
                  style={s.chevron}
                />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </ScreenWrapper>
  );
}

const s = StyleSheet.create({
  header:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 52, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER },
  backBtn:       { width: 36, height: 36, borderRadius: 10, backgroundColor: BG, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER },
  headerEye:     { fontSize: 10, fontWeight: '700', color: GOLD, letterSpacing: 1.5, textTransform: 'uppercase' },
  headerTitle:   { fontSize: 22, fontWeight: '800', color: SLATE, letterSpacing: -0.3 },
  headerBadge:   { backgroundColor: '#EDF1F8', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  headerBadgeText:{ fontSize: 13, fontWeight: '700', color: NAVY },

  searchRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 14, backgroundColor: SURFACE, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: BORDER },
  searchInput:{ flex: 1, fontSize: 14, color: SLATE, padding: 0 },

  chipRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  chip:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  chipText:{ fontSize: 12, fontWeight: '600', color: MUTED },

  list:  { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  center:{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle:{ fontSize: 17, fontWeight: '700', color: SLATE },
  emptySub:  { fontSize: 13, color: MUTED },

  card:     { flexDirection: 'row', backgroundColor: SURFACE, borderRadius: 16, borderWidth: 1, borderColor: BORDER, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1 },
  cardBar:  { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  sevBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  sevBadgeText:{ fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  catBadgeText:{ fontSize: 10, fontWeight: '700' },
  cardTitle:{ fontSize: 14, fontWeight: '700', color: SLATE, lineHeight: 20 },
  cardDesc: { fontSize: 13, color: MUTED, lineHeight: 20, marginTop: 8 },
  chevron:  { alignSelf: 'center', marginLeft: 4, marginRight: 10 },
});
