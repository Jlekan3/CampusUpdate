import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import EmailSentScreen from '../screens/auth/EmailSentScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

const Stack = createStackNavigator();

const AuthNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      cardStyle: { backgroundColor: '#1A365D' },
      gestureEnabled: true,
      animationEnabled: true,
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="EmailSent" component={EmailSentScreen} />
    <Stack.Screen name="ForgotPassword"    component={ForgotPasswordScreen} />
    <Stack.Screen name="OTPVerification"   component={OTPVerificationScreen} />
    <Stack.Screen name="ResetPassword"     component={ResetPasswordScreen} />
  </Stack.Navigator>
);

export default AuthNavigator;
