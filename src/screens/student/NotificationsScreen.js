import React, { useContext, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { COLORS, USER_ROLES } from '../../utils/constants';
import { CampusUpdatesContext } from '../../context/CampusUpdatesContext';
import { useAuth } from '../../context/AuthContext';
import {
  markNotificationAsRead,
  subscribeToUserNotificationReads,
} from '../../services/databaseService';

const NOTIFICATION_COLOR = '#06B6D4';

const NotificationsScreen = ({ navigation }) => {
  const { notifications } = useContext(CampusUpdatesContext);
  const { userRole, user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [readMap, setReadMap] = useState({});
  const [filterMode, setFilterMode] = useState('all');

  useEffect(() => {
    if (!user?.id) {
      setReadMap({});
      return undefined;
    }

    const unsubscribe = subscribeToUserNotificationReads(user.id, (entries) => {
      setReadMap(entries || {});
    });

    return () => {
      try {
        unsubscribe?.();
      } catch (error) {
        // ignore
      }
    };
  }, [user?.id]);

  const visibleNotifications = useMemo(() => {
    const userId = user?.id;
    const staffRoles = [USER_ROLES.ADMIN, USER_ROLES.FACULTY];

    return notifications.filter((item) => {
      const audience = (item.audience || 'everyone').toString().toLowerCase();
      const recipientIds = Array.isArray(item.recipientIds)
        ? item.recipientIds.filter(Boolean)
        : item.recipientId
          ? [item.recipientId]
          : [];
      const isDirect = audience === 'direct' || recipientIds.length > 0;

      if (isDirect) {
        if (!userId) return false;
        return recipientIds.includes(userId);
      }

      if (audience === 'staff') {
        return staffRoles.includes(userRole);
      }

      return true;
    });
  }, [notifications, user?.id, userRole]);

  const unreadNotificationCount = useMemo(
    () => visibleNotifications.filter((item) => !readMap[item.id]?.readAt).length,
    [readMap, visibleNotifications]
  );

  const readNotificationCount = useMemo(
    () => visibleNotifications.length - unreadNotificationCount,
    [unreadNotificationCount, visibleNotifications.length]
  );

  const filteredNotifications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let items = visibleNotifications;

    if (filterMode === 'unread') {
      items = items.filter((item) => !readMap[item.id]?.readAt);
    } else if (filterMode === 'read') {
      items = items.filter((item) => !!readMap[item.id]?.readAt);
    }

    if (!query) return items;

    return items.filter((item) => {
      const title = (item.title || '').toLowerCase();
      const body = (item.body || '').toLowerCase();

      return title.includes(query) || body.includes(query);
    });
  }, [filterMode, readMap, searchQuery, visibleNotifications]);

  const handleMarkAsRead = async (notificationId) => {
    if (!user?.id || !notificationId) return;

    try {
      setReadMap((current) => ({
        ...current,
        [notificationId]: { readAt: new Date() },
      }));
      await markNotificationAsRead(user.id, notificationId);
    } catch (error) {
      setReadMap((current) => {
        const next = { ...current };
        delete next[notificationId];
        return next;
      });
    }
  };

  return (
    <ScreenWrapper backgroundColor="#F3F8FF" statusBarStyle="dark-content">
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate('Home')}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.heroIconWrap}>
              <Ionicons name="notifications-outline" size={20} color={COLORS.white} />
            </View>
          </View>
          <Text style={styles.heroTitle}>Notifications</Text>
          <Text style={styles.heroSubtitle}>Keep up with campus updates and quickly clear what you have already seen.</Text>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.muted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search notifications..."
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

        <View style={styles.filterRow}>
          {[
            { key: 'all', label: 'All', count: visibleNotifications.length },
            { key: 'unread', label: 'Unread', count: unreadNotificationCount },
            { key: 'read', label: 'Read', count: readNotificationCount },
          ].map((filter) => {
            const active = filterMode === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setFilterMode(filter.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterPillLabel, active && styles.filterPillLabelActive]}>{filter.label}</Text>
                <View style={[styles.filterPillCount, active && styles.filterPillCountActive]}>
                  <Text style={[styles.filterPillCountText, active && styles.filterPillCountTextActive]}>
                    {filter.count > 99 ? '99+' : filter.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={filteredNotifications}
          keyExtractor={(i) => i.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={filteredNotifications.length === 0 ? styles.emptyContainer : styles.listContent}
          renderItem={({ item }) => {
            const createdAt = item.createdAt ? new Date(item.createdAt) : null;
            const timeLabel = createdAt
              ? createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : null;
            const dateLabel = createdAt
              ? createdAt.toLocaleDateString([], { month: 'short', day: 'numeric' })
              : null;
            const isRead = !!readMap[item.id]?.readAt;
            const accentColor = isRead ? '#94A3B8' : COLORS.primary;
            const recipientIds = Array.isArray(item.recipientIds)
              ? item.recipientIds.filter(Boolean)
              : item.recipientId
                ? [item.recipientId]
                : [];
            const isDirect = (item.audience || '').toString().toLowerCase() === 'direct' || recipientIds.length > 0;

            return (
              <View style={[styles.item, isRead && styles.itemRead]}>
                <View style={[styles.itemAccent, { backgroundColor: accentColor }]} />
                <View style={styles.itemBody}>
                  <View style={styles.itemHeader}>
                    <View style={[styles.iconBadge, isRead && styles.iconBadgeRead]}>
                      <Ionicons name="notifications-outline" size={18} color={isRead ? '#6B7280' : COLORS.primary} />
                    </View>
                    <View style={styles.headerTextArea}>
                      <Text style={[styles.itemTitle, isRead && styles.itemTitleRead]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={styles.metaRow}>
                        {timeLabel ? <Text style={styles.timestamp}>{timeLabel}</Text> : null}
                        {dateLabel ? <Text style={styles.timestamp}>{dateLabel}</Text> : null}
                      </View>
                    </View>
                    <View style={[styles.statusPill, isRead ? styles.statusPillRead : styles.statusPillUnread]}>
                      <Ionicons
                        name={isRead ? 'checkmark-done' : 'ellipse'}
                        size={11}
                        color={isRead ? '#15803D' : '#1D4ED8'}
                      />
                      <Text style={[styles.statusPillText, isRead ? styles.statusPillTextRead : styles.statusPillTextUnread]}>
                        {isRead ? 'Read' : 'New'}
                      </Text>
                    </View>
                  </View>

                  {isDirect ? (
                    <View style={styles.directBadgeRow}>
                      <Ionicons name="person-circle-outline" size={12} color="#0F766E" style={styles.directBadgeIcon} />
                      <Text style={styles.directBadgeLabel} numberOfLines={1}>
                        {item.recipientName ? `Direct to ${item.recipientName}` : 'Direct message'}
                      </Text>
                    </View>
                  ) : null}

                  {item.body ? (
                    <Text style={[styles.itemText, isRead && styles.itemTextRead]} numberOfLines={3}>
                      {item.body}
                    </Text>
                  ) : null}

                  <View style={styles.itemFooter}>
                    {!isRead && user?.id ? (
                      <TouchableOpacity
                        style={styles.markReadButton}
                        onPress={() => handleMarkAsRead(item.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.primary} />
                        <Text style={styles.markReadButtonText}>Mark as read</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.readNote}>
                        <Ionicons name="checkmark-done" size={14} color="#15803D" />
                        <Text style={styles.readNoteText}>You already viewed this update</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="notifications-off-outline" size={34} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No matching notifications' : filterMode === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Try a different keyword or clear the search.'
                  : filterMode === 'read'
                    ? 'Read items will show here after you open them.'
                    : 'You’ll see important campus updates here.'}
              </Text>
            </View>
          }
        />
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12, paddingHorizontal: 20 },
  heroCard: {
    backgroundColor: NOTIFICATION_COLOR,
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
  },
  heroGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    top: -60,
    right: -50,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  heroIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: 'rgba(255,255,255,0.92)',
    maxWidth: 320,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 14,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 14,
    color: COLORS.dark,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  filterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterPillActive: {
    backgroundColor: NOTIFICATION_COLOR,
    borderColor: NOTIFICATION_COLOR,
  },
  filterPillLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  filterPillLabelActive: {
    color: COLORS.white,
  },
  filterPillCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterPillCountActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  filterPillCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  filterPillCountTextActive: {
    color: COLORS.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  listContent: {
    paddingTop: 2,
    paddingBottom: 20,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    overflow: 'hidden',
  },
  itemRead: {
    backgroundColor: '#F8FAFC',
  },
  itemAccent: {
    width: 6,
  },
  itemBody: {
    flex: 1,
    padding: 14,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#ECFEFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  iconBadgeRead: {
    backgroundColor: '#E5E7EB',
  },
  headerTextArea: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontWeight: '700',
    color: COLORS.dark,
    fontSize: 15,
  },
  itemTitleRead: {
    color: '#475569',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 3,
  },
  itemText: {
    color: COLORS.muted,
    marginTop: 4,
    fontSize: 13,
    lineHeight: 20,
  },
  itemTextRead: {
    color: '#94A3B8',
  },
  directBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  directBadgeIcon: {
    marginRight: 6,
  },
  directBadgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  timestamp: {
    color: '#9CA3AF',
    fontSize: 11,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    marginLeft: 8,
  },
  statusPillUnread: {
    backgroundColor: '#CFFAFE',
  },
  statusPillRead: {
    backgroundColor: '#ECFDF5',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusPillTextUnread: {
    color: NOTIFICATION_COLOR,
  },
  statusPillTextRead: {
    color: '#15803D',
  },
  itemFooter: {
    marginTop: 10,
  },
  readNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readNoteText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  markReadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
  },
  markReadButtonText: {
    color: NOTIFICATION_COLOR,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#CFFAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
});

export default NotificationsScreen;
