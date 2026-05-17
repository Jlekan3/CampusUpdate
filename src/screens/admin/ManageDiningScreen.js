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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import CustomButton from '../../components/CustomButton';
import { COLORS } from '../../utils/constants';
import {
  addDining,
  deleteDining,
  getDining,
  subscribeToDining,
  subscribeToLocations,
  updateDining,
} from '../../services/databaseService';

const defaultForm = {
  name: '',
  category: 'Restaurant',
  location: '',
  hours: '',
  contact: '',
  foodtype: '',
  icon: 'restaurant-outline',
  description: '',
};

const diningCategories = ['Restaurant', 'Cafeteria', 'Cafe', 'Food Court', 'Snack Bar', 'Other'];
const diningIcons = [
  'restaurant-outline',
  'cafe-outline',
  'fast-food-outline',
  'pizza-outline',
  'nutrition-outline',
  'leaf-outline',
];

const ManageDiningScreen = () => {
  const [diningOptions, setDiningOptions] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDiningId, setSelectedDiningId] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  useEffect(() => {
    const loadDining = async () => {
      try {
        const items = await getDining();
        setDiningOptions(items || []);
      } catch (error) {
        console.error('Failed to load dining records:', error);
      }
    };

    loadDining();

    const unsubscribe = subscribeToDining((items) => {
      setDiningOptions(items || []);
    });

    return () => {
      try {
        unsubscribe && unsubscribe();
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToLocations((items) => {
      const locationNames = (items || [])
        .map((item) => item.names || item.name || item.title || '')
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      setAvailableLocations([...new Set(locationNames)]);
    });

    return () => {
      try {
        unsubscribe && unsubscribe();
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, []);

  const filteredDining = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return diningOptions;

    return diningOptions.filter((item) => {
      const fields = [item.name, item.type, item.location, item.hours, item.phone, item.cuisine, item.description, item.icon]
        .map((value) => (value || '').toString().toLowerCase());

      return fields.some((value) => value.includes(query));
    });
  }, [diningOptions, searchQuery]);

  const diningCount = diningOptions.length;
  const visibleCount = filteredDining.length;

  const resetForm = () => {
    setSelectedDiningId(null);
    setFormData(defaultForm);
    setShowLocationPicker(false);
    setShowForm(false);
  };

  const handleSelect = (item) => {
    setSelectedDiningId(item.id);
    setFormData({
      name: item.name || '',
      category: item.category || item.type || 'Restaurant',
      location: item.location || '',
      hours: item.hours || '',
      contact: item.contact || item.phone || '',
      foodtype: item.foodtype || item.cuisine || '',
      icon: item.icon || 'restaurant-outline',
      description: item.description || '',
    });
    setShowLocationPicker(false);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setSelectedDiningId(null);
    setFormData(defaultForm);
    setShowLocationPicker(false);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation', 'Dining name is required.');
      return;
    }

    if (!formData.location.trim() || !formData.hours.trim()) {
      Alert.alert('Validation', 'Location and hours are required.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        location: formData.location.trim(),
        hours: formData.hours.trim(),
        contact: formData.contact.trim(),
        foodtype: formData.foodtype.trim(),
        icon: formData.icon.trim() || 'restaurant-outline',
        description: formData.description.trim(),
      };

      if (selectedDiningId) {
        await updateDining(selectedDiningId, payload);
      } else {
        await addDining(payload);
      }

      Alert.alert('Success', selectedDiningId ? 'Dining option updated successfully!' : 'Dining option added successfully!');
      resetForm();
    } catch (error) {
      console.error('Save dining error:', error);
      Alert.alert('Error', error?.message || 'Unable to save dining option');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (targetId = selectedDiningId, label) => {
    if (!targetId) return;

    const friendlyName = (label || formData.name || '').trim();
    const displayName = friendlyName ? `"${friendlyName}"` : 'this dining option';

    Alert.alert('Delete Dining Option', `Are you sure you want to delete ${displayName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await deleteDining(targetId);
            Alert.alert('Success', 'Dining option deleted successfully!');
            if (selectedDiningId === targetId) {
              resetForm();
            }
          } catch (error) {
            console.error('Delete dining error:', error);
            Alert.alert('Error', error?.message || 'Unable to delete dining option');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const renderDiningItem = ({ item }) => (
    <View style={styles.itemCard}>
      <TouchableOpacity
        style={styles.itemBody}
        activeOpacity={0.85}
        onPress={() => handleSelect(item)}
      >
        <View style={styles.itemTopRow}>
          <View style={styles.itemHeader}>
            <View style={styles.itemIcon}>
              <Ionicons name={item.icon || 'restaurant-outline'} size={22} color={COLORS.primary} />
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>{item.name || 'Untitled dining option'}</Text>
              <Text style={styles.itemSubtitle} numberOfLines={1}>{item.category || item.type || 'Dining'}</Text>
            </View>
          </View>
          <View style={styles.itemBadge}>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </View>
        </View>
        <View style={styles.itemMetaRow}>
          <Text style={styles.itemMeta}>{item.location}</Text>
          <Text style={styles.itemMeta}>{item.hours}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.itemActionsRow}>
        <TouchableOpacity
          style={[styles.itemActionButton, styles.itemActionPrimary]}
          onPress={() => handleSelect(item)}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={14} color={COLORS.primary} />
          <Text style={[styles.itemActionText, styles.itemActionPrimaryText]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.itemActionButton, styles.itemActionDanger]}
          onPress={() => handleDelete(item.id, item.name)}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={14} color={COLORS.white} />
          <Text style={[styles.itemActionText, styles.itemActionDangerText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScreenWrapper showsVerticalScrollIndicator>
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroEyebrow}>Admin Dashboard</Text>
            <Text style={styles.headerTitle}>Dining</Text>
            <Text style={styles.headerSubtitle}>Manage campus dining options</Text>
          </View>
          <View style={styles.heroIconWrap}>
            <Ionicons name="restaurant-outline" size={26} color={COLORS.white} />
          </View>
        </View>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroPill}>
            <Ionicons name="restaurant-outline" size={14} color={COLORS.white} />
            <Text style={styles.heroPillText}>{diningCount} records</Text>
          </View>
          <View style={styles.heroPillSecondary}>
            <Ionicons name="search-outline" size={14} color={COLORS.primary} />
            <Text style={styles.heroPillTextSecondary}>{visibleCount} shown</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAddNew} activeOpacity={0.9}>
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.addButtonText}>Add Dining</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color={COLORS.muted} style={styles.searchIcon} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search dining options..."
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
          <Text style={styles.searchMetaText}>{searchQuery ? 'Filtered dining list' : 'Search the current roster'}</Text>
          <Text style={styles.searchMetaCount}>{visibleCount} shown</Text>
        </View>
      </View>

      {showForm ? (
        <View style={styles.formCard}>
          <View style={styles.formHeader}>
            <View style={styles.formTitleBlock}>
              <Text style={styles.formEyebrow}>{selectedDiningId ? 'Edit record' : 'New record'}</Text>
              <Text style={styles.formTitle}>{selectedDiningId ? 'Edit Dining Option' : 'New Dining Option'}</Text>
            </View>
            <TouchableOpacity onPress={resetForm} activeOpacity={0.85}>
              <View style={styles.closeButton}>
                <Ionicons name="close" size={20} color={COLORS.dark} />
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formScrollContent}
            showsVerticalScrollIndicator
          >
            <View style={styles.formSectionCard}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(value) => setFormData({ ...formData, name: value })}
                placeholder="e.g. Main Cafeteria"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {diningCategories.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.chip, formData.category === type && styles.chipActive]}
                    onPress={() => setFormData({ ...formData, category: type })}
                  >
                    <Text style={[styles.chipText, formData.category === type && styles.chipTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formSectionCard}>
              <Text style={styles.label}>Location</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowLocationPicker((current) => !current)}
                activeOpacity={0.8}
              >
                <Text style={[styles.pickerButtonText, !formData.location && styles.pickerButtonPlaceholder]} numberOfLines={1}>
                  {formData.location || 'Choose an existing location'}
                </Text>
                <Ionicons name={showLocationPicker ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.muted} />
              </TouchableOpacity>

              {showLocationPicker ? (
                <View style={styles.locationPickerPanel}>
                  <Text style={styles.locationPickerTitle}>Select a campus location</Text>
                  <ScrollView style={styles.locationPickerScroll} nestedScrollEnabled showsVerticalScrollIndicator>
                    {availableLocations.length > 0 ? (
                      availableLocations.map((location) => (
                        <TouchableOpacity
                          key={location}
                          style={[styles.locationOption, formData.location === location && styles.locationOptionActive]}
                          onPress={() => {
                            setFormData({ ...formData, location });
                            setShowLocationPicker(false);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="location-outline" size={16} color={formData.location === location ? COLORS.white : COLORS.primary} />
                          <Text style={[styles.locationOptionText, formData.location === location && styles.locationOptionTextActive]} numberOfLines={1}>
                            {location}
                          </Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <Text style={styles.locationPickerEmpty}>No saved locations available yet.</Text>
                    )}
                  </ScrollView>
                </View>
              ) : null}

              <Text style={styles.label}>Hours</Text>
              <TextInput
                style={styles.input}
                value={formData.hours}
                onChangeText={(value) => setFormData({ ...formData, hours: value })}
                placeholder="e.g. 7:00 AM - 8:00 PM"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>Contact</Text>
              <TextInput
                style={styles.input}
                value={formData.contact}
                onChangeText={(value) => setFormData({ ...formData, contact: value })}
                placeholder="e.g. +1 (234) 567-8901"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>Food Type</Text>
              <TextInput
                style={styles.input}
                value={formData.foodtype}
                onChangeText={(value) => setFormData({ ...formData, foodtype: value })}
                placeholder="e.g. Multi-cuisine"
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.label}>Icon</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                {diningIcons.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[styles.iconChip, formData.icon === icon && styles.iconChipActive]}
                    onPress={() => setFormData({ ...formData, icon })}
                  >
                    <Ionicons name={icon} size={18} color={formData.icon === icon ? COLORS.white : COLORS.primary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(value) => setFormData({ ...formData, description: value })}
                placeholder="Describe the dining option"
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={5}
              />
            </View>

            <View style={styles.buttonRow}>
              <CustomButton title="Cancel" onPress={resetForm} variant="outline" style={styles.buttonFlex} disabled={saving || deleting} />
              {selectedDiningId ? (
                <CustomButton title="Delete" onPress={handleDelete} variant="danger" style={styles.buttonFlex} loading={deleting} disabled={saving || deleting} />
              ) : null}
              <CustomButton
                title={selectedDiningId ? 'Update' : 'Save'}
                onPress={handleSave}
                style={styles.buttonFlex}
                loading={saving}
                disabled={saving || deleting}
              />
            </View>
          </ScrollView>
        </View>
      ) : null}

      <Text style={styles.listTitle}>
        {filteredDining.length > 0 ? `Dining Options (${filteredDining.length})` : searchQuery ? 'No matching dining options' : 'No Dining Options Yet'}
      </Text>

      <FlatList
        data={filteredDining}
        keyExtractor={(item) => item.id}
        renderItem={renderDiningItem}
        scrollEnabled
        nestedScrollEnabled
        showsVerticalScrollIndicator
        style={styles.diningList}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="restaurant-outline" size={30} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Try a different keyword or clear the search.' : 'Tap Add Dining to create the first dining option.'}
            </Text>
            {!searchQuery ? <Text style={styles.emptySubtext}>Dining entries you add here will appear in the student dashboard.</Text> : null}
          </View>
        }
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: 0,
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
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
  },
  headerSubtitle: {
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
  formCard: {
    backgroundColor: COLORS.white,
    borderRadius: 28,
    paddingBottom: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EEF9',
  },
  formTitleBlock: {
    flex: 1,
    paddingRight: 12,
  },
  formEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  formTitle: {
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
  formScroll: {
    maxHeight: 500,
    overflowY: 'auto',
  },
  formScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
  },
  formSectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E8EEF9',
    padding: 14,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 0,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
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
    marginBottom: 12,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  pickerButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerButtonText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
    marginRight: 8,
  },
  pickerButtonPlaceholder: {
    color: '#9CA3AF',
  },
  locationPickerPanel: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  locationPickerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 10,
  },
  locationPickerScroll: {
    maxHeight: 180,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 8,
  },
  locationOptionActive: {
    backgroundColor: COLORS.primary,
  },
  locationOptionText: {
    marginLeft: 8,
    fontSize: 13,
    color: COLORS.dark,
    flex: 1,
  },
  locationOptionTextActive: {
    color: COLORS.white,
  },
  locationPickerEmpty: {
    fontSize: 13,
    color: COLORS.muted,
    paddingVertical: 8,
  },
  chipScroll: {
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.muted,
  },
  chipTextActive: {
    color: COLORS.white,
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
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  buttonFlex: {
    flex: 1,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 12,
    marginTop: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
  diningList: {
    maxHeight: 460,
  },
  itemCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  itemBody: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EEF9',
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.dark,
  },
  itemSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  itemBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8EEF9',
  },
  itemMeta: {
    flex: 1,
    fontSize: 12,
    color: COLORS.muted,
  },
  itemActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 12,
  },
  itemActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  itemActionPrimary: {
    backgroundColor: '#EEF4FF',
    borderColor: '#CBD5F5',
  },
  itemActionPrimaryText: {
    color: COLORS.primary,
  },
  itemActionDanger: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  itemActionDangerText: {
    color: COLORS.white,
  },
  itemActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconWrap: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default ManageDiningScreen;