import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
  Modal,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as XLSX from 'xlsx';
import ScreenWrapper from '../../components/ScreenWrapper';
import CustomButton from '../../components/CustomButton';
import { COLORS } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { USER_ROLES } from '../../utils/constants';
import { addLocation, addLocationsBatch, subscribeToLocations, updateLocation, deleteLocation } from '../../services/databaseService';
import { uploadLocationImages, deleteLocationImage } from '../../services/storageService';

const AddLocationsScreen = ({ navigation }) => {
  const [locations, setLocations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    names: '',
    description: '',
    category: 'Gate',
    latitude: '',
    longitude: '',
    imageurl: '',
  });
  const [localImageUri, setLocalImageUri] = useState(null);
  const { userRole, user } = useAuth();
  const [importing, setImporting] = useState(false);

  const filteredLocations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return locations;

    return locations.filter((location) => {
      const name = (location.names || location.name || '').toLowerCase();
      const category = (location.category || '').toLowerCase();
      const description = (location.description || '').toLowerCase();

      return (
        name.includes(query) ||
        category.includes(query) ||
        description.includes(query)
      );
    });
  }, [locations, searchQuery]);

  useEffect(() => {
    const unsubscribe = subscribeToLocations((items) => {
      setLocations(items || []);
    });

    return () => {
      try {
        unsubscribe?.();
      } catch (e) {
        // ignore unsubscribe errors
      }
    };
  }, []);

  // Reset form when modal closes
  useEffect(() => {
    if (!showModal) {
      setFormData({
        names: '',
        description: '',
        category: 'Gate',
        latitude: '',
        longitude: '',
        imageurl: '',
      });
      setLocalImageUri(null);
      setEditingId(null);
      setIsUploading(false);
    }
  }, [showModal]);

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

  const pickLocationPhoto = async (source) => {
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permission.status !== 'granted') {
        Alert.alert('Permission needed', 'Allow camera or photo access to add a location image.');
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.85,
            });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setLocalImageUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', error?.message || 'Could not open image picker.');
    }
  };

  const clearLocationPhoto = () => {
    setLocalImageUri(null);
    setFormData((current) => ({ ...current, imageurl: '' }));
  };

  const resolveImageUrl = async (locationId, previousImageUrl) => {
    if (!localImageUri) {
      return formData.imageurl.trim() || previousImageUrl || '';
    }

    if (previousImageUrl && previousImageUrl.includes('firebasestorage.googleapis.com')) {
      try {
        await deleteLocationImage(previousImageUrl);
      } catch (error) {
        console.log('Previous image cleanup skipped', error?.message);
      }
    }

    const uploadedUrls = await uploadLocationImages(locationId, [{ uri: localImageUri }]);
    return uploadedUrls[0] || formData.imageurl.trim() || previousImageUrl || '';
  };

  const handleAddLocation = async () => {
    if (userRole !== USER_ROLES.ADMIN) {
      return Alert.alert('Unauthorized', 'You are not allowed to perform this action');
    }

    if (!formData.names.trim()) {
      return Alert.alert('Validation Error', 'Location name is required');
    }

    if (!formData.latitude.trim() || !formData.longitude.trim()) {
      return Alert.alert('Validation Error', 'Latitude and Longitude are required');
    }

    // Validate coordinates
    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return Alert.alert('Validation Error', 'Latitude and Longitude must be valid numbers');
    }

    try {
      setIsUploading(true);
      
      const previousImageUrl = editingId
        ? locations.find((item) => item.id === editingId)?.imageurl
        : '';

      const newLocation = {
        names: formData.names.trim(),
        description: formData.description.trim(),
        category: formData.category,
        coordinates: {
          latitude: lat,
          longitude: lng,
        },
        imageurl: formData.imageurl.trim() || previousImageUrl || '',
      };

      if (user?.uid) {
        newLocation.createdBy = user.uid;
      }

      let savedId = editingId;
      if (editingId) {
        if (localImageUri) {
          newLocation.imageurl = await resolveImageUrl(editingId, previousImageUrl);
        }
        await updateLocation(editingId, newLocation);
      } else {
        savedId = await addLocation(newLocation);
        if (localImageUri) {
          const imageurl = await resolveImageUrl(savedId, '');
          await updateLocation(savedId, { imageurl });
        }
      }
      
      // Show success message
      Alert.alert(
        'Success ✓',
        `"${newLocation.names}" ${editingId ? 'updated' : 'saved'} in Firestore`
      );
      
      // Close modal and reset form
      setShowModal(false);
      
    } catch (error) {
      console.error('❌ Save failed:', error.message);
      
      // Show error message
      let errorMsg = error.message;
      if (error.code === 'permission-denied') {
        errorMsg = 'Permission denied. Check if your role is "admin" in users collection.';
      }
      
      Alert.alert('Error', errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Location', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteLocation(id);
            if (editingId === id) {
              setShowModal(false);
            }
          } catch (error) {
            Alert.alert('Error', error.message || 'Unable to delete location');
          }
        },
      },
    ]);
  };

  const handleEdit = (location) => {
    setEditingId(location.id);
    setFormData({
      names: location.names || location.name || '',
      description: location.description || '',
      category: location.category || 'Gate',
      latitude: location.coordinates?.latitude?.toString() || location.latitude?.toString() || '',
      longitude: location.coordinates?.longitude?.toString() || location.longitude?.toString() || '',
      imageurl: location.imageurl || '',
    });
    setLocalImageUri(null);
    setShowModal(true);
  };

  const handleDeleteCurrent = () => {
    if (!editingId) return;
    handleDelete(editingId);
  };

  const handleImportRows = async (rows) => {
    const locationsToCreate = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2;
      const nameValue =
        row['Room Name'] || row['room name'] || row.RoomName || row.roomName || row.name || row.Name || row.location || row.Location || row.title || row.Title;
      const floorValue = row.floor || row.Floor || '';
      const descriptionValue = row.description || row.Description || '';

      if (!nameValue) {
        errors.push(`Row ${rowNumber}: missing Room Name`);
        continue;
      }

      locationsToCreate.push({
        name: String(nameValue).trim(),
        names: String(nameValue).trim(),
        floor: String(floorValue).trim(),
        description: String(descriptionValue).trim(),
        category: 'Other',
        imageCount: 0,
        images: [],
        createdBy: user?.uid || null,
      });
    }

    let success = 0;
    if (locationsToCreate.length > 0) {
      try {
        const createdIds = await addLocationsBatch(locationsToCreate);
        success = createdIds.length;
      } catch (error) {
        console.error('Batch import failed:', error);
        errors.push('Batch upload failed');
      }
    }

    Alert.alert(
      'Import Complete',
      `Uploaded ${success} location${success === 1 ? '' : 's'}. ${errors.length} error${errors.length === 1 ? '' : 's'}.` +
        (errors.length ? '\nSee console for details.' : '')
    );

    if (errors.length) {
      console.warn('Import errors:', errors);
    }
  };

  const readFileWithFileReader = (file, mode) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error || new Error('Failed to read the selected file.'));

      if (mode === 'text') {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });

  const handleWebFileChange = async (event) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const fileName = (file.name || '').toLowerCase();
      const isCsv = fileName.endsWith('.csv');
      const isXlsx = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

      if (!isCsv && !isXlsx) {
        throw new Error('Please select a .xlsx or .csv file.');
      }

      const fileData = isCsv
        ? await readFileWithFileReader(file, 'text')
        : await readFileWithFileReader(file, 'arrayBuffer');

      const workbook = isCsv
        ? XLSX.read(fileData, { type: 'string' })
        : XLSX.read(fileData, { type: 'array' });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      await handleImportRows(rows);
    } catch (error) {
      console.error('Web import failed:', error);
      Alert.alert('Import failed', error?.message || 'Could not import file.');
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportLocations = async () => {
    try {
      setImporting(true);

      if (Platform.OS === 'web') {
        fileInputRef.current?.click();
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
          'application/csv',
          'text/comma-separated-values',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      const canceled = result?.canceled || result?.type === 'cancel';
      if (canceled) {
        setImporting(false);
        return;
      }

      const pickedFile = result?.assets?.[0] || result;
      const fileName = (pickedFile?.name || pickedFile?.fileName || '').toLowerCase();
      const fileUri = pickedFile?.uri;

      if (!fileUri) {
        throw new Error('Could not read the selected file.');
      }

      const isCsv = fileName.endsWith('.csv');
      const isXlsx = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

      if (!isCsv && !isXlsx) {
        throw new Error('Please select a .xlsx or .csv file.');
      }

      const fileText = isCsv
        ? await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 })
        : await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });

      const workbook = isCsv
        ? XLSX.read(fileText, { type: 'string' })
        : XLSX.read(fileText, { type: 'base64' });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      await handleImportRows(rows);
    } catch (err) {
      setImporting(false);
      console.error('Import failed', err);
      Alert.alert('Import failed', err?.message || 'Could not import file. Please select a .xlsx or .csv file.');
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      Gate: '#1E40AF',
      Building: '#2563EB',
      Facility: '#3B82F6',
      Cafeteria: '#60A5FA',
      Restroom: '#0EA5E9',
      Gym: '#06B6D4',
      Library: '#0891B2',
      Lab: '#0369A1',
      Parking: '#3B82F6',
      Other: '#64748B',
    };
    return colors[category] || '#3B82F6';
  };

  const renderLocationCard = ({ item }) => (
    <TouchableOpacity style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <View
          style={[
            styles.locationIcon,
            { backgroundColor: getCategoryColor(item.category) + '20' },
          ]}
        >
          <Ionicons
            name={
              item.category === 'Gate'
                ? 'enter-outline'
                : item.category === 'Building'
                ? 'business-outline'
                : item.category === 'Parking'
                ? 'car-outline'
                : item.category === 'Cafeteria'
                ? 'restaurant-outline'
                : item.category === 'Gym'
                ? 'dumbbell-outline'
                : 'location-outline'
            }
            size={24}
            color={getCategoryColor(item.category)}
          />
        </View>
        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{item.names}</Text>
          <Text style={styles.locationBuilding}>
            {item.category}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => handleEdit(item)}
            style={styles.actionButton}
          >
            <Ionicons name="pencil-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            style={styles.actionButton}
          >
            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.locationDetails}>
        <View style={styles.detail}>
          <Ionicons name="location-outline" size={16} color={COLORS.muted} />
          <Text style={styles.detailText}>
            {item.coordinates?.latitude?.toFixed(4)}, {item.coordinates?.longitude?.toFixed(4)}
          </Text>
        </View>
        <View style={styles.detail}>
          <Ionicons name="pricetag-outline" size={16} color={COLORS.muted} />
          <Text style={styles.detailText}>{item.category}</Text>
        </View>
      </View>

      {item.description && (
        <Text style={styles.description}>{item.description}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        {Platform.OS === 'web' ? (
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/csv"
            onChange={handleWebFileChange}
            style={styles.hiddenFileInput}
          />
        ) : null}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroEyebrow}>Admin Dashboard</Text>
              <Text style={styles.title}>Add Locations</Text>
              <Text style={styles.subtitle}>Create new locations with photos</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="location-outline" size={26} color={COLORS.white} />
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroPill}>
              <Ionicons name="location-outline" size={14} color={COLORS.white} />
              <Text style={styles.heroPillText}>{locations.length} records</Text>
            </View>
            <View style={styles.heroPillSecondary}>
              <Ionicons name="add-circle-outline" size={14} color={COLORS.primary} />
              <Text style={styles.heroPillTextSecondary}>Create new location</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={() => setShowModal(true)} activeOpacity={0.9}>
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.addButtonText}>Add Location</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={18} color={COLORS.muted} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search locations..."
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
              {searchQuery ? 'Filtered locations list' : 'Search the current roster'}
            </Text>
            <Text style={styles.searchMetaCount}>{filteredLocations.length} shown</Text>
          </View>
        </View>

        <View style={styles.locationsListBox}>
          <FlatList
            data={filteredLocations}
            renderItem={renderLocationCard}
            keyExtractor={(item) => item.id}
            style={styles.locationsList}
            scrollEnabled={true}
            showsVerticalScrollIndicator={true}
            persistentScrollbar
            indicatorStyle="black"
            nestedScrollEnabled
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="location-outline" size={48} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No locations match your search' : 'No locations added yet'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? 'Try a different keyword or clear the search' : 'Tap the + button to create a new location with photos'}
                </Text>
              </View>
            }
          />
        </View>
      </View>

      {/* Add Location Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleBlock}>
                <Text style={styles.modalEyebrow}>{editingId ? 'Edit record' : 'New record'}</Text>
                <Text style={styles.modalTitle}>{editingId ? 'Edit Location' : 'Add New Location'}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)} activeOpacity={0.85}>
                <View style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={COLORS.dark} />
                </View>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.formContent}
              contentContainerStyle={styles.formContentInner}
              showsVerticalScrollIndicator={true}
              persistentScrollbar
              indicatorStyle="black"
            >
              {userRole === USER_ROLES.ADMIN ? (
                <View style={styles.formSectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionHeaderIconWrap}>
                      <Ionicons name="cloud-upload-outline" size={20} color={COLORS.primary} />
                    </View>
                    <View style={styles.sectionHeaderText}>
                      <Text style={styles.uploadTitle}>Import Locations</Text>
                      <Text style={styles.uploadText}>
                        Upload a .xlsx or .csv file with columns like Room Name, Floor, and Description.
                      </Text>
                    </View>
                  </View>
                  <CustomButton
                    title={importing ? 'Importing...' : 'Upload Excel / CSV'}
                    onPress={handleImportLocations}
                    variant="secondary"
                    disabled={isUploading || importing}
                  />
                </View>
              ) : null}

              {/* Location Name */}
              <View style={styles.formSectionCard}>
                <Text style={styles.sectionLabel}>Location Name <Text style={{color: COLORS.danger}}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., North gate"
                  value={formData.names}
                  onChangeText={(text) =>
                    setFormData({ ...formData, names: text })
                  }
                  placeholderTextColor={COLORS.muted}
                />

                {/* Category */}
                <Text style={styles.sectionLabel}>Category <Text style={{color: COLORS.danger}}>*</Text></Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.categoryScroll}
                  contentContainerStyle={styles.categoryScrollContent}
                >
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryChip,
                        formData.category === cat && styles.categoryChipActive,
                      ]}
                      onPress={() => setFormData({ ...formData, category: cat })}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.categoryText,
                          formData.category === cat && styles.categoryTextActive,
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
                  placeholder="Main entrance to RMU"
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={COLORS.muted}
                  textAlignVertical="top"
                />

                {/* Coordinates */}
                <Text style={styles.sectionLabel}>Coordinates <Text style={{color: COLORS.danger}}>*</Text></Text>
                <Text style={styles.coordinateHint}>Get from any map app or GPS (e.g., 5.615291, -0.065228)</Text>
                <View style={styles.coordinatesRow}>
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Latitude"
                    value={formData.latitude}
                    onChangeText={(text) => setFormData({ ...formData, latitude: text })}
                    keyboardType="decimal-pad"
                    placeholderTextColor={COLORS.muted}
                  />
                  <View style={{ width: 12 }} />
                  <TextInput
                    style={[styles.input, styles.halfInput]}
                    placeholder="Longitude"
                    value={formData.longitude}
                    onChangeText={(text) => setFormData({ ...formData, longitude: text })}
                    keyboardType="decimal-pad"
                    placeholderTextColor={COLORS.muted}
                  />
                </View>

                {/* Location photo */}
                <Text style={styles.sectionLabel}>Location photo</Text>
                <Text style={styles.coordinateHint}>Upload to Firebase Storage, or paste an image URL below.</Text>

                {(localImageUri || formData.imageurl) ? (
                  <View style={styles.imagesContainer}>
                    <View style={styles.imagePreviewContainer}>
                      <Image
                        source={{ uri: localImageUri || formData.imageurl }}
                        style={styles.imagePreview}
                        resizeMode="cover"
                      />
                      <TouchableOpacity style={styles.removeImageButton} onPress={clearLocationPhoto}>
                        <Ionicons name="close-circle" size={28} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                <View style={styles.imageButtons}>
                  <TouchableOpacity
                    style={styles.imageButton}
                    onPress={() => pickLocationPhoto('library')}
                    disabled={isUploading}
                  >
                    <Ionicons name="images-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.imageButtonText}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.imageButton}
                    onPress={() => pickLocationPhoto('camera')}
                    disabled={isUploading}
                  >
                    <Ionicons name="camera-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.imageButtonText}>Camera</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.sectionLabel}>Image URL (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com/image.jpg"
                  value={formData.imageurl}
                  onChangeText={(text) => setFormData({ ...formData, imageurl: text })}
                  placeholderTextColor={COLORS.muted}
                  editable={!localImageUri}
                />

                <View style={styles.formButtons}>
                  <CustomButton
                    title="Cancel"
                    onPress={() => setShowModal(false)}
                    variant="outline"
                    style={{ flex: 1 }}
                    disabled={isUploading}
                  />
                  {editingId && (
                    <>
                      <View style={{ width: 12 }} />
                      <CustomButton
                        title="Delete"
                        onPress={handleDeleteCurrent}
                        variant="danger"
                        style={{ flex: 1 }}
                        disabled={isUploading}
                      />
                    </>
                  )}
                  <View style={{ width: 12 }} />
                  <CustomButton
                    title={isUploading ? (editingId ? 'Updating...' : 'Saving...') : (editingId ? 'Update Location' : 'Add Location')}
                    onPress={handleAddLocation}
                    variant="primary"
                    style={{ flex: 1 }}
                    disabled={isUploading}
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
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
  },
  subtitle: {
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
    color: '#0F172A',
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
    borderColor: 'rgba(15,23,42,0.06)',
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
  listContent: {
    paddingBottom: 20,
  },
  locationsListBox: {
    maxHeight: 430,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    borderRadius: 22,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  locationsList: {
    flex: 1,
  },
  locationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.dark,
  },
  locationBuilding: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  locationDetails: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: COLORS.muted,
    marginLeft: 6,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 12,
    lineHeight: 18,
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
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
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
    shadowOpacity: 0.2,
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
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.dark,
  },
  formContent: {
    paddingHorizontal: 18,
  },
  formContentInner: {
    paddingTop: 16,
    paddingBottom: 28,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  sectionHeaderIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 0,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  coordinateHint: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
    fontSize: 14,
    color: COLORS.dark,
  },
  textArea: {
    minHeight: 110,
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
  categoryScrollContent: {
    paddingRight: 4,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.muted,
  },
  categoryTextActive: {
    color: COLORS.white,
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
  },
  imageButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    marginLeft: 8,
  },
  imagesContainer: {
    marginBottom: 12,
  },
  imageCountLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 8,
  },
  imagePreviewContainer: {
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 12,
  },
  uploadCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 6,
  },
  uploadText: {
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
    marginBottom: 12,
  },
  hiddenFileInput: {
    display: 'none',
  },
});

export default AddLocationsScreen;
