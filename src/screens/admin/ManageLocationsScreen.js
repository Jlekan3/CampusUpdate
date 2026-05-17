import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import CustomButton from '../../components/CustomButton';
import { COLORS } from '../../utils/constants';
import { subscribeToLocations, updateLocation, deleteLocation } from '../../services/databaseService';
import { useAuth } from '../../context/AuthContext';
import { USER_ROLES } from '../../utils/constants';

const ManageLocationsScreen = ({ navigation }) => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    names: '',
    description: '',
    category: 'Gate',
    latitude: '',
    longitude: '',
    imageurl: '',
  });

  const { userRole } = useAuth();

  const categories = [
    'Gate',
    'Building',
    'Facility',
    'Cafeteria',
    'Restroom',
    'Gym',
    'Library',
    'Lab',
    'Parking',
    'Other',
  ];

  // Subscribe to locations from Firestore
  useEffect(() => {
    const unsub = subscribeToLocations((items) => {
      setLocations(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleEdit = (location) => {
    if (userRole !== USER_ROLES.ADMIN) {
      return Alert.alert('Unauthorized', 'You are not allowed to perform this action');
    }
    
    setEditingId(location.id);
    setEditForm({
      names: location.names || '',
      description: location.description || '',
      category: location.category || 'Gate',
      latitude: location.coordinates?.latitude?.toString() || '',
      longitude: location.coordinates?.longitude?.toString() || '',
      imageurl: location.imageurl || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editForm.names.trim()) {
      return Alert.alert('Validation Error', 'Location name is required');
    }

    if (!editForm.latitude.trim() || !editForm.longitude.trim()) {
      return Alert.alert('Validation Error', 'Latitude and Longitude are required');
    }

    const lat = parseFloat(editForm.latitude);
    const lng = parseFloat(editForm.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return Alert.alert('Validation Error', 'Coordinates must be valid numbers');
    }

    try {
      const updatedData = {
        names: editForm.names.trim(),
        description: editForm.description.trim(),
        category: editForm.category,
        coordinates: {
          latitude: lat,
          longitude: lng,
        },
        imageurl: editForm.imageurl.trim(),
      };

      await updateLocation(editingId, updatedData);
      
      Alert.alert('Success ✓', `"${editForm.names}" updated successfully`);
      setShowEditModal(false);
      setEditingId(null);
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', `Unable to update location: ${error.message}`);
    }
  };

  const handleDelete = (id, name) => {
    if (userRole !== USER_ROLES.ADMIN) {
      return Alert.alert('Unauthorized', 'You are not allowed to perform this action');
    }

    Alert.alert('Delete Location', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLocation(id);
            Alert.alert('Success ✓', 'Location deleted successfully');
          } catch (err) {
            console.log('Delete error', err);
            Alert.alert('Error', 'Unable to delete location');
          }
        },
      },
    ]);
  };

  const getCategoryColor = (category) => {
    const colors = {
      Gate: '#EF4444',
      Building: '#3B82F6',
      Facility: '#8B5CF6',
      Cafeteria: '#EC4899',
      Restroom: '#10B981',
      Gym: '#F97316',
      Library: '#F59E0B',
      Lab: '#14B8A6',
      Parking: '#06B6D4',
      Other: '#6B7280',
    };
    return colors[category] || '#3B82F6';
  };

  const renderLocationCard = ({ item }) => (
    <View style={styles.locationCard}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: getCategoryColor(item.category) + '20' },
          ]}
        >
          <Text
            style={[
              styles.categoryBadgeText,
              { color: getCategoryColor(item.category) },
            ]}
          >
            {item.category}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEdit(item)}
          >
            <Ionicons name="pencil" size={18} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDelete(item.id, item.names)}
          >
            <Ionicons name="trash" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.locationName}>{item.names}</Text>

      {item.description && (
        <Text style={styles.description}>{item.description}</Text>
      )}

      <View style={styles.infoRow}>
        <Ionicons name="location" size={14} color={COLORS.muted} />
        <Text style={styles.infoText}>
          {item.coordinates?.latitude?.toFixed(4)}, {item.coordinates?.longitude?.toFixed(4)}
        </Text>
      </View>
    </View>
  );

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Manage Locations</Text>
          <Text style={styles.subtitle}>View, edit, and delete locations</Text>
        </View>

        {loading ? (
          <Text style={styles.loading}>Loading locations...</Text>
        ) : (
          <FlatList
            data={locations}
            keyExtractor={(item) => item.id}
            renderItem={renderLocationCard}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="location-outline" size={48} color={COLORS.light} />
                <Text style={styles.emptyText}>No locations yet</Text>
                <Text style={styles.emptySubtext}>
                  Add locations from the "Add Locations" screen
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Edit Location Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Location</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContent}>
              {/* Location Name */}
              <Text style={styles.sectionLabel}>Location Name <Text style={{color: COLORS.danger}}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., North gate"
                value={editForm.names}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, names: text })
                }
                placeholderTextColor={COLORS.muted}
              />

              {/* Category */}
              <Text style={styles.sectionLabel}>Category <Text style={{color: COLORS.danger}}>*</Text></Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
              >
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      editForm.category === cat && styles.categoryChipActive,
                    ]}
                    onPress={() =>
                      setEditForm({ ...editForm, category: cat })
                    }
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        editForm.category === cat && styles.categoryTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Description */}
              <Text style={styles.sectionLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Location details..."
                value={editForm.description}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, description: text })
                }
                multiline
                numberOfLines={4}
                placeholderTextColor={COLORS.muted}
                textAlignVertical="top"
              />

              {/* Coordinates */}
              <Text style={styles.sectionLabel}>Coordinates <Text style={{color: COLORS.danger}}>*</Text></Text>
              <View style={styles.coordinatesRow}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Latitude"
                  value={editForm.latitude}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, latitude: text })
                  }
                  keyboardType="decimal-pad"
                  placeholderTextColor={COLORS.muted}
                />
                <View style={{ width: 12 }} />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Longitude"
                  value={editForm.longitude}
                  onChangeText={(text) =>
                    setEditForm({ ...editForm, longitude: text })
                  }
                  keyboardType="decimal-pad"
                  placeholderTextColor={COLORS.muted}
                />
              </View>

              {/* Image URL */}
              <Text style={styles.sectionLabel}>Image URL</Text>
              <TextInput
                style={styles.input}
                placeholder="https://example.com/image.jpg"
                value={editForm.imageurl}
                onChangeText={(text) =>
                  setEditForm({ ...editForm, imageurl: text })
                }
                placeholderTextColor={COLORS.muted}
              />

              <View style={styles.formButtons}>
                <CustomButton
                  title="Cancel"
                  onPress={() => setShowEditModal(false)}
                  variant="outline"
                  style={{ flex: 1 }}
                />
                <View style={{ width: 12 }} />
                <CustomButton
                  title="Update"
                  onPress={handleSaveEdit}
                  variant="primary"
                  style={{ flex: 1 }}
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
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 4,
  },
  loading: {
    textAlign: 'center',
    color: COLORS.muted,
    marginTop: 20,
  },
  listContent: {
    paddingBottom: 20,
  },
  locationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: COLORS.muted,
    marginBottom: 12,
    lineHeight: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  formContent: {
    padding: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginTop: 16,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 14,
    color: COLORS.dark,
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  coordinatesRow: {
    flexDirection: 'row',
  },
  halfInput: {
    flex: 1,
    marginBottom: 0,
  },
  categoryScroll: {
    marginBottom: 12,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
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
    fontWeight: '500',
    color: COLORS.muted,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 12,
  },
}); 
