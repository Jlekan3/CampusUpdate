import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../utils/constants';

const QRScannerScreen = ({ navigation }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const navigateToMap = (params) => {
    const state = navigation.getState?.();
    const routeNames = state?.routeNames || [];

    if (routeNames.includes('StudentTabs')) {
      navigation.navigate('StudentTabs', { screen: 'Map', params });
      return;
    }

    if (routeNames.includes('GuestTabs')) {
      navigation.navigate('GuestTabs', { screen: 'Map', params });
      return;
    }

    navigation.navigate('Map', params);
  };

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);

    // Payloads: "location:<id>" or "geo:<lat>,<lng>"
    try {
      if (typeof data === 'string' && data.startsWith('location:')) {
        const id = data.split(':')[1];
        navigation.navigate('LocationDetails', { id });
        return;
      }

      if (typeof data === 'string' && data.startsWith('geo:')) {
        const [lat, lng] = data.replace('geo:', '').split(',');
        const coords = { latitude: Number(lat), longitude: Number(lng) };
        navigateToMap({ coords });
        return;
      }

      // Fallback: show scanned text
      Alert.alert('QR Scanned', data || 'No data', [
        { text: 'OK', onPress: () => setScanned(false) }
      ]);
    } catch (e) {
      Alert.alert('Scan error', 'Unable to parse QR code', [
        { text: 'OK', onPress: () => setScanned(false) }
      ]);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fullScreenContainer}>
        <Ionicons name="qr-code-outline" size={72} color={COLORS.white} />
        <Text style={styles.statusText}>QR scanning is available on mobile devices only.</Text>
        <Text style={styles.webNote}>Open this screen in Expo Go on Android or iPhone.</Text>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.fullScreenContainer}>
        <Text style={styles.statusText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.fullScreenContainer}>
        <Text style={styles.statusText}>Camera permission is required to scan QR codes.</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.permissionButton} activeOpacity={0.85}>
          <Text style={styles.permissionLink}>Grant permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.title}>QR Scanner</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['qr'],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />

        <View style={styles.overlayTop} />
        <View style={styles.centerBox}>
          <View style={styles.qrFrame} />
        </View>
        <View style={styles.overlayBottom}>
          <Text style={styles.instructionTitle}>Point your camera at a campus QR code</Text>
          {scanned ? (
            <TouchableOpacity style={styles.retry} onPress={() => setScanned(false)}>
              <Text style={{ color: COLORS.white }}>Tap to scan again</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.note}>Scanning...</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'black' },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: 'black',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusText: {
    color: COLORS.white,
    textAlign: 'center',
    fontSize: 16,
  },
  permissionLink: {
    color: COLORS.primary,
    marginTop: 12,
    fontSize: 15,
  },
  permissionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: { padding: 8 },
  title: { fontSize: 18, fontWeight: '600', color: COLORS.dark },
  placeholder: { width: 40 },
  scannerContainer: { flex: 1, backgroundColor: 'black', overflow: 'hidden' },
  overlayTop: { height: 100, backgroundColor: 'rgba(0,0,0,0.5)' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  qrFrame: {
    width: 260,
    height: 260,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.white,
    backgroundColor: 'transparent',
  },
  overlayBottom: { height: 140, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', paddingTop: 16 },
  instructionTitle: { color: COLORS.white, fontSize: 16, fontWeight: '600', marginBottom: 8 },
  note: { color: COLORS.white },
  webNote: { color: 'rgba(255,255,255,0.8)', marginTop: 6, textAlign: 'center' },
  retry: { marginTop: 8, backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
});

export default QRScannerScreen;