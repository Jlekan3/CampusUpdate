import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import CustomButton from '../../components/CustomButton';
import {
  COLORS,
  USER_ROLES,
  EVENT_CATEGORIES,
  EVENT_CATEGORY_ICONS,
} from '../../utils/constants';
import { subscribeToEvents, addEvent, updateEvent, deleteEvent } from '../../services/databaseService';
import { useAuth } from '../../context/AuthContext';

const ManageEventsScreen = ({ navigation }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  // Form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Academic');
  const [description, setDescription] = useState('');

  const { userRole } = useAuth();

  useEffect(() => {
    const unsub = subscribeToEvents((list) => {
      setEvents(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const resetForm = () => {
    setTitle('');
    setDate('');
    setTime('');
    setLocation('');
    setCategory('Academic');
    setDescription('');
    setEditingEvent(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setTitle(event.title || '');
    setDate(event.date || '');
    setTime(event.time || '');
    setLocation(event.location || '');
    setCategory(event.category || 'Academic');
    setDescription(event.description || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (userRole !== USER_ROLES.ADMIN) {
      return Alert.alert('Unauthorized', 'You are not allowed to perform this action');
    }

    if (!title.trim()) {
      return Alert.alert('Validation', 'Event title is required');
    }

    const eventData = {
      title: title.trim(),
      date: date.trim(),
      time: time.trim(),
      location: location.trim(),
      category,
      description: description.trim(),
    };

    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, eventData);
        Alert.alert('Success', 'Event updated successfully');
      } else {
        await addEvent(eventData);
        Alert.alert('Success', 'Event created successfully');
      }
      setShowModal(false);
      resetForm();
    } catch (err) {
      console.log('Save event error', err);
      Alert.alert('Error', 'Unable to save event');
    }
  };

  const handleDelete = (event) => {
    Alert.alert('Delete Event', `Are you sure you want to delete "${event.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEvent(event.id);
          } catch (err) {
            console.log('Delete error', err);
            Alert.alert('Error', 'Unable to delete event');
          }
        },
      },
    ]);
  };

  const getCategoryIcon = (cat) => {
    return EVENT_CATEGORY_ICONS[cat] || 'calendar-outline';
  };

  const renderEventCard = ({ item }) => (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <View style={[styles.iconContainer, { backgroundColor: COLORS.primary + '20' }]}>
          <Ionicons name={getCategoryIcon(item.category)} size={22} color={COLORS.primary} />
        </View>
        <View style={styles.eventInfo}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventCategory}>{item.category || 'Event'}</Text>
        </View>
      </View>

      <View style={styles.eventDetails}>
        {item.date && (
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={COLORS.muted} />
            <Text style={styles.detailText}>{item.date}</Text>
          </View>
        )}
        {item.time && (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={14} color={COLORS.muted} />
            <Text style={styles.detailText}>{item.time}</Text>
          </View>
        )}
        {item.location && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.muted} />
            <Text style={styles.detailText}>{item.location}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
          <Ionicons name="create-outline" size={18} color={COLORS.primary} />
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Campus Events</Text>
            <Text style={styles.subtitle}>{events.length} event{events.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
            <Ionicons name="add" size={24} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderEventCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color={COLORS.muted} />
                <Text style={styles.emptyText}>No events yet</Text>
                <Text style={styles.emptySubtext}>Tap the + button to create your first event</Text>
              </View>
            ) : null
          }
        />
      </View>

      {/* Add/Edit Event Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEvent ? 'Edit Event' : 'New Event'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Event title"
                placeholderTextColor={COLORS.muted}
              />

              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="e.g., Feb 20, 2026"
                placeholderTextColor={COLORS.muted}
              />

              <Text style={styles.label}>Time</Text>
              <TextInput
                style={styles.input}
                value={time}
                onChangeText={setTime}
                placeholder="e.g., 10:00 AM - 4:00 PM"
                placeholderTextColor={COLORS.muted}
              />

              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Event location"
                placeholderTextColor={COLORS.muted}
              />

              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                {EVENT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Ionicons
                      name={getCategoryIcon(cat)}
                      size={16}
                      color={category === cat ? COLORS.white : COLORS.muted}
                    />
                    <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Event description (optional)"
                placeholderTextColor={COLORS.muted}
                multiline
                numberOfLines={4}
              />

              <View style={styles.modalActions}>
                <CustomButton
                  title="Cancel"
                  variant="outline"
                  onPress={() => setShowModal(false)}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <CustomButton
                  title={editingEvent ? 'Update' : 'Create'}
                  onPress={handleSave}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 2,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 20,
  },
  eventCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  eventCategory: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 2,
  },
  eventDetails: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 13,
    color: COLORS.muted,
    marginLeft: 8,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  editText: {
    color: COLORS.primary,
    fontWeight: '500',
    marginLeft: 4,
    fontSize: 14,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  deleteText: {
    color: COLORS.danger,
    fontWeight: '500',
    marginLeft: 4,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 4,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.light,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: COLORS.dark,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.light,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 13,
    color: COLORS.muted,
    marginLeft: 6,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 16,
  },
});

export default ManageEventsScreen;
