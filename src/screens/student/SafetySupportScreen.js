import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Linking,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { COLORS, CAMPUS_EMERGENCY_CONTACTS } from '../../utils/constants';

const emergencyContacts = CAMPUS_EMERGENCY_CONTACTS;

const SUPPORT_THEME = '#7F1D1D';
const SUPPORT_THEME_LIGHT = '#FEF2F2';

const SafetySupportScreen = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleCall = (number) => {
    Linking.openURL(`tel:${number.replace(/\D/g, '')}`);
  };

  const filteredContacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return emergencyContacts;

    return emergencyContacts.filter((item) => {
      const fields = [item.title, item.number, item.description]
        .map((value) => (value || '').toString().toLowerCase());

      return fields.some((value) => value.includes(query));
    });
  }, [searchQuery]);

  const visibleCount = filteredContacts.length;

  const renderContactCard = ({ item }) => (
    <TouchableOpacity style={styles.contactCard} activeOpacity={0.88}>
      <View style={styles.contactCardTopRow}>
        <View style={[styles.contactIconWrap, { backgroundColor: SUPPORT_THEME_LIGHT }]}>
          <View style={[styles.contactIcon, { backgroundColor: item.color + '22' }]}>
            <Ionicons name={item.icon} size={24} color={item.color} />
          </View>
        </View>
        <View style={styles.contactPill}>
          <Ionicons name="call-outline" size={12} color={SUPPORT_THEME} />
          <Text style={[styles.contactPillText, { color: SUPPORT_THEME }]}>Tap to call</Text>
        </View>
      </View>

      <View style={styles.contactInfo}>
        <Text style={styles.contactTitle}>{item.title}</Text>
        <Text style={styles.contactDesc}>{item.description}</Text>
        <Text style={styles.contactNumber}>{item.number}</Text>
      </View>

      <TouchableOpacity style={styles.callButton} onPress={() => handleCall(item.number)}>
        <Ionicons name="call" size={18} color={COLORS.white} />
        <Text style={styles.callButtonText}>Call now</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper scrollable showsVerticalScrollIndicator>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroEyebrow}>Student Dashboard</Text>
              <Text style={styles.headerTitle}>Safety &amp; Support</Text>
              <Text style={styles.headerSubtitle}>
                Reach emergency contacts and review key campus rules.
              </Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={26} color={COLORS.white} />
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatPill}>
              <Ionicons name="call-outline" size={14} color={COLORS.white} />
              <Text style={styles.heroStatText}>{emergencyContacts.length} contacts</Text>
            </View>
            <View style={styles.heroStatPillSecondary}>
              <Ionicons name="search-outline" size={14} color={SUPPORT_THEME} />
              <Text style={styles.heroStatTextSecondary}>{visibleCount} visible</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={18} color={COLORS.muted} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search contacts or rules..."
              placeholderTextColor={COLORS.muted}
              style={styles.searchInput}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchButton} activeOpacity={0.8}>
                <Ionicons name="close-circle" size={18} color={COLORS.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.searchMetaRow}>
            <Text style={styles.searchMetaText}>
              {searchQuery ? 'Filtered support contacts' : 'Quick access to emergency help'}
            </Text>
            <Text style={styles.searchMetaCount}>{visibleCount} shown</Text>
          </View>
        </View>

        <ScrollView
          style={styles.supportContainer}
          contentContainerStyle={styles.supportContent}
          showsVerticalScrollIndicator
          nestedScrollEnabled
        >
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Emergency Contacts</Text>
              <Text style={styles.sectionSubtitle}>
                For urgent situations, please use one of the contacts below.
              </Text>
            </View>
            <View style={styles.sectionBadge}>
              <Ionicons name="flash-outline" size={12} color={COLORS.primary} />
              <Text style={styles.sectionBadgeText}>24/7 ready</Text>
            </View>
          </View>

          <FlatList
            data={filteredContacts}
            renderItem={renderContactCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyStateIconWrap}>
                  <Ionicons name="shield-outline" size={42} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'No matching contacts' : 'No contacts available'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {searchQuery ? 'Try a different keyword or clear the search.' : 'Emergency contacts will appear here.'}
                </Text>
              </View>
            }
          />
        </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: SUPPORT_THEME,
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
    color: SUPPORT_THEME,
    fontSize: 12,
    fontWeight: '700',
  },
  searchContainer: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#F3D5D5',
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
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
    color: SUPPORT_THEME,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 20,
  },
  supportContainer: {
    maxHeight: 400,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3D5D5',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  supportContent: {
    padding: 16,
    paddingBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 12,
    lineHeight: 18,
  },
  sectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: SUPPORT_THEME_LIGHT,
  },
  sectionBadgeText: {
    fontSize: 11,
    color: SUPPORT_THEME,
    fontWeight: '700',
  },
  contactCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F3D5D5',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  contactCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  contactIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: SUPPORT_THEME_LIGHT,
  },
  contactPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  contactInfo: {
    flex: 1,
    marginBottom: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.dark,
  },
  contactDesc: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  contactNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    backgroundColor: SUPPORT_THEME,
  },
  callButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyStateIconWrap: {
    width: 74,
    height: 74,
    borderRadius: 22,
    backgroundColor: SUPPORT_THEME_LIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  ruleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: COLORS.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  ruleTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  ruleItemsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
    backgroundColor: '#F9FAFB',
  },
  ruleDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});

export default SafetySupportScreen;
