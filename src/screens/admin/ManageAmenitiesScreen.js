import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import CustomButton from '../../components/CustomButton';
import { COLORS } from '../../utils/constants';
import {
  subscribeToAmenities,
  subscribeToAmenitiesCount,
  getAmenities,
  getAmenitiesCount,
  addAmenity,
  updateAmenity,
  deleteAmenity,
} from '../../services/databaseService';
// GeoPoint not used with Supabase — lat/lng stored as separate columns

const defaultAmenityForm = {
  name: '',
  description: '',
  iconName: 'fitness-outline',
  latitude: '',
  longitude: '',
};

const amenityIconOptions = [
  'fitness-outline',
  'walk-outline',
  'basketball-outline',
  'bicycle-outline',
  'restaurant-outline',
  'water-outline',
  'medkit-outline',
  'book-outline',
  'construct-outline',
  'football-outline',
];

const ManageAmenitiesScreen = () => {
  const [amenities, setAmenities] = useState([]);
  const [amenitiesCount, setAmenitiesCount] = useState(0);
  const [selectedAmenityId, setSelectedAmenityId] = useState(null);
  const [formData, setFormData] = useState(defaultAmenityForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAmenities = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return amenities;

    return amenities.filter((amenity) => {
      const name = (amenity.name || '').toLowerCase();
      const description = (amenity.description || '').toLowerCase();
      const iconNameValue = (amenity.icon_name || '').toLowerCase();

      return (
        name.includes(query) ||
        description.includes(query) ||
        iconNameValue.includes(query)
      );
    });
  }, [amenities, searchQuery]);

  useEffect(() => {
    console.log('ManageAmenitiesScreen: Setting up subscription to amenities...');

    const loadAmenities = async () => {
      try {
        const items = await getAmenities();
        console.log('ManageAmenitiesScreen: Initial amenities fetch count:', items?.length || 0);
        setAmenities(items || []);
      } catch (e) {
        console.error('ManageAmenitiesScreen: Initial amenities fetch failed:', e?.code, e?.message);
      }
    };

    const loadAmenitiesCount = async () => {
      try {
        const count = await getAmenitiesCount();
        console.log('ManageAmenitiesScreen: Initial amenities count:', count);
        setAmenitiesCount(count || 0);
      } catch (e) {
        console.error('ManageAmenitiesScreen: Initial amenities count fetch failed:', e?.code, e?.message);
      }
    };

    loadAmenities();
    loadAmenitiesCount();

    const unsubscribe = subscribeToAmenities((items) => {
      console.log('ManageAmenitiesScreen: Received amenities snapshot, count:', items?.length || 0);
      setAmenities(items || []);
    });

    const unsubscribeCount = subscribeToAmenitiesCount((count) => {
      console.log('ManageAmenitiesScreen: Received amenities count:', count);
      setAmenitiesCount(count || 0);
    });

    return () => {
      console.log('ManageAmenitiesScreen: Cleaning up subscription');
      try {
        unsubscribe && unsubscribe();
        unsubscribeCount && unsubscribeCount();
      } catch (e) {
        console.error('ManageAmenitiesScreen: Error during cleanup:', e);
      }
    };
  }, []);

  const resetForm = () => {
    setSelectedAmenityId(null);
    setEditingId(null);
    setFormData(defaultAmenityForm);
    setShowModal(false);
  };

  const handleSelectAmenity = (amenity) => {
    setSelectedAmenityId(amenity.id);
    setEditingId(amenity.id);
    const nextForm = {
      name: amenity.name || '',
      description: amenity.description || '',
      iconName: amenity.icon_name || 'fitness-outline',
      latitude: '',
      longitude: '',
    };

    if (amenity.location && typeof amenity.location === 'object' && amenity.location.latitude !== undefined) {
      nextForm.latitude = amenity.location.latitude?.toString() || '';
      nextForm.longitude = amenity.location.longitude?.toString() || '';
    }

    setFormData(nextForm);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setSelectedAmenityId(null);
    setEditingId(null);
    setFormData(defaultAmenityForm);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      Alert.alert('Validation', 'Please enter both a name and description.');
      return;
    }

    let lat = null;
    let lng = null;
    if (formData.latitude.trim() && formData.longitude.trim()) {
      lat = parseFloat(formData.latitude.trim());
      lng = parseFloat(formData.longitude.trim());
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        Alert.alert('Validation', 'Please enter valid latitude and longitude values.');
        return;
      }
    } else if (formData.latitude.trim() || formData.longitude.trim()) {
      Alert.alert('Validation', 'Please provide both latitude and longitude, or leave both empty.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        icon_name: formData.iconName.trim() || 'fitness-outline',
      };

      if (lat !== null && lng !== null) {
        payload.latitude  = lat;
        payload.longitude = lng;
      }

      if (editingId) {
        await updateAmenity(editingId, payload);
      } else {
        await addAmenity(payload);
      }

      Alert.alert('Success', editingId ? 'Amenity updated successfully!' : 'Amenity added successfully!');
      resetForm();
    } catch (e) {
      console.error('Error saving amenity:', e.code, e.message);
      if (e?.code === 'permission-denied') {
        Alert.alert('Error', 'Permission denied. Please confirm your admin role and Firestore rules for the amenities collection.');
      } else {
        Alert.alert('Error', `Unable to save amenity: ${e.message}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (targetId = editingId) => {
    if (!targetId) return;

    Alert.alert('Delete Amenity', 'Are you sure you want to delete this amenity?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await deleteAmenity(targetId);
            Alert.alert('Success', 'Amenity deleted successfully!');
            resetForm();
          } catch (e) {
            console.error('Error deleting amenity:', e.code, e.message);
            Alert.alert('Error', `Unable to delete amenity: ${e.message}`);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const renderAmenityItem = ({ item }) => {
    const hasLocation = item.location && typeof item.location === 'object';
    const latitude = hasLocation ? item.location.latitude : null;
    const longitude = hasLocation ? item.location.longitude : null;

    return (
      <View style={[styles.amenityCard, selectedAmenityId === item.id && styles.amenityCardActive]}>
        <TouchableOpacity
          style={styles.amenityCardBody}
          onPress={() => handleSelectAmenity(item)}
          activeOpacity={0.85}
        >
          <View style={styles.amenityTopRow}>
            <View style={styles.amenityIconWrap}>
              <Ionicons name={item.icon_name || 'fitness-outline'} size={20} color={COLORS.primary} />
            </View>
            <View style={styles.amenityBodyText}>
              <Text style={styles.amenityTitle} numberOfLines={1}>
                {item.name || 'Untitled amenity'}
              </Text>
              {item.description ? (
                <Text style={styles.amenitySubtitle} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : (
                <Text style={styles.amenitySubtitleMuted}>No description provided</Text>
              )}
            </View>
            <View style={styles.amenityChevron}>
              <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
            </View>
          </View>

          <View style={styles.amenityMetaRow}>
            {hasLocation ? (
              <View style={styles.amenityMetaChip}>
                <Ionicons name="location-outline" size={12} color={COLORS.primary} />
                <Text style={styles.amenityMetaText}>
                  {latitude?.toFixed ? latitude.toFixed(4) : latitude}, {longitude?.toFixed ? longitude.toFixed(4) : longitude}
                </Text>
              </View>
            ) : (
              <View style={styles.amenityMetaChip}>
                <Ionicons name="time-outline" size={12} color={COLORS.primary} />
                <Text style={styles.amenityMetaText}>No coordinates yet</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.amenityActionsRow}>
          <TouchableOpacity
            style={[styles.amenityActionButton, styles.amenityActionEdit]}
            onPress={() => handleSelectAmenity(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={14} color={COLORS.primary} />
            <Text style={styles.amenityActionTextPrimary}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.amenityActionButton, styles.amenityActionDelete]}
            onPress={() => handleDelete(item.id)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={14} color={COLORS.white} />
            <Text style={styles.amenityActionTextDanger}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const totalRecords = amenitiesCount || amenities.length;
  const visibleCount = filteredAmenities.length;

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroEyebrow}>Admin Dashboard</Text>
              <Text style={styles.heroTitle}>Campus Amenities</Text>
              <Text style={styles.heroSubtitle}>Manage facilities, services, and shared resources</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="fitness-outline" size={26} color={COLORS.white} />
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroPill}>
              <Ionicons name="fitness-outline" size={14} color={COLORS.white} />
              <Text style={styles.heroPillText}>{totalRecords} records</Text>
            </View>
            <View style={styles.heroPillSecondary}>
              <Ionicons name="search-outline" size={14} color={COLORS.primary} />
              <Text style={styles.heroPillTextSecondary}>{visibleCount} shown</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={handleAddNew} activeOpacity={0.9}>
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.addButtonText}>Add Amenity</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={18} color={COLORS.muted} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search amenities..."
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
              {searchQuery ? 'Filtered amenities list' : 'Search the current roster'}
            </Text>
            <Text style={styles.searchMetaCount}>{visibleCount} shown</Text>
          </View>
        </View>

        <Text style={styles.listTitle}>
          {visibleCount > 0 ? `Amenities (${visibleCount})` : searchQuery ? 'No matching amenities' : 'No Amenities Yet'}
        </Text>

        <View style={styles.listShell}>
          <FlatList
            data={filteredAmenities}
            keyExtractor={(item) => item.id}
            renderItem={renderAmenityItem}
            scrollEnabled
            showsVerticalScrollIndicator
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="fitness-outline" size={34} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'Try a different keyword or clear the search.' : 'Tap Add Amenity to create the first campus service entry.'}
                </Text>
                {!searchQuery ? (
                  <Text style={styles.emptySubtext}>Amenity cards you create here appear in the student app instantly.</Text>
                ) : null}
              </View>
            }
          />
        </View>
      </View>

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={resetForm}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleBlock}>
                <Text style={styles.modalEyebrow}>{editingId ? 'Edit record' : 'New record'}</Text>
                <Text style={styles.modalTitle}>{editingId ? 'Edit Amenity' : 'Add Amenity'}</Text>
              </View>
              <TouchableOpacity onPress={resetForm} activeOpacity={0.85}>
                <View style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={COLORS.dark} />
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator
            >
              <View style={styles.formSectionCard}>
                <Text style={styles.sectionLabel}>Amenity Name <Text style={styles.requiredMark}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Outdoor Basketball Court"
                  placeholderTextColor={COLORS.muted}
                  value={formData.name}
                  onChangeText={(value) => setFormData((prev) => ({ ...prev, name: value }))}
                />

                <Text style={styles.sectionLabel}>Description <Text style={styles.requiredMark}>*</Text></Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Describe what students should know about this space."
                  placeholderTextColor={COLORS.muted}
                  value={formData.description}
                  onChangeText={(value) => setFormData((prev) => ({ ...prev, description: value }))}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />

                <Text style={styles.sectionLabel}>Icon</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll} contentContainerStyle={styles.iconScrollContent}>
                  {amenityIconOptions.map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[styles.iconChip, formData.iconName === icon && styles.iconChipActive]}
                      onPress={() => setFormData((prev) => ({ ...prev, iconName: icon }))}
                      activeOpacity={0.85}
                    >
                      <Ionicons name={icon} size={18} color={formData.iconName === icon ? COLORS.white : COLORS.primary} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.sectionLabel}>Coordinates (optional)</Text>
                <Text style={styles.coordinateHint}>Include latitude & longitude so the amenity appears on the campus map.</Text>
                <View style={styles.coordinatesRow}>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Latitude"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="decimal-pad"
                    value={formData.latitude}
                    onChangeText={(value) => setFormData((prev) => ({ ...prev, latitude: value }))}
                  />
                  <View style={styles.coordinateSpacer} />
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Longitude"
                    placeholderTextColor={COLORS.muted}
                    keyboardType="decimal-pad"
                    value={formData.longitude}
                    onChangeText={(value) => setFormData((prev) => ({ ...prev, longitude: value }))}
                  />
                </View>

                <View style={styles.modalButtonRow}>
                  <CustomButton
                    title="Cancel"
                    onPress={resetForm}
                    variant="outline"
                    style={styles.buttonFlex}
                    disabled={saving || deleting}
                  />
                  {editingId ? (
                    <CustomButton
                      title={deleting ? 'Deleting...' : 'Delete'}
                      onPress={() => handleDelete(editingId)}
                      variant="danger"
                      style={styles.buttonFlex}
                      loading={deleting}
                      disabled={saving || deleting}
                    />
                  ) : null}
                  <CustomButton
                    title={saving ? (editingId ? 'Updating...' : 'Saving...') : editingId ? 'Update Amenity' : 'Save Amenity'}
                    onPress={handleSave}
                    style={styles.buttonFlex}
                    loading={saving}
                    disabled={saving || deleting}
                  />
                </View>
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
    padding: 18,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 28,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#020617',
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  heroTextBlock: {
    flex: 1,
    paddingRight: 12,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.72)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.82)',
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
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  heroPillSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.white,
  },
  heroPillText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  heroPillTextSecondary: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  searchContainer: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    minWidth: 0,
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
  listTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 12,
    marginTop: 4,
  },
  listShell: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 4,
    maxHeight: 520,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  listContent: {
    padding: 14,
  },
  amenityCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  amenityCardActive: {
    borderColor: COLORS.primary,
  },
  amenityCardBody: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
  },
  amenityTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  amenityIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amenityBodyText: {
    flex: 1,
    minWidth: 0,
  },
  amenityTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.dark,
  },
  amenitySubtitle: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
  amenitySubtitleMuted: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
  },
  amenityChevron: {
    width: 30,
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  amenityMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  amenityMetaText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  amenityActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 12,
  },
  amenityActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  amenityActionEdit: {
    borderColor: '#CBD5F5',
    backgroundColor: '#EEF4FF',
  },
  amenityActionDelete: {
    borderColor: '#DC2626',
    backgroundColor: '#DC2626',
  },
  amenityActionTextPrimary: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  amenityActionTextDanger: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 18,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
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
  modalTitleBlock: {
    flex: 1,
    paddingRight: 12,
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
  modalScroll: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  modalScrollContent: {
    paddingBottom: 24,
  },
  formSectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EEF9',
    padding: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 0,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  requiredMark: {
    color: '#DC2626',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.dark,
    marginBottom: 14,
  },
  textArea: {
    minHeight: 110,
  },
  iconScroll: {
    marginBottom: 12,
  },
  iconScrollContent: {
    paddingVertical: 4,
  },
  iconChip: {
    width: 42,
    height: 42,
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  iconChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  coordinateHint: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 10,
  },
  coordinatesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  halfInput: {
    flex: 1,
  },
  coordinateSpacer: {
    width: 12,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  buttonFlex: {
    flex: 1,
  },
});

export default ManageAmenitiesScreen;
