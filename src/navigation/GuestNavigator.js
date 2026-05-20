import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import GuestHomeScreen from '../screens/guest/GuestHomeScreen';
import MapScreen from '../screens/common/MapScreen';
import LocationDetailsScreen from '../screens/common/LocationDetailsScreen';
import SearchLocationsScreen from '../screens/common/SearchLocationsScreen';
import FavoritesScreen from '../screens/student/FavoritesScreen';
import QRScannerScreen from '../screens/common/QRScannerScreen';
import { COLORS } from '../utils/constants';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const GuestTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Search') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Favorites') {
            iconName = focused ? 'heart' : 'heart-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor:   '#1A365D',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E2E8F0',
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 10,
          paddingTop: 8,
          shadowColor: '#0A1628',
          shadowOpacity: 0.06,
          shadowRadius: 10,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.2,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={GuestHomeScreen}
        options={{ title: 'Home' }}
      />
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{ title: 'Map' }}
      />
      <Tab.Screen 
        name="Search" 
        component={SearchLocationsScreen}
        options={{ title: 'Search' }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{ title: 'Favorites' }}
      />
    </Tab.Navigator>
  );
};

const GuestNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.white,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: COLORS.dark,
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen 
        name="GuestTabs" 
        component={GuestTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="LocationDetails" 
        component={LocationDetailsScreen}
        options={{ title: 'Location Details' }}
      />
      <Stack.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{ title: 'Scan QR Code', headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default GuestNavigator;