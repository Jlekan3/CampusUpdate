import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { USER_ROLES } from '../../utils/constants';
import { CampusUpdatesContext } from '../../context/CampusUpdatesContext';
import { useAuth } from '../../context/AuthContext';
import {
  markNotificationAsRead,
  subscribeToUserNotificationReads,
} from '../../services/databaseService';

const NAVY = '#1A365D';
const GOLD = '#C5A047';
const BG   = '#F8F9FA';

const PRIORITY = {
  emergency:      { color: '#E53E3E', bg: '#FEE2E2', label: 'Emergency' },
  academic:       { color: NAVY,      bg: 'rgba(197,160,71,0.14)', label: 'Academic' },
  administrative: { color: '#2563EB', bg: '#DBEAFE', label: 'Admin' },
  departmental:   { color: '#0D9488', bg: '#CCFBF1', label: 'Department' },
  events:         { color: '#7C3AED', bg: '#EDE9FE', label: 'Event' },
  default:        { color: NAVY,      bg: '#EDF1F8', label: 'Notice' },
};

const getPriority = (item) => {
  const cat = (item?.category || item?.type || '').toLowerCase();
  return PRIORITY[cat] || PRIORITY.default;
};

const fmtRelative = (v) => {
  if (!v) return '';
  const d  = v instanceof Date ? v : new Date(v);
  if (isNaN(d)) return '';
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1)   return 'Just now';
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const FILTERS = ['All', 'Unread', 'Academic', 'Events', 'Emergency'];

export default function NotificationsScreen({ navigation }) {
  const { notifications } = useContext(CampusUpdatesContext);
  const { userRole, user }  = useAuth();

  const [search,     setSearch]     = useState('');
  const [readMap,    setReadMap]    = useState({});
  const [filter,     setFilter]     = useState('All');

  useEffect(() => {
    if (!user?.id) { setReadMap({}); return; }
    const unsub = subscribeToUserNotificationReads(user.id, (e) => setReadMap(e || {}));
    return () => { try { unsub?.(); } catch (_) {} };
  }, [user?.id]);

  const visible = useMemo(() => {
    const staffRoles = [USER_ROLES.ADMIN, USER_ROLES.FACULTY];
    return notifications.filter((item) => {
      const audience    = (item.audience || 'everyone').toLowerCase();
      const recipientIds = Array.isArray(item.recipientIds) ? item.recipientIds : item.recipientId ? [item.recipientId] : [];
      if (audience === 'direct' || recipientIds.length > 0) return user?.id && recipientIds.includes(user.id);
      if (audience === 'staff') return staffRoles.includes(userRole);
      return true;
    });
  }, [notifications, user?.id, userRole]);

  const filtered = useMemo(() => {
    let items = visible;
    if (filter === 'Unread') items = items.filter((i) => !readMap[i.id]?.readAt);
    else if (filter !== 'All') items = items.filter((i) => (i.category || '').toLowerCase().includes(filter.toLowerCase()));
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((i) => (i.title + i.message + i.category).toLowerCase().includes(q));
    }
    return items;
  }, [visible, filter, search, readMap]);

  const unread = useMemo(() => visible.filter((i) => !readMap[i.id]?.readAt).length, [visible, readMap]);

  const handleRead = async (item) => {
    if (!readMap[item.id]?.readAt && user?.id) {
      await markNotificationAsRead(user.id, item.id).catch(() => {});
    }
  };

  const canGoBack = navigation?.canGoBack?.();

  const renderItem = ({ item }) => {
    const pri  = getPriority(item);
    const isNew = !readMap[item.id]?.readAt;
    return (
      <TouchableOpacity
        style={[styles.card, isNew && styles.cardUnread]}
        activeOpacity={0.85}
        onPress={() => handleRead(item)}
      >
        {isNew && <View style={[styles.cardDot, { backgroundColor: pri.color }]} />}
        <View style={[styles.cardLeftBar, { backgroundColor: pri.color }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <View style={[styles.priChip, { backgroundColor: pri.bg }]}>
              <Text style={[styles.priChipText, { color: pri.color }]}>{pri.label}</Text>
            </View>
            <Text style={styles.cardTime}>{fmtRelative(item.createdAt)}</Text>
          </View>
          <Text style={[styles.cardTitle, isNew && styles.cardTitleBold]} numberOfLines={1}>
            {item.title || 'Campus Notice'}
          </Text>
          <Text style={styles.cardPreview} numberOfLines={2}>
            {item.message || item.body || item.description || ''}
          </Text>
          {item.postedByName ? (
            <Text style={styles.cardMeta}>Posted by {item.postedByName}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

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
            <Text style={styles.headerTitle}>Notifications</Text>
          </View>
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unread} new</Text>
            </View>
          )}
        </View>
        <Text style={styles.headerSub}>Academic updates, campus notices and alerts.</Text>
      </View>

      {/* ── Search ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={GOLD} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notifications…"
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

      {/* ── Filter chips ── */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, filter === f && styles.chipActive]}
            onPress={() => setFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item, i) => item.id || String(i)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color={GOLD} />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySub}>
              {filter !== 'All' ? 'Try a different filter.' : 'Check back later for campus updates.'}
            </Text>
          </View>
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  // Header
  header:          { backgroundColor: NAVY, paddingTop: 52, paddingBottom: 22, paddingHorizontal: 20, overflow: 'hidden' },
  headerGoldBar:   { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: GOLD },
  headerContent:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  backBtn:         { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
  headerEyebrow:   { fontSize: 10, fontWeight: '800', letterSpacing: 2, color: GOLD, textTransform: 'uppercase' },
  headerTitle:     { fontSize: 26, fontWeight: '800', color: '#fff' },
  headerSub:       { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  unreadBadge:     { backgroundColor: GOLD, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  unreadBadgeText: { fontSize: 12, fontWeight: '800', color: NAVY },

  // Search
  searchWrap: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  searchBar:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(26,54,93,0.10)', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  searchInput:{ flex: 1, fontSize: 14, color: '#2D3748', padding: 0 },

  // Filters
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  chip:      { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(26,54,93,0.12)' },
  chipActive:    { backgroundColor: NAVY, borderColor: NAVY },
  chipText:      { fontSize: 12, fontWeight: '600', color: '#718096' },
  chipTextActive:{ color: '#fff' },

  // Cards
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row', backgroundColor: '#fff', borderRadius: 18, borderWidth: 1,
    borderColor: 'rgba(26,54,93,0.08)', marginBottom: 10, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1,
  },
  cardUnread:    { borderColor: 'rgba(197,160,71,0.30)', backgroundColor: '#FFFEF8' },
  cardDot:       { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4 },
  cardLeftBar:   { width: 4, borderRadius: 0 },
  cardBody:      { flex: 1, padding: 14 },
  cardTopRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  priChip:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  priChipText:   { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  cardTime:      { fontSize: 11, color: '#A0AEC0' },
  cardTitle:     { fontSize: 14, color: '#2D3748', marginBottom: 4 },
  cardTitleBold: { fontWeight: '700' },
  cardPreview:   { fontSize: 12, color: '#718096', lineHeight: 17 },
  cardMeta:      { fontSize: 11, color: '#A0AEC0', marginTop: 6 },

  // Empty
  empty:      { flex: 1, alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2D3748' },
  emptySub:   { fontSize: 13, color: '#718096', textAlign: 'center', maxWidth: 240 },
});
