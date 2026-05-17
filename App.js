import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { CampusUpdatesProvider } from './src/context/CampusUpdatesContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CampusUpdatesProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </CampusUpdatesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}