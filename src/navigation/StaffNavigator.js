import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { CampusUpdatesContext } from '../context/CampusUpdatesContext';
import { subscribeToUserNotificationReads } from '../services/databaseService';

// Screens
import StaffHomeScreen     from '../screens/staff/StaffHomeScreen';
import MapScreen           from '../screens/common/MapScreen';
import NotificationsScreen from '../screens/student/NotificationsScreen';
import CampusEventsScreen  from '../screens/student/CampusEventsScreen';
import SafetySupportScreen from '../screens/student/SafetySupportScreen';
import SearchLocationsScreen from '../screens/common/SearchLocationsScreen';
import LocationDetailsScreen from '../screens/common/LocationDetailsScreen';
import QRScannerScreen     from '../screens/common/QRScannerScreen';
import FavoritesScreen     from '../screens/student/FavoritesScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Palette (matches StaffHomeScreen) ────────────────────────────────────────
const NAVY = '#1A365D';
const GOLD = '#C5A047';

const StaffTabs = () => {
  const { notifications } = React.useContext(CampusUpdatesContext);
  const { user } = useAuth();
  const [readMap, setReadMap] = React.useState({});

  React.useEffect(() => {
    if (!user?.id) { setReadMap({}); return; }
    const unsub = subscribeToUserNotificationReads(user.id, (e) => setReadMap(e || {}));
    return () => { try { unsub?.(); } catch (_) {} };
  }, [user?.id]);

  const unreadCount = React.useMemo(
    () => notifications.reduce((n, item) => (readMap[item.id]?.readAt ? n : n + 1), 0),
    [notifications, readMap]
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   GOLD,
        tabBarInactiveTintColor: 'rgba(255,255,255,0.42)',
        tabBarStyle: {
          backgroundColor: NAVY,
          height: 62,
          paddingBottom: 10,
          paddingTop: 8,
          borderTopColor: `${GOLD}38`,
          elevation: 12,
          shadowColor: '#060F1E',
          shadowOpacity: 0.24,
          shadowRadius: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home:          focused ? 'home'          : 'home-outline',
            Map:           focused ? 'map'           : 'map-outline',
            Notifications: focused ? 'notifications' : 'notifications-outline',
            Favorites:     focused ? 'heart'         : 'heart-outline',
          };
          const name = icons[route.name] || 'ellipse-outline';
          return (
            <View style={tabStyles.iconWrap}>
              <Ionicons name={name} size={size} color={color} />
              {route.name === 'Notifications' && unreadCount > 0 && (
                <View style={tabStyles.badge}>
                  <Text style={tabStyles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Home"          component={StaffHomeScreen}     options={{ title: 'Home'          }} />
      <Tab.Screen name="Map"           component={MapScreen}           options={{ title: 'Map'           }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Alerts'        }} />
      <Tab.Screen name="Favorites"     component={FavoritesScreen}     options={{ title: 'Saved'         }} />
    </Tab.Navigator>
  );
};

const StaffNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle:      { backgroundColor: '#FFFFFF', elevation: 0, shadowOpacity: 0 },
      headerTintColor:  NAVY,
      headerTitleStyle: { fontWeight: '700', color: '#2D3748' },
      headerBackTitleVisible: false,
    }}
  >
    <Stack.Screen name="StaffTabs"      component={StaffTabs}            options={{ headerShown: false }} />
    <Stack.Screen name="Map"            component={MapScreen}            options={{ headerShown: false }} />
    <Stack.Screen name="Search"         component={SearchLocationsScreen} options={{ title: 'Search Locations', headerShown: true }} />
    <Stack.Screen name="LocationDetails"component={LocationDetailsScreen} options={{ title: 'Location Details' }} />
    <Stack.Screen name="CampusEvents"   component={CampusEventsScreen}   options={{ title: 'Campus Events',   headerShown: true }} />
    <Stack.Screen name="SafetySupport"  component={SafetySupportScreen}  options={{ title: 'Safety & Support',headerShown: true }} />
    <Stack.Screen name="QRScanner"      component={QRScannerScreen}      options={{ title: 'Scan QR Code',    headerShown: false }} />
    <Stack.Screen name="ReportsTab"     component={NotificationsScreen}  options={{ title: 'Notifications',   headerShown: true }} />
  </Stack.Navigator>
);

export default StaffNavigator;

const tabStyles = StyleSheet.create({
  iconWrap: { position: 'relative', overflow: 'visible' },
  badge: {
    position: 'absolute',
    top: -6, right: -10,
    minWidth: 18, height: 18,
    borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: '#E53E3E',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: NAVY,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
