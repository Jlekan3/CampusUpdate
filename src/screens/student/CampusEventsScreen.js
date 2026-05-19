import React, { useState, useContext, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  Animated,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { COLORS, EVENT_CATEGORIES, EVENT_CATEGORY_ICONS } from '../../utils/constants';
import { CampusUpdatesContext } from '../../context/CampusUpdatesContext';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToUserEventInterests,
  saveUserEventInterest,
  removeUserEventInterest,
} from '../../services/databaseService';

const EVENT_THEME = '#7C3AED';
const EVENT_THEME_SOFT = '#8B5CF6';

const CampusEventsScreen = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [interestedEvents, setInterestedEvents] = useState([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [fadeAnim] = useState(new Animated.Value(0));
  const [interestsLoading, setInterestsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const { events, eventsLoading } = useContext(CampusUpdatesContext);
  const { user, userRole } = useAuth();
  const categories = ['All', ...EVENT_CATEGORIES];

  const visibleEvents = events.filter((event) => {
    const audience = (event.audience || 'everyone').toString().toLowerCase();
    if (audience !== 'staff') return true;

    return [userRole, user?.role, user?.userRole, user?.type]
      .some((roleValue) => (roleValue || '').toString().toLowerCase().includes('admin')
        || (roleValue || '').toString().toLowerCase().includes('faculty')
        || (roleValue || '').toString().toLowerCase().includes('staff'));
  });

  const reminderOptions = [
    { id: '0', label: 'At Event Time', minutes: 0 },
    { id: '30', label: '30 minutes before', minutes: 30 },
    { id: '60', label: '1 hour before', minutes: 60 },
    { id: '1440', label: '1 day before', minutes: 1440 },
  ];

  const showSuccessNotification = (message) => {
    setNotificationMessage(message);
    setShowNotification(true);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setShowNotification(false));
  };

  useEffect(() => {
    if (!user?.id) {
      setInterestedEvents([]);
      setInterestsLoading(false);
      return;
    }

    setInterestsLoading(true);
    const unsubscribe = subscribeToUserEventInterests(user.id, (items) => {
      setInterestedEvents(items);
      setInterestsLoading(false);
    });

    return () => {
      try {
        unsubscribe?.();
      } catch (e) {
        // ignore unsubscribe errors
      }
    };
  }, [user?.id]);

  const handleInterestedClick = (event) => {
    if (isEventInterested(event.id)) {
      // Already interested, show cancel option
      setSelectedEvent(event);
      setShowCancelModal(true);
    } else {
      // Not interested yet, show reminder options
      setSelectedEvent(event);
      setSelectedReminder(null);
      setShowReminderModal(true);
    }
  };

  const handleReminderSelect = (reminder) => {
    setSelectedReminder(reminder);
  };

  const handleConfirmReminder = async () => {
    if (selectedEvent && selectedReminder) {
      // Add to interested events with reminder
      const newInterestedEvent = {
        eventId: selectedEvent.id,
        reminderTime: selectedReminder.minutes,
        reminderLabel: selectedReminder.label,
        savedAt: new Date(),
      };

      try {
        if (user?.id) {
          await saveUserEventInterest(user.id, selectedEvent.id, selectedReminder);
        } else {
          setInterestedEvents((prevInterestedEvents) => [
            ...prevInterestedEvents.filter((e) => e.eventId !== selectedEvent.id),
            newInterestedEvent,
          ]);
        }
      } catch (e) {
        Alert.alert('Error', 'Unable to save reminder right now. Please try again.');
        return;
      }

      setShowReminderModal(false);
      showSuccessNotification(
        `✓ Reminder set! You'll be notified ${selectedReminder.label}`
      );
    }
  };

  const handleRemoveInterest = async () => {
    if (selectedEvent) {
      try {
        if (user?.id) {
          await removeUserEventInterest(user.id, selectedEvent.id);
        } else {
          setInterestedEvents((prevInterestedEvents) =>
            prevInterestedEvents.filter((e) => e.eventId !== selectedEvent.id)
          );
        }
      } catch (e) {
        Alert.alert('Error', 'Unable to remove interest right now. Please try again.');
        return;
      }

      setShowCancelModal(false);
      showSuccessNotification(
        `✓ Removed interest in ${selectedEvent.title}`
      );
    }
  };

  const isEventInterested = (eventId) => {
    return interestedEvents.some((e) => e.eventId === eventId);
  };

  const getEventReminder = (eventId) => {
    const interested = interestedEvents.find((e) => e.eventId === eventId);
    return interested;
  };

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const categoryFiltered = selectedCategory === 'All'
      ? visibleEvents
      : visibleEvents.filter((e) => e.category === selectedCategory);

    if (!query) return categoryFiltered;

    return categoryFiltered.filter((event) => {
      const title = (event.title || '').toLowerCase();
      const category = (event.category || '').toLowerCase();
      const location = (event.location || '').toLowerCase();
      const date = (event.date || '').toLowerCase();
      const time = (event.time || '').toLowerCase();

      return (
        title.includes(query) ||
        category.includes(query) ||
        location.includes(query) ||
        date.includes(query) ||
        time.includes(query)
      );
    });
  }, [searchQuery, selectedCategory, visibleEvents]);

  const getIconForCategory = (category) => {
    return EVENT_CATEGORY_ICONS[category] || 'calendar-outline';
  };

  const renderEventCard = ({ item }) => {
    const isInterested = isEventInterested(item.id);
    const reminderInfo = getEventReminder(item.id);

    return (
      <View style={[styles.eventCard, isInterested && styles.eventCardInterested]}>
        <View style={styles.eventAccent} />
        <View style={styles.eventBody}>
          <View style={styles.eventHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name={getIconForCategory(item.category)} size={24} color={EVENT_THEME} />
            </View>
            <View style={styles.eventTitle}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.category}>{item.category}</Text>
            </View>
            {isInterested && (
              <View style={styles.interestedBadge}>
                <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              </View>
            )}
          </View>

          <View style={styles.eventDetails}>
            <View style={styles.detail}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.muted} />
              <Text style={styles.detailText}>{item.date}</Text>
            </View>
            <View style={styles.detail}>
              <Ionicons name="time-outline" size={16} color={COLORS.muted} />
              <Text style={styles.detailText}>{item.time}</Text>
            </View>
            <View style={styles.detail}>
              <Ionicons name="location-outline" size={16} color={COLORS.muted} />
              <Text style={styles.detailText}>{item.location}</Text>
            </View>
            {reminderInfo && (
              <View style={styles.reminderDisplay}>
                <Ionicons name="notifications-outline" size={14} color={EVENT_THEME} />
                <Text style={styles.reminderText}>{reminderInfo.reminderLabel}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.registerButton,
              isInterested && styles.registerButtonInterested,
            ]}
            onPress={() => handleInterestedClick(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isInterested ? 'heart' : 'heart-outline'}
              size={16}
              color={COLORS.white}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.registerText}>
              {isInterested ? 'Interested ✓' : 'Interested'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScreenWrapper>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.contentScroll}>
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.headerTitle}>Campus Events</Text>
              <Text style={styles.headerSubtitle}>Explore upcoming events and save reminders for what matters most.</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.white} />
            </View>
          </View>
          <View style={styles.heroPillsRow}>
            <View style={styles.heroPill}>
              <Ionicons name="sparkles-outline" size={14} color={COLORS.white} />
              <Text style={styles.heroPillText}>Fresh events</Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="notifications-outline" size={14} color={COLORS.white} />
              <Text style={styles.heroPillText}>Reminder support</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={COLORS.muted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search events..."
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

        <View style={styles.dropdownSection}>
          <Text style={styles.dropdownLabel}>Category</Text>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setShowCategoryDropdown((current) => !current)}
            activeOpacity={0.85}
          >
            <View style={styles.dropdownTriggerContent}>
              <View style={styles.dropdownIconWrap}>
                <Ionicons name="grid-outline" size={18} color={EVENT_THEME} />
              </View>
              <View style={styles.dropdownTextWrap}>
                <Text style={styles.dropdownValueLabel}>Selected category</Text>
                <Text style={styles.dropdownValue}>{selectedCategory}</Text>
              </View>
            </View>
            <Ionicons
              name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={EVENT_THEME}
            />
          </TouchableOpacity>

          {showCategoryDropdown && (
            <View style={styles.dropdownMenu}>
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                    onPress={() => {
                      setSelectedCategory(cat);
                      setShowCategoryDropdown(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>
                      {cat}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={18} color={EVENT_THEME} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.eventsListBox}>
          <FlatList
            data={filteredEvents}
            renderItem={renderEventCard}
            keyExtractor={(item) => item.id}
            scrollEnabled={true}
            nestedScrollEnabled
            showsVerticalScrollIndicator={true}
            indicatorStyle="black"
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              eventsLoading || interestsLoading ? (
                <View style={styles.emptyContainer}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                  <Text style={styles.emptyText}>Loading events...</Text>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={48} color={COLORS.muted} />
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No matching events found' : 'No events found'}
                  </Text>
                  {searchQuery ? (
                    <Text style={styles.emptySubtext}>
                      Try a different keyword or clear the search.
                    </Text>
                  ) : null}
                </View>
              )
            }
          />
        </View>
      </ScrollView>

      {/* Reminder Modal */}
      <Modal
        transparent
        visible={showReminderModal}
        animationType="fade"
        onRequestClose={() => setShowReminderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Set Reminder</Text>
                <Text style={styles.modalSubtitle}>Choose when you want to be notified</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowReminderModal(false)}
                style={styles.closeButton}
                activeOpacity={0.6}
              >
                <Ionicons name="close-circle" size={24} color={EVENT_THEME} />
              </TouchableOpacity>
            </View>

            <View style={styles.selectedEventCard}>
              <Ionicons name="calendar-outline" size={18} color={EVENT_THEME} />
              <Text style={styles.selectedEventText} numberOfLines={2}>{selectedEvent?.title}</Text>
            </View>

            <View style={styles.remindersContainer}>
              {reminderOptions.map((reminder) => (
                <TouchableOpacity
                  key={reminder.id}
                  style={[
                    styles.reminderOption,
                    selectedReminder?.id === reminder.id &&
                      styles.reminderOptionSelected,
                  ]}
                  onPress={() => handleReminderSelect(reminder)}
                  activeOpacity={0.7}
                >
                  <View style={styles.reminderOptionContent}>
                    <Ionicons
                      name={
                        selectedReminder?.id === reminder.id
                          ? 'radio-button-on'
                          : 'radio-button-off'
                      }
                      size={20}
                      color={
                        selectedReminder?.id === reminder.id
                            ? EVENT_THEME
                          : COLORS.muted
                      }
                    />
                    <Text
                      style={[
                        styles.reminderLabel,
                        selectedReminder?.id === reminder.id &&
                          styles.reminderLabelSelected,
                      ]}
                    >
                      {reminder.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowReminderModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !selectedReminder && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirmReminder}
                disabled={!selectedReminder}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={18}
                  color={COLORS.white}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.confirmButtonText}>Set Reminder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancel Interest Modal */}
      <Modal
        transparent
        visible={showCancelModal}
        animationType="fade"
        onRequestClose={() => setShowCancelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.cancelModalContent}>
            <View style={styles.cancelIconContainer}>
              <Ionicons name="help-circle-outline" size={48} color={COLORS.primary} />
            </View>

            <Text style={styles.cancelModalTitle}>Remove Interest?</Text>
            <Text style={styles.cancelModalSubtitle}>
              Are you sure you want to remove your interest in this event?
            </Text>

            <View style={styles.cancelDescription}>
              <Text style={styles.eventNameText}>{selectedEvent?.title}</Text>
            </View>

            <View style={styles.cancelModalActions}>
              <TouchableOpacity
                style={styles.cancelKeepButton}
                onPress={() => setShowCancelModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelKeepButtonText}>Keep Interest</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelRemoveButton}
                onPress={handleRemoveInterest}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={COLORS.white}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.cancelRemoveButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Notification */}
      {showNotification && (
        <Animated.View
          style={[
            styles.notification,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.notificationContent}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
            <Text style={styles.notificationText}>{notificationMessage}</Text>
          </View>
        </Animated.View>
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 0,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    marginTop: 4,
    lineHeight: 18,
  },
  contentScroll: {
    flex: 1,
  },
  heroCard: {
    backgroundColor: EVENT_THEME,
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
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
    backgroundColor: 'rgba(255,255,255,0.16)',
    top: -70,
    right: -60,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  heroPillsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroPillText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  eventsListBox: {
    maxHeight: 500,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 14,
    marginBottom: 14,
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
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.dark,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  dropdownSection: {
    marginBottom: 16,
  },
  dropdownLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  dropdownTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dropdownTextWrap: {
    flex: 1,
  },
  dropdownValueLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  dropdownValue: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
  },
  dropdownMenu: {
    marginTop: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 8,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  dropdownOptionActive: {
    backgroundColor: '#F5F3FF',
  },
  dropdownOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  dropdownOptionTextActive: {
    color: EVENT_THEME,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.muted,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  eventCardInterested: {
    borderColor: '#C4B5FD',
  },
  eventAccent: {
    height: 6,
    backgroundColor: EVENT_THEME,
  },
  eventBody: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  iconContainer: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventTitle: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  category: {
    fontSize: 12,
    color: EVENT_THEME,
    fontWeight: '600',
    marginTop: 2,
  },
  interestedBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventDetails: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.muted,
    marginLeft: 8,
  },
  reminderDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  reminderText: {
    fontSize: 12,
    color: EVENT_THEME,
    marginLeft: 6,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: EVENT_THEME,
    paddingVertical: 11,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerButtonInterested: {
    backgroundColor: '#10b981',
  },
  registerText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 30,
    maxHeight: '82%',
    overflow: 'hidden',
  },
  modalHandle: {
    width: 54,
    height: 5,
    borderRadius: 999,
    alignSelf: 'center',
    backgroundColor: EVENT_THEME,
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
  },
  closeButton: {
    padding: 4,
    marginTop: -2,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
    fontWeight: '500',
  },
  selectedEventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
    padding: 12,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  selectedEventText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  remindersContainer: {
    marginBottom: 24,
  },
  reminderOption: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reminderOptionSelected: {
    backgroundColor: '#F5F3FF',
    borderColor: EVENT_THEME,
  },
  reminderOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reminderLabel: {
    fontSize: 14,
    color: COLORS.muted,
    marginLeft: 12,
    fontWeight: '500',
  },
  reminderLabelSelected: {
    color: EVENT_THEME,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: EVENT_THEME,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelButtonText: {
    color: EVENT_THEME,
    fontWeight: '700',
    fontSize: 14,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: EVENT_THEME,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.muted,
    opacity: 0.5,
  },
  confirmButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  // Cancel Modal Styles
  cancelModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 30,
    alignItems: 'center',
  },
  cancelIconContainer: {
    marginBottom: 16,
  },
  cancelModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 8,
  },
  cancelModalSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  cancelDescription: {
    backgroundColor: '#F5F3FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  eventNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: EVENT_THEME,
    textAlign: 'center',
  },
  cancelModalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelKeepButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: EVENT_THEME,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelKeepButtonText: {
    color: EVENT_THEME,
    fontWeight: '700',
    fontSize: 14,
  },
  cancelRemoveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelRemoveButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 14,
  },
  // Notification Styles
  notification: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: EVENT_THEME,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationText: {
    color: COLORS.white,
    marginLeft: 12,
    fontWeight: '500',
    fontSize: 14,
    flex: 1,
  },
});

export default CampusEventsScreen;

