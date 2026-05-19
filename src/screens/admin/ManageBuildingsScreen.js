import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import CustomButton from '../../components/CustomButton';
import { COLORS } from '../../utils/constants';
import { subscribeToBuildings, deleteBuilding, updateBuilding } from '../../services/databaseService';
import { useAuth } from '../../context/AuthContext';
import { USER_ROLES } from '../../utils/constants';

const ManageBuildingsScreen = ({ navigation }) => {
  const [buildings, setBuildings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBuildings = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return buildings;

    return buildings.filter((building) => {
      const nameValue = (building.name || '').toLowerCase();
      const descriptionValue = (building.description || '').toLowerCase();

      return nameValue.includes(query) || descriptionValue.includes(query);
    });
  }, [buildings, searchQuery]);

  useEffect(() => {
    const unsub = subscribeToBuildings((items) => {
      setBuildings(items);
      setLoading(false);
    });
    return unsub;
  }, []);

  const { userRole } = useAuth();
  const visibleCount = filteredBuildings.length;

  const resetForm = () => {
    setName('');
    setDescription('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (building) => {
    setEditingId(building.id);
    setName(building.name);
    setDescription(building.description || '');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (userRole !== USER_ROLES.ADMIN) return Alert.alert('Unauthorized', 'You are not allowed to perform this action');
    if (!editingId) return Alert.alert('Unavailable', 'Adding buildings is disabled. Select a building to edit.');
    if (!name.trim()) return Alert.alert('Validation', 'Building name is required');
    
    try {
      await updateBuilding(editingId, {
        name: name.trim(),
        description: description.trim(),
      });
      Alert.alert('Success', 'Building updated!');
      resetForm();
    } catch (err) {
      console.log('Save building error', err);
      Alert.alert('Error', 'Unable to save building');
    }
  };

  const handleDelete = (id) => {
    if (userRole !== USER_ROLES.ADMIN) return Alert.alert('Unauthorized', 'You are not allowed to perform this action');
    Alert.alert('Delete Building', 'Are you sure you want to delete this building?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteBuilding(id);
          Alert.alert('Success', 'Building deleted!');
        } catch (err) {
          console.log('Delete error', err);
          Alert.alert('Error', 'Unable to delete building');
        }
      } }
    ]);
  };

  const handleDeleteCurrent = () => {
    if (!editingId) return;

    handleDelete(editingId);
  };

  return (
    <ScreenWrapper showsVerticalScrollIndicator>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            </TouchableOpacity>

            <View style={styles.heroTextWrap}>
              <Text style={styles.heroEyebrow}>Admin Dashboard</Text>
              <Text style={styles.title}>Buildings</Text>
              <Text style={styles.subtitle}>Create and manage campus buildings</Text>
            </View>

            <View style={styles.heroIconWrap}>
              <Ionicons name="business-outline" size={26} color={COLORS.white} />
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroPill}>
              <Ionicons name="business-outline" size={14} color={COLORS.white} />
              <Text style={styles.heroPillText}>{buildings.length} total</Text>
            </View>
            <View style={styles.heroPillSecondary}>
              <Ionicons name="search-outline" size={14} color={COLORS.primary} />
              <Text style={styles.heroPillTextSecondary}>{visibleCount} shown</Text>
            </View>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={18} color={COLORS.muted} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search buildings..."
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
          <View style={styles.searchMetaRow}>
            <Text style={styles.searchMetaText}>
              {searchQuery ? 'Filtered building list' : 'Search the current roster'}
            </Text>
            <Text style={styles.searchMetaCount}>{visibleCount} shown</Text>
          </View>
        </View>

        <View style={styles.listPanel}>
          <FlatList
            data={filteredBuildings}
            keyExtractor={(i) => i.id}
            style={styles.buildingsList}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.buildingCard} activeOpacity={0.85} onPress={() => handleEdit(item)}>
                <View style={styles.buildingTopRow}>
                  <View style={styles.buildingHeader}>
                    <View style={styles.buildingIcon}>
                      <Ionicons name="business-outline" size={22} color={COLORS.primary} />
                    </View>
                    <View style={styles.buildingInfo}>
                      <Text style={styles.buildingName}>{item.name}</Text>
                      {item.description ? (
                        <Text style={styles.buildingDescription} numberOfLines={2}>{item.description}</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>Active</Text>
                  </View>
                </View>

                <View style={styles.actionsContainer}>
                  <TouchableOpacity style={styles.cardActionButton} onPress={() => handleEdit(item)} activeOpacity={0.85}>
                    <Ionicons name="pencil-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.cardActionButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cardDeleteButton} onPress={() => handleDelete(item.id)} activeOpacity={0.85}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    <Text style={styles.cardDeleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
            scrollEnabled={false}
            ListEmptyComponent={
              !loading && (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconWrap}>
                    <Ionicons name="building-outline" size={48} color={COLORS.primary} />
                  </View>
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No matching buildings' : 'No buildings yet'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery ? 'Try a different keyword or clear the search' : 'Create one to get started'}
                  </Text>
                </View>
              )
            }
          />
        </View>
            scrollEnabled
            nestedScrollEnabled
            showsVerticalScrollIndicator
            persistentScrollbar={Platform.OS === 'android'}
        {/* Building Form Modal */}
        <Modal
          visible={showForm}
          animationType="slide"
          transparent
          onRequestClose={resetForm}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalOverlay}
          >
            <ScrollView
              contentContainerStyle={styles.modalContainer}
              showsVerticalScrollIndicator
              nestedScrollEnabled
            >
              <View style={styles.formCard}>
                <View style={styles.formHeader}>
                  <View style={styles.formHeaderText}>
                    <Text style={styles.formEyebrow}>Edit record</Text>
                    <Text style={styles.formTitle}>Edit Building</Text>
                  </View>

                  <TouchableOpacity onPress={resetForm} activeOpacity={0.85}>
                    <View style={styles.closeButton}>
                      <Ionicons name="close" size={20} color={COLORS.dark} />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.formDivider} />

                <View style={styles.formSectionCard}>
                  <Text style={styles.formLabel}>Building Name *</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g., Science Building, Library"
                    style={styles.input}
                    placeholderTextColor={COLORS.muted}
                  />

                  <Text style={styles.formLabel}>Description</Text>
                  <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder="e.g., Main science labs and classrooms"
                    style={[styles.input, styles.descriptionInput]}
                    multiline
                    numberOfLines={3}
                    placeholderTextColor={COLORS.muted}
                  />

                  {(name.trim() || description.trim()) ? (
                    <View style={styles.previewCard}>
                      <Text style={styles.previewLabel}>Preview</Text>
                      <View style={styles.previewContent}>
                        <Text style={styles.previewTitle}>{name || 'Building Name...'}</Text>
                        {description ? <Text style={styles.previewText}>{description}</Text> : null}
                      </View>
                    </View>
                  ) : null}
                </View>

                <View style={styles.actionButtonsContainer}>
                  <CustomButton
                    title="Cancel"
                    onPress={resetForm}
                    variant="outline"
                    style={styles.cancelButton}
                  />
                  {editingId ? (
                    <CustomButton
                      title="Delete"
                      onPress={handleDeleteCurrent}
                      variant="danger"
                      style={styles.deleteButton}
                    />
                  ) : null}
                  <CustomButton
                    title="Update"
                    onPress={handleSave}
                    variant="primary"
                    style={editingId ? styles.saveButtonWithDelete : styles.saveButton}
                  />
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 12,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  heroTextWrap: {
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
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
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 6,
    lineHeight: 20,
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
  searchContainer: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 12,
    marginBottom: 10,
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
  listPanel: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
    flex: 1,
    minHeight: 0,
  },
  buildingsList: {
    flex: 1,
    minHeight: 0,
  },
  buildingCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  buildingTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  buildingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  buildingIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  buildingInfo: {
    flex: 1,
    minWidth: 0,
  },
  buildingName: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.dark,
    flexShrink: 1,
  },
  buildingDescription: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
    flexShrink: 1,
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#EEF4FF',
    borderWidth: 1,
    borderColor: '#D7E3FF',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#EEF4FF',
  },
  cardActionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  cardDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
  },
  cardDeleteButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.danger,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyIconWrap: {
    width: 78,
    height: 78,
    borderRadius: 24,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  modalContainer: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 0,
  },
  formCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 30,
    shadowColor: '#020617',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  formHeaderText: {
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
  formDivider: {
    height: 1,
    backgroundColor: '#E8EEF9',
    marginBottom: 16,
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
  formLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 14,
    color: COLORS.dark,
  },
  descriptionInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  previewCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  previewContent: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E8EEF9',
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.dark,
  },
  previewText: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 6,
    lineHeight: 18,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  deleteButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  saveButtonWithDelete: {
    flex: 1,
  },
});

export default ManageBuildingsScreen;
