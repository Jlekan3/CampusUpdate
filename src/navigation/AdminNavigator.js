import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_THEME, USER_ROLES } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { subscribeToIssueReports } from '../services/databaseService';

// Existing screens
import AdminDashboard from '../screens/admin/AdminDashboard';
import ManageBuildingsScreen from '../screens/admin/ManageBuildingsScreen';
import ManageLocationsScreen from '../screens/admin/ManageLocationsScreen';
import ManageNotificationsScreen from '../screens/admin/ManageNotificationsScreen';
import ManagePeopleScreen from '../screens/admin/ManagePeopleScreen';
import ManageDiningScreen from '../screens/admin/ManageDiningScreen';
import ManageReportsScreen from '../screens/admin/ManageReportsScreen';
import AddLocationsScreen from '../screens/admin/AddLocationsScreen';
import AdminAnalyticsScreen from '../screens/admin/AdminAnalyticsScreen';
import ManageCampusRulesScreen from '../screens/admin/ManageCampusRulesScreen';
import ManageAmenitiesScreen from '../screens/admin/ManageAmenitiesScreen';
import ManageEventsScreen from '../screens/admin/ManageEventsScreen';
import LocationDetailsScreen from '../screens/common/LocationDetailsScreen';
import ScreenWrapper from '../components/ScreenWrapper';
import CustomButton from '../components/CustomButton';

// New screens
import ManageDepartmentsScreen from '../screens/admin/ManageDepartmentsScreen';
import EmergencyManagementScreen from '../screens/admin/EmergencyManagementScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const DRAWER_ITEMS = [
  { label: 'Dashboard', icon: 'speedometer-outline', route: 'Dashboard' },
  { label: 'Departments', icon: 'layers-outline', route: 'ManageDepartments' },
  { label: 'Buildings', icon: 'business-outline', route: 'Buildings' },
  { label: 'Manage People', icon: 'people-outline', route: 'Users' },
  { label: 'Locations', icon: 'location-outline', route: 'AddLocations' },
  { label: 'Events & Notices', icon: 'calendar-outline', route: 'Notifications' },
  { label: 'Dining', icon: 'restaurant-outline', route: 'ManageDining' },
  { label: 'Reports', icon: 'document-text-outline', route: 'Reports' },
  { label: 'Emergency', icon: 'alert-circle-outline', route: 'EmergencyManagement' },
  { label: 'Campus Rules', icon: 'shield-outline', route: 'ManageCampusRules' },
  { label: 'Amenities', icon: 'fitness-outline', route: 'ManageAmenities' },
  { label: 'Analytics', icon: 'analytics-outline', route: 'AdminAnalytics' },
  { label: 'Settings', icon: 'settings-outline', route: 'AdminSettings' },
];

const AdminDrawerContent = (props) => {
  const { logout, user } = useAuth();
  const { colors } = useTheme();

  // Screens that live inside the AdminTabs tab navigator
  const TAB_SCREENS = new Set(['Dashboard', 'Departments', 'Users', 'Reports']);

  const navigate = (route) => {
    props.navigation.closeDrawer();
    if (TAB_SCREENS.has(route)) {
      // Navigate into the nested tab navigator
      props.navigation.navigate('AdminTabs', { screen: route });
    } else {
      // Stack screens registered on the parent AdminNavigator
      props.navigation.navigate(route);
    }
  };

  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: colors.surface }}
      contentContainerStyle={{ paddingTop: 0 }}
    >
      {/* Header */}
      <View style={drawerStyles.header}>
        <View style={drawerStyles.goldBar} />
        <View style={drawerStyles.headerContent}>
          <View style={drawerStyles.avatar}>
            <Text style={drawerStyles.avatarText}>
              {(user?.displayName || user?.email || 'A')[0].toUpperCase()}
            </Text>
          </View>
          <Text style={drawerStyles.adminName} numberOfLines={1}>
            {user?.displayName || 'Admin'}
          </Text>
          <Text style={drawerStyles.adminEmail} numberOfLines={1}>
            {user?.email || ''}
          </Text>
          <View style={drawerStyles.adminBadge}>
            <Ionicons name="shield-checkmark-outline" size={11} color={ADMIN_THEME.accent} />
            <Text style={drawerStyles.adminBadgeText}>Administrator</Text>
          </View>
        </View>
      </View>

      {/* Nav items */}
      <View style={[drawerStyles.navSection, { borderTopColor: colors.border }]}>
        {DRAWER_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[drawerStyles.navItem, { borderBottomColor: colors.border }]}
            onPress={() => navigate(item.route)}
            activeOpacity={0.7}
          >
            <View style={[drawerStyles.navIconWrap, { backgroundColor: ADMIN_THEME.primary + '14' }]}>
              <Ionicons name={item.icon} size={18} color={ADMIN_THEME.primary} />
            </View>
            <Text style={[drawerStyles.navLabel, { color: colors.textDark }]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.border} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={[drawerStyles.logoutBtn, { borderTopColor: colors.border, borderBottomColor: colors.border }]}
        onPress={() => { props.navigation.closeDrawer(); logout(); }}
        activeOpacity={0.7}
      >
        <View style={[drawerStyles.navIconWrap, { backgroundColor: '#E53E3E18' }]}>
          <Ionicons name="log-out-outline" size={18} color="#E53E3E" />
        </View>
        <Text style={drawerStyles.logoutLabel}>Logout</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
};

const AdminTabs = ({ navigation }) => {
  const { colors } = useTheme();
  const [reports, setReports] = React.useState([]);

  React.useEffect(() => {
    const unsub = subscribeToIssueReports((items) => setReports(items || []));
    return () => { try { unsub?.(); } catch (e) {} };
  }, []);

  const unreadCount = React.useMemo(() => {
    return reports.reduce((count, report) => {
      const role = (report?.reporterRole || '').toString().toLowerCase();
      const isStudentOrStaff = role.includes('student') || role.includes('staff') || role.includes('faculty');
      const isUnread = !report?.adminReadAt;
      return isStudentOrStaff && isUnread ? count + 1 : count;
    }, 0);
  }, [reports]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: ADMIN_THEME.primary,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 62,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Dashboard: focused ? 'speedometer' : 'speedometer-outline',
            Departments: focused ? 'layers' : 'layers-outline',
            Users: focused ? 'people' : 'people-outline',
            Reports: focused ? 'document-text' : 'document-text-outline',
          };
          const iconName = icons[route.name] || 'ellipse-outline';
          return (
            <View style={{ position: 'relative', overflow: 'visible' }}>
              <Ionicons name={iconName} size={size} color={color} />
              {route.name === 'Reports' && unreadCount > 0 && (
                <View style={tabStyles.badge}>
                  <Text style={tabStyles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboard} />
      <Tab.Screen name="Departments" component={ManageDepartmentsScreen} />
      <Tab.Screen name="Users" component={ManagePeopleScreen} />
      <Tab.Screen name="Reports" component={ManageReportsScreen} />
      <Tab.Screen
        name="Menu"
        component={AdminDashboard}
        options={{
          tabBarLabel: 'Menu',
          tabBarIcon: ({ color, size }) => <Ionicons name="menu-outline" size={size} color={color} />,
          tabBarButton: () => (
            <TouchableOpacity
              style={tabStyles.menuTabBtn}
              onPress={() => navigation.openDrawer()}
              activeOpacity={0.7}
            >
              <Ionicons name="menu-outline" size={24} color={ADMIN_THEME.primary} />
              <Text style={[tabStyles.menuTabLabel, { color: ADMIN_THEME.primary }]}>Menu</Text>
            </TouchableOpacity>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const AdminDrawer = () => (
  <Drawer.Navigator
    drawerContent={(props) => <AdminDrawerContent {...props} />}
    screenOptions={{
      headerShown: false,
      drawerType: 'slide',
      overlayStyle: { backgroundColor: 'rgba(0,0,0,0.4)' },
      drawerStyle: { width: '78%' },
      swipeEnabled: true,
    }}
  >
    <Drawer.Screen name="AdminTabs" component={AdminTabs} />
  </Drawer.Navigator>
);

const NotAuthorized = () => {
  const { logout } = useAuth();
  return (
    <ScreenWrapper>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <Ionicons name="lock-closed-outline" size={64} color="#CBD5E0" />
        <Text style={{ fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8, color: ADMIN_THEME.textDark }}>Not Authorized</Text>
        <Text style={{ color: ADMIN_THEME.textMuted, marginBottom: 24, textAlign: 'center' }}>
          Your account does not have admin access.
        </Text>
        <CustomButton title="Logout" onPress={logout} variant="outline" />
      </View>
    </ScreenWrapper>
  );
};

const AdminNavigator = () => {
  const { userRole } = useAuth();

  if (userRole !== USER_ROLES.ADMIN) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="NotAuthorized" component={NotAuthorized} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: ADMIN_THEME.surface, elevation: 0, shadowOpacity: 0 },
        headerTintColor: ADMIN_THEME.primary,
        headerTitleStyle: { fontWeight: '700', color: ADMIN_THEME.textDark },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="AdminMain" component={AdminDrawer} options={{ headerShown: false }} />
      <Stack.Screen name="LocationDetails" component={LocationDetailsScreen} options={{ title: 'Location Details' }} />
      <Stack.Screen name="AddLocations" component={AddLocationsScreen} options={{ title: 'Add Locations', headerShown: true }} />
      <Stack.Screen name="ManageDining" component={ManageDiningScreen} options={{ title: 'Dining', headerShown: true }} />
      <Stack.Screen name="Notifications" component={ManageNotificationsScreen} options={{ title: 'Events & Notices', headerShown: true }} />
      <Stack.Screen name="AdminReportsStack" component={ManageReportsScreen} options={{ title: 'Reports', headerShown: true }} />
      <Stack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} options={{ title: 'Analytics', headerShown: true }} />
      <Stack.Screen name="ManageCampusRules" component={ManageCampusRulesScreen} options={{ title: 'Campus Rules', headerShown: true }} />
      <Stack.Screen name="ManageAmenities" component={ManageAmenitiesScreen} options={{ title: 'Amenities', headerShown: true }} />
      <Stack.Screen name="Buildings" component={ManageBuildingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ManageDepartments" component={ManageDepartmentsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EmergencyManagement" component={EmergencyManagementScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

export default AdminNavigator;

const drawerStyles = StyleSheet.create({
  header: {
    backgroundColor: ADMIN_THEME.primary,
    paddingBottom: 20,
    overflow: 'hidden',
  },
  goldBar: {
    height: 4,
    backgroundColor: ADMIN_THEME.accent,
  },
  headerContent: {
    padding: 20,
    paddingTop: 32,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: ADMIN_THEME.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: ADMIN_THEME.primary,
  },
  adminName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  adminEmail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 10,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  adminBadgeText: {
    fontSize: 11,
    color: ADMIN_THEME.accent,
    fontWeight: '700',
  },
  navSection: {
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 0.5,
  },
  navIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    marginTop: 8,
  },
  logoutLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#E53E3E',
  },
});

const tabStyles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  menuTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 2,
  },
  menuTabLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
});
