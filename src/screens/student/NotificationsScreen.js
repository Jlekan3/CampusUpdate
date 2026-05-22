import React, { useContext, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
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

// ── Category config ───────────────────────────────────────────────────────────
const PRIORITY = {
  emergency:      { color: '#DC2626', bg: '#FEE2E2', label: 'EMERGENCY', icon: 'warning-outline'      },
  academic:       { color: NAVY,      bg: GOLD_S,    label: 'ACADEMIC',  icon: 'school-outline'        },
  administrative: { color: '#2563EB', bg: '#DBEAFE', label: 'ADMIN',     icon: 'briefcase-outline'     },
  departmental:   { color: '#0D9488', bg: '#CCFBF1', label: 'DEPT',      icon: 'layers-outline'        },
  events:         { color: '#7C3AED', bg: '#EDE9FE', label: 'EVENT',     icon: 'calendar-outline'      },
  general:        { color: NAVY,      bg: '#EDF1F8', label: 'GENERAL',   icon: 'megaphone-outline'     },
  default:        { color: MUTED,     bg: '#F1F5F9', label: 'NOTICE',    icon: 'notifications-outline' },
};

const getPriority = (item) => {
  const cat = (item?.category || item?.type || '').toLowerCase();
  return PRIORITY[cat] || PRIORITY.default;
};

const fmtRelative = (v) => {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d)) return '';
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1)  return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const FILTERS = ['All', 'Unread', 'Academic', 'Events', 'Emergency'];

// ── Notification card ─────────────────────────────────────────────────────────
function NotifCard({ item, isNew, onPress }) {
  const pri = getPriority(item);
  return (
    <TouchableOpacity
      style={[st.card, isNew && st.cardUnread]}
      onPress={onPress}
      activeOpacity={0.87}
    >
      {/* Left accent bar */}
      <View style={[st.cardBar, { backgroundColor: pri.color }]} />

      <View style={st.cardBody}>
        {/* Top row: priority chip + time + unread dot */}
        <View style={st.cardTopRow}>
          <View style={[st.priChip, { backgroundColor: pri.bg }]}>
            <Ionicons name={pri.icon} size={9} color={pri.color} />
            <Text style={[st.priChipText, { color: pri.color }]}>{pri.label}</Text>
          </View>
          <Text style={st.cardTime}>{fmtRelative(item.createdAt)}</Text>
          {isNew && <View style={[st.unreadDot, { backgroundColor: pri.color }]} />}
        </View>

        {/* Title */}
        <Text style={[st.cardTitle, isNew && st.cardTitleBold]} numberOfLines={1}>
          {item.title || 'Campus Notice'}
        </Text>

        {/* Preview body */}
        <Text style={st.cardPreview} numberOfLines={2}>
          {item.message || item.body || item.description || ''}
        </Text>

        {/* Footer meta */}
        {(item.postedByName || item.is_pinned) ? (
          <View style={st.cardFooter}>
            {item.postedByName ? (
              <View style={st.metaRow}>
                <Ionicons name="person-outline" size={11} color={LIGHT} />
                <Text style={st.metaText}>{item.postedByName}</Text>
              </View>
            ) : null}
            {item.is_pinned ? (
              <View style={st.pinnedChip}>
                <Ionicons name="pin" size={9} color={GOLD} />
                <Text style={st.pinnedText}>Pinned</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
  const { notifications } = useContext(CampusUpdatesContext);
  const { userRole, user }  = useAuth();

  const [search,  setSearch]  = useState('');
  const [readMap, setReadMap] = useState({});
  const [filter,  setFilter]  = useState('All');

  useEffect(() => {
    if (!user?.id) { setReadMap({}); return; }
    const unsub = subscribeToUserNotificationReads(user.id, (e) => setReadMap(e || {}));
    return () => { try { unsub?.(); } catch (_) {} };
  }, [user?.id]);

  const visible = useMemo(() => {
    const staffRoles = [USER_ROLES.ADMIN, USER_ROLES.FACULTY];
    return notifications.filter((item) => {
      const audience     = (item.audience || 'everyone').toLowerCase();
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
      items = items.filter((i) => (i.title + (i.message || '') + (i.category || '')).toLowerCase().includes(q));
    }
    return items;
  }, [visible, filter, search, readMap]);

  const unread = useMemo(() => visible.filter((i) => !readMap[i.id]?.readAt).length, [visible, readMap]);
  const emergencyCount = useMemo(() => visible.filter((i) => (i.category || '').toLowerCase() === 'emergency' && !readMap[i.id]?.readAt).length, [visible, readMap]);

  const handleRead = async (item) => {
    if (!readMap[item.id]?.readAt && user?.id) {
      await markNotificationAsRead(user.id, item.id).catch(() => {});
    }
  };

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
            <Text style={st.headerTitle}>Notifications</Text>
          </View>
          {unread > 0 && (
            <View style={st.unreadBadge}>
              <Text style={st.unreadBadgeText}>{unread}</Text>
            </View>
          )}
        </View>
        <Text style={st.headerSub}>Academic updates, campus notices and alerts</Text>
      </View>

      {/* ── Emergency nudge ── */}
      {emergencyCount > 0 && (
        <TouchableOpacity
          style={st.emergencyNudge}
          onPress={() => setFilter('Emergency')}
          activeOpacity={0.88}
        >
          <View style={st.emergencyNudgeLeft}>
            <View style={st.emergencyBell}>
              <Ionicons name="notifications" size={18} color="#DC2626" />
            </View>
            <View>
              <Text style={st.emergencyNudgeCount}>{emergencyCount} Active Urgent Alert{emergencyCount > 1 ? 's' : ''}</Text>
              <Text style={st.emergencyNudgeSub}>Tap to view emergency notices</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#DC2626" />
        </TouchableOpacity>
      )}

      {/* ── Search ── */}
      <View style={st.searchWrap}>
        <Ionicons name="search-outline" size={16} color={LIGHT} />
        <TextInput
          style={st.searchInput}
          placeholder="Search notifications…"
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

      {/* ── Filter pills ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterRow}>
        {FILTERS.map((f) => {
          const isUnread = f === 'Unread' && unread > 0;
          const isEmergency = f === 'Emergency' && emergencyCount > 0;
          return (
            <TouchableOpacity
              key={f}
              style={[
                st.pill,
                filter === f && st.pillActive,
                isEmergency && filter !== f && st.pillEmergency,
              ]}
              onPress={() => setFilter(f)}
              activeOpacity={0.8}
            >
              <Text style={[
                st.pillText,
                filter === f && st.pillTextActive,
                isEmergency && filter !== f && { color: '#DC2626' },
              ]}>{f}</Text>
              {isUnread && filter !== f && (
                <View style={st.pillDot} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Count row ── */}
      <View style={st.countRow}>
        <Text style={st.countText}>
          {filtered.length} {filtered.length === 1 ? 'notification' : 'notifications'}
        </Text>
        {unread > 0 && filter !== 'Unread' && (
          <Text style={st.unreadCount}>{unread} unread</Text>
        )}
      </View>

      {/* ── List ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item, i) => item.id || String(i)}
        renderItem={({ item }) => (
          <NotifCard
            item={item}
            isNew={!readMap[item.id]?.readAt}
            onPress={() => handleRead(item)}
          />
        )}
        contentContainerStyle={st.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={st.empty}>
            <View style={st.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={32} color={LIGHT} />
            </View>
            <Text style={st.emptyTitle}>No notifications</Text>
            <Text style={st.emptySub}>
              {filter !== 'All' ? 'Try a different filter or search term.' : 'Check back later for campus updates.'}
            </Text>
          </View>
        }
      />
    </ScreenWrapper>
  );
}

const st = StyleSheet.create({
  // ── Header ──────────────────────────────────────────────────────────────────
  header:          { backgroundColor: NAVY, paddingTop: 52, paddingBottom: 20, paddingHorizontal: 20 },
  headerGoldBar:   { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: GOLD },
  headerContent:   { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  backBtn:         { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  headerEyebrow:   { fontSize: 10, fontWeight: '800', letterSpacing: 2.5, color: GOLD, textTransform: 'uppercase' },
  headerTitle:     { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  headerSub:       { fontSize: 12, color: 'rgba(255,255,255,0.55)', letterSpacing: 0.2 },
  unreadBadge:     { minWidth: 32, height: 32, borderRadius: 16, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
  unreadBadgeText: { fontSize: 13, fontWeight: '900', color: NAVY },

  // ── Emergency nudge ──────────────────────────────────────────────────────────
  emergencyNudge:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 14, backgroundColor: '#FFF5F5', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#FECACA' },
  emergencyNudgeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  emergencyBell:      { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  emergencyNudgeCount:{ fontSize: 14, fontWeight: '800', color: '#DC2626' },
  emergencyNudgeSub:  { fontSize: 11, color: '#EF4444', marginTop: 1 },

  // ── Search ──────────────────────────────────────────────────────────────────
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 14, backgroundColor: SURFACE, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: BORDER, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  searchInput: { flex: 1, fontSize: 14, color: SLATE, padding: 0 },

  // ── Filter pills ─────────────────────────────────────────────────────────────
  filterRow:      { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
  pill:           { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  pillActive:     { backgroundColor: NAVY, borderColor: NAVY },
  pillEmergency:  { borderColor: '#FECACA', backgroundColor: '#FFF5F5' },
  pillText:       { fontSize: 12, fontWeight: '600', color: MUTED },
  pillTextActive: { color: '#fff', fontWeight: '700' },
  pillDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD },

  // ── Count row ────────────────────────────────────────────────────────────────
  countRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
  countText:   { fontSize: 12, fontWeight: '600', color: LIGHT },
  unreadCount: { fontSize: 12, fontWeight: '700', color: GOLD },

  // ── Cards ────────────────────────────────────────────────────────────────────
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 8 },
  card: {
    flexDirection: 'row',
    backgroundColor: SURFACE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardUnread:    { borderColor: 'rgba(197,160,71,0.25)', backgroundColor: '#FFFEF8' },
  cardBar:       { width: 4 },
  cardBody:      { flex: 1, padding: 14 },
  cardTopRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  priChip:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  priChipText:   { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  cardTime:      { fontSize: 11, color: LIGHT, flex: 1, textAlign: 'right' },
  unreadDot:     { width: 7, height: 7, borderRadius: 4 },
  cardTitle:     { fontSize: 14, fontWeight: '600', color: MUTED, marginBottom: 4, letterSpacing: -0.1 },
  cardTitleBold: { fontWeight: '800', color: SLATE },
  cardPreview:   { fontSize: 12, color: LIGHT, lineHeight: 18 },
  cardFooter:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  metaRow:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:      { fontSize: 11, color: LIGHT },
  pinnedChip:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: GOLD_S, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  pinnedText:    { fontSize: 10, fontWeight: '700', color: GOLD },

  // ── Empty ────────────────────────────────────────────────────────────────────
  empty:      { alignItems: 'center', paddingTop: 56, paddingHorizontal: 40, gap: 10 },
  emptyIcon:  { width: 68, height: 68, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: SLATE },
  emptySub:   { fontSize: 13, color: LIGHT, textAlign: 'center', lineHeight: 19 },
});
