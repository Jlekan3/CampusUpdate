import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, USER_ROLES } from '../utils/constants';
import { useAuth } from '../context/AuthContext';
import { subscribeToIssueReports } from '../services/databaseService';

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
import LocationDetailsScreen from '../screens/common/LocationDetailsScreen';
import ScreenWrapper from '../components/ScreenWrapper';
import CustomButton from '../components/CustomButton';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const AdminTabs = () => {
  const [reports, setReports] = React.useState([]);

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
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Dashboard') iconName = focused ? 'speedometer' : 'speedometer-outline';
          if (route.name === 'Buildings') iconName = focused ? 'business' : 'business-outline';
          if (route.name === 'People') iconName = focused ? 'people' : 'people-outline';
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
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: { backgroundColor: COLORS.white, height: 60, paddingBottom: 8, paddingTop: 8, borderTopColor: '#E5E7EB' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={AdminDashboard} />
      <Tab.Screen name="Buildings" component={ManageBuildingsScreen} />
      <Tab.Screen name="People" component={ManagePeopleScreen} />
      <Tab.Screen name="Notifications" component={ManageNotificationsScreen} />
    </Tab.Navigator>
  );
};

const NotAuthorized = ({ navigation }) => {
  const { logout } = useAuth();
  return (
    <ScreenWrapper>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 8, color: COLORS.dark }}>Not authorized</Text>
        <Text style={{ color: COLORS.muted, marginBottom: 20, textAlign: 'center' }}>Your account does not have permission to access admin features.</Text>
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
        headerStyle: { backgroundColor: COLORS.white, elevation: 0, shadowOpacity: 0 },
        headerTintColor: COLORS.dark,
        headerTitleStyle: { fontWeight: '600' },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false }} />
      <Stack.Screen name="LocationDetails" component={LocationDetailsScreen} options={{ title: 'Location Details' }} />
      <Stack.Screen name="ManagePeople" component={ManagePeopleScreen} options={{ title: 'Manage People', headerShown: true }} />
      <Stack.Screen name="AddLocations" component={AddLocationsScreen} options={{ title: 'Add Locations', headerShown: true }} />
      <Stack.Screen name="ManageDining" component={ManageDiningScreen} options={{ title: 'Dining', headerShown: true }} />
      <Stack.Screen name="Reports" component={ManageReportsScreen} options={{ title: 'Reports', headerShown: true }} />
      <Stack.Screen name="AdminAnalytics" component={AdminAnalyticsScreen} options={{ title: 'Analytics Overview', headerShown: true }} />
      <Stack.Screen name="ManageCampusRules" component={ManageCampusRulesScreen} options={{ title: 'Manage Campus Rules', headerShown: true }} />
      <Stack.Screen name="ManageAmenities" component={ManageAmenitiesScreen} options={{ title: 'Manage Amenities', headerShown: true }} />
    </Stack.Navigator>
  );
};

export default AdminNavigator; 

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
