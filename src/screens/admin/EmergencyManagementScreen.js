import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeToIssueReports,
  updateIssueReport,
  addItem,
} from '../../services/databaseService';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', color: '#E53E3E', icon: 'alert-circle-outline' },
  { value: 'in_progress', label: 'In Progress', color: '#D69E2E', icon: 'time-outline' },
  { value: 'resolved', label: 'Resolved', color: '#38A169', icon: 'checkmark-circle-outline' },
  { value: 'dismissed', label: 'Dismissed', color: '#718096', icon: 'close-circle-outline' },
];

const PRIORITY_COLORS = {
  high: '#E53E3E',
  critical: '#7B0000',
  medium: '#D69E2E',
  low: '#38A169',
};

const EmergencyManagementScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [allReports, setAllReports] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('open');
  const [adminResponse, setAdminResponse] = useState('');
  const [saving, setSaving] = useState(false);
  const [alertText, setAlertText] = useState('');
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [sendingAlert, setSendingAlert] = useState(false);

  useEffect(() => {
    const unsub = subscribeToIssueReports((items) => setAllReports(items));
    return () => { try { unsub?.(); } catch (e) {} };
  }, []);

  const emergencyReports = useMemo(() => {
    return allReports.filter((r) => {
      const cat = (r.category || '').toLowerCase();
      const priority = (r.priority || '').toLowerCase();
      return cat === 'emergency' || priority === 'high' || priority === 'critical';
    });
  }, [allReports]);

  const openCount = useMemo(() => emergencyReports.filter((r) => r.status === 'open').length, [emergencyReports]);
  const inProgressCount = useMemo(() => emergencyReports.filter((r) => r.status === 'in_progress').length, [emergencyReports]);
  const resolvedCount = useMemo(() => emergencyReports.filter((r) => r.status === 'resolved').length, [emergencyReports]);

  const openReport = (report) => {
    setSelectedReport(report);
    setReviewStatus(report.status || 'open');
    setAdminResponse(report.adminResponse || '');
  };

  const closeReport = () => {
    setSelectedReport(null);
    setAdminResponse('');
  };

  const handleSave = async () => {
    if (!selectedReport) return;
    setSaving(true);
    try {
      await updateIssueReport(selectedReport.id, {
        status: reviewStatus,
        adminResponse,
        adminReadAt: new Date(),
        adminReadBy: user?.uid || '',
        reviewedAt: new Date(),
      });
      closeReport();
    } catch (e) {
      Alert.alert('Error', 'Failed to update report.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendAlert = async () => {
    if (!alertText.trim()) {
      Alert.alert('Required', 'Enter the alert message.');
      return;
    }
    setSendingAlert(true);
    try {
      await addItem('notifications', {
        title: '🚨 EMERGENCY ALERT',
        body: alertText.trim(),
        type: 'emergency',
        audience: 'everyone',
        priority: 'high',
        createdBy: user?.uid || '',
      });
      setAlertText('');
      setShowAlertModal(false);
      Alert.alert('Alert Sent', 'Emergency alert has been broadcast to all users.');
    } catch (e) {
      Alert.alert('Error', 'Failed to send emergency alert.');
    } finally {
      setSendingAlert(false);
    }
  };

  const getStatusInfo = (status) => STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0];
  const getPriorityColor = (priority) => PRIORITY_COLORS[(priority || '').toLowerCase()] || '#718096';

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    const d = date instanceof Date ? date : new Date(date);
    return isNaN(d.getTime()) ? 'Unknown' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderReport = ({ item }) => {
    const statusInfo = getStatusInfo(item.status);
    const priorityColor = getPriorityColor(item.priority);
    return (
      <TouchableOpacity
        onPress={() => openReport(item)}
        style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.border, borderLeftColor: priorityColor }]}
      >
        <View style={styles.reportTopRow}>
          <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '22', borderColor: priorityColor }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>{(item.priority || 'HIGH').toUpperCase()}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: statusInfo.color + '18' }]}>
            <Ionicons name={statusInfo.icon} size={12} color={statusInfo.color} />
            <Text style={[styles.statusChipText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
          {!item.adminReadAt && <View style={styles.unreadDot} />}
        </View>
        <Text style={[styles.reportTitle, { color: colors.textDark }]} numberOfLines={2}>{item.title || 'Untitled Report'}</Text>
        <Text style={[styles.reportDesc, { color: colors.textMuted }]} numberOfLines={2}>{item.description || ''}</Text>
        <View style={styles.reportMeta}>
          <Ionicons name="person-outline" size={12} color={colors.textMuted} />
          <Text style={[styles.reportMetaText, { color: colors.textMuted }]}>{item.reporterName || item.reporterEmail || 'Anonymous'}</Text>
          <Text style={[styles.reportMetaDot, { color: colors.textMuted }]}>·</Text>
          <Text style={[styles.reportMetaText, { color: colors.textMuted }]}>{formatDate(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper backgroundColor={colors.background} statusBarStyle="dark-content">
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroAccent} />
        <View style={styles.heroContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroText}>
            <Text style={styles.heroEyebrow}>Admin</Text>
            <Text style={styles.heroTitle}>Emergency Management</Text>
            <Text style={styles.heroSub}>{emergencyReports.length} emergency report{emergencyReports.length !== 1 ? 's' : ''}</Text>
          </View>
          <TouchableOpacity style={styles.alertBtn} onPress={() => setShowAlertModal(true)}>
            <Ionicons name="megaphone-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          {[
            { label: 'Open', count: openCount, color: '#E53E3E' },
            { label: 'In Progress', count: inProgressCount, color: '#D69E2E' },
            { label: 'Resolved', count: resolvedCount, color: '#38A169' },
          ].map((s) => (
            <View key={s.label} style={[styles.summaryCard, { backgroundColor: s.color + '22', borderColor: s.color }]}>
              <Text style={[styles.summaryCount, { color: s.color }]}>{s.count}</Text>
              <Text style={[styles.summaryLabel, { color: s.color }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Report list */}
      <FlatList
        data={emergencyReports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        contentContainerStyle={[styles.listContent, emergencyReports.length === 0 && styles.emptyContent]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={64} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.textDark }]}>No emergency reports</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>All clear. No high-priority incidents at this time.</Text>
          </View>
        }
      />

      {/* Report detail modal */}
      <Modal visible={!!selectedReport} transparent animationType="slide" onRequestClose={closeReport}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHandle} />
            <ScrollView contentContainerStyle={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.sheetHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetTitle, { color: colors.textDark }]} numberOfLines={2}>{selectedReport?.title || 'Report'}</Text>
                  <Text style={[styles.sheetSub, { color: colors.textMuted }]}>{formatDate(selectedReport?.createdAt)}</Text>
                </View>
                <TouchableOpacity onPress={closeReport} style={[styles.closeBtn, { backgroundColor: colors.border }]}>
                  <Ionicons name="close" size={20} color={colors.textDark} />
                </TouchableOpacity>
              </View>

              {/* Reporter info */}
              <View style={[styles.infoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Reporter</Text>
                <Text style={[styles.infoValue, { color: colors.textDark }]}>{selectedReport?.reporterName || 'Anonymous'}</Text>
                {selectedReport?.reporterEmail ? <Text style={[styles.infoSub, { color: colors.textMuted }]}>{selectedReport.reporterEmail}</Text> : null}
                {selectedReport?.reporterRole ? <Text style={[styles.infoSub, { color: colors.textMuted }]}>Role: {selectedReport.reporterRole}</Text> : null}
              </View>

              {/* Description */}
              {selectedReport?.description ? (
                <View style={[styles.infoBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Description</Text>
                  <Text style={[styles.infoValue, { color: colors.textDark }]}>{selectedReport.description}</Text>
                </View>
              ) : null}

              {/* Meta chips */}
              <View style={styles.metaChipRow}>
                {selectedReport?.category ? (
                  <View style={[styles.metaChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Ionicons name="folder-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.metaChipText, { color: colors.textMuted }]}>{selectedReport.category}</Text>
                  </View>
                ) : null}
                {selectedReport?.priority ? (
                  <View style={[styles.metaChip, { backgroundColor: getPriorityColor(selectedReport.priority) + '18', borderColor: getPriorityColor(selectedReport.priority) }]}>
                    <Ionicons name="alert-circle-outline" size={12} color={getPriorityColor(selectedReport.priority)} />
                    <Text style={[styles.metaChipText, { color: getPriorityColor(selectedReport.priority) }]}>{selectedReport.priority} priority</Text>
                  </View>
                ) : null}
              </View>

              {/* Status selector */}
              <Text style={[styles.label, { color: colors.textDark }]}>Update Status</Text>
              <View style={styles.statusGrid}>
                {STATUS_OPTIONS.map((s) => (
                  <TouchableOpacity
                    key={s.value}
                    onPress={() => setReviewStatus(s.value)}
                    style={[styles.statusOption, { backgroundColor: reviewStatus === s.value ? s.color : colors.background, borderColor: reviewStatus === s.value ? s.color : colors.border }]}
                  >
                    <Ionicons name={s.icon} size={16} color={reviewStatus === s.value ? '#fff' : s.color} />
                    <Text style={[styles.statusOptionText, { color: reviewStatus === s.value ? '#fff' : s.color }]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Admin response */}
              <Text style={[styles.label, { color: colors.textDark }]}>Admin Response</Text>
              <TextInput
                style={[styles.textarea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark }]}
                value={adminResponse}
                onChangeText={setAdminResponse}
                placeholder="Write your response to this incident..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.btn, styles.btnCancel, { borderColor: colors.border }]} onPress={closeReport}>
                  <Text style={[styles.btnText, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={[styles.btnText, { color: '#fff' }]}>Save Response</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Emergency Alert modal */}
      <Modal visible={showAlertModal} transparent animationType="fade" onRequestClose={() => setShowAlertModal(false)}>
        <View style={styles.overlay}>
          <View style={[styles.alertSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.alertSheetHeader}>
              <View style={[styles.alertIcon, { backgroundColor: '#E53E3E' }]}>
                <Ionicons name="megaphone-outline" size={24} color="#fff" />
              </View>
              <Text style={[styles.alertSheetTitle, { color: colors.textDark }]}>Send Emergency Alert</Text>
              <Text style={[styles.alertSheetSub, { color: colors.textMuted }]}>This will be broadcast to all users immediately.</Text>
            </View>
            <TextInput
              style={[styles.textarea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textDark, marginHorizontal: 20 }]}
              value={alertText}
              onChangeText={setAlertText}
              placeholder="Type your emergency message..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={[styles.btnRow, { paddingHorizontal: 20, paddingBottom: 24 }]}>
              <TouchableOpacity style={[styles.btn, styles.btnCancel, { borderColor: colors.border }]} onPress={() => setShowAlertModal(false)}>
                <Text style={[styles.btnText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: '#E53E3E' }]} onPress={handleSendAlert} disabled={sendingAlert}>
                {sendingAlert ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Ionicons name="send-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                    <Text style={[styles.btnText, { color: '#fff' }]}>Send Alert</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  hero: {
    backgroundColor: '#1A365D',
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 56,
    overflow: 'hidden',
  },
  heroAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#C5A047' },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  heroText: { flex: 1 },
  heroEyebrow: { fontSize: 11, fontWeight: '700', color: '#C5A047', textTransform: 'uppercase', letterSpacing: 1.2 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  alertBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E53E3E', justifyContent: 'center', alignItems: 'center' },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'center' },
  summaryCount: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  listContent: { padding: 16, gap: 12 },
  emptyContent: { flexGrow: 1 },
  reportCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reportTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  priorityText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusChipText: { fontSize: 11, fontWeight: '600' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E53E3E', marginLeft: 'auto' },
  reportTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  reportDesc: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  reportMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reportMetaText: { fontSize: 11 },
  reportMetaDot: { fontSize: 11 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptySub: { fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#CBD5E0', alignSelf: 'center', marginTop: 12 },
  sheetScroll: { padding: 20, paddingBottom: 40 },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '800', flex: 1 },
  sheetSub: { fontSize: 12, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  infoBox: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  infoLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  infoSub: { fontSize: 12, marginTop: 2 },
  metaChipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  metaChipText: { fontSize: 12 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusOption: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, minWidth: '45%' },
  statusOptionText: { fontSize: 13, fontWeight: '600' },
  textarea: { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 14, minHeight: 100, marginBottom: 16 },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  btnCancel: { borderWidth: 1 },
  btnPrimary: { backgroundColor: '#1A365D' },
  btnText: { fontSize: 14, fontWeight: '700' },
  alertSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingBottom: 8 },
  alertSheetHeader: { alignItems: 'center', padding: 20, paddingBottom: 16 },
  alertIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  alertSheetTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  alertSheetSub: { fontSize: 13, textAlign: 'center', marginTop: 4 },
});

export default EmergencyManagementScreen;
