const { getDefaultConfig } = require('expo/metro-config');

/**
 * Use Expo's default Metro configuration for all platforms.
 *
 * Expo already handles web vs native resolution (including react-native-web),
 * and using custom resolver aliases here can break the native bundle when
 * running in Expo Go (e.g., requireNativeModule errors).
 */
const config = getDefaultConfig(__dirname);

module.exports = config;
