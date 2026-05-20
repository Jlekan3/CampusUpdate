import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,

  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { subscribeToCampusRules } from '../../services/databaseService';

// LayoutAnimation works natively in the New Architecture — no UIManager setup needed

const NAVY = '#1A365D';
const GOLD = '#C5A047';
const BG   = '#F8F9FA';

const DEFAULT_SECTIONS = [
  {
    id: 'academic',
    title: 'Academic Integrity',
    subtitle: 'Honesty, assignments and exams',
    icon: 'school-outline',
    color: NAVY,
    rules: [
      'Submit only original work unless collaboration is explicitly allowed.',
      'Do not share answers, exam questions, or graded materials.',
      'Cite all sources used in papers, projects, and presentations.',
      'Follow all exam instructions and time limits exactly as given.',
      'Report suspected cheating through the proper channel.',
    ],
  },
  {
    id: 'conduct',
    title: 'Campus Conduct',
    subtitle: 'Respectful behaviour and shared spaces',
    icon: 'people-outline',
    color: '#2563EB',
    rules: [
      'Treat students, staff, and visitors with respect at all times.',
      'Keep common areas clean and dispose of waste properly.',
      'Follow posted signs, campus policies, and staff directions.',
      'Use campus facilities responsibly and avoid damaging property.',
      'Maintain a quiet, professional environment in study areas.',
    ],
  },
  {
    id: 'safety',
    title: 'Safety & Security',
    subtitle: 'Emergencies, access, and campus protection',
    icon: 'shield-checkmark-outline',
    color: '#059669',
    rules: [
      'Carry your student ID and present it when requested.',
      'Do not prop open secure doors or share access credentials.',
      'Report suspicious activity, hazards, or injuries immediately.',
      'Follow evacuation routes during drills or emergency alerts.',
      'Use designated walkways and lighting after dark.',
    ],
  },
  {
    id: 'digital',
    title: 'Digital Responsibility',
    subtitle: 'Technology and online behaviour',
    icon: 'laptop-outline',
    color: '#7C3AED',
    rules: [
      'Use campus Wi-Fi and computers for academic purposes only.',
      'Do not access, alter, or delete other users\' data.',
      'Respect copyright and licensing for all digital materials.',
      'Report cybersecurity incidents to IT immediately.',
    ],
  },
];

export default function CampusRulesScreen({ navigation }) {
  const [dbSections,   setDbSections]   = useState([]);
  const [search,       setSearch]       = useState('');
  const [expandedId,   setExpandedId]   = useState(null);

  useEffect(() => {
    const unsub = subscribeToCampusRules((rules) => {
      if (rules?.length) {
        const mapped = rules.map((r, i) => ({
          id:       r.id || String(i),
          title:    r.title,
          subtitle: r.category || '',
          icon:     'document-text-outline',
          color:    NAVY,
          rules:    r.description ? [r.description] : [],
        }));
        setDbSections(mapped);
      }
    });
    return () => { try { unsub?.(); } catch (_) {} };
  }, []);

  const sections = dbSections.length ? dbSections : DEFAULT_SECTIONS;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sections;
    return sections.filter((s) =>
      s.title.toLowerCase().includes(q) ||
      s.rules.some((r) => r.toLowerCase().includes(q))
    );
  }, [sections, search]);

  const toggle = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId((prev) => (prev === id ? null : id));
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
            <Text style={styles.headerTitle}>Campus Rules</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="shield-outline" size={24} color={GOLD} />
          </View>
        </View>
        <Text style={styles.headerSub}>Know your rights and responsibilities on campus.</Text>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={GOLD} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search rules…"
            placeholderTextColor="#A0AEC0"
            value={search}
            onChangeText={setSearch}
          />
          {search ? <TouchableOpacity onPress={() => setSearch('')}><Ionicons name="close-circle" size={18} color="#A0AEC0" /></TouchableOpacity> : null}
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
        {filtered.map((section) => {
          const open = expandedId === section.id;
          return (
            <View key={section.id} style={styles.section}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => toggle(section.id)} activeOpacity={0.85}>
                <View style={[styles.sectionIconBox, { backgroundColor: `${section.color}14` }]}>
                  <Ionicons name={section.icon} size={20} color={section.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionSub}>{section.subtitle}</Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: `${section.color}14` }]}>
                  <Text style={[styles.countBadgeText, { color: section.color }]}>{section.rules.length}</Text>
                </View>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color="#A0AEC0" style={{ marginLeft: 6 }} />
              </TouchableOpacity>

              {open && (
                <View style={styles.rulesWrap}>
                  {section.rules.map((rule, i) => (
                    <View key={i} style={styles.ruleRow}>
                      <View style={[styles.ruleNum, { backgroundColor: section.color }]}>
                        <Text style={styles.ruleNumText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.ruleText}>{rule}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {filtered.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={36} color={GOLD} />
            <Text style={styles.emptyText}>No rules matched "{search}"</Text>
          </View>
        )}
      </ScrollView>
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

  section:       { backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(26,54,93,0.08)', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  sectionIconBox:{ width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: '#2D3748', marginBottom: 2 },
  sectionSub:    { fontSize: 12, color: '#718096' },
  countBadge:    { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  countBadgeText:{ fontSize: 12, fontWeight: '800' },

  rulesWrap: { paddingHorizontal: 16, paddingBottom: 16, borderTopWidth: 1, borderTopColor: 'rgba(26,54,93,0.06)', paddingTop: 12, gap: 10 },
  ruleRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ruleNum:   { width: 22, height: 22, borderRadius: 7, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  ruleNumText:{ fontSize: 11, fontWeight: '800', color: '#fff' },
  ruleText:  { flex: 1, fontSize: 13, color: '#4A5568', lineHeight: 19 },

  empty:     { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 14, color: '#718096' },
});
