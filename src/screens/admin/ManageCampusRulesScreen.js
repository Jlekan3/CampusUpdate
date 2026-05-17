import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import CustomButton from '../../components/CustomButton';
import { COLORS } from '../../utils/constants';
import {
  subscribeToCampusRules,
  addCampusRule,
  updateCampusRule,
  deleteCampusRule,
} from '../../services/databaseService';

const defaultRuleForm = {
  title: '',
  description: '',
};

const ManageCampusRulesScreen = () => {
  const [rules, setRules] = useState([]);
  const [selectedRuleId, setSelectedRuleId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(defaultRuleForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRules = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return rules;

    return rules.filter((rule) => {
      const titleValue = (rule.title || '').toLowerCase();
      const descriptionValue = (rule.description || '').toLowerCase();

      return titleValue.includes(query) || descriptionValue.includes(query);
    });
  }, [rules, searchQuery]);

  useEffect(() => {
    console.log('ManageCampusRulesScreen: Setting up subscription to campus rules...');
    const unsubscribe = subscribeToCampusRules((items) => {
      console.log('ManageCampusRulesScreen: Received campus rules snapshot, count:', items?.length || 0);
      setRules(items || []);
    });

    return () => {
      console.log('ManageCampusRulesScreen: Cleaning up subscription');
      try {
        unsubscribe && unsubscribe();
      } catch (e) {
        console.error('ManageCampusRulesScreen: Error during cleanup:', e);
      }
    };
  }, []);

  const resetForm = () => {
    setSelectedRuleId(null);
    setEditingId(null);
    setFormData(defaultRuleForm);
    setShowModal(false);
  };

  const handleSelectRule = (rule) => {
    setSelectedRuleId(rule.id);
    setEditingId(rule.id);
    setFormData({
      title: rule.title || '',
      description: rule.description || '',
    });
    setShowModal(true);
  };

  const handleAddNew = () => {
    setSelectedRuleId(null);
    setEditingId(null);
    setFormData(defaultRuleForm);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.description.trim()) {
      Alert.alert('Validation', 'Please enter both a title and description.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
      };

      if (editingId) {
        console.log('Updating campus rule:', editingId, payload);
        await updateCampusRule(editingId, payload);
        console.log('✓ Campus rule updated successfully');
      } else {
        console.log('Adding new campus rule:', payload);
        await addCampusRule(payload);
        console.log('✓ Campus rule added successfully');
      }

      Alert.alert('Success', editingId ? 'Rule updated successfully!' : 'Rule added successfully!');
      resetForm();
    } catch (e) {
      console.error('Error saving campus rule:', e.code, e.message);
      Alert.alert('Error', `Unable to save rule: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (targetId = editingId) => {
    if (!targetId) return;

    Alert.alert('Delete Rule', 'Are you sure you want to delete this rule?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            console.log('Deleting campus rule:', targetId);
            await deleteCampusRule(targetId);
            console.log('✓ Campus rule deleted successfully');
            Alert.alert('Success', 'Rule deleted successfully!');
            resetForm();
          } catch (e) {
            console.error('Error deleting campus rule:', e.code, e.message);
            Alert.alert('Error', `Unable to delete rule: ${e.message}`);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  const renderRuleItem = ({ item }) => {
    const updatedAt = item.updatedAt || item.createdAt;
    const dateLabel = updatedAt
      ? (updatedAt instanceof Date ? updatedAt : new Date(updatedAt)).toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null;

    return (
      <View style={[styles.ruleCard, selectedRuleId === item.id && styles.ruleCardActive]}>
        <TouchableOpacity
          style={styles.ruleCardBody}
          onPress={() => handleSelectRule(item)}
          activeOpacity={0.85}
        >
          <View style={styles.ruleTopRow}>
            <View style={styles.ruleIconWrap}>
              <Ionicons name="shield-outline" size={20} color={COLORS.primary} />
            </View>
            <View style={styles.ruleBodyText}>
              <Text style={styles.ruleTitle} numberOfLines={1}>
                {item.title || 'Untitled rule'}
              </Text>
              {item.description ? (
                <Text style={styles.ruleSubtitle} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : (
                <Text style={styles.ruleSubtitleMuted}>No description provided</Text>
              )}
            </View>
            <View style={styles.ruleChevron}>
              <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
            </View>
          </View>

          <View style={styles.ruleMetaRow}>
            {dateLabel ? (
              <View style={styles.ruleMetaChip}>
                <Ionicons name="time-outline" size={12} color={COLORS.primary} />
                <Text style={styles.ruleMetaText}>Updated {dateLabel}</Text>
              </View>
            ) : (
              <View style={styles.ruleMetaChip}>
                <Ionicons name="alert-circle-outline" size={12} color={COLORS.primary} />
                <Text style={styles.ruleMetaText}>Effective immediately</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.ruleActionsRow}>
          <TouchableOpacity
            style={[styles.ruleActionButton, styles.ruleActionEdit]}
            onPress={() => handleSelectRule(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={14} color={COLORS.primary} />
            <Text style={styles.ruleActionTextPrimary}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ruleActionButton, styles.ruleActionDelete]}
            onPress={() => handleDelete(item.id)}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={14} color={COLORS.white} />
            <Text style={styles.ruleActionTextDanger}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const totalRecords = rules.length;
  const visibleCount = filteredRules.length;

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroEyebrow}>Admin Dashboard</Text>
              <Text style={styles.heroTitle}>Campus Rules</Text>
              <Text style={styles.heroSubtitle}>Keep policy updates aligned across students and staff</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={26} color={COLORS.white} />
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroPill}>
              <Ionicons name="shield-outline" size={14} color={COLORS.white} />
              <Text style={styles.heroPillText}>{totalRecords} records</Text>
            </View>
            <View style={styles.heroPillSecondary}>
              <Ionicons name="search-outline" size={14} color={COLORS.primary} />
              <Text style={styles.heroPillTextSecondary}>{visibleCount} shown</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.addButton} onPress={handleAddNew} activeOpacity={0.9}>
            <Ionicons name="add" size={20} color={COLORS.white} />
            <Text style={styles.addButtonText}>Add Rule</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search" size={18} color={COLORS.muted} style={styles.searchIcon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search campus rules..."
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
              {searchQuery ? 'Filtered campus rule list' : 'Search the current roster'}
            </Text>
            <Text style={styles.searchMetaCount}>{visibleCount} shown</Text>
          </View>
        </View>

        <Text style={styles.listTitle}>
          {visibleCount > 0 ? `Rules (${visibleCount})` : searchQuery ? 'No matching rules' : 'No Rules Yet'}
        </Text>

        <View style={styles.listShell}>
          <FlatList
            data={filteredRules}
            keyExtractor={(item) => item.id}
            renderItem={renderRuleItem}
            scrollEnabled
            showsVerticalScrollIndicator
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <Ionicons name="shield-outline" size={34} color={COLORS.primary} />
                </View>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'Try a different keyword or clear the search.' : 'Tap Add Rule to publish the first campus policy.'}
                </Text>
                {!searchQuery ? (
                  <Text style={styles.emptySubtext}>Rules you add here appear in the student dashboard immediately.</Text>
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
                <Text style={styles.modalTitle}>{editingId ? 'Edit Rule' : 'Add Rule'}</Text>
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
                <Text style={styles.sectionLabel}>Rule Title <Text style={styles.requiredMark}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., General Campus Conduct"
                  placeholderTextColor={COLORS.muted}
                  value={formData.title}
                  onChangeText={(value) => setFormData((prev) => ({ ...prev, title: value }))}
                />

                <Text style={styles.sectionLabel}>Rule Description <Text style={styles.requiredMark}>*</Text></Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Explain the policy, expectations, or consequences."
                  placeholderTextColor={COLORS.muted}
                  value={formData.description}
                  onChangeText={(value) => setFormData((prev) => ({ ...prev, description: value }))}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />

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
                    title={saving ? (editingId ? 'Updating...' : 'Saving...') : editingId ? 'Update Rule' : 'Save Rule'}
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
  ruleCard: {
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
  ruleCardActive: {
    borderColor: COLORS.primary,
  },
  ruleCardBody: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2FF',
  },
  ruleTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  ruleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleBodyText: {
    flex: 1,
    minWidth: 0,
  },
  ruleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.dark,
  },
  ruleSubtitle: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
  ruleSubtitleMuted: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
  },
  ruleChevron: {
    width: 30,
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  ruleMetaRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ruleMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
  },
  ruleMetaText: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
  },
  ruleActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 12,
  },
  ruleActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  ruleActionEdit: {
    borderColor: '#CBD5F5',
    backgroundColor: '#EEF4FF',
  },
  ruleActionDelete: {
    borderColor: '#DC2626',
    backgroundColor: '#DC2626',
  },
  ruleActionTextPrimary: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  ruleActionTextDanger: {
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
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  buttonFlex: {
    flex: 1,
  },
});

export default ManageCampusRulesScreen;
