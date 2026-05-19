import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES } from '../utils/constants';

const NAVY = '#1A365D';
const GOLD = '#C5A047';

// Import navigators
import AuthNavigator    from './AuthNavigator';
import GuestNavigator   from './GuestNavigator';
import StudentNavigator from './StudentNavigator';
import StaffNavigator   from './StaffNavigator';
import AdminNavigator   from './AdminNavigator';

const Stack = createStackNavigator();

const RootNavigator = () => {
  const { user, userRole, authLoading } = useAuth();
  console.log('RootNavigator', { authLoading, user: user?.id, userRole });

  if (authLoading) {
    return (
      <View style={splash.container}>
        <View style={splash.card}>
          <Text style={splash.title}>RMU Campus</Text>
          <Text style={splash.sub}>Regional Maritime University</Text>
          <ActivityIndicator size="large" color={GOLD} style={{ marginTop: 28 }} />
        </View>
      </View>
    );
  }

  const navKey = user ? `${user.id}:${userRole}` : 'auth';

  return (
    <NavigationContainer key={navKey}>
      <Stack.Navigator
        key={navKey}
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          cardStyleInterpolator: ({ current, next, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      >
        {!user ? (
          // Not authenticated - show Auth stack
          <Stack.Screen 
            name="Auth" 
            component={AuthNavigator}
            options={{
              animationTypeForReplace: user ? 'pop' : 'push',
            }}
          />
        ) : userRole === USER_ROLES.ADMIN ? (
          // Admin user
          <Stack.Screen 
            name="AdminMain" 
            component={AdminNavigator}
            options={{
              animationTypeForReplace: 'push',
            }}
          />
        ) : userRole === USER_ROLES.FACULTY ? (
          // Staff / Faculty user — dedicated staff dashboard
          <Stack.Screen
            name="StaffMain"
            component={StaffNavigator}
            options={{ animationTypeForReplace: 'push' }}
          />
        ) : userRole === USER_ROLES.STUDENT ? (
          // Student user
          <Stack.Screen
            name="StudentMain"
            component={StudentNavigator}
            options={{
              animationTypeForReplace: 'push',
            }}
          />
        ) : (
          // Guest user (authenticated but with guest role)
          <Stack.Screen 
            name="GuestMain" 
            component={GuestNavigator}
            options={{
              animationTypeForReplace: 'push',
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;

const splash = StyleSheet.create({
  container: { flex: 1, backgroundColor: NAVY, justifyContent: 'center', alignItems: 'center' },
  card:      { alignItems: 'center' },
  title:     { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  sub:       { fontSize: 13, color: GOLD, fontWeight: '600', marginTop: 6, letterSpacing: 0.3 },
});