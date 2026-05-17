import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import CustomButton from '../../components/CustomButton';
import { COLORS, USER_ROLES } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';
import { CampusUpdatesContext } from '../../context/CampusUpdatesContext';
import * as ImagePicker from 'expo-image-picker';
import { addIssueReport, subscribeToUserNotificationReads } from '../../services/databaseService';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

const DASHBOARD_THEME = {
  background: '#EFF6FF',
  hero: '#1E40AF',
  heroSoft: '#60A5FA',
  accent: '#3B82F6',
  textDark: '#0F172A',
  textMuted: '#475569',
  panel: '#FFFFFF',
};

const STORAGE_KEY = 'guest-dashboard-mode';

const THEMES = {
  light: {
    background: '#F8FAFC',
    hero: '#1E40AF',
    heroSoft: '#60A5FA',
    panel: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceBorder: 'rgba(37, 99, 235, 0.18)',
    textPrimary: '#0F172A',
    textMuted: '#475569',
  },
  dark: {
    background: '#0B1220',
    hero: '#2563EB',
    heroSoft: '#93C5FD',
    panel: '#111827',
    surface: '#111827',
    surfaceBorder: 'rgba(255, 255, 255, 0.10)',
    textPrimary: '#F8FAFC',
    textMuted: '#CBD5E1',
  },
};

const ACTION_BLUE = '#2563EB';
const ACTION_CARD_BG = '#FFFFFF';
const ACTION_CARD_BORDER = 'rgba(37, 99, 235, 0.35)';
const ACTION_ICON_BG = 'rgba(37, 99, 235, 0.12)';

const quickAccessFeatures = [
  { id: 'map', title: 'Campus Map', icon: 'map-outline', nav: 'Map', color: ACTION_BLUE, cardBg: ACTION_CARD_BG, cardBorder: ACTION_CARD_BORDER },
  { id: 'search', title: 'Search', icon: 'search-outline', nav: 'Search', color: ACTION_BLUE, cardBg: ACTION_CARD_BG, cardBorder: ACTION_CARD_BORDER },
  {
    id: 'favorites',
    title: 'Favorites',
    icon: 'heart-outline',
    nav: 'Favorites',
    color: ACTION_BLUE,
    cardBg: ACTION_CARD_BG,
    cardBorder: ACTION_CARD_BORDER,
  },
  { id: 'notifications', title: 'Notifications', icon: 'notifications-outline', nav: 'Notifications', color: ACTION_BLUE, cardBg: ACTION_CARD_BG, cardBorder: ACTION_CARD_BORDER },
];

const discoveryFeatures = [
  { id: 'events', title: 'Events', icon: 'calendar-outline', nav: 'CampusEvents', color: ACTION_BLUE, cardBg: ACTION_CARD_BG, cardBorder: ACTION_CARD_BORDER },
  { id: 'dining', title: 'Dining', icon: 'restaurant-outline', nav: 'Dining', color: ACTION_BLUE, cardBg: ACTION_CARD_BG, cardBorder: ACTION_CARD_BORDER },
  { id: 'amenities', title: 'Amenities', icon: 'fitness-outline', nav: 'Amenities', color: ACTION_BLUE, cardBg: ACTION_CARD_BG, cardBorder: ACTION_CARD_BORDER },
  { id: 'rules', title: 'Campus Rules', icon: 'shield-outline', nav: 'CampusRules', color: ACTION_BLUE, cardBg: ACTION_CARD_BG, cardBorder: ACTION_CARD_BORDER },
];

const supportFeatures = [
  { id: 'safety', title: 'Safety & Support', icon: 'alert-circle-outline', nav: 'SafetySupport', color: '#1E40AF' },
];

const StudentHomeScreen = ({ navigation }) => {
  const { notifications } = React.useContext(CampusUpdatesContext);
  const { logout, user, userRole } = useAuth();
  const [mode, setMode] = React.useState('light');
  const [showReportModal, setShowReportModal] = React.useState(false);
  const [showMoreActions, setShowMoreActions] = React.useState(false);
  const [issueTitle, setIssueTitle] = React.useState('');
  const [issueDescription, setIssueDescription] = React.useState('');
  const [issueCategory, setIssueCategory] = React.useState('Technical');
  const [photos, setPhotos] = React.useState([]);
  const [readMap, setReadMap] = React.useState({});
  const [profile, setProfile] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const savedMode = await AsyncStorage.getItem(STORAGE_KEY);
        if (mounted && (savedMode === 'light' || savedMode === 'dark')) {
          setMode(savedMode);
        }
      } catch (error) {
        console.log('StudentHomeScreen theme load error', error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, mode).catch((error) => {
      console.log('StudentHomeScreen theme save error', error);
    });
  }, [mode]);

  const theme = THEMES[mode] || THEMES.light;

  React.useEffect(() => {
    if (!user?.uid) {
      setProfile(null);
      setReadMap({});
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));

        if (cancelled) {
          return;
        }

        if (snap.exists()) {
          setProfile({ id: snap.id, ...(snap.data() || {}) });
        } else {
          setProfile(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.log('StudentHomeScreen profile load error', error);
          setProfile(null);
        }
      }
    })();

    const unsubscribe = subscribeToUserNotificationReads(user.uid, (entries) => {
      setReadMap(entries || {});
    });

    return () => {
      cancelled = true;
      try {
        unsubscribe?.();
      } catch (error) {
        // ignore
      }
    };
  }, [user?.uid]);

  const profileName = React.useMemo(() => {
    const displayName = (profile?.name || user?.displayName || '').trim();
    if (displayName) return displayName;

    const email = (user?.email || '').trim();
    if (!email) return '';

    const localPart = email.split('@')[0] || '';
    if (!localPart) return '';

    const cleaned = localPart.replace(/[._-]+/g, ' ').trim();
    if (!cleaned) return '';

    return cleaned
      .split(' ')
      .filter(Boolean)
      .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
      .join(' ');
  }, [profile?.name, user?.displayName, user?.email]);

  const profileIndexNumber = React.useMemo(() => {
    return (
      profile?.studentID ||
      profile?.studentId ||
      profile?.indexNumber ||
      profile?.indexNo ||
      profile?.idNumber ||
      profile?.staffId ||
      profile?.employeeId ||
      profile?.uid ||
      user?.uid ||
      ''
    );
  }, [profile, user?.uid]);

  const profileProgramme = (profile?.programme || '').trim();
  const profileDepartment = (profile?.department || '').trim();
  const isStaffProfile = userRole === USER_ROLES.FACULTY || userRole === USER_ROLES.ADMIN;

  const handleNavigate = (screen) => {
    navigation.navigate(screen);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.cancelled) {
        setPhotos([...photos, result.uri]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleReportSubmit = () => {
    if (!issueTitle.trim() || !issueDescription.trim()) {
      Alert.alert('Validation Error', 'Please fill in all fields');
      return;
    }

    addIssueReport({
      title: issueTitle.trim(),
      description: issueDescription.trim(),
      category: issueCategory,
      photoUris: photos,
      photoCount: photos.length,
      reporterId: user?.uid || '',
      reporterName: user?.displayName || '',
      reporterEmail: user?.email || '',
      reporterRole: userRole || user?.role || user?.userRole || 'student',
      status: 'open',
    })
      .then(() => {
        Alert.alert('Success', 'Issue reported successfully!');
        setShowReportModal(false);
        setIssueTitle('');
        setIssueDescription('');
        setIssueCategory('Technical');
        setPhotos([]);
      })
      .catch((error) => {
        Alert.alert('Error', error?.message || 'Failed to submit issue report');
      });
  };

  const removePhoto = (index) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const visibleNotifications = React.useMemo(() => {
    const userId = user?.uid;
    const staffRoles = [USER_ROLES.ADMIN, USER_ROLES.FACULTY];

    return notifications.filter((item) => {
      const audience = (item.audience || 'everyone').toString().toLowerCase();
      const recipientIds = Array.isArray(item.recipientIds)
        ? item.recipientIds.filter(Boolean)
        : item.recipientId
          ? [item.recipientId]
          : [];
      const isDirect = audience === 'direct' || recipientIds.length > 0;

      if (isDirect) {
        if (!userId) return false;
        return recipientIds.includes(userId);
      }

      if (audience === 'staff') {
        return staffRoles.includes(userRole);
      }

      return true;
    });
  }, [notifications, user?.uid, userRole]);

  const unreadNotificationCount = React.useMemo(() => {
    return visibleNotifications.reduce((count, item) => {
      return readMap[item.id]?.readAt ? count : count + 1;
    }, 0);
  }, [readMap, visibleNotifications]);

  return (
    <ScreenWrapper backgroundColor={theme.background} statusBarStyle={mode === 'dark' ? 'light-content' : 'dark-content'}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.bgOrbTop} />
        <View style={styles.bgOrbSecondary} />

        {/* Header */}
        <View style={[styles.heroCard, { backgroundColor: theme.hero }]}>
          <View style={[styles.heroGlow, { backgroundColor: theme.heroSoft }]} />
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: COLORS.white }]}>{profileName ? `Welcome, ${profileName}` : 'Welcome'}</Text>
              <Text style={[styles.identityLine, { color: 'rgba(255,255,255,0.92)' }]}>
                {profileName || 'Campus member'}
              </Text>
              {isStaffProfile ? (
                <>
                  <Text style={[styles.identityLine, { color: 'rgba(255,255,255,0.88)' }]}>
                    Department: {profileDepartment || 'N/A'}
                  </Text>
                  <Text style={[styles.identityLine, { color: 'rgba(255,255,255,0.88)' }]}>
                    ID Number: {profileIndexNumber || 'N/A'}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.identityLine, { color: 'rgba(255,255,255,0.88)' }]}>
                    Index Number: {profileIndexNumber || 'N/A'}
                  </Text>
                  <Text style={[styles.identityLine, { color: 'rgba(255,255,255,0.88)' }]}>
                    Programme: {profileProgramme || 'N/A'}
                  </Text>
                </>
              )}
              <Text style={styles.subtitle}>Your campus hub for navigation, events, and support</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.themeMiniButton}
                onPress={() => setMode((current) => (current === 'dark' ? 'light' : 'dark'))}
                activeOpacity={0.85}
              >
                <Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={16} color={COLORS.white} />
              </TouchableOpacity>
              <View style={styles.headerActionStack}>
                <TouchableOpacity onPress={() => handleNavigate('Notifications')} style={styles.iconButton}>
                  <Ionicons name="notifications-outline" size={22} color={theme.hero} />
                  {unreadNotificationCount > 0 ? (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>
                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
                <TouchableOpacity onPress={logout} style={styles.iconButton}>
                  <Ionicons name="log-out-outline" size={22} color={theme.hero} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroPill}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.white} />
              <Text style={styles.heroPillText}>Stay Updated</Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="navigate-outline" size={16} color={COLORS.white} />
              <Text style={styles.heroPillText}>Find Spaces Fast</Text>
            </View>
          </View>
        </View>

        <View style={[styles.hoursCard, { backgroundColor: theme.panel, borderColor: theme.surfaceBorder }]}>
          <View style={styles.hoursHeader}>
            <View style={[styles.hoursIconWrap, { backgroundColor: `${theme.hero}1A` }]}>
              <Ionicons name="time-outline" size={18} color={theme.hero} />
            </View>
            <Text style={[styles.hoursTitle, { color: theme.textPrimary }]}>Working Hours</Text>
          </View>
          <Text style={[styles.hoursBody, { color: theme.textMuted }]}>School working hours are from 9 AM to 4 PM.</Text>
        </View>

        {/* Quick Access Section */}
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Quick Access</Text>
        <View style={styles.grid}>
          {quickAccessFeatures.map((f) => (
            <TouchableOpacity
              key={f.id}
              style={[
                styles.actionCard,
                {
                  backgroundColor: mode === 'dark' ? theme.surface : (f.cardBg || `${f.color}12`),
                  borderColor: mode === 'dark' ? theme.surfaceBorder : (f.cardBorder || `${f.color}33`),
                },
              ]}
              onPress={() => handleNavigate(f.nav)}
              activeOpacity={0.85}
            >
              <View style={[styles.actionAccent, { backgroundColor: f.color }]} />
              <View style={styles.actionBody}>
                <View style={styles.actionHeader}>
                  <View style={[styles.actionIconWrap, { backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : `${f.color}1F` }]}>
                    <Ionicons name={f.icon} size={24} color={f.color} />
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                </View>
                <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>{f.title}</Text>
                <View style={styles.actionFooter}>
                  <Text style={[styles.actionTag, { color: f.color }]}>Open feature</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.moreActionsToggle, { backgroundColor: theme.hero }]}
          onPress={() => setShowMoreActions((current) => !current)}
          activeOpacity={0.85}
        >
          <View>
            <Text style={styles.moreActionsTitle}>More Actions</Text>
            <Text style={styles.moreActionsSubtitle}>
              Tap to discover events, dining, amenities, support, and reports
            </Text>
          </View>
          <Ionicons
            name={showMoreActions ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={COLORS.white}
          />
        </TouchableOpacity>

        {showMoreActions && (
          <View style={styles.moreActionsPanel}>
            {/* Information Discovery Section */}
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Discover</Text>
            <View style={styles.grid}>
              {discoveryFeatures.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  style={[
                    styles.actionCard,
                    {
                      backgroundColor: mode === 'dark' ? theme.surface : (f.cardBg || `${f.color}12`),
                      borderColor: mode === 'dark' ? theme.surfaceBorder : (f.cardBorder || `${f.color}33`),
                    },
                  ]}
                  onPress={() => handleNavigate(f.nav)}
                  activeOpacity={0.85}
                >
                  <View style={[styles.actionAccent, { backgroundColor: f.color }]} />
                  <View style={styles.actionBody}>
                    <View style={styles.actionHeader}>
                      <View style={[styles.actionIconWrap, { backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : `${f.color}1F` }]}>
                        <Ionicons name={f.icon} size={24} color={f.color} />
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                    </View>
                    <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>{f.title}</Text>
                    <View style={styles.actionFooter}>
                      <Text style={[styles.actionTag, { color: f.color }]}>Open feature</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Safety & Support Section */}
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Support</Text>
            <View style={styles.supportRow}>
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  styles.squareActionCard,
                  {
                    backgroundColor: mode === 'dark' ? theme.surface : ACTION_CARD_BG,
                    borderColor: mode === 'dark' ? theme.surfaceBorder : ACTION_CARD_BORDER,
                  },
                ]}
                onPress={() => handleNavigate('SafetySupport')}
                activeOpacity={0.85}
              >
                <View style={[styles.actionAccent, { backgroundColor: ACTION_BLUE }]} />
                <View style={styles.actionBodySquare}>
                  <View style={styles.actionHeader}>
                    <View style={[styles.actionIconWrap, { backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : ACTION_ICON_BG }]}> 
                      <Ionicons name="alert-circle-outline" size={24} color={ACTION_BLUE} />
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                  </View>
                  <Text style={[styles.actionTitle, { color: theme.textPrimary }]}>Safety & Support</Text>
                  <Text style={[styles.actionDescription, { color: theme.textMuted }]} numberOfLines={2}>Emergency contacts, campus rules & alerts</Text>
                  <View style={styles.actionFooter}>
                    <Text style={[styles.actionTag, { color: ACTION_BLUE }]}>Open feature</Text>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionCard,
                  styles.squareActionCard,
                  {
                    backgroundColor: mode === 'dark' ? theme.surface : ACTION_CARD_BG,
                    borderColor: mode === 'dark' ? theme.surfaceBorder : ACTION_CARD_BORDER,
                  },
                ]}
                onPress={() => setShowReportModal(true)}
                activeOpacity={0.85}
              >
                <View style={[styles.actionAccent, { backgroundColor: ACTION_BLUE }]} />
                <View style={styles.actionBodySquare}>
                  <View style={styles.actionHeader}>
                    <View style={[styles.actionIconWrap, { backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.06)' : ACTION_ICON_BG }]}> 
                      <Ionicons name="alert-circle-outline" size={24} color={ACTION_BLUE} />
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                  </View>
                  <Text style={[styles.actionTitle, { color: mode === 'dark' ? theme.textPrimary : DASHBOARD_THEME.textDark }]}>Report Issue</Text>
                  <Text style={styles.actionDescription} numberOfLines={2}>Report campus problems, damages, or concerns</Text>
                  <View style={styles.actionFooter}>
                    <Text style={[styles.actionTag, { color: ACTION_BLUE }]}>Open form</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Report Issue Modal */}
      <Modal
        visible={showReportModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowReportModal(false)}
      >
        <ScreenWrapper backgroundColor={theme.hero} statusBarStyle="light-content">
          <ScrollView style={styles.modalContainer} showsVerticalScrollIndicator={false}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <Ionicons name="close" size={28} color={COLORS.white} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Report an Issue</Text>
              <View style={{ width: 28 }} />
            </View>

            {/* Form Content */}
            <View style={styles.formContainer}>
              {/* Category Selection */}
              <Text style={styles.formLabel}>Category</Text>
              <View style={styles.categoryContainer}>
                {['Technical', 'Facility', 'Safety', 'Other'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryButton, issueCategory === cat && styles.categoryButtonActive]}
                    onPress={() => setIssueCategory(cat)}
                  >
                    <Text style={[styles.categoryButtonText, issueCategory === cat && styles.categoryButtonTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title Input */}
              <Text style={styles.formLabel}>Issue Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Brief title of the issue"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={issueTitle}
                onChangeText={setIssueTitle}
              />

              {/* Description Input */}
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                placeholder="Detailed description of the issue"
                placeholderTextColor="rgba(255, 255, 255, 0.5)"
                value={issueDescription}
                onChangeText={setIssueDescription}
                multiline
                numberOfLines={5}
              />

              {/* Photo Section */}
              <Text style={styles.formLabel}>Photos (Optional)</Text>
              <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
                <Ionicons name="camera" size={24} color={COLORS.white} />
                <Text style={styles.photoButtonText}>Take Photo</Text>
              </TouchableOpacity>

              {/* Display Selected Photos */}
              {photos.length > 0 && (
                <View style={styles.photosContainer}>
                  {photos.map((photo, index) => (
                    <View key={index} style={styles.photoPreview}>
                      <Image source={{ uri: photo }} style={styles.photoImage} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={() => removePhoto(index)}
                      >
                        <Ionicons name="close" size={20} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* Submit Button */}
              <CustomButton
                title="Submit Report"
                onPress={handleReportSubmit}
                style={styles.submitButton}
              />

              {/* Cancel Button */}
              <CustomButton
                title="Cancel"
                onPress={() => setShowReportModal(false)}
                variant="outline"
                style={styles.cancelButton}
              />
            </View>
          </ScrollView>
        </ScreenWrapper>
      </Modal>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    paddingTop: 16,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  bgOrbTop: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(20, 184, 166, 0.18)',
    top: -80,
    right: -60,
  },
  bgOrbSecondary: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
    top: 120,
    left: -70,
  },
  heroCard: {
    backgroundColor: DASHBOARD_THEME.hero,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 22,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  hoursCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  hoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  hoursIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoursTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  hoursBody: {
    fontSize: 12,
    lineHeight: 18,
  },
  heroGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: DASHBOARD_THEME.heroSoft,
    opacity: 0.45,
    top: -30,
    right: -30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { 
    fontSize: 22, 
    fontWeight: '700', 
    color: COLORS.white 
  },
  identityLine: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  subtitle: { 
    color: 'rgba(255, 255, 255, 0.9)', 
    marginTop: 4,
    fontSize: 13,
    maxWidth: 230,
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
  },
  heroPillText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: { 
    fontSize: 18,
    fontWeight: '700',
    color: DASHBOARD_THEME.textDark,
    marginBottom: 12,
    marginTop: 8,
  },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionCard: {
    width: '48%',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.09,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    minHeight: 112,
    marginBottom: 12,
  },
  actionAccent: {
    width: 10,
  },
  actionBody: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  actionBodySquare: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: DASHBOARD_THEME.textDark,
    marginBottom: 6,
  },
  actionDescription: {
    fontSize: 13,
    color: DASHBOARD_THEME.textMuted,
    lineHeight: 19,
  },
  squareActionCard: {
    width: '48%',
    minHeight: 170,
  },
  supportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 18,
  },
  actionFooter: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  actionTag: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  quickActions: {
    marginBottom: 18,
  },
  moreActionsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DASHBOARD_THEME.hero,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  moreActionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  moreActionsSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.88)',
  },
  moreActionsPanel: {
    marginBottom: 18,
    paddingTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignItems: 'flex-start',
  },
  headerActionStack: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
  },
  themeMiniButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.65)',
    position: 'relative',
    overflow: 'visible',
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  notificationBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  /* Modal Styles */
  modalContainer: {
    flex: 1,
    paddingHorizontal: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 10,
    marginTop: 16,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  categoryButtonActive: {
    backgroundColor: COLORS.white,
  },
  categoryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  categoryButtonTextActive: {
    color: '#1e40af',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    padding: 14,
    color: COLORS.white,
    fontSize: 14,
    marginBottom: 16,
  },
  textAreaInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    paddingVertical: 20,
    marginBottom: 16,
    gap: 10,
  },
  photoButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  photoPreview: {
    position: 'relative',
    width: '48%',
    aspectRatio: 1,
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 6,
  },
  submitButton: {
    marginBottom: 12,
  },
  cancelButton: {
    marginBottom: 30,
  },
});

export default StudentHomeScreen;
