import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, USER_ROLES } from '../utils/constants';
import { CampusUpdatesContext } from '../context/CampusUpdatesContext';
import { useAuth } from '../context/AuthContext';
import { subscribeToUserNotificationReads } from '../services/databaseService';

import StudentHomeScreen from '../screens/student/StudentHomeScreen';
import FavoritesScreen from '../screens/student/FavoritesScreen';
import NotificationsScreen from '../screens/student/NotificationsScreen';
import CampusEventsScreen from '../screens/student/CampusEventsScreen';
import DiningScreen from '../screens/student/DiningScreen';
import AmenitiesScreen from '../screens/student/AmenitiesScreen';
import CampusRulesScreen from '../screens/student/CampusRulesScreen';
import SafetySupportScreen from '../screens/student/SafetySupportScreen';
import MapScreen from '../screens/common/MapScreen';
import LocationDetailsScreen from '../screens/common/LocationDetailsScreen';
import SearchLocationsScreen from '../screens/common/SearchLocationsScreen';
import QRScannerScreen from '../screens/common/QRScannerScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const StudentTabs = () => {
  const { notifications } = React.useContext(CampusUpdatesContext);
  const { user, userRole } = useAuth();
  const [readMap, setReadMap] = React.useState({});

  React.useEffect(() => {
    if (!user?.uid) {
      setReadMap({});
      return undefined;
    }

    const unsubscribe = subscribeToUserNotificationReads(user.uid, (entries) => {
      setReadMap(entries || {});
    });

    return () => {
      try {
        unsubscribe?.();
      } catch (error) {
        // ignore
      }
    };
  }, [user?.uid]);

  const unreadCount = React.useMemo(() => {
    const userId = user?.uid;
    const staffRoles = [USER_ROLES.ADMIN, USER_ROLES.FACULTY];

    return notifications.reduce((count, item) => {
      const audience = (item.audience || 'everyone').toString().toLowerCase();
      const recipientIds = Array.isArray(item.recipientIds)
        ? item.recipientIds.filter(Boolean)
        : item.recipientId
          ? [item.recipientId]
          : [];
      const isDirect = audience === 'direct' || recipientIds.length > 0;

      if (isDirect) {
        if (!userId || !recipientIds.includes(userId)) {
          return count;
        }
        return readMap[item.id]?.readAt ? count : count + 1;
      }

      if (audience === 'staff' && !staffRoles.includes(userRole)) {
        return count;
      }

      return readMap[item.id]?.readAt ? count : count + 1;
    }, 0);
  }, [notifications, readMap, user?.uid, userRole]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          if (route.name === 'Map') iconName = focused ? 'map' : 'map-outline';
          if (route.name === 'Favorites') iconName = focused ? 'heart' : 'heart-outline';
          if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';

          return (
            <View style={styles.tabIconWrap}>
              <Ionicons name={iconName} size={size} color={color} />
              {route.name === 'Notifications' && unreadCount > 0 ? (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              ) : null}
            </View>
          );
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: COLORS.white,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          borderTopColor: '#E2E8F0',
          elevation: 8,
          shadowColor: '#0F172A',
          shadowOpacity: 0.08,
          shadowRadius: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={StudentHomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
    </Tab.Navigator>
  );
};

const StudentNavigator = () => (
  <Stack.Navigator
    screenOptions={{ 
      headerStyle: { backgroundColor: COLORS.white, elevation: 0, shadowOpacity: 0 }, 
      headerTintColor: COLORS.dark, 
      headerTitleStyle: { fontWeight: '600' },
      headerBackTitleVisible: false,
    }}
  >
    <Stack.Screen name="StudentTabs" component={StudentTabs} options={{ headerShown: false }} />
    <Stack.Screen name="Search" component={SearchLocationsScreen} options={{ title: 'Search Locations', headerShown: true }} />
    <Stack.Screen name="LocationDetails" component={LocationDetailsScreen} options={{ title: 'Location Details' }} />
    <Stack.Screen name="CampusEvents" component={CampusEventsScreen} options={{ title: 'Campus Events', headerShown: true }} />
    <Stack.Screen name="Dining" component={DiningScreen} options={{ title: 'Dining', headerShown: true }} />
    <Stack.Screen name="Amenities" component={AmenitiesScreen} options={{ title: 'Campus Amenities', headerShown: true }} />
    <Stack.Screen name="CampusRules" component={CampusRulesScreen} options={{ title: 'Campus Rules', headerShown: true }} />
    <Stack.Screen name="SafetySupport" component={SafetySupportScreen} options={{ title: 'Safety & Support', headerShown: true }} />
    <Stack.Screen name="QRScanner" component={QRScannerScreen} options={{ title: 'Scan QR Code', headerShown: false }} />
  </Stack.Navigator>
);

export default StudentNavigator;

const styles = StyleSheet.create({
  tabIconWrap: {
    position: 'relative',
    overflow: 'visible',
  },
  tabBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
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
  tabBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
});
