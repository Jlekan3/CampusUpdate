import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_THEME, USER_ROLES } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

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
import ManageEmergencyContactsScreen from '../screens/admin/ManageEmergencyContactsScreen';

// Merged screens
import CampusStructureScreen from '../screens/admin/CampusStructureScreen';
import CampusContentScreen from '../screens/admin/CampusContentScreen';
import ControlCentreScreen from '../screens/admin/ControlCentreScreen';
import ReportsAnalyticsScreen from '../screens/admin/ReportsAnalyticsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();

const DRAWER_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard',    icon: 'speedometer-outline', route: 'Dashboard',    color: ADMIN_THEME.primary },
      { label: 'Manage Users', icon: 'people-outline',      route: 'ManageUsers',  color: '#7C3AED' },
    ],
  },
  {
    title: 'Campus Management',
    items: [
      { label: 'Campus Structure', icon: 'business-outline',  route: 'CampusStructure', color: '#0891B2' },
      { label: 'Campus Content',   icon: 'calendar-outline',  route: 'CampusContent',   color: '#059669' },
    ],
  },
  {
    title: 'Reports & Control',
    items: [
      { label: 'Issues & Analytics', icon: 'bar-chart-outline', route: 'ReportsAnalytics', color: '#D97706' },
      { label: 'Control Centre',     icon: 'shield-outline',     route: 'ControlCentre',    color: '#DC2626' },
    ],
  },
];

const AdminDrawerContent = (props) => {
  const { logout, user } = useAuth();

  const TAB_SCREENS = new Set(['Dashboard', 'ManageUsers']);

  const navigate = (route) => {
    props.navigation.closeDrawer();
    if (TAB_SCREENS.has(route)) {
      props.navigation.navigate('AdminTabs', { screen: route });
    } else {
      props.navigation.navigate(route);
    }
  };

  const initials = (user?.displayName || user?.email || 'A')
    .split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <DrawerContentScrollView
      {...props}
      style={drawerStyles.root}
      contentContainerStyle={{ paddingTop: 0, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile header ── */}
      <View style={drawerStyles.header}>
        {/* Decorative orb */}
        <View style={drawerStyles.headerOrb} />

        <View style={drawerStyles.avatar}>
          <Text style={drawerStyles.avatarText}>{initials}</Text>
        </View>

        <Text style={drawerStyles.adminName} numberOfLines={1}>
          {user?.displayName || user?.user_metadata?.full_name || 'Administrator'}
        </Text>
        <Text style={drawerStyles.adminEmail} numberOfLines={1}>{user?.email || ''}</Text>

        <View style={drawerStyles.adminBadge}>
          <Ionicons name="shield-checkmark-outline" size={11} color="#60A5FA" />
          <Text style={drawerStyles.adminBadgeText}>Administrator</Text>
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={drawerStyles.divider} />

      {/* ── Grouped nav items ── */}
      {DRAWER_SECTIONS.map((section) => (
        <View key={section.title} style={drawerStyles.section}>
          <Text style={drawerStyles.sectionTitle}>{section.title.toUpperCase()}</Text>
          {section.items.map((item) => (
            <TouchableOpacity
              key={item.route}
              style={drawerStyles.navItem}
              onPress={() => navigate(item.route)}
              activeOpacity={0.75}
            >
              <View style={[drawerStyles.navIconWrap, { backgroundColor: item.color + '18' }]}>
                <Ionicons name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={drawerStyles.navLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward-outline" size={15} color="rgba(255,255,255,0.25)" />
            </TouchableOpacity>
          ))}
        </View>
      ))}

      {/* ── Divider ── */}
      <View style={drawerStyles.divider} />

      {/* ── Sign out ── */}
      <TouchableOpacity
        style={drawerStyles.logoutBtn}
        onPress={() => {
          props.navigation.closeDrawer();
          logout();
        }}
        activeOpacity={0.75}
      >
        <View style={[drawerStyles.navIconWrap, { backgroundColor: '#EF444418' }]}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
        </View>
        <Text style={drawerStyles.logoutLabel}>Sign Out</Text>
      </TouchableOpacity>
    </DrawerContentScrollView>
  );
};

const AdminTabs = ({ navigation }) => {
  const { colors } = useTheme();

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
            Dashboard:    focused ? 'speedometer'  : 'speedometer-outline',
            ManageUsers:  focused ? 'people'       : 'people-outline',
          };
          const iconName = icons[route.name] || 'ellipse-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard"   component={AdminDashboard} />
      <Tab.Screen name="ManageUsers" component={ManagePeopleScreen} options={{ tabBarLabel: 'Users' }} />
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
      drawerStyle: { width: '78%', backgroundColor: '#0F1C2E' },
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
      <Stack.Screen name="AdminMain"        component={AdminDrawer}            options={{ headerShown: false }} />
      <Stack.Screen name="CampusStructure"  component={CampusStructureScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="CampusContent"    component={CampusContentScreen}    options={{ headerShown: false }} />
      <Stack.Screen name="ControlCentre"    component={ControlCentreScreen}    options={{ headerShown: false }} />
      <Stack.Screen name="ReportsAnalytics"    component={ReportsAnalyticsScreen}         options={{ headerShown: false }} />
      <Stack.Screen name="EmergencyContacts"   component={ManageEmergencyContactsScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="ManageCampusRules"   component={ManageCampusRulesScreen}        options={{ headerShown: false }} />
      <Stack.Screen name="LocationDetails"     component={LocationDetailsScreen}          options={{ title: 'Location Details' }} />
    </Stack.Navigator>
  );
};

export default AdminNavigator;

const drawerStyles = StyleSheet.create({
  root: {
    backgroundColor: '#0F1C2E',   // deep navy — consistent with primary brand
  },

  // ── Profile header ──────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  headerOrb: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(96,165,250,0.08)',
    top: -60,
    right: -60,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: ADMIN_THEME.primary,
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  adminName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  adminEmail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(96,165,250,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.3)',
  },
  adminBadgeText: {
    fontSize: 11,
    color: '#60A5FA',
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Divider ─────────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginHorizontal: 16,
    marginVertical: 8,
  },

  // ── Nav sections ─────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 1.2,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 12,
    marginBottom: 2,
  },
  navIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },

  // ── Sign out ─────────────────────────────────────────────────────────────────
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 12,
    gap: 12,
  },
  logoutLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
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
