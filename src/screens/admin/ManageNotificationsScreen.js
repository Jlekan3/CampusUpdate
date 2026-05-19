import React, { useEffect, useState, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Alert, Modal, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import CustomButton from '../../components/CustomButton';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { CampusUpdatesContext } from '../../context/CampusUpdatesContext';
import { USER_ROLES } from '../../utils/constants';
import { subscribeToLocations } from '../../services/databaseService';

const EVENT_CATEGORIES = ['Academic', 'Career', 'Sports', 'Social', 'Cultural', 'Health'];
const NOTIFICATION_AUDIENCES = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'staff', label: 'Staff only' },
];
const FEED_FILTERS = [
  { value: 'all', label: 'All updates' },
  { value: 'notification', label: 'Notices' },
  { value: 'event', label: 'Events' },
];

const ManageNotificationsScreen = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [contentType, setContentType] = useState('notification'); // 'notification' or 'event'
  const [editingId, setEditingId] = useState(null);
  const [editingType, setEditingType] = useState(null);
  const [notificationAudience, setNotificationAudience] = useState('everyone');
  const [eventAudience, setEventAudience] = useState('everyone');
  
  // Event specific fields
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventLocationId, setEventLocationId] = useState('');
  const [locations, setLocations] = useState([]);
  const [eventCategory, setEventCategory] = useState('Academic');
  const [activeFilter, setActiveFilter] = useState('all');
  
  const { userRole } = useAuth();
  const campusUpdates = useContext(CampusUpdatesContext);
  const { notifications, events, postNotification, postEvent, deleteNotification, deleteEvent, updateNotification, updateEvent } = campusUpdates;

  // Display both notifications and events
  const allItems = [
    ...notifications.map(n => ({ ...n, type: 'notification' })),
    ...events.map(e => ({ ...e, type: 'event' })),
  ].sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return allItems;
    return allItems.filter((item) => item.type === activeFilter);
  }, [allItems, activeFilter]);

  const directNotificationCount = useMemo(() => {
    return notifications.filter((item) => {
      const rawAudience = (item?.audience || '').toString().toLowerCase();
      if (rawAudience === 'direct') return true;
      if (Array.isArray(item?.recipientIds) && item.recipientIds.length > 0) return true;
      return Boolean(item?.recipientId);
    }).length;
  }, [notifications]);

  const heroStats = [
    {
      id: 'total',
      label: 'Total updates',
      value: allItems.length,
      icon: 'pulse-outline',
      color: '#38BDF8',
    },
    {
      id: 'events',
      label: 'Featured events',
      value: events.length,
      icon: 'calendar-outline',
      color: '#A78BFA',
    },
    {
      id: 'direct',
      label: 'Direct notices',
      value: directNotificationCount,
      icon: 'person-circle-outline',
      color: '#FB7185',
    },
  ];

  useEffect(() => {
    const unsubscribe = subscribeToLocations((items) => {
      setLocations(items || []);
    });

    return () => {
      try {
        unsubscribe?.();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  const resetForm = () => {
    setTitle('');
    setBody('');
    setEventDate('');
    setEventTime('');
    setEventLocation('');
    setEventLocationId('');
    setEventCategory('Academic');
    setNotificationAudience('everyone');
    setEventAudience('everyone');
    setContentType('notification');
    setEditingId(null);
    setEditingType(null);
    setShowForm(false);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditingType(item.type);
    setContentType(item.type);
    setTitle(item.title);
    
    if (item.type === 'event') {
      setEventDate(item.date);
      setEventTime(item.time);
      setEventLocation(item.location);
      setEventLocationId(item.locationId || '');
      setEventCategory(item.category);
      setEventAudience(item.audience || 'everyone');
    } else {
      setBody(item.body);
      setNotificationAudience(item.audience || 'everyone');
    }
    
    setShowForm(true);
  };

  const handleDraft = async () => {
    // Draft functionality not available in real-time mode
    Alert.alert('Info', 'In real-time mode, items are either posted or discarded');
  };

  const handlePost = async () => {
    if (userRole !== USER_ROLES.ADMIN) return Alert.alert('Unauthorized', 'You are not allowed to perform this action');
    
    // Check if editing
    if (editingId) {
      if (editingType === 'notification') {
        if (!title.trim() || !body.trim()) return Alert.alert('Validation', 'Both title and body are required');
        try {
          updateNotification(editingId, {
            title: title.trim(),
            body: body.trim(),
          });
          resetForm();
          Alert.alert('Success', 'Notification updated!');
        } catch (err) {
          Alert.alert('Error', 'Unable to update notification');
        }
      } else {
        if (!title.trim() || !eventDate.trim() || !eventTime.trim() || !eventLocation.trim()) {
          return Alert.alert('Validation', 'Event title, date, time, and campus location are required');
        }
        try {
          updateEvent(editingId, {
            title: title.trim(),
            date: eventDate.trim(),
            time: eventTime.trim(),
            location: eventLocation.trim(),
            locationId: eventLocationId,
            category: eventCategory,
            audience: eventAudience,
          });
          resetForm();
          Alert.alert('Success', 'Event updated!');
        } catch (err) {
          Alert.alert('Error', 'Unable to update event');
        }
      }
      return;
    }

    // Creating new item
    if (contentType === 'notification') {
      if (!title.trim() || !body.trim()) return Alert.alert('Validation', 'Both title and body are required');
      try {
        postNotification({ 
          title: title.trim(), 
          body: body.trim(),
          type: 'notification',
          audience: notificationAudience,
        });
        resetForm();
        Alert.alert('Success', 'Notification posted! Students will see it immediately.');
      } catch (err) {
        Alert.alert('Error', 'Unable to post notification');
      }
    } else {
      if (!title.trim() || !eventDate.trim() || !eventTime.trim() || !eventLocation.trim()) {
        return Alert.alert('Validation', 'Event title, date, time, and campus location are required');
      }
      try {
        postEvent({
          title: title.trim(),
          date: eventDate.trim(),
          time: eventTime.trim(),
          location: eventLocation.trim(),
          locationId: eventLocationId,
          category: eventCategory,
          audience: eventAudience,
          type: 'event',
        });
        resetForm();
        Alert.alert('Success', 'Event posted! Students will see it immediately.');
      } catch (err) {
        Alert.alert('Error', 'Unable to post event');
      }
    }
  };

  const handleDelete = (id, type) => {
    Alert.alert('Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        try {
          if (type === 'notification') {
            deleteNotification(id);
          } else {
            deleteEvent(id);
          }
        } catch (err) {
          Alert.alert('Error', 'Unable to delete');
        }
      } }
    ]);
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'posted': return '#10B981';
      case 'draft': return '#F59E0B';
      case 'archived': return '#6B7280';
      default: return '#10B981';
    }
  };

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Campus Updates</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowForm(true)}
          >
            <Ionicons name="add-circle" size={32} color="#1e40af" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredItems}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator
          ListHeaderComponent={(
            <View style={styles.listHeader}>
              <View style={styles.heroCard}>
                <View style={styles.heroTopRow}>
                  <View style={styles.heroCopy}>
                    <Text style={styles.heroEyebrow}>Broadcast studio</Text>
                    <Text style={styles.heroTitle}>Campus updates hub</Text>
                    <Text style={styles.heroSubtitle}>
                      Craft instant notices or spotlight upcoming events for students and staff.
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.heroCTA} onPress={() => setShowForm(true)} activeOpacity={0.88}>
                    <Ionicons name="create-outline" size={18} color={COLORS.white} />
                    <Text style={styles.heroCTAText}>Compose update</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.heroStatsRow}>
                  {heroStats.map((stat) => (
                    <View key={stat.id} style={styles.heroStatCard}>
                      <View style={[styles.heroStatIcon, { backgroundColor: `${stat.color}26` }]}> 
                        <Ionicons name={stat.icon} size={16} color={stat.color} />
                      </View>
                      <Text style={styles.heroStatValue}>{stat.value}</Text>
                      <Text style={styles.heroStatLabel}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.filterRow}>
                {FEED_FILTERS.map((filter) => (
                  <TouchableOpacity
                    key={filter.value}
                    style={[styles.filterChip, activeFilter === filter.value && styles.filterChipActive]}
                    onPress={() => setActiveFilter(filter.value)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[styles.filterChipText, activeFilter === filter.value && styles.filterChipTextActive]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          renderItem={({ item }) => {
            const recipientIds = Array.isArray(item.recipientIds)
              ? item.recipientIds.filter(Boolean)
              : item.recipientId
                ? [item.recipientId]
                : [];
            const isDirectAudience = (item.audience || '').toString().toLowerCase() === 'direct' || recipientIds.length > 0;

            const audienceBadgeStyle = () => {
              if (item.audience === 'staff') return styles.audienceBadgeStaff;
              if (isDirectAudience) return styles.audienceBadgeDirect;
              return styles.audienceBadgeEveryone;
            };

            const audienceIcon = () => {
              if (item.audience === 'staff') return 'people-outline';
              if (isDirectAudience) return 'person-circle-outline';
              return 'globe-outline';
            };

            const audienceLabel = () => {
              if (item.audience === 'staff') return 'Staff only';
              if (isDirectAudience) {
                return item.recipientName ? `Direct • ${item.recipientName}` : 'Direct message';
              }
              return 'Everyone';
            };

            const audienceTextStyle = () => {
              if (item.audience === 'staff') return styles.audienceBadgeTextStaff;
              if (isDirectAudience) return styles.audienceBadgeTextDirect;
              return styles.audienceBadgeTextEveryone;
            };

            const formattedTime = item.createdAt
              ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '';

            return (
              <View style={styles.notificationCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={[styles.cardTypeIndicator, item.type === 'event' && styles.cardTypeIndicatorEvent]}>
                    <Ionicons
                      name={item.type === 'event' ? 'calendar-outline' : 'notifications-outline'}
                      size={16}
                      color={COLORS.white}
                      style={styles.cardTypeIcon}
                    />
                    <Text style={styles.typeLabel}>{item.type === 'event' ? 'Event' : 'Notice'}</Text>
                  </View>
                  <View style={styles.cardHeaderMeta}>
                    <View style={[styles.statusBadge, { backgroundColor: '#10B981' }]}>
                      <Ionicons name="checkmark-circle" size={14} color={COLORS.white} />
                      <Text style={styles.statusText}>Live</Text>
                    </View>
                    {formattedTime ? <Text style={styles.cardTimestamp}>{formattedTime}</Text> : null}
                  </View>
                </View>

                <Text style={styles.itemTitle}>{item.title}</Text>

                {(item.type === 'notification' || item.type === 'event') && (
                  <View style={[styles.audienceBadge, audienceBadgeStyle()]}> 
                    <Ionicons
                      name={audienceIcon()}
                      size={12}
                      color={item.audience === 'staff' ? '#92400E' : '#0F766E'}
                    />
                    <Text style={[styles.audienceBadgeText, audienceTextStyle()]}> 
                      {audienceLabel()}
                    </Text>
                  </View>
                )}

                <View style={styles.cardBody}>
                  {item.type === 'event' ? (
                    <View style={styles.eventDetailsPanel}>
                      <View style={styles.eventDetail}>
                        <Ionicons name="calendar-outline" size={14} color="#475569" />
                        <Text style={styles.eventDetailText}>{item.date} • {item.time}</Text>
                      </View>
                      <View style={styles.eventDetail}>
                        <Ionicons name="location-outline" size={14} color="#475569" />
                        <Text style={styles.eventDetailText}>{item.location}</Text>
                      </View>
                      <View style={styles.eventDetail}>
                        <Ionicons name="pricetag-outline" size={14} color="#475569" />
                        <Text style={styles.eventDetailText}>{item.category}</Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.itemText} numberOfLines={3}>{item.body}</Text>
                  )}
                </View>

                <View style={styles.cardActionsRow}>
                  <CustomButton
                    title="Edit"
                    variant="primary"
                    onPress={() => handleEdit(item)}
                    style={[styles.cardActionButton, styles.cardActionPrimary]}
                  />
                  <CustomButton
                    title="Delete"
                    variant="outline"
                    onPress={() => handleDelete(item.id, item.type)}
                    style={styles.cardActionButton}
                  />
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="mail-unread-outline" size={32} color={COLORS.primary || '#1d4ed8'} />
              </View>
              <Text style={styles.emptyTitle}>No updates yet</Text>
              <Text style={styles.emptySubtitle}>Create your first notification or campus event.</Text>
            </View>
          }
        />

        {/* Creative Updates Form Modal */}
        <Modal
          visible={showForm}
          animationType="slide"
          transparent={true}
          onRequestClose={resetForm}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalEyebrow}>
                    {editingId ? 'Edit record' : 'New record'}
                  </Text>
                  <Text style={styles.modalTitle}>
                    {editingId ? 'Update Campus Update' : 'Create Campus Update'}
                  </Text>
                </View>
                <TouchableOpacity onPress={resetForm}>
                  <View style={styles.closeButton}>
                    <Ionicons name="close" size={20} color={COLORS.dark} />
                  </View>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.formContent}
                contentContainerStyle={styles.formContentInner}
                showsVerticalScrollIndicator
                nestedScrollEnabled
              >

                {/* Type Selector */}
                <Text style={styles.sectionLabel}>Update Type</Text>
                <View style={styles.typeSelector}>
                  <TouchableOpacity 
                    style={[styles.typeButton, contentType === 'notification' && styles.typeButtonActive, editingId && styles.typeButtonDisabled]}
                    onPress={() => !editingId && setContentType('notification')}
                    disabled={!!editingId}
                  >
                    <Ionicons 
                      name="notifications-outline" 
                      size={20} 
                      color={contentType === 'notification' ? 'white' : '#6B7280'} 
                    />
                    <Text style={[styles.typeButtonText, contentType === 'notification' && styles.typeButtonTextActive]}>
                      Notification
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.typeButton, contentType === 'event' && styles.typeButtonActive, editingId && styles.typeButtonDisabled]}
                    onPress={() => !editingId && setContentType('event')}
                    disabled={!!editingId}
                  >
                    <Ionicons 
                      name="calendar-outline" 
                      size={20} 
                      color={contentType === 'event' ? 'white' : '#6B7280'} 
                    />
                    <Text style={[styles.typeButtonText, contentType === 'event' && styles.typeButtonTextActive]}>
                      Event
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.formDivider, { marginTop: 16 }]} />

                {/* Common Fields */}
                <Text style={styles.sectionLabel}>Title</Text>
                <TextInput 
                  value={title} 
                  onChangeText={setTitle} 
                  placeholder={contentType === 'notification' ? 'Enter notification title...' : 'Enter event name...'} 
                  style={[styles.input, styles.titleInput]}
                  placeholderTextColor="#9CA3AF"
                />

                {/* Notification Specific */}
                {contentType === 'notification' && (
                  <>
                    <Text style={styles.sectionLabel}>Message</Text>
                    <TextInput 
                      value={body} 
                      onChangeText={setBody} 
                      placeholder="Write your message here..." 
                      style={[styles.input, styles.bodyInput]}
                      multiline
                      placeholderTextColor="#9CA3AF"
                    />

                    {!editingId && (
                      <>
                        <Text style={styles.formLabel}>Who can see this?</Text>
                        <View style={styles.audienceSelector}>
                          {NOTIFICATION_AUDIENCES.map((audience) => (
                            <TouchableOpacity
                              key={audience.value}
                              style={[
                                styles.audienceButton,
                                notificationAudience === audience.value && styles.audienceButtonActive,
                              ]}
                              onPress={() => setNotificationAudience(audience.value)}
                              activeOpacity={0.85}
                            >
                              <Text style={[
                                styles.audienceButtonText,
                                notificationAudience === audience.value && styles.audienceButtonTextActive,
                              ]}>
                                {audience.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    )}
                  </>
                )}

                {/* Event Specific */}
                {contentType === 'event' && (
                  <>
                    <Text style={styles.sectionLabel}>Date</Text>
                    <TextInput 
                      value={eventDate} 
                      onChangeText={setEventDate} 
                      placeholder="e.g., Feb 25, 2026" 
                      style={styles.input}
                      placeholderTextColor="#9CA3AF"
                    />

                    <Text style={styles.sectionLabel}>Time</Text>
                    <TextInput 
                      value={eventTime} 
                      onChangeText={setEventTime} 
                      placeholder="e.g., 2:00 PM - 3:30 PM" 
                      style={styles.input}
                      placeholderTextColor="#9CA3AF"
                    />

                    <Text style={styles.sectionLabel}>Location</Text>
                    <View style={styles.locationSelectorCard}>
                      <Text style={styles.locationSelectorHint}>
                        Select a campus location from the database.
                      </Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.locationChipRow}>
                        {locations.map((location) => {
                          const locationLabel = location.name || location.title || 'Unnamed Location';
                          const isSelected = eventLocationId === location.id;

                          return (
                            <TouchableOpacity
                              key={location.id}
                              style={[styles.locationChip, isSelected && styles.locationChipActive]}
                              onPress={() => {
                                setEventLocationId(location.id);
                                setEventLocation(locationLabel);
                              }}
                              activeOpacity={0.85}
                            >
                              <Text style={[styles.locationChipText, isSelected && styles.locationChipTextActive]}>
                                {locationLabel}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                      <Text style={styles.selectedLocationText}>
                        {eventLocation ? `Selected: ${eventLocation}` : 'No campus location selected yet'}
                      </Text>
                    </View>

                    <Text style={styles.sectionLabel}>Category</Text>
                    <View style={styles.eventCategorySelector}>
                      {EVENT_CATEGORIES.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.eventCategoryButton,
                            eventCategory === cat && styles.eventCategoryButtonActive,
                          ]}
                          onPress={() => setEventCategory(cat)}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.eventCategoryButtonText,
                              eventCategory === cat && styles.eventCategoryButtonTextActive,
                            ]}
                          >
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {!editingId && (
                      <>
                        <Text style={styles.formLabel}>Who can see this?</Text>
                        <View style={styles.audienceSelector}>
                          {NOTIFICATION_AUDIENCES.map((audience) => (
                            <TouchableOpacity
                              key={audience.value}
                              style={[
                                styles.audienceButton,
                                eventAudience === audience.value && styles.audienceButtonActive,
                              ]}
                              onPress={() => setEventAudience(audience.value)}
                              activeOpacity={0.85}
                            >
                              <Text style={[
                                styles.audienceButtonText,
                                eventAudience === audience.value && styles.audienceButtonTextActive,
                              ]}>
                                {audience.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    )}
                  </>
                )}

                {/* Preview */}
                {(title.trim() || (contentType === 'notification' && body.trim())) && (
                  <View style={styles.previewCard}>
                    <Text style={styles.previewLabel}>Preview</Text>
                    <View style={styles.previewContent}>
                      {contentType === 'notification' ? (
                        <>
                          <Text style={styles.previewTitle}>{title || 'Title...'}</Text>
                          <Text style={styles.previewBody}>{body || 'Body...'}</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.previewTitle}>{title || 'Event Title...'}</Text>
                          {eventDate && <Text style={styles.previewDetail}>📅 {eventDate} • {eventTime || 'Time'}</Text>}
                          {eventLocation && <Text style={styles.previewDetail}>📍 {eventLocation}</Text>}
                          {eventCategory && <Text style={styles.previewDetail}>🏷️ {eventCategory}</Text>}
                        </>
                      )}
                    </View>
                  </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                  <CustomButton
                    title="Cancel"
                    onPress={resetForm}
                    variant="outline"
                    style={styles.cancelButton}
                  />
                  <CustomButton
                    title={editingId 
                      ? 'Save Changes' 
                      : (contentType === 'notification' ? 'Post Now' : 'Publish Event')
                    }
                    onPress={handlePost}
                    variant="primary"
                    style={styles.postButton}
                  />
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    padding: 4,
  },
  listContent: {
    paddingBottom: 32,
  },
  listHeader: {
    marginBottom: 16,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#020617',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  heroCopy: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
    lineHeight: 18,
  },
  heroCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#2563EB',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  heroCTAText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  heroStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 18,
    flexWrap: 'wrap',
  },
  heroStatCard: {
    flex: 1,
    minWidth: 110,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  heroStatIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  heroStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.white,
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: COLORS.white,
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  notificationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e40af',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  cardTypeIndicatorEvent: {
    backgroundColor: '#7c3aed',
  },
  cardTypeIcon: {
    marginRight: 6,
  },
  cardHeaderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTimestamp: {
    fontSize: 12,
    color: '#94A3B8',
  },
  typeLabel: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 4,
  },
  statusText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginRight: 10,
  },
  audienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
    marginTop: 4,
    marginBottom: 10,
    gap: 4,
  },
  audienceBadgeEveryone: {
    backgroundColor: '#CCFBF1',
  },
  audienceBadgeStaff: {
    backgroundColor: '#FEF3C7',
  },
  audienceBadgeDirect: {
    backgroundColor: '#DCFCE7',
  },
  audienceBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  audienceBadgeTextEveryone: {
    color: '#0F766E',
  },
  audienceBadgeTextStaff: {
    color: '#92400E',
  },
  audienceBadgeTextDirect: {
    color: '#0F766E',
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  itemText: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },
  cardBody: {
    marginBottom: 14,
  },
  eventDetailsPanel: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#F8FAFC',
    gap: 6,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventDetailText: {
    fontSize: 12,
    color: '#475569',
    marginLeft: 6,
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardActionButton: {
    flex: 1,
  },
  cardActionPrimary: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.muted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingBottom: 20,
    shadowColor: '#020617',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EEF9',
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.dark,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formContent: {
    paddingHorizontal: 18,
    flexGrow: 1,
  },
  formContentInner: {
    paddingTop: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    fontSize: 14,
    color: COLORS.dark,
  },
  titleInput: {
    height: 48,
  },
  bodyInput: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  locationSelectorCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    padding: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  locationSelectorHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 10,
  },
  locationChipRow: {
    gap: 10,
    paddingBottom: 4,
  },
  locationChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: COLORS.white,
  },
  locationChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  locationChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  locationChipTextActive: {
    color: COLORS.white,
  },
  selectedLocationText: {
    marginTop: 10,
    fontSize: 12,
    color: '#6B7280',
  },
  eventCategorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
    marginBottom: 12,
  },
  eventCategoryButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  eventCategoryButtonActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  eventCategoryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  eventCategoryButtonTextActive: {
    color: COLORS.white,
  },
  audienceSelector: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
    marginBottom: 12,
  },
  audienceButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  audienceButtonActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  audienceButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  audienceButtonTextActive: {
    color: COLORS.white,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    backgroundColor: '#F8FAFC',
  },
  typeButtonActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  typeButtonDisabled: {
    opacity: 0.5,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: COLORS.white,
  },
  previewCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0F172A',
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  previewContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 6,
  },
  previewBody: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 18,
  },
  previewDetail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    marginBottom: 0,
  },
  cancelButton: {
    flex: 1,
  },
  postButton: {
    flex: 1,
  },
});

export default ManageNotificationsScreen;