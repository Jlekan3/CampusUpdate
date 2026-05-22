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
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import ScreenWrapper from '../../components/ScreenWrapper';
import { COLORS } from '../../utils/constants';
import {
  addDining,
  deleteDining,
  getDining,
  subscribeToDining,
  subscribeToLocations,
  updateDining,
} from '../../services/databaseService';

// ── Design Tokens ────────────────────────────────────────────────────────────
const NAVY = '#1A365D';
const GOLD = '#C5A047';
const SLATE = '#0F172A';
const MUTED = '#64748B';
const LIGHT = '#94A3B8';
const BG = '#F8FAFC';
const SURFACE = '#FFFFFF';
const BORDER = '#E2E8F0';

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

export default function ManageDiningScreen({ navigation }) {
  const [diningOptions, setDiningOptions] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Form Management States
  const [selectedDiningId, setSelectedDiningId] = useState(null);
  const [formData, setFormData] = useState(defaultForm);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const items = await getDining();
        setDiningOptions(items || []);
      } catch (error) {
        console.error('Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    const unsubscribeDining = subscribeToDining((items) => {
      setDiningOptions(items || []);
    });

    const unsubscribeLocations = subscribeToLocations((items) => {
      const locationNames = (items || [])
        .map((item) => item.names || item.name || item.title || '')
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      setAvailableLocations([...new Set(locationNames)]);
    });

    return () => {
      unsubscribeDining && unsubscribeDining();
      unsubscribeLocations && unsubscribeLocations();
    };
  }, []);

  const filteredDining = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return diningOptions;

    return diningOptions.filter((item) => {
      return [
        item.name,
        item.category,
        item.type,
        item.location,
        item.foodtype,
        item.cuisine,
      ]
        .map((val) => (val || '').toString().toLowerCase())
        .some((val) => val.includes(query));
    });
  }, [diningOptions, searchQuery]);

  const handleOpenAddModal = () => {
    setSelectedDiningId(null);
    setFormData(defaultForm);
    setShowLocationPicker(false);
    setModalVisible(true);
  };

  const handleOpenEditModal = (item) => {
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
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.location.trim() || !formData.hours.trim()) {
      Alert.alert('Required Fields', 'Please complete Name, Location, and Operating Hours.');
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
        Alert.alert('Success', 'Dining asset parameters updated safely.');
      } else {
        await addDining(payload);
        Alert.alert('Success', 'New dining option registered into platform framework.');
      }
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Save Failed', error?.message || 'Unable to store changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = (targetId, name) => {
    Alert.alert(
      'Remove Resource Entry',
      `Are you completely sure you want to delete "${name || 'this resource'}" from campus registry indices?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteDining(targetId);
              Alert.alert('Removed', 'Asset has been detached successfully.');
            } catch (error) {
              Alert.alert('Deletion Conflict', error?.message || 'Failed to remove asset.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // ── Excel / CSV Processing Engine ───────────────────────────
  const handleImportRows = async (rows) => {
    let insertedCount = 0;
    const skipped = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = (row['name'] || row['Name'] || '').toString().trim();
      const location = (row['location'] || row['Location'] || '').toString().trim();
      const hours = (row['hours'] || row['Hours'] || row['Operating Hours'] || '').toString().trim();
      const category = (row['category'] || row['Category'] || 'Restaurant').toString().trim();
      const contact = (row['contact'] || row['Contact'] || row['Phone'] || '').toString().trim();
      const foodtype = (row['foodtype'] || row['Food Type'] || row['Cuisine'] || '').toString().trim();
      const description = (row['description'] || row['Description'] || '').toString().trim();
      const icon = (row['icon'] || row['Icon'] || 'restaurant-outline').toString().trim();

      if (!name || !location || !hours) {
        skipped.push(`Row ${i + 2}: Missing required parameters (Name, Location, or Hours).`);
        continue;
      }

      try {
        await addDining({
          name,
          category,
          location,
          hours,
          contact,
          foodtype,
          icon,
          description,
        });
        insertedCount++;
      } catch (err) {
        skipped.push(`Row ${i + 2} Exception: ${err.message}`);
      }
    }

    let completionSummary = `${insertedCount} spreadsheet row-entries mapped and inserted into live databases.`;
    if (skipped.length) {
      completionSummary += `\n\n${skipped.length} exceptions skipped:\n${skipped.slice(0, 5).join('\n')}`;
    }
    Alert.alert('Import Protocol Finished', completionSummary);
    setImporting(false);
  };

  const handleImportExcelDocument = async () => {
    try {
      setImporting(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/csv',
          'application/csv',
          '*/*',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        setImporting(false);
        return;
      }

      const file = result.assets[0];
      const isCsv = file.name?.toLowerCase().endsWith('.csv');
      const fileStringData = isCsv
        ? await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.UTF8 })
        : await FileSystem.readAsStringAsync(file.uri, { encoding: FileSystem.EncodingType.Base64 });

      const workbook = isCsv
        ? XLSX.read(fileStringData, { type: 'string' })
        : XLSX.read(fileStringData, { type: 'base64' });

      const focusedSheetName = workbook.SheetNames[0];
      const parsedSheet = workbook.Sheets[focusedSheetName];
      const structuredRows = XLSX.utils.sheet_to_json(parsedSheet, { defval: '' });

      await handleImportRows(structuredRows);
    } catch (err) {
      Alert.alert('Import Failed', err?.message || 'File interpretation failed. Verify schema.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <ScreenWrapper backgroundColor={BG} statusBarStyle="dark-content">
      {/* ── HEADER ACTION ROW ── */}
      <View style={s.headerBlock}>
        <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color={SLATE} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerSubtitle}>ADMINISTRATION</Text>
          <Text style={s.headerTitle}>Dining Directory</Text>
        </View>
        <TouchableOpacity style={s.addRoundBtn} onPress={handleOpenAddModal} activeOpacity={0.85}>
          <Ionicons name="add" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* ── METADATA & SEARCH INTERFACE ── */}
      <View style={s.searchSection}>
        <Ionicons name="search-outline" size={18} color={LIGHT} style={{ marginRight: 10 }} />
        <TextInput
          style={s.searchInputField}
          placeholder="Search locations, categories, menus..."
          placeholderTextColor={LIGHT}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={LIGHT} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── MASS SPREADSHEET BATCHING LOADER ── */}
      <TouchableOpacity
        style={[s.importBarAction, importing && { opacity: 0.6 }]}
        onPress={handleImportExcelDocument}
        disabled={importing}
        activeOpacity={0.8}
      >
        <Ionicons name={importing ? 'hourglass-outline' : 'cloud-upload-outline'} size={16} color={NAVY} />
        <Text style={s.importBarText}>{importing ? 'Processing Spreadsheets…' : 'Import from Excel / CSV'}</Text>
      </TouchableOpacity>

      {/* ── CORE RENDER PIPELINE LIST ── */}
      {loading && diningOptions.length === 0 ? (
        <View style={s.centeredSpinner}>
          <ActivityIndicator size="large" color={NAVY} />
        </View>
      ) : (
        <FlatList
          data={filteredDining}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={s.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={s.emptyContextCard}>
              <Ionicons name="restaurant-outline" size={44} color={LIGHT} />
              <Text style={s.emptyContextText}>No matching dining operations registered.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.assetCard}>
              <View style={s.cardIdentityRow}>
                <View style={s.iconWrapperFrame}>
                  <Ionicons name={item.icon || 'restaurant-outline'} size={20} color={NAVY} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.itemPrimaryName} numberOfLines={1}>{item.name}</Text>
                  <Text style={s.itemCategoryLabel}>{item.category || item.type || 'Dining'}</Text>
                </View>
              </View>

              <View style={s.metaDetailsContainer}>
                <View style={s.metaDataRow}>
                  <Ionicons name="location-outline" size={13} color={MUTED} style={{ marginRight: 4 }} />
                  <Text style={s.metaInfoText} numberOfLines={1}>{item.location}</Text>
                </View>
                <View style={[s.metaDataRow, { marginTop: 4 }]}>
                  <Ionicons name="time-outline" size={13} color={MUTED} style={{ marginRight: 4 }} />
                  <Text style={s.metaInfoText} numberOfLines={1}>{item.hours}</Text>
                </View>
              </View>

              <View style={s.cardActionsRow}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={s.secondaryActionBtn} onPress={() => handleOpenEditModal(item)}>
                  <Ionicons name="create-outline" size={14} color={NAVY} />
                  <Text style={s.secondaryActionBtnText}>Modify</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.destructiveActionBtn} onPress={() => handleDeleteItem(item.id, item.name)}>
                  <Ionicons name="trash-outline" size={14} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* ── ADMIN INTERACTIVE BOTTOM SHEET MODAL ── */}
      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.modalOverlayFrame}>
          <View style={s.bottomSheetModalSurface}>
            <View style={s.modalIndicatorHandle} />
            <View style={s.modalHeaderRow}>
              <Text style={s.modalTitleText}>{selectedDiningId ? 'Modify Dining Asset' : 'Add New Dining Option'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={SLATE} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.modalFormScroll} showsVerticalScrollIndicator={false}>
              <Text style={s.inputLabelHeader}>Dining Asset Name *</Text>
              <TextInput style={s.cleanInputBox} value={formData.name} onChangeText={(val) => setFormData({ ...formData, name: val })} placeholder="e.g. Executive Cafeteria" placeholderTextColor={LIGHT} />

              <Text style={s.inputLabelHeader}>Service Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScrollerContainer}>
                {diningCategories.map((cat) => (
                  <TouchableOpacity key={cat} style={[s.categoryPillSelection, formData.category === cat && s.categoryPillActive]} onPress={() => setFormData({ ...formData, category: cat })}>
                    <Text style={[s.categoryPillText, formData.category === cat && s.categoryPillTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={s.inputLabelHeader}>Campus Structural Location *</Text>
              <TouchableOpacity style={s.dropdownBtn} onPress={() => setShowLocationPicker(!showLocationPicker)} activeOpacity={0.8}>
                <Text style={[s.dropdownBtnText, !formData.location && { color: LIGHT }]} numberOfLines={1}>
                  {formData.location || 'Select designated campus site'}
                </Text>
                <Ionicons name={showLocationPicker ? 'chevron-up-outline' : 'chevron-down-outline'} size={16} color={LIGHT} />
              </TouchableOpacity>

              {showLocationPicker && (
                <View style={s.pickerInlineContainer}>
                  <ScrollView style={{ maxHeight: 140 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {availableLocations.map((loc) => (
                      <TouchableOpacity key={loc} style={[s.pickerSelectionOptionRow, formData.location === loc && s.pickerSelectionActiveRow]} onPress={() => { setFormData({ ...formData, location: loc }); setShowLocationPicker(false); }}>
                        <Text style={[s.pickerSelectionText, formData.location === loc && { fontWeight: '700', color: NAVY }]}>{loc}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={s.inputLabelHeader}>Operating Schedule / Hours *</Text>
              <TextInput style={s.cleanInputBox} value={formData.hours} onChangeText={(val) => setFormData({ ...formData, hours: val })} placeholder="e.g. Mon - Fri: 07:00 - 21:00" placeholderTextColor={LIGHT} />

              <Text style={s.inputLabelHeader}>Contact Communications Channel</Text>
              <TextInput style={s.cleanInputBox} value={formData.contact} onChangeText={(val) => setFormData({ ...formData, contact: val })} keyboardType="phone-pad" placeholder="e.g. +233..." placeholderTextColor={LIGHT} />

              <Text style={s.inputLabelHeader}>Primary Cuisine / Food Specialization</Text>
              <TextInput style={s.cleanInputBox} value={formData.foodtype} onChangeText={(val) => setFormData({ ...formData, foodtype: val })} placeholder="e.g. Continental & Local Dishes" placeholderTextColor={LIGHT} />

              <Text style={s.inputLabelHeader}>Display Graphic Icon Mapping</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScrollerContainer}>
                {diningIcons.map((ico) => (
                  <TouchableOpacity key={ico} style={[s.iconBoxSelection, formData.icon === ico && s.iconBoxActive]} onPress={() => setFormData({ ...formData, icon: ico })}>
                    <Ionicons name={ico} size={18} color={formData.icon === ico ? '#FFF' : NAVY} />
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={s.inputLabelHeader}>Descriptive Summary Overview</Text>
              <TextInput style={[s.cleanInputBox, s.multiLineHeightInput]} value={formData.description} onChangeText={(val) => setFormData({ ...formData, description: val })} multiline numberOfLines={4} placeholder="Describe operational specifics..." placeholderTextColor={LIGHT} />
            </ScrollView>

            <TouchableOpacity style={[s.primarySubmitActionBtn, saving && { opacity: 0.8 }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.primarySubmitActionBtnText}>Commit Registries Save</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenWrapper>
  );
}

// ── Clean Premium UI Stylesheet ──────────────────────────────────────────────
const s = StyleSheet.create({
  headerBlock: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, backgroundColor: SURFACE, borderBottomWidth: 1, borderBottomColor: BORDER, gap: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: BORDER, backgroundColor: BG },
  headerSubtitle: { fontSize: 10, fontWeight: '700', color: GOLD, letterSpacing: 1.2 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: SLATE, marginTop: 1 },
  addRoundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center' },

  searchSection: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 16, paddingHorizontal: 14, height: 46, borderRadius: 12, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER },
  searchInputField: { flex: 1, fontSize: 14, color: SLATE },

  importBarAction: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginTop: 10, paddingVertical: 11, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1.5, borderColor: BORDER, backgroundColor: SURFACE },
  importBarText: { fontSize: 13, fontWeight: '700', color: NAVY },

  listContainer: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40, gap: 12 },
  centeredSpinner: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyContextCard: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyContextText: { fontSize: 14, fontWeight: '500', color: MUTED, textAlign: 'center' },

  assetCard: { backgroundColor: SURFACE, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: BORDER },
  cardIdentityRow: { flexDirection: 'row', alignItems: 'center' },
  iconWrapperFrame: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EDF2F7', justifyContent: 'center', alignItems: 'center' },
  itemPrimaryName: { fontSize: 15, fontWeight: '700', color: SLATE },
  itemCategoryLabel: { fontSize: 12, color: MUTED, marginTop: 1 },

  metaDetailsContainer: { marginTop: 12, padding: 10, borderRadius: 10, backgroundColor: BG },
  metaDataRow: { flexDirection: 'row', alignItems: 'center' },
  metaInfoText: { fontSize: 12, color: SLATE, fontWeight: '500', flex: 1 },

  cardActionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  secondaryActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: BORDER, backgroundColor: BG },
  secondaryActionBtnText: { fontSize: 12, fontWeight: '600', color: NAVY },
  destructiveActionBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },

  modalOverlayFrame: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
  bottomSheetModalSurface: { backgroundColor: SURFACE, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 34, maxHeight: '85%' },
  modalIndicatorHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: BORDER, alignSelf: 'center', marginBottom: 16 },
  modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitleText: { fontSize: 16, fontWeight: '800', color: SLATE },
  modalFormScroll: { gap: 12, paddingBottom: 20 },
  inputLabelHeader: { fontSize: 11, fontWeight: '700', color: SLATE, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  cleanInputBox: { height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 14, backgroundColor: BG, fontSize: 14, color: SLATE },
  multiLineHeightInput: { height: 80, paddingTop: 10, textAlignVertical: 'top' },

  chipScrollerContainer: { flexDirection: 'row', marginVertical: 2 },
  categoryPillSelection: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: BG, borderWidth: 1, borderColor: BORDER, marginRight: 8 },
  categoryPillActive: { backgroundColor: NAVY, borderColor: NAVY },
  categoryPillText: { fontSize: 12, fontWeight: '600', color: MUTED },
  categoryPillTextActive: { color: '#FFF' },

  iconBoxSelection: { width: 40, height: 40, borderRadius: 10, backgroundColor: BG, borderWidth: 1, borderColor: BORDER, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  iconBoxActive: { backgroundColor: NAVY, borderColor: NAVY },

  dropdownBtn: { height: 44, borderRadius: 10, borderWidth: 1.5, borderColor: BORDER, paddingHorizontal: 14, backgroundColor: BG, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownBtnText: { fontSize: 14, color: SLATE, flex: 1 },

  pickerInlineContainer: { backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, borderRadius: 10, padding: 4, marginTop: -4 },
  pickerSelectionOptionRow: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6 },
  pickerSelectionActiveRow: { backgroundColor: '#EEF4FF' },
  pickerSelectionText: { fontSize: 13, color: SLATE },

  primarySubmitActionBtn: { height: 48, borderRadius: 12, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  primarySubmitActionBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});