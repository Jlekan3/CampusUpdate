import React, {
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import CustomButton from '../../components/CustomButton';
import { useAuth } from '../../context/AuthContext';
import { CampusUpdatesContext } from '../../context/CampusUpdatesContext';
import { supabase } from '../../config/supabase';
import {
  subscribeToIssueReports,
  subscribeToDepartments,
  updateDepartment,
  addNotification,
  updateIssueReport,
} from '../../services/databaseService';

const { width } = Dimensions.get('window');

// ── Corporate White & Blue Palette ──────────────────────────────────────────
const C = {
  bluePrimary:   '#1A365D', // Corporate Navy Blue
  blueAccent:    '#2563EB', // Vibrant Informational Blue
  blueLightBg:   '#EFF6FF', // Soft Sky Blue Contrast
  white:         '#FFFFFF',
  bgCanvas:      '#F8FAFC', // Crisp Professional Light Canvas
  textDark:      '#0F172A', // Slate Dark Body Text
  textMuted:     '#64748B', // Neutral Cool Gray Subtext
  borderLight:   '#E2E8F0', // Clean Segment Dividers
  greenSuccess:  '#10B981',
  orangePending: '#F59E0B',
};

export default function StaffHomeScreen() {
  const { user } = useAuth();
  const { events } = useContext(CampusUpdatesContext);

  // --- Core State Configurations ---
  const [activeTab, setActiveTab] = useState('Overview'); // 'Overview', 'Departments', 'Reports'
  const [departments, setDepartments] = useState([]);
  const [issueReports, setIssueReports] = useState([]);
  const [usersList, setUsersList] = useState([]); // Storage for direct message targeting selections
  const [isLoading, setIsLoading] = useState(false);

  // --- Broadcast Modal Form States (Notifications & Events) ---
  const [broadcastModalVisible, setBroadcastModalVisible] = useState(false);
  const [broadcastType, setBroadcastType] = useState('Notification'); // 'Notification' or 'Event'
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('Academic'); // 'Academic', 'Administrative', 'Emergency'
  const [audienceScope, setAudienceScope] = useState('everyone'); // 'everyone', 'staff', 'direct'
  const [selectedRecipientId, setSelectedRecipientId] = useState('');

  // --- Department Management Modal Form States ---
  const [deptModalVisible, setDeptModalVisible] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptHOD, setDeptHOD] = useState('');

  // --- Campus Issue Report Context Detail States ---
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  // --- Real-Time Sync Subscriptions ---
  useEffect(() => {
    setIsLoading(true);

    // Fetch department structures and assign database listeners
    const unsubDepts = subscribeToDepartments((data) => {
      setDepartments(data || []);
      setIsLoading(false); // clear loading as soon as either subscription resolves
    });

    // Fetch student/user tracking reports and assign database listeners
    const unsubIssues = subscribeToIssueReports((data) => {
      setIssueReports(data || []);
      setIsLoading(false);
    });

    // Fetch user profiles directory to support dynamic targeted selections
    fetchUsersDirectory();

    return () => {
      if (typeof unsubDepts === 'function') unsubDepts();
      if (typeof unsubIssues === 'function') unsubIssues();
    };
  }, []);

  const fetchUsersDirectory = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .order('full_name', { ascending: true });
      if (error) throw error;
      setUsersList(data || []);
    } catch (err) {
      console.error('Failed to load user directory matrix:', err.message);
    }
  };

  // --- Execution Form Submission Logic Handler ---
  const handlePublishBroadcast = async () => {
    if (!title.trim() || !body.trim()) {
      Alert.alert('Required Field Missing', 'Please provide a title and detailed body context.');
      return;
    }

    if (audienceScope === 'direct' && !selectedRecipientId) {
      Alert.alert('Recipient Required', 'Please select a specific recipient for this direct message broadcast.');
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        category: category,
        type: broadcastType, // Differentiates system notifications vs events
        sender_id: user?.id,
        sender_name: user?.full_name || 'Staff Member',
        target_audience: audienceScope, // 'everyone', 'staff', 'direct'
        recipient_id: audienceScope === 'direct' ? selectedRecipientId : null,
        created_at: new Date().toISOString(),
      };

      await addNotification(payload);
      
      Alert.alert('Broadcast Published', `Your ${broadcastType.toLowerCase()} has been deployed successfully.`);
      
      // Clean up local layout variable configurations
      setTitle('');
      setBody('');
      setAudienceScope('everyone');
      setSelectedRecipientId('');
      setBroadcastModalVisible(false);
    } catch (error) {
      Alert.alert('Deployment Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDepartmentDetails = async () => {
    if (!deptName.trim() || !deptCode.trim()) return;
    try {
      await updateDepartment(selectedDept.id, {
        name: deptName.trim(),
        code: deptCode.trim(),
        hod: deptHOD.trim(),
      });
      setDeptModalVisible(false);
      Alert.alert('Success', 'Department data model updated.');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  const handleUpdateReportStatus = async (reportId, newStatus) => {
    try {
      await updateIssueReport(reportId, { status: newStatus });
      setReportModalVisible(false);
      Alert.alert('Status Synchronized', `Issue status marked as ${newStatus}.`);
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <ScreenWrapper style={styles.canvasContainer}>
      
      {/* Dynamic Header Component */}
      <View style={styles.brandHeader}>
        <View>
          <Text style={styles.brandTitle}>RMU Portal</Text>
          <Text style={styles.brandSubtitle}>Faculty & Staff Control Centre</Text>
        </View>
        <TouchableOpacity 
          style={styles.composerTriggerButton}
          onPress={() => setBroadcastModalVisible(true)}
        >
          <Ionicons name="megaphone" size={18} color={C.white} />
          <Text style={styles.composerTriggerButtonText}>Broadcast</Text>
        </TouchableOpacity>
      </View>

      {/* Segmented Top Navigation Bar Controls */}
      <View style={styles.segmentNavigationBar}>
        {['Overview', 'Departments', 'Reports'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.navigationTabItem, activeTab === tab && styles.navigationTabItemActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.navigationTabText, activeTab === tab && styles.navigationTabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Global Activity Loading Indicator Overlay */}
      {isLoading && <ActivityIndicator size="large" color={C.blueAccent} style={{ marginVertical: 20 }} />}

      <ScrollView contentContainerStyle={styles.scrollLayoutPane} showsVerticalScrollIndicator={false}>
        
        {/* TAB SUBSECTION PANEL: OVERVIEW PLATFORM */}
        {activeTab === 'Overview' && (
          <View style={styles.contentDashboardSection}>
            <Text style={styles.panelBlockSectionHeader}>Recent Activities & Broadcast Streams</Text>
            
            {events.slice(0, 4).map((item) => (
              <View key={item.id} style={styles.dataLogCardRow}>
                <View style={styles.badgeIndicatorMarker}>
                  <Ionicons 
                    name={item.type === 'Event' ? "calendar-sharp" : "notifications-sharp"} 
                    size={20} 
                    color={C.blueAccent} 
                  />
                </View>
                <View style={styles.dataLogCardBody}>
                  <Text style={styles.dataLogCardTitleText}>{item.title}</Text>
                  <Text style={styles.dataLogCardSubtitleText} numberOfLines={2}>{item.body}</Text>
                  <View style={styles.metadataCardContainerBadge}>
                    <Text style={styles.badgeScopeIndicatorLabel}>Target: {item.target_audience || 'Everyone'}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB SUBSECTION PANEL: DEPARTMENT CONTROLS */}
        {activeTab === 'Departments' && (
          <View style={styles.contentDashboardSection}>
            <Text style={styles.panelBlockSectionHeader}>Campus Academic Department Registries</Text>
            {departments.map((dept) => (
              <TouchableOpacity
                key={dept.id}
                style={styles.dataLogCardRow}
                onPress={() => {
                  setSelectedDept(dept);
                  setDeptName(dept.name);
                  setDeptCode(dept.code);
                  setDeptHOD(dept.hod || '');
                  setDeptModalVisible(true);
                }}
              >
                <Ionicons name="business" size={24} color={C.bluePrimary} style={{ marginRight: 12 }} />
                <View style={styles.dataLogCardBody}>
                  <Text style={styles.dataLogCardTitleText}>{dept.name} ({dept.code})</Text>
                  <Text style={styles.dataLogCardSubtitleText}>HOD: {dept.hod || 'Unassigned Faculty Head'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* TAB SUBSECTION PANEL: CAMPUS INCIDENT REPORTS */}
        {activeTab === 'Reports' && (
          <View style={styles.contentDashboardSection}>
            <Text style={styles.panelBlockSectionHeader}>Supervised Student Issue Tickets</Text>
            {issueReports.map((report) => (
              <TouchableOpacity
                key={report.id}
                style={styles.dataLogCardRow}
                onPress={() => {
                  setSelectedReport(report);
                  setReportModalVisible(true);
                }}
              >
                <View style={[
                  styles.statusFlagIndicatorNode, 
                  { backgroundColor: report.status === 'Resolved' ? C.greenSuccess : C.orangePending }
                ]} />
                <View style={styles.dataLogCardBody}>
                  <Text style={styles.dataLogCardTitleText}>{report.title}</Text>
                  <Text style={styles.dataLogCardSubtitleText} numberOfLines={1}>{report.description}</Text>
                </View>
                <Ionicons name="eye-outline" size={18} color={C.blueAccent} />
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>

      {/* MODAL ARCHITECTURE 1: MULTI-DIRECTION BROADCAST COMPOSER ENGINE */}
      <Modal visible={broadcastModalVisible} animationType="slide" transparent={true}>
        <View style={styles.overlayModalContainerViewport}>
          <View style={styles.modalContentCardSheet}>
            
            <View style={styles.modalHeaderTitleBlockSection}>
              <Text style={styles.modalHeadingTitleText}>Create Broadcast Entry</Text>
              <TouchableOpacity onPress={() => setBroadcastModalVisible(false)}>
                <Ionicons name="close" size={24} color={C.textDark} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
              
              {/* Selector A: Broadcast Engine Type Switch */}
              <Text style={styles.formSelectorLabelPromptText}>Broadcast Medium Type</Text>
              <View style={styles.inlineOptionSelectorRow}>
                {['Notification', 'Event'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.optionSelectorPillBadge, broadcastType === t && styles.optionSelectorPillBadgeActive]}
                    onPress={() => setBroadcastType(t)}
                  >
                    <Text style={[styles.optionSelectorLabelText, broadcastType === t && styles.optionSelectorLabelTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Selector B: Dynamic Targeting Direction Engine */}
              <Text style={styles.formSelectorLabelPromptText}>Target Audience Direction</Text>
              <View style={styles.inlineOptionSelectorRow}>
                {[
                  { id: 'everyone', display: 'Everyone' },
                  { id: 'staff', display: 'Staff Only' },
                  { id: 'direct', display: 'Direct Message' }
                ].map((scope) => (
                  <TouchableOpacity
                    key={scope.id}
                    style={[styles.optionSelectorPillBadge, audienceScope === scope.id && styles.optionSelectorPillBadgeActive]}
                    onPress={() => setAudienceScope(scope.id)}
                  >
                    <Text style={[styles.optionSelectorLabelText, audienceScope === scope.id && styles.optionSelectorLabelTextActive]}>
                      {scope.display}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Conditional Sub-Selector Layout: Direct Target User Entity Directory Picker */}
              {audienceScope === 'direct' && (
                <View style={styles.conditionalDropdownSectionContainer}>
                  <Text style={styles.formSelectorLabelPromptText}>Select Target User Profile Recipient</Text>
                  <ScrollView style={styles.recipientScrollPickerPane} nestedScrollEnabled={true}>
                    {usersList.map((usr) => (
                      <TouchableOpacity
                        key={usr.id}
                        style={[
                          styles.recipientSelectableRowCard, 
                          selectedRecipientId === usr.id && styles.recipientSelectableRowCardActive
                        ]}
                        onPress={() => setSelectedRecipientId(usr.id)}
                      >
                        <Text style={[
                          styles.recipientRecordNameText, 
                          selectedRecipientId === usr.id && styles.recipientRecordNameTextActive
                        ]}>
                          {usr.full_name || 'Anonymous User'} ({usr.role?.toUpperCase() || 'STUDENT'})
                        </Text>
                        <Text style={styles.recipientRecordSubEmailText}>{usr.email}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Selector C: Categorization Selection Matrix */}
              <Text style={styles.formSelectorLabelPromptText}>Topic Category Classification</Text>
              <View style={styles.inlineOptionSelectorRow}>
                {['Academic', 'Administrative', 'Emergency'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.optionSelectorPillBadge, category === cat && styles.optionSelectorPillBadgeActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.optionSelectorLabelText, category === cat && styles.optionSelectorLabelTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Standard Structural Input Form Fields */}
              <Text style={styles.formSelectorLabelPromptText}>Broadcast Title</Text>
              <TextInput
                style={styles.textInputControlFieldBox}
                placeholder="Enter title heading context..."
                placeholderTextColor={C.textMuted}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.formSelectorLabelPromptText}>Detailed Body Message</Text>
              <TextInput
                style={[styles.textInputControlFieldBox, styles.textInputTextAreaBoxModifier]}
                placeholder="Write message log content body text here..."
                placeholderTextColor={C.textMuted}
                multiline={true}
                numberOfLines={4}
                value={body}
                onChangeText={setBody}
              />

              <CustomButton
                title={`Publish ${broadcastType}`}
                onPress={handlePublishBroadcast}
                style={{ marginTop: 24, backgroundColor: C.blueAccent }}
              />

            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL ARCHITECTURE 2: DEPARTMENT METADATA CONFIGURATION EDITOR */}
      <Modal visible={deptModalVisible} animationType="fade" transparent={true}>
        <View style={styles.overlayModalContainerViewport}>
          <View style={styles.modalContentCardSheet}>
            <View style={styles.modalHeaderTitleBlockSection}>
              <Text style={styles.modalHeadingTitleText}>Edit Department Registry</Text>
              <TouchableOpacity onPress={() => setDeptModalVisible(false)}>
                <Ionicons name="close" size={24} color={C.textDark} />
              </TouchableOpacity>
            </View>

            <Text style={styles.formSelectorLabelPromptText}>Department Name</Text>
            <TextInput
              style={styles.textInputControlFieldBox}
              value={deptName}
              onChangeText={setDeptName}
            />

            <Text style={styles.formSelectorLabelPromptText}>Department Registry Code</Text>
            <TextInput
              style={styles.textInputControlFieldBox}
              value={deptCode}
              onChangeText={setDeptCode}
            />

            <Text style={styles.formSelectorLabelPromptText}>Assigned Head of Department (HOD)</Text>
            <TextInput
              style={styles.textInputControlFieldBox}
              value={deptHOD}
              onChangeText={setDeptHOD}
            />

            <CustomButton
              title="Save Modifications"
              onPress={handleUpdateDepartmentDetails}
              style={{ marginTop: 24, backgroundColor: C.bluePrimary }}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL ARCHITECTURE 3: CAMPUS ISSUE TICKETING INSPECTOR */}
      <Modal visible={reportModalVisible} animationType="fade" transparent={true}>
        <View style={styles.overlayModalContainerViewport}>
          <View style={styles.modalContentCardSheet}>
            <View style={styles.modalHeaderTitleBlockSection}>
              <Text style={styles.modalHeadingTitleText}>Issue Ticket Details</Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <Ionicons name="close" size={24} color={C.textDark} />
              </TouchableOpacity>
            </View>

            {selectedReport && (
              <View style={{ gap: 10 }}>
                <Text style={styles.inspectorDetailHeadingTitleText}>{selectedReport.title}</Text>
                <View style={styles.inspectorMetadataBadgeRowContainer}>
                  <Text style={styles.inspectorSubtextLabel}>Status: {selectedReport.status}</Text>
                  <Text style={styles.inspectorSubtextLabel}>Category: {selectedReport.category || 'General'}</Text>
                </View>

                <ScrollView style={styles.inspectorBodyDescriptionTextBlockScrollBox}>
                  <Text style={styles.inspectorBodyDescriptionContentText}>
                    {selectedReport.description || 'No descriptive content attached to this ticket submission.'}
                  </Text>
                </ScrollView>

                <View style={styles.inspectorOperationalControlActionContainerRow}>
                  <TouchableOpacity
                    style={[styles.inspectorActionTriggerButton, { backgroundColor: C.greenSuccess }]}
                    onPress={() => handleUpdateReportStatus(selectedReport.id, 'Resolved')}
                  >
                    <Text style={styles.inspectorActionButtonLabelText}>Resolve Ticket</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.inspectorActionTriggerButton, { backgroundColor: C.orangePending }]}
                    onPress={() => handleUpdateReportStatus(selectedReport.id, 'Pending')}
                  >
                    <Text style={styles.inspectorActionButtonLabelText}>Mark Pending</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

    </ScreenWrapper>
  );
}

// ── Corporate Modern Structural Stylesheets ─────────────────────────────────
const styles = StyleSheet.create({
  canvasContainer: {
    flex: 1,
    backgroundColor: C.bgCanvas,
  },
  brandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.bluePrimary,
  },
  brandSubtitle: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  composerTriggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.blueAccent,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  composerTriggerButtonText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentNavigationBar: {
    flexDirection: 'row',
    backgroundColor: C.white,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  navigationTabItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  navigationTabItemActive: {
    borderBottomColor: C.blueAccent,
  },
  navigationTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textMuted,
  },
  navigationTabTextActive: {
    color: C.blueAccent,
    fontWeight: '700',
  },
  scrollLayoutPane: {
    padding: 20,
  },
  contentDashboardSection: {
    gap: 12,
  },
  panelBlockSectionHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textDark,
    marginBottom: 6,
  },
  dataLogCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.white,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  badgeIndicatorMarker: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.blueLightBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  statusFlagIndicatorNode: {
    width: 6,
    height: 36,
    borderRadius: 3,
    marginRight: 14,
  },
  dataLogCardBody: {
    flex: 1,
    gap: 2,
  },
  dataLogCardTitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textDark,
  },
  dataLogCardSubtitleText: {
    fontSize: 13,
    color: C.textMuted,
    lineHeight: 18,
  },
  metadataCardContainerBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.bgCanvas,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 0.5,
    borderColor: C.borderLight,
  },
  badgeScopeIndicatorLabel: {
    fontSize: 10,
    color: C.textMuted,
    fontWeight: '600',
  },
  overlayModalContainerViewport: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)', // Deep Tint Backdrop
    justifyContent: 'flex-end',
  },
  modalContentCardSheet: {
    backgroundColor: C.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  modalHeaderTitleBlockSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeadingTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: C.textDark,
  },
  formSelectorLabelPromptText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.textDark,
    marginTop: 16,
    marginBottom: 8,
  },
  inlineOptionSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionSelectorPillBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: C.bgCanvas,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  optionSelectorPillBadgeActive: {
    backgroundColor: C.blueLightBg,
    borderColor: C.blueAccent,
  },
  optionSelectorLabelText: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: '600',
  },
  optionSelectorLabelTextActive: {
    color: C.blueAccent,
    fontWeight: '700',
  },
  conditionalDropdownSectionContainer: {
    backgroundColor: C.bgCanvas,
    padding: 12,
    borderRadius: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  recipientScrollPickerPane: {
    maxHeight: 140,
    backgroundColor: C.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  recipientSelectableRowCard: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  recipientSelectableRowCardActive: {
    backgroundColor: C.blueLightBg,
  },
  recipientRecordNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textDark,
  },
  recipientRecordNameTextActive: {
    color: C.blueAccent,
  },
  recipientRecordSubEmailText: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 1,
  },
  textInputControlFieldBox: {
    backgroundColor: C.bgCanvas,
    borderWidth: 1,
    borderColor: C.borderLight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: C.textDark,
  },
  textInputTextAreaBoxModifier: {
    height: 90,
    textAlignVertical: 'top',
  },
  inspectorDetailHeadingTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.textDark,
  },
  inspectorMetadataBadgeRowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  inspectorSubtextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textMuted,
    backgroundColor: C.bgCanvas,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  inspectorBodyDescriptionTextBlockScrollBox: {
    maxHeight: 160,
    backgroundColor: C.bgCanvas,
    borderRadius: 12,
    padding: 14,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: C.borderLight,
  },
  inspectorBodyDescriptionContentText: {
    fontSize: 14,
    lineHeight: 22,
    color: C.textDark,
  },
  inspectorOperationalControlActionContainerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  inspectorActionTriggerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  inspectorActionButtonLabelText: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
  },
});