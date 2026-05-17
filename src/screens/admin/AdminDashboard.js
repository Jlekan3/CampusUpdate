import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../../components/ScreenWrapper';
import CustomButton from '../../components/CustomButton';
import { COLORS } from '../../utils/constants';
import { subscribeToBuildings, subscribeToIssueReports, subscribeToLocations, subscribeToUsers } from '../../services/databaseService';
import { useAuth } from '../../context/AuthContext';
// import UI moved to AddLocationsScreen

const DASHBOARD_THEME = {
  background: '#F8FAFC',
  hero: '#0F172A',
  heroSoft: '#2563EB',
  accent: '#3B82F6',
  textDark: '#0F172A',
  textMuted: '#475569',
  panel: '#FFFFFF',
};

const quickActions = [
  { id: 'people', label: 'Manage People', icon: 'people-outline', nav: 'People', color: '#1E40AF' },
  { id: 'locations', label: 'Add Locations', icon: 'location-outline', nav: 'AddLocations', color: '#2563EB' },
  { id: 'buildings', label: 'Manage Buildings', icon: 'business-outline', nav: 'Buildings', color: '#3B82F6' },
  { id: 'dining', label: 'Dining', icon: 'restaurant-outline', nav: 'ManageDining', color: '#60A5FA' },
  { id: 'reports', label: 'Reports', icon: 'document-text-outline', nav: 'Reports', color: '#0EA5E9' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications-outline', nav: 'Notifications', color: '#06B6D4' },
  { id: 'rules', label: 'Campus Rules', icon: 'shield-outline', nav: 'ManageCampusRules', color: '#0891B2' },
  { id: 'amenities', label: 'Amenities', icon: 'fitness-outline', nav: 'ManageAmenities', color: '#2563EB' },
  { id: 'analytics', label: 'Analytics', icon: 'analytics-outline', nav: 'AdminAnalytics', color: '#3B82F6' },
];

const stats = [
  { id: '1', title: 'Buildings', value: 0, icon: 'business-outline', color: '#3B82F6' },
  { id: '2', title: 'Locations', value: 0, icon: 'location-outline', color: '#2563EB' },
  { id: '3', title: 'Active Users', value: 0, icon: 'people-outline', color: '#3B82F6' },
];

const AdminDashboard = ({ navigation }) => {
  const { logout, user } = useAuth();
  const [counts, setCounts] = React.useState({ buildings: 0, locations: 0, users: 0 });
  const [reports, setReports] = React.useState([]);
  const [showAdminTools, setShowAdminTools] = React.useState(true);

  React.useEffect(() => {
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
  }, []);

  const unreadNotificationCount = React.useMemo(() => {
    return reports.reduce((count, report) => {
      const role = (report?.reporterRole || '').toString().toLowerCase();
      const isStudentOrStaff = role.includes('student') || role.includes('staff') || role.includes('faculty');
      const isUnread = !report?.adminReadAt;

      return isStudentOrStaff && isUnread ? count + 1 : count;
    }, 0);
  }, [reports]);
  

  React.useEffect(() => {
    console.log('AdminDashboard mounted - setting up subscriptions');
    
    const unsubBuildings = subscribeToBuildings((items) => {
      console.log('Buildings updated:', items.length);
      setCounts((c) => ({ ...c, buildings: items.length }));
    });

    const unsubLocations = subscribeToLocations((items) => {
      console.log('Locations updated:', items.length);
      setCounts((c) => ({ ...c, locations: items.length }));
    });

    const unsubUsers = subscribeToUsers((items) => {
      console.log('Users fetched from Firebase:', items);
      console.log('User count:', items.length);
      setCounts((c) => ({ ...c, users: items.length }));
    });

    return () => {
      console.log('AdminDashboard cleanup - unsubscribing');
      unsubBuildings();
      unsubLocations();
      unsubUsers();
    };
  }, []);

  const renderStat = ({ item }) => (
    <View style={[styles.statCard, { borderLeftColor: item.color }]}> 
      <View style={styles.statTopRow}>
        <View style={[styles.statIcon, { backgroundColor: `${item.color}1A` }]}>
          <Ionicons name={item.icon} size={22} color={item.color} />
        </View>
        <View style={styles.statBadge}>
          <Text style={styles.statBadgeText}>Live</Text>
        </View>
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>{
          item.id === '1' ? counts.buildings : item.id === '2' ? counts.locations : counts.users
        }</Text>
        <Text style={styles.statTitle}>{item.title}</Text>
        <Text style={styles.statHint}>Synced from Firebase</Text>
      </View>
    </View>
  );

  const renderAction = ({ item }) => (
    <TouchableOpacity
      key={item.id}
      style={styles.dropdownActionCard}
      onPress={() => navigation.navigate(item.nav)}
    >
      <View style={styles.dropdownActionTopRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${item.color}1F` }]}> 
          <Ionicons name={item.icon} size={24} color={item.color} />
        </View>
        <Ionicons name="chevron-forward" size={18} color={DASHBOARD_THEME.textMuted} />
      </View>
      <Text style={styles.cardTitle}>{item.label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScreenWrapper backgroundColor={DASHBOARD_THEME.background} statusBarStyle="dark-content">
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.bgOrbTop} />
        <View style={styles.bgOrbSecondary} />

        {/* Hero / Header */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroAccentBar} />
          <View style={styles.header}>
            <View style={styles.headerTextBlock}>
              <Text style={styles.heroEyebrow}>Admin Dashboard</Text>
              <Text style={styles.title}>Admin Control Center</Text>
              <Text style={styles.subtitle}>Manage people, buildings, events and alerts</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => navigation.navigate('Reports')}
                style={styles.iconButton}
              >
                <Ionicons name="notifications-outline" size={22} color={DASHBOARD_THEME.hero} />
                {unreadNotificationCount > 0 ? (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
              <TouchableOpacity onPress={logout} style={styles.iconButton}>
                <Ionicons name="log-out-outline" size={22} color={DASHBOARD_THEME.hero} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroStatsRow}>
            <View style={[styles.heroPill, styles.heroPillPrimary]}>
              <Ionicons name="business-outline" size={16} color={COLORS.white} />
              <Text style={styles.heroPillText}>{counts.buildings} buildings</Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="location-outline" size={16} color={COLORS.white} />
              <Text style={styles.heroPillText}>{counts.locations} locations</Text>
            </View>
            <View style={styles.heroPill}>
              <Ionicons name="people-outline" size={16} color={COLORS.white} />
              <Text style={styles.heroPillText}>{counts.users} users</Text>
            </View>
          </View>
        </View>

        {/* Overview Stats */}
        <View style={styles.overviewSection}>
          <View style={styles.overviewHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Overview</Text>
              <Text style={styles.overviewSubtitle}>A quick snapshot of campus data activity</Text>
            </View>
            <View style={styles.overviewBadge}>
              <Ionicons name="pulse-outline" size={12} color={DASHBOARD_THEME.heroSoft} />
              <Text style={styles.overviewBadgeText}>Live status</Text>
            </View>
          </View>

          <View style={styles.overviewPanel}>
            <View style={styles.statsContainer}>
              {stats.map((item) => renderStat({ item }))}
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.dropdownSection}>
          <TouchableOpacity
            style={styles.dropdownTrigger}
            onPress={() => setShowAdminTools((current) => !current)}
            activeOpacity={0.85}
          >
            <View>
              <Text style={styles.sectionTitle}>Admin Tools</Text>
              <Text style={styles.dropdownSubtitle}>Open to manage campus features</Text>
            </View>
            <View style={styles.dropdownTriggerRight}>
              <Text style={styles.dropdownCount}>{quickActions.length} tools</Text>
              <Ionicons
                name={showAdminTools ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={DASHBOARD_THEME.textMuted}
              />
            </View>
          </TouchableOpacity>

          {showAdminTools ? (
            <View style={styles.dropdownPanel}>
              {quickActions.map((item) => renderAction({ item }))}
            </View>
          ) : null}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoIcon}>
            <Ionicons name="information-circle-outline" size={24} color={COLORS.white} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Campus Data Management</Text>
            <Text style={styles.infoText}>
              Add students and staff, create locations with photos, review reports, and manage buildings,
              events, and notifications in one place.
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  bgOrbTop: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(20, 184, 166, 0.12)',
    top: -90,
    right: -80,
  },
  bgOrbSecondary: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(29, 78, 216, 0.08)',
    top: 120,
    left: -90,
  },
  header: {
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextBlock: {
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
    color: 'rgba(255, 255, 255, 0.82)',
    marginTop: 6,
    maxWidth: 260,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: DASHBOARD_THEME.textDark,
    marginBottom: 0,
    marginTop: 0,
  },
  overviewSection: {
    marginBottom: 6,
  },
  overviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  overviewSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: DASHBOARD_THEME.textMuted,
    lineHeight: 18,
  },
  overviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#E0F2FE',
  },
  overviewBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: DASHBOARD_THEME.heroSoft,
  },
  overviewPanel: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
    marginBottom: 18,
  },
  heroCard: {
    backgroundColor: DASHBOARD_THEME.hero,
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 22,
    overflow: 'hidden',
    shadowColor: '#020617',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  heroGlow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: DASHBOARD_THEME.heroSoft,
    opacity: 0.22,
    top: -50,
    right: -48,
  },
  heroAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: DASHBOARD_THEME.accent,
  },
  heroStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.16)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  heroPillPrimary: {
    backgroundColor: 'rgba(20, 184, 166, 0.22)',
    borderColor: 'rgba(20, 184, 166, 0.32)',
  },
  heroPillText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  statsContainer: {
    gap: 12,
    marginBottom: 0,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderLeftColor: COLORS.primary,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  statIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.dark,
  },
  statTitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
    fontWeight: '600',
  },
  statHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
  },
  statBadge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: DASHBOARD_THEME.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  dropdownSection: {
    marginBottom: 20,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  dropdownSubtitle: {
    fontSize: 12,
    color: DASHBOARD_THEME.textMuted,
    marginTop: 2,
  },
  dropdownTriggerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownCount: {
    fontSize: 12,
    fontWeight: '700',
    color: DASHBOARD_THEME.textMuted,
  },
  dropdownPanel: {
    marginTop: 10,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  dropdownActionCard: {
    width: '48%',
    aspectRatio: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dropdownActionTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
    width: '100%',
  },
  card: {
    width: '48%',
    backgroundColor: DASHBOARD_THEME.panel,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontWeight: '700',
    color: DASHBOARD_THEME.textDark,
    fontSize: 14,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#0B1220',
    borderRadius: 22,
    padding: 16,
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#020617',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
  },
  infoIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(20, 184, 166, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(241, 245, 249, 0.95)',
    marginTop: 4,
    lineHeight: 18,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
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
});

export default AdminDashboard;
