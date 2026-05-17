import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import CustomButton from '../../components/CustomButton';
import { COLORS, USER_ROLES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { addNotification, deleteIssueReport, subscribeToIssueReports, updateIssueReport } from '../../services/databaseService';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: '#60A5FA' },
  { value: 'in_progress', label: 'In Progress', color: '#3B82F6' },
  { value: 'resolved', label: 'Resolved', color: '#2563EB' },
  { value: 'dismissed', label: 'Dismissed', color: '#64748B' },
];

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
];

const REPORTER_ROLES = {
  student: 'Student',
  faculty: 'Staff',
  staff: 'Staff',
  admin: 'Admin',
};

const normalizeDate = (value) => {
  if (!value) return 'Unknown date';
  const date = value?.toDate ? value.toDate() : value;
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Unknown date';
  return parsed.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ManageReportsScreen = ({ navigation }) => {
  const { userRole, user } = useAuth();
  const [reports, setReports] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('open');
  const [adminResponse, setAdminResponse] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userRole !== USER_ROLES.ADMIN) return undefined;

    const unsubscribe = subscribeToIssueReports((items) => {
      setReports(items || []);
    });

    return () => {
      try {
        unsubscribe?.();
      } catch (error) {
        // ignore
      }
    };
  }, [userRole]);

  const filteredReports = useMemo(() => {
    if (activeFilter === 'all') return reports;
    return reports.filter((item) => (item.status || 'open') === activeFilter);
  }, [activeFilter, reports]);

  const counts = useMemo(() => {
    return reports.reduce(
      (accumulator, item) => {
        const status = item.status || 'open';
        if (status === 'open') accumulator.open += 1;
        if (status === 'in_progress') accumulator.in_progress += 1;
        if (status === 'resolved') accumulator.resolved += 1;
        if (status === 'dismissed') accumulator.dismissed += 1;
        return accumulator;
      },
      { open: 0, in_progress: 0, resolved: 0, dismissed: 0 }
    );
  }, [reports]);

  const openReviewModal = (report) => {
    setSelectedReport(report);
    setReviewStatus(report.status || 'open');
    setAdminResponse(report.adminResponse || '');
  };

  const closeReviewModal = () => {
    setSelectedReport(null);
    setReviewStatus('open');
    setAdminResponse('');
  };

  const isReportRead = Boolean(selectedReport?.adminReadAt);

  const toggleReportReadState = async (shouldMarkRead) => {
    if (!selectedReport?.id) return;

    try {
      await updateIssueReport(selectedReport.id, {
        adminReadAt: shouldMarkRead ? new Date() : null,
        adminReadBy: shouldMarkRead ? user?.uid || '' : '',
      });

      setSelectedReport((current) =>
        current
          ? {
              ...current,
              adminReadAt: shouldMarkRead ? new Date() : null,
              adminReadBy: shouldMarkRead ? user?.uid || '' : '',
            }
          : current
      );
    } catch (error) {
      Alert.alert('Error', error?.message || 'Unable to update read state');
    }
  };

  const handleDeleteReport = () => {
    if (!selectedReport?.id) return;

    Alert.alert('Delete Report', 'Are you sure you want to delete this report?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteIssueReport(selectedReport.id);
            closeReviewModal();
            Alert.alert('Success', 'Report deleted successfully.');
          } catch (error) {
            Alert.alert('Error', error?.message || 'Unable to delete report');
          }
        },
      },
    ]);
  };

  const notifyReporterOfResponse = async (report, responseText, statusValue) => {
    if (!report?.reporterId || !responseText) {
      return;
    }

    const normalizedStatus = statusValue || report.status || 'open';
    const statusConfig = STATUS_OPTIONS.find((option) => option.value === normalizedStatus);
    const statusLabel = statusConfig?.label || 'Update';

    try {
      await addNotification({
        title: report.title ? `${statusLabel}: ${report.title}` : `Report ${statusLabel}`,
        body: responseText,
        type: 'notification',
        audience: 'direct',
        recipientId: report.reporterId,
        recipientIds: [report.reporterId],
        recipientName: report.reporterName || '',
        recipientRole: (report.reporterRole || 'student').toLowerCase(),
        category: 'report-response',
        metadata: {
          reportId: report.id,
          reportTitle: report.title || '',
          reportStatus: normalizedStatus,
        },
        createdBy: user?.uid || '',
        createdByName: user?.displayName || user?.email || 'Admin',
      });
    } catch (notificationError) {
      console.error('Failed to deliver report response notification', notificationError);
    }
  };

  const handleSaveReview = async () => {
    if (!selectedReport?.id) return;

    const trimmedResponse = adminResponse.trim();
    const reportSnapshot = selectedReport;

    try {
      setSaving(true);
      await updateIssueReport(reportSnapshot.id, {
        status: reviewStatus,
        adminResponse: trimmedResponse,
        reviewedBy: user?.uid || '',
        reviewedByName: user?.displayName || user?.email || 'Admin',
        reviewedAt: new Date(),
      });
      if (trimmedResponse) {
        await notifyReporterOfResponse(reportSnapshot, trimmedResponse, reviewStatus);
      }
      closeReviewModal();
      Alert.alert('Success', 'Report updated successfully.');
    } catch (error) {
      Alert.alert('Error', error?.message || 'Unable to update report');
    } finally {
      setSaving(false);
    }
  };

  const renderSummaryCard = (label, value, icon, color) => (
    <View style={[styles.summaryCard, { borderTopColor: color }]}> 
      <View style={[styles.summaryIconWrap, { backgroundColor: `${color}18` }]}> 
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );

  const renderReport = ({ item }) => {
    const roleLabel = REPORTER_ROLES[(item.reporterRole || '').toLowerCase()] || 'Student';
    const statusConfig = STATUS_OPTIONS.find((option) => option.value === (item.status || 'open')) || STATUS_OPTIONS[0];
    const readLabel = item.adminReadAt ? 'Read' : 'Unread';
    const readBadgeStyle = item.adminReadAt ? styles.readBadge : styles.unreadBadge;
    const readBadgeTextStyle = item.adminReadAt ? styles.readBadgeText : styles.unreadBadgeText;

    return (
      <TouchableOpacity style={styles.reportCard} onPress={() => openReviewModal(item)} activeOpacity={0.86}>
        <View style={styles.reportTopRow}>
          <View style={styles.reportTopBadges}>
            <View style={styles.reportTypeBadge}>
              <Ionicons name="document-text-outline" size={14} color={COLORS.white} />
              <Text style={styles.reportTypeText}>{item.category || 'General'}</Text>
            </View>
            <View style={[styles.readStateBadge, readBadgeStyle]}>
              <Text style={[styles.readStateText, readBadgeTextStyle]}>{readLabel}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${statusConfig.color}18` }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>

        <Text style={styles.reportTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.reportDescription} numberOfLines={3}>{item.description}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Ionicons name="person-outline" size={12} color="#475569" />
            <Text style={styles.metaChipText}>{item.reporterName || 'Anonymous'}</Text>
          </View>
          <View style={styles.metaChip}>
            <Ionicons name="people-outline" size={12} color="#475569" />
            <Text style={styles.metaChipText}>{roleLabel}</Text>
          </View>
          {item.photoCount > 0 ? (
            <View style={styles.metaChip}>
              <Ionicons name="image-outline" size={12} color="#475569" />
              <Text style={styles.metaChipText}>{item.photoCount} photo{item.photoCount > 1 ? 's' : ''}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.reportFooter}>
          <Text style={styles.reportTimestamp}>{normalizeDate(item.createdAt)}</Text>
          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
        </View>
      </TouchableOpacity>
    );
  };

  if (userRole !== USER_ROLES.ADMIN) {
    return (
      <ScreenWrapper>
        <View style={styles.unauthorizedContainer}>
          <Text style={styles.unauthorizedTitle}>Not authorized</Text>
          <Text style={styles.unauthorizedText}>You do not have permission to access the report inbox.</Text>
          <CustomButton title="Back to Dashboard" onPress={() => navigation.navigate('Dashboard')} variant="outline" />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper backgroundColor={styles.screenBackground.backgroundColor} statusBarStyle="dark-content">
      <FlatList
        data={filteredReports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator
        ListHeaderComponent={
          <View>
            <View style={styles.heroCard}>
              <View style={styles.heroAccent} />
              <Text style={styles.heroEyebrow}>Report Inbox</Text>
              <Text style={styles.heroTitle}>Student and Staff Reports</Text>
              <Text style={styles.heroSubtitle}>Review submitted campus issues, track their status, and add an admin response.</Text>
            </View>

            <View style={styles.summaryRow}>
              {renderSummaryCard('Open', counts.open, 'alert-circle-outline', '#F59E0B')}
              {renderSummaryCard('Working', counts.in_progress, 'time-outline', '#3B82F6')}
              {renderSummaryCard('Resolved', counts.resolved, 'checkmark-circle-outline', '#10B981')}
            </View>

            <View style={styles.filterRow}>
              {FILTER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.filterChip, activeFilter === option.value && styles.filterChipActive]}
                  onPress={() => setActiveFilter(option.value)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.filterChipText, activeFilter === option.value && styles.filterChipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Ionicons name="mail-open-outline" size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.emptyTitle}>No reports yet</Text>
            <Text style={styles.emptyText}>Reports submitted by students or staff will appear here.</Text>
          </View>
        }
      />

      <Modal visible={!!selectedReport} transparent animationType="slide" onRequestClose={closeReviewModal}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalShell}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalEyebrow}>Review report</Text>
                  <Text style={styles.modalTitle}>{selectedReport?.title || 'Report details'}</Text>
                </View>
                <TouchableOpacity onPress={closeReviewModal} style={styles.closeButton} activeOpacity={0.85}>
                  <Ionicons name="close" size={20} color={COLORS.dark} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalContent}
                contentContainerStyle={styles.modalContentInner}
                showsVerticalScrollIndicator
                nestedScrollEnabled
              >
                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Reporter</Text>
                  <Text style={styles.detailValue}>{selectedReport?.reporterName || 'Anonymous'}</Text>
                  <Text style={styles.detailSubtext}>
                    {REPORTER_ROLES[(selectedReport?.reporterRole || '').toLowerCase()] || 'Student'}
                    {selectedReport?.reporterEmail ? ` • ${selectedReport.reporterEmail}` : ''}
                  </Text>
                </View>

                <View style={styles.detailGrid}>
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipLabel}>Category</Text>
                    <Text style={styles.detailChipValue}>{selectedReport?.category || 'General'}</Text>
                  </View>
                  <View style={styles.detailChip}>
                    <Text style={styles.detailChipLabel}>Submitted</Text>
                    <Text style={styles.detailChipValue}>{normalizeDate(selectedReport?.createdAt)}</Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <CustomButton
                    title={isReportRead ? 'Mark as unread' : 'Mark as read'}
                    onPress={() => toggleReportReadState(!isReportRead)}
                    variant={isReportRead ? 'outline' : 'primary'}
                    style={styles.actionButton}
                  />
                  <CustomButton
                    title="Delete"
                    onPress={handleDeleteReport}
                    variant="danger"
                    style={styles.actionButton}
                  />
                </View>

                <View style={styles.detailBlock}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.descriptionText}>{selectedReport?.description || 'No description provided.'}</Text>
                </View>

                {selectedReport?.photoUris?.length ? (
                  <View style={styles.detailBlock}>
                    <Text style={styles.detailLabel}>Photos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                      {selectedReport.photoUris.map((uri, index) => (
                        <View key={`${uri}-${index}`} style={styles.photoCard}>
                          <Text style={styles.photoLabel}>Photo {index + 1}</Text>
                          <Text style={styles.photoUri} numberOfLines={2}>{uri}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}

                <Text style={styles.sectionLabel}>Update Status</Text>
                <View style={styles.statusSelector}>
                  {STATUS_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.statusOption,
                        reviewStatus === option.value && {
                          backgroundColor: option.color,
                          borderColor: option.color,
                        },
                      ]}
                      onPress={() => setReviewStatus(option.value)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.statusOptionText, reviewStatus === option.value && styles.statusOptionTextActive]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Admin Response</Text>
                <TextInput
                  style={styles.responseInput}
                  placeholder="Add a response or next step for the reporter..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  value={adminResponse}
                  onChangeText={setAdminResponse}
                />

                <View style={styles.actionButtons}>
                  <CustomButton title="Close" onPress={closeReviewModal} variant="outline" style={styles.cancelButton} />
                  <CustomButton
                    title={saving ? 'Saving...' : 'Save Review'}
                    onPress={handleSaveReview}
                    variant="primary"
                    style={styles.saveButton}
                  />
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  screenBackground: {
    backgroundColor: '#F8FAFC',
  },
  listContent: {
    padding: 18,
    paddingBottom: 28,
  },
  heroCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 18,
    marginBottom: 18,
    overflow: 'hidden',
  },
  heroAccent: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(37, 99, 235, 0.16)',
    top: -70,
    right: -50,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#93C5FD',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#E2E8F0',
    maxWidth: '92%',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 14,
    borderTopWidth: 4,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.dark,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  reportCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  reportTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  reportTopBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  reportTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reportTypeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  readStateBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  readBadge: {
    backgroundColor: '#DBEAFE',
  },
  unreadBadge: {
    backgroundColor: '#BAE6FD',
  },
  readStateText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  readBadgeText: {
    color: '#1E40AF',
  },
  unreadBadgeText: {
    color: '#1E40AF',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reportTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 6,
  },
  reportDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  reportFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportTimestamp: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: '#64748B',
  },
  unauthorizedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unauthorizedTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 8,
  },
  unauthorizedText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalShell: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    shadowColor: '#020617',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EEF9',
  },
  modalEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.dark,
    maxWidth: 260,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    paddingHorizontal: 18,
  },
  modalContentInner: {
    paddingTop: 16,
    paddingBottom: 24,
  },
  detailBlock: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 4,
  },
  detailSubtext: {
    fontSize: 13,
    lineHeight: 18,
    color: '#64748B',
  },
  detailGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  detailChip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
  },
  detailChipLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  detailChipValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.dark,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  photoRow: {
    gap: 10,
    paddingBottom: 4,
  },
  photoCard: {
    width: 180,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 12,
  },
  photoLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 6,
  },
  photoUri: {
    fontSize: 12,
    lineHeight: 16,
    color: '#64748B',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 4,
  },
  statusSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statusOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  statusOptionTextActive: {
    color: COLORS.white,
  },
  responseInput: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: COLORS.dark,
    textAlignVertical: 'top',
    marginBottom: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  cancelButton: {
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
});

export default ManageReportsScreen;
