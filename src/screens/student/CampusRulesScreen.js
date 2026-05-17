import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { COLORS } from '../../utils/constants';
import { subscribeToCampusRules } from '../../services/databaseService';

const DEFAULT_RULE_SECTIONS = [
  {
    id: 'academic',
    title: 'Academic Integrity',
    subtitle: 'Rules for honesty, assignments, and exams',
    icon: 'school-outline',
    rules: [
      'Submit only original work unless collaboration is explicitly allowed.',
      'Do not share answers, exam questions, or graded materials.',
      'Cite all sources used in papers, projects, and presentations.',
      'Follow all exam instructions and time limits exactly as given.',
      'Report suspected cheating or plagiarism through the proper channel.',
    ],
  },
  {
    id: 'conduct',
    title: 'Campus Conduct',
    subtitle: 'Rules for respectful behavior and shared spaces',
    icon: 'people-outline',
    rules: [
      'Treat students, staff, and visitors with respect at all times.',
      'Keep common areas clean and dispose of waste properly.',
      'Follow posted signs, campus policies, and staff directions.',
      'Use campus facilities responsibly and avoid damaging property.',
      'Maintain a quiet, professional environment in study areas and classrooms.',
    ],
  },
  {
    id: 'safety',
    title: 'Safety & Security',
    subtitle: 'Rules for emergencies, access, and campus protection',
    icon: 'shield-checkmark-outline',
    rules: [
      'Carry your student ID and present it when requested by campus staff.',
      'Do not prop open secure doors or share access credentials.',
      'Report suspicious activity, hazards, or injuries immediately.',
      'Follow evacuation routes and emergency instructions during drills or alerts.',
      'Use designated walkways, lighting, and safe transport options after dark.',
    ],
  },
];

const mapFirestoreRulesToSections = (rules) => {
  return (rules || []).map((rule) => {
    const description = (rule.description || '').trim();
    const lines = description
      ? description.split(/\n+/).map((line) => line.trim()).filter(Boolean)
      : [];

    return {
      id: rule.id,
      title: rule.title || 'Campus rule',
      subtitle: 'Official campus policy',
      icon: 'document-text-outline',
      rules: lines.length > 0 ? lines : ['No details provided yet.'],
    };
  });
};

const CampusRulesScreen = () => {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [firestoreRules, setFirestoreRules] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToCampusRules((items) => {
      setFirestoreRules(items || []);
      setRulesLoading(false);
    });

    return () => {
      try {
        unsubscribe?.();
      } catch (error) {
        // ignore
      }
    };
  }, []);

  const ruleSections = useMemo(() => {
    const fromFirestore = mapFirestoreRulesToSections(firestoreRules);
    if (fromFirestore.length > 0) return fromFirestore;
    return DEFAULT_RULE_SECTIONS;
  }, [firestoreRules]);

  const usingFallback = firestoreRules.length === 0 && !rulesLoading;

  const filteredSections = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return ruleSections;

    return ruleSections.filter((section) => {
      const title = (section.title || '').toLowerCase();
      const subtitle = (section.subtitle || '').toLowerCase();
      const rules = section.rules || [];

      return (
        title.includes(query) ||
        subtitle.includes(query) ||
        rules.some((rule) => rule.toLowerCase().includes(query))
      );
    });
  }, [ruleSections, searchQuery]);

  const visibleCount = filteredSections.length;
  const totalRules = filteredSections.reduce((count, section) => count + (section.rules?.length || 0), 0);

  const toggleSection = (sectionId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategory((current) => (current === sectionId ? null : sectionId));
  };

  const renderAccordionSection = (section) => {
    const expanded = expandedCategory === section.id;

    return (
      <View key={section.id} style={styles.accordionCard}>
        <TouchableOpacity
          style={styles.accordionHeader}
          activeOpacity={0.85}
          onPress={() => toggleSection(section.id)}
        >
          <View style={styles.accordionHeaderLeft}>
            <View style={styles.ruleIconWrap}>
              <View style={styles.ruleIconContainer}>
                <Ionicons name={section.icon} size={22} color={COLORS.primary} />
              </View>
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.ruleTitle}>{section.title}</Text>
              <Text style={styles.ruleSubtitle}>{section.subtitle}</Text>
            </View>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={COLORS.muted}
          />
        </TouchableOpacity>

        {expanded ? (
          <View style={styles.accordionBody}>
            {section.rules.map((rule, index) => (
              <View key={`${section.id}-${index}`} style={styles.ruleRow}>
                <View style={styles.ruleBullet} />
                <Text style={styles.ruleDescription}>{rule}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <ScreenWrapper scrollable showsVerticalScrollIndicator>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroEyebrow}>Student Dashboard</Text>
            <Text style={styles.headerTitle}>Campus Rules</Text>
            <Text style={styles.headerSubtitle}>
              {usingFallback
                ? 'Showing default guidelines until admin publishes official rules.'
                : 'Review the official RMU campus rules and guidelines.'}
            </Text>
          </View>
          <View style={styles.heroIconWrap}>
            <Ionicons name="shield-checkmark-outline" size={26} color={COLORS.white} />
          </View>
        </View>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatPill}>
            <Ionicons name="list-outline" size={14} color={COLORS.white} />
            <Text style={styles.heroStatText}>{visibleCount} sections</Text>
          </View>
          <View style={styles.heroStatPillSecondary}>
            <Ionicons name="documents-outline" size={14} color={COLORS.primary} />
            <Text style={styles.heroStatTextSecondary}>{totalRules} rules shown</Text>
          </View>
        </View>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color={COLORS.muted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search campus rules..."
            placeholderTextColor={COLORS.muted}
            style={styles.searchInput}
          />
          {searchQuery ? (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearSearchButton}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.muted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={styles.searchMetaRow}>
          <Text style={styles.searchMetaText}>
            {searchQuery ? 'Filtered by your search' : 'Tap a section to expand the rules'}
          </Text>
          <Text style={styles.searchMetaCount}>{visibleCount} visible</Text>
        </View>
      </View>

      <View style={styles.listContent}>
        {filteredSections.length > 0 ? (
          filteredSections.map(renderAccordionSection)
        ) : (
          <View style={styles.emptyStateCard}>
            <View style={styles.emptyStateIconWrap}>
              <Ionicons name="shield-outline" size={42} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyStateTitle}>No matching rules</Text>
            <Text style={styles.emptyStateText}>
              Try a different keyword or clear the search.
            </Text>
          </View>
        )}
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
  },
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#1E293B',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 6,
    lineHeight: 20,
  },
  heroIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  heroStatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  heroStatPillSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.white,
  },
  heroStatText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  heroStatTextSecondary: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  searchContainer: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.dark,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  searchMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchMetaText: {
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
  },
  searchMetaCount: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  accordionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EEF9',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  ruleIconWrap: {
    marginRight: 12,
  },
  ruleIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  ruleSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 3,
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
    backgroundColor: '#F8FAFF',
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
  },
  ruleDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    flex: 1,
  },
  ruleBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 7,
    marginRight: 10,
  },
  emptyStateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8EEF9',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  emptyStateIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 12,
  },
  emptyStateText: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 8,
  },
});

export default CampusRulesScreen;
