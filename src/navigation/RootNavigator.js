import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { USER_ROLES, COLORS } from '../utils/constants';

// Import navigators
import AuthNavigator              from './AuthNavigator';
import GuestNavigator             from './GuestNavigator';
import StudentNavigator           from './StudentNavigator';
import StaffNavigator             from './StaffNavigator';
import AdminNavigator             from './AdminNavigator';
import ForceChangePasswordScreen  from '../screens/auth/ForceChangePasswordScreen';

const Stack = createStackNavigator();

const RootNavigator = () => {
  const { user, userRole, authLoading, mustChangePassword } = useAuth();
  console.log('RootNavigator', { authLoading, user: user?.id, userRole });

  if (authLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: COLORS.white 
      }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
        ) : mustChangePassword ? (
          // Admin-created account: user must change temp password before proceeding
          <Stack.Screen
            name="ForceChangePassword"
            component={ForceChangePasswordScreen}
            options={{ animationTypeForReplace: 'push' }}
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
        ) : userRole === USER_ROLES.STAFF || userRole === USER_ROLES.FACULTY ? (
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