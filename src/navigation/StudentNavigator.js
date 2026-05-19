import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { HugeiconsIcon } from '@hugeicons/react-native';
import {
  Home01Icon,
  Location01Icon,
  FavouriteIcon,
  Notification01Icon,
} from '@hugeicons/core-free-icons';
import { USER_ROLES } from '../utils/constants';
import { CampusUpdatesContext } from '../context/CampusUpdatesContext';
import { useAuth } from '../context/AuthContext';
import { subscribeToUserNotificationReads } from '../services/databaseService';
import StudentSidebar from '../components/StudentSidebar';
import { COLORS, FONTS } from '../utils/theme';

import StudentHomeScreen from '../screens/student/StudentHomeScreen';
import ReportIssueScreen from '../screens/student/ReportIssueScreen';
import FavoritesScreen from '../screens/student/FavoritesScreen';
import NotificationsScreen from '../screens/student/NotificationsScreen';
import CampusEventsScreen from '../screens/student/CampusEventsScreen';
import DiningScreen from '../screens/student/DiningScreen';
import CampusRulesScreen from '../screens/student/CampusRulesScreen';
import SafetySupportScreen from '../screens/student/SafetySupportScreen';
import MapScreen from '../screens/common/MapScreen';
import LocationDetailsScreen from '../screens/common/LocationDetailsScreen';
import SearchLocationsScreen from '../screens/common/SearchLocationsScreen';
import QRScannerScreen from '../screens/common/QRScannerScreen';

const Stack   = createStackNavigator();
const Tab     = createBottomTabNavigator();
const Drawer  = createDrawerNavigator();

// ── Bottom Tabs (Home, Map, Favorites, Notifications) ────────────────────────

const StudentTabs = () => {
  const { notifications } = React.useContext(CampusUpdatesContext);
  const { user, userRole } = useAuth();
  const [readMap, setReadMap] = React.useState({});

  React.useEffect(() => {
    if (!user?.id) { setReadMap({}); return; }
    const unsub = subscribeToUserNotificationReads(user.id, (entries) => setReadMap(entries || {}));
    return () => { try { unsub?.(); } catch (_) {} };
  }, [user?.id]);

  const unreadCount = React.useMemo(() => {
    const staffRoles = [USER_ROLES.ADMIN, USER_ROLES.FACULTY];
    return notifications.reduce((count, item) => {
      const audience = (item.audience || 'everyone').toLowerCase();
      const recipientIds = Array.isArray(item.recipientIds)
        ? item.recipientIds.filter(Boolean)
        : item.recipientId ? [item.recipientId] : [];
      const isDirect = audience === 'direct' || recipientIds.length > 0;
      if (isDirect) {
        if (!user?.id || !recipientIds.includes(user.id)) return count;
        return readMap[item.id]?.readAt ? count : count + 1;
      }
      if (audience === 'staff' && !staffRoles.includes(userRole)) return count;
      return readMap[item.id]?.readAt ? count : count + 1;
    }, 0);
  }, [notifications, readMap, user?.id, userRole]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const iconProps = { size, color, variant: 'stroke' };
          if (route.name === 'TabHome')   return <HugeiconsIcon icon={Home01Icon} {...iconProps} />;
          if (route.name === 'TabMap')    return <HugeiconsIcon icon={Location01Icon} {...iconProps} />;
          if (route.name === 'TabFavs')   return <HugeiconsIcon icon={FavouriteIcon} {...iconProps} />;
          if (route.name === 'TabNotifs') {
            return (
              <View style={st.tabIconWrap}>
                <HugeiconsIcon icon={Notification01Icon} {...iconProps} />
                {unreadCount > 0 && (
                  <View style={st.tabBadge}>
                    <Text style={st.tabBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </View>
            );
          }
        },
        tabBarActiveTintColor: '#60A5FA',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarStyle: {
          backgroundColor: COLORS.primary,
          height: 62,
          paddingBottom: 10,
          paddingTop: 8,
          borderTopColor: 'rgba(255,255,255,0.1)',
          elevation: 10,
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: FONTS.semiBold, letterSpacing: 0.2 },
        headerShown: false,
      })}
    >
      <Tab.Screen name="TabHome"   component={StudentHomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen name="TabMap"    component={MapScreen}         options={{ title: 'Map' }} />
      <Tab.Screen name="TabFavs"   component={FavoritesScreen}   options={{ title: 'Favorites' }} />
      <Tab.Screen name="TabNotifs" component={NotificationsScreen} options={{ title: 'Notifications' }} />
    </Tab.Navigator>
  );
};

// ── Drawer (sidebar) ─────────────────────────────────────────────────────────

const StudentDrawer = () => (
  <Drawer.Navigator
    drawerContent={(props) => <StudentSidebar {...props} />}
    screenOptions={{
      headerShown: false,
      drawerType: 'slide',
      drawerStyle: { width: 280, backgroundColor: '#0F172A' },
      overlayColor: 'rgba(0,0,0,0.5)',
      swipeEdgeWidth: 40,
    }}
  >
    <Drawer.Screen name="HomeTabs"        component={StudentTabs}        options={{ title: 'Home' }} />
    <Drawer.Screen name="DrawerMap"       component={MapScreen}          options={{ title: 'Campus Map' }} />
    <Drawer.Screen name="DrawerNotifs"    component={NotificationsScreen} options={{ title: 'Notifications' }} />
    <Drawer.Screen name="DrawerFavs"      component={FavoritesScreen}    options={{ title: 'Favorites' }} />
    <Drawer.Screen name="DrawerEvents"    component={CampusEventsScreen} options={{ title: 'Events' }} />
    <Drawer.Screen name="DrawerDining"    component={DiningScreen}       options={{ title: 'Dining' }} />
    <Drawer.Screen name="DrawerRules"     component={CampusRulesScreen}  options={{ title: 'Campus Rules' }} />
    <Drawer.Screen name="DrawerSafety"    component={SafetySupportScreen} options={{ title: 'Safety & Support' }} />
    <Drawer.Screen name="DrawerQR"        component={QRScannerScreen}    options={{ title: 'Scan QR' }} />
    <Drawer.Screen name="DrawerReport"    component={ReportIssueScreen}  options={{ title: 'Report Issue' }} />
  </Drawer.Navigator>
);

// ── Root stack (drawer + modal screens) ──────────────────────────────────────

const StudentNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: { backgroundColor: COLORS.white, elevation: 0, shadowOpacity: 0 },
      headerTintColor: COLORS.textPrimary,
      headerTitleStyle: { fontWeight: '600' },
      headerBackTitleVisible: false,
    }}
  >
    <Stack.Screen name="StudentDrawer"   component={StudentDrawer}          options={{ headerShown: false }} />
    <Stack.Screen name="Search"          component={SearchLocationsScreen}  options={{ title: 'Search Locations', headerShown: true }} />
    <Stack.Screen name="LocationDetails" component={LocationDetailsScreen}  options={{ title: 'Location Details' }} />
  </Stack.Navigator>
);

export default StudentNavigator;

const st = StyleSheet.create({
  tabIconWrap: { position: 'relative', overflow: 'visible' },
  tabBadge: {
    position: 'absolute', top: -6, right: -10,
    minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5,
    backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#1A365D',
  },
  tabBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
});
