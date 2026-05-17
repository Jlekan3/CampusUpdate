import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import CustomButton from '../../components/CustomButton';
import { COLORS } from '../../utils/constants';

const FLAG_ITEMS = [
  'Cameroon',
  'The Gambia',
  'Ghana',
  'Liberia',
  'Sierra Leone',
  'Regional Maritime University',
];

const SMALL_BUBBLES = [
  { country: 'Cameroon', style: { top: 24, left: 22, transform: [{ scale: 0.34 }, { rotate: '-12deg' }] } },
  { country: 'The Gambia', style: { top: 86, left: 110, transform: [{ scale: 0.28 }, { rotate: '8deg' }] } },
  { country: 'Ghana', style: { top: 164, left: 34, transform: [{ scale: 0.30 }, { rotate: '16deg' }] } },
  { country: 'Liberia', style: { top: 236, left: 126, transform: [{ scale: 0.26 }, { rotate: '-10deg' }] } },
  { country: 'Sierra Leone', style: { top: 322, left: 28, transform: [{ scale: 0.32 }, { rotate: '10deg' }] } },
  { country: 'Cameroon', style: { top: 424, left: 128, transform: [{ scale: 0.24 }, { rotate: '-8deg' }] } },
  { country: 'The Gambia', style: { top: 540, left: 24, transform: [{ scale: 0.28 }, { rotate: '12deg' }] } },
  { country: 'Ghana', style: { top: 632, left: 118, transform: [{ scale: 0.22 }, { rotate: '-14deg' }] } },
  { country: 'Liberia', style: { top: 742, left: 40, transform: [{ scale: 0.30 }, { rotate: '7deg' }] } },
  { country: 'Sierra Leone', style: { top: 846, left: 126, transform: [{ scale: 0.25 }, { rotate: '-6deg' }] } },
  { country: 'Cameroon', style: { top: 58, right: 20, transform: [{ scale: 0.24 }, { rotate: '10deg' }] } },
  { country: 'The Gambia', style: { top: 150, right: 114, transform: [{ scale: 0.30 }, { rotate: '-12deg' }] } },
  { country: 'Ghana', style: { top: 248, right: 26, transform: [{ scale: 0.27 }, { rotate: '8deg' }] } },
  { country: 'Liberia', style: { top: 350, right: 104, transform: [{ scale: 0.22 }, { rotate: '-10deg' }] } },
  { country: 'Sierra Leone', style: { top: 454, right: 34, transform: [{ scale: 0.29 }, { rotate: '14deg' }] } },
  { country: 'Cameroon', style: { top: 566, right: 120, transform: [{ scale: 0.23 }, { rotate: '-8deg' }] } },
  { country: 'The Gambia', style: { top: 674, right: 18, transform: [{ scale: 0.26 }, { rotate: '6deg' }] } },
  { country: 'Ghana', style: { top: 786, right: 110, transform: [{ scale: 0.21 }, { rotate: '-16deg' }] } },
  { country: 'Liberia', style: { top: 902, right: 28, transform: [{ scale: 0.25 }, { rotate: '9deg' }] } },
  { country: 'Sierra Leone', style: { top: 1018, right: 118, transform: [{ scale: 0.20 }, { rotate: '-7deg' }] } },
  { country: 'Regional Maritime University', style: { top: 908, left: 128, transform: [{ scale: 0.24 }, { rotate: '7deg' }] } },
];

const FlagTile = ({ country }) => {
  if (country === 'Cameroon') {
    return (
      <View style={styles.flagCard}>
        <View style={styles.cameroonRow}>
          <View style={[styles.flagStripe, { backgroundColor: '#007A33' }]} />
          <View style={[styles.flagStripe, { backgroundColor: '#CE1126', alignItems: 'center', justifyContent: 'center' }]}>
            <View style={styles.starCameroon} />
          </View>
          <View style={[styles.flagStripe, { backgroundColor: '#FCD116' }]} />
        </View>
      </View>
    );
  }

  if (country === 'The Gambia') {
    return (
      <View style={styles.flagCard}>
        <View style={styles.gambiaFlag}>
          <View style={[styles.gambiaBand, { backgroundColor: '#CE1126' }]} />
          <View style={styles.gambiaWhiteLine} />
          <View style={[styles.gambiaBand, { backgroundColor: '#0038A8' }]} />
          <View style={styles.gambiaWhiteLine} />
          <View style={[styles.gambiaBand, { backgroundColor: '#007A33' }]} />
        </View>
      </View>
    );
  }

  if (country === 'Ghana') {
    return (
      <View style={styles.flagCard}>
        <View style={styles.ghanaFlag}>
          <View style={[styles.horizontalStripe, { backgroundColor: '#CE1126' }]} />
          <View style={[styles.horizontalStripe, { backgroundColor: '#FCD116', alignItems: 'center', justifyContent: 'center' }]}>
            <View style={styles.starGhana} />
          </View>
          <View style={[styles.horizontalStripe, { backgroundColor: '#007A33' }]} />
        </View>
      </View>
    );
  }

  if (country === 'Liberia') {
    return (
      <View style={styles.flagCard}>
        <View style={styles.liberiaFlag}>
          <View style={styles.liberiaCanton}>
            <View style={styles.starLiberia} />
          </View>
          <View style={styles.liberiaStripes}>
            {Array.from({ length: 11 }).map((_, index) => (
              <View
                key={`liberia-${index}`}
                style={[
                  styles.liberiaStripe,
                  { backgroundColor: index % 2 === 0 ? '#CE1126' : '#FFFFFF' },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  if (country === 'Regional Maritime University') {
    return (
      <View style={styles.flagCard}>
        <View style={styles.rmuFlag}>
          <View style={[styles.rmuBand, { backgroundColor: '#0F4C81' }]} />
          <View style={[styles.rmuBand, { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }]}>
            <View style={styles.rmuEmblemOuter}>
              <View style={styles.rmuEmblemInner}>
                <Text style={styles.rmuText}>RMU</Text>
              </View>
            </View>
          </View>
          <View style={[styles.rmuBand, { backgroundColor: '#0F4C81' }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flagCard}>
      <View style={styles.sierraLeoneFlag}>
        <View style={[styles.horizontalStripe, { backgroundColor: '#1EB53A' }]} />
        <View style={[styles.horizontalStripe, { backgroundColor: '#FFFFFF' }]} />
        <View style={[styles.horizontalStripe, { backgroundColor: '#0072C6' }]} />
      </View>
    </View>
  );
};

const RibbonLine = ({ style, colors }) => (
  <View style={[styles.ribbonLine, style]}>
    {colors.map((color, index) => (
      <View key={`${color}-${index}`} style={[styles.ribbonSegment, { backgroundColor: color }]} />
    ))}
  </View>
);

const SmallFlagBubble = ({ country, style }) => (
  <View style={[styles.smallBubble, style]}>
    <View style={styles.smallBubbleInner}>
      <FlagTile country={country} />
    </View>
  </View>
);

export default function LoginScreen() {
  const { login, loading, enterGuestMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const emailInputStyle = useMemo(
    () => [styles.input, emailFocused && styles.inputFocused],
    [emailFocused]
  );

  const passwordInputStyle = useMemo(
    () => [styles.input, passwordFocused && styles.inputFocused],
    [passwordFocused]
  );

  const handleLogin = async () => {
    setError(null);
    try {
      await login(email.trim(), password);
    } catch (err) {
      console.log('Login error', err);
      setError(err.message || 'Unable to login');
      Alert.alert('Login failed', err.message || 'Please check credentials');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.backgroundContainer}>
      <View style={styles.artisticBackground} pointerEvents="none">
        {SMALL_BUBBLES.map((bubble, index) => (
          <SmallFlagBubble key={`${bubble.country}-${index}`} country={bubble.country} style={bubble.style} />
        ))}
        <RibbonLine
          style={styles.ribbonLineLeftTop}
          colors={['#007A33', '#CE1126', '#FCD116']}
        />
        <RibbonLine
          style={styles.ribbonLineLeftMid}
          colors={['#CE1126', '#0038A8', '#FFFFFF', '#007A33']}
        />
        <RibbonLine
          style={styles.ribbonLineRightTop}
          colors={['#CE1126', '#FCD116', '#007A33']}
        />
        <RibbonLine
          style={styles.ribbonLineRightMid}
          colors={['#CE1126', '#FFFFFF', '#1EB53A', '#FFFFFF', '#0072C6']}
        />
        <RibbonLine
          style={styles.ribbonLineBottomLeft}
          colors={['#1EB53A', '#FFFFFF', '#0072C6']}
        />
        <RibbonLine
          style={styles.ribbonLineRMU}
          colors={['#0F4C81', '#FFFFFF', '#0F4C81']}
        />
        <View style={[styles.sideBubble, styles.sideBubbleLeftTop]}>
          <FlagTile country={FLAG_ITEMS[0]} />
        </View>
        <View style={[styles.sideBubble, styles.sideBubbleLeftMid]}>
          <FlagTile country={FLAG_ITEMS[1]} />
        </View>
        <View style={[styles.sideBubble, styles.sideBubbleRightTop]}>
          <FlagTile country={FLAG_ITEMS[2]} />
        </View>
        <View style={[styles.sideBubble, styles.sideBubbleRightMid]}>
          <FlagTile country={FLAG_ITEMS[3]} />
        </View>
        <View style={[styles.sideBubble, styles.sideBubbleBottomLeft]}>
          <FlagTile country={FLAG_ITEMS[4]} />
        </View>
        <View style={[styles.sideBubble, styles.sideBubbleBottomRight]}>
          <FlagTile country={FLAG_ITEMS[5]} />
        </View>
        <View style={styles.heroGlow} />
      </View>
      <ScrollView contentContainerStyle={styles.center} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
            <View style={styles.brandRow}>
              <View style={styles.logo}>
                <Ionicons name="school" size={28} color={COLORS.white} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.title}>RMU Campus Map</Text>
                <Text style={styles.subtitle}>Sign in to access maps, events, and updates</Text>
              </View>
            </View>

            <View style={styles.tipBanner}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.tipText}>Use your school email and password</Text>
            </View>

            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={styles.inputGroup}>
              <Ionicons name="mail-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                placeholder="name@rmu.edu.gh"
                placeholderTextColor="#94A3B8"
                style={emailInputStyle}
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputGroup}>
              <Ionicons name="lock-closed-outline" size={20} color="#64748B" style={styles.inputIcon} />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showPassword}
                style={passwordInputStyle}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <TouchableOpacity onPress={() => setShowPassword((s) => !s)} style={styles.eye}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => Alert.alert('Forgot password', 'Use the Firebase console to reset during development')}>
              <Text style={styles.forgot}>Forgot password?</Text>
            </TouchableOpacity>

            <CustomButton
              title={loading ? 'Signing in...' : 'Sign In'}
              onPress={handleLogin}
              loading={loading}
              style={styles.signInButton}
            />

            <CustomButton
              title="Continue as Guest"
              onPress={enterGuestMode}
              variant="outline"
              style={styles.guestButton}
              textStyle={styles.guestButtonText}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  backgroundContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  artisticBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '100%',
    overflow: 'hidden',
  },
  sideBubble: {
    position: 'absolute',
  },
  smallBubble: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.16,
  },
  smallBubbleInner: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 85,
  },
  ribbonLine: {
    position: 'absolute',
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    flexDirection: 'row',
  },
  ribbonSegment: {
    flex: 1,
    opacity: 0.88,
  },
  ribbonLineLeftTop: {
    top: 120,
    left: -10,
    width: 360,
    transform: [{ rotate: '10deg' }],
  },
  ribbonLineLeftMid: {
    top: 352,
    left: -12,
    width: 356,
    transform: [{ rotate: '-7deg' }],
  },
  ribbonLineRightTop: {
    top: 138,
    right: -10,
    width: 360,
    transform: [{ rotate: '-10deg' }],
  },
  ribbonLineRightMid: {
    top: 372,
    right: -12,
    width: 356,
    transform: [{ rotate: '7deg' }],
  },
  ribbonLineBottomLeft: {
    bottom: 142,
    left: -8,
    width: 370,
    transform: [{ rotate: '-13deg' }],
  },
  ribbonLineRMU: {
    bottom: 132,
    right: 36,
    width: 330,
    transform: [{ rotate: '15deg' }],
  },
  flagCard: {
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.10)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.20,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  flagStripe: {
    flex: 1,
  },
  cameroonRow: {
    flex: 1,
    flexDirection: 'row',
  },
  starCameroon: {
    width: 34,
    height: 34,
    backgroundColor: '#FCD116',
    transform: [{ rotate: '45deg' }],
  },
  gambiaFlag: {
    flex: 1,
  },
  gambiaBand: {
    flex: 1,
  },
  gambiaWhiteLine: {
    height: 2,
    backgroundColor: '#FFFFFF',
  },
  ghanaFlag: {
    flex: 1,
  },
  horizontalStripe: {
    flex: 1,
  },
  starGhana: {
    width: 36,
    height: 36,
    backgroundColor: '#111827',
    transform: [{ rotate: '45deg' }],
  },
  liberiaFlag: {
    flex: 1,
    flexDirection: 'row',
  },
  liberiaCanton: {
    width: '38%',
    backgroundColor: '#002868',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starLiberia: {
    width: 32,
    height: 32,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  liberiaStripes: {
    flex: 1,
  },
  liberiaStripe: {
    flex: 1,
  },
  sierraLeoneFlag: {
    flex: 1,
  },
  rmuFlag: {
    flex: 1,
  },
  rmuBand: {
    flex: 1,
  },
  rmuEmblemOuter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 76, 129, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rmuEmblemInner: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0F4C81',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rmuText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  stripe: {
    position: 'absolute',
    width: '150%',
    height: 42,
    left: '-25%',
    opacity: 0.86,
  },
  heroGlow: {
    position: 'absolute',
    width: 440,
    height: 440,
    borderRadius: 999,
    top: 30,
    right: -180,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  sideBubbleLeftTop: {
    top: 18,
    left: -92,
    transform: [{ rotate: '-8deg' }],
  },
  sideBubbleLeftMid: {
    top: '28%',
    left: -102,
    transform: [{ rotate: '10deg' }],
  },
  sideBubbleRightTop: {
    top: 46,
    right: -98,
    transform: [{ rotate: '12deg' }],
  },
  sideBubbleRightMid: {
    top: '34%',
    right: -108,
    transform: [{ rotate: '-10deg' }],
  },
  sideBubbleBottomLeft: {
    bottom: 70,
    left: -88,
    transform: [{ rotate: '8deg' }],
  },
  sideBubbleBottomRight: {
    bottom: 92,
    right: -92,
    transform: [{ rotate: '-10deg' }],
  },
  avoid: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  center: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 30,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 30,
    paddingHorizontal: 22,
    paddingVertical: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOpacity: 0.16,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
    overflow: 'hidden',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#0EA5E9',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOpacity: 0.28,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  title: { fontSize: 24, fontWeight: '800', color: '#0F172A', letterSpacing: 0.2 },
  subtitle: { color: '#475569', marginTop: 4, fontSize: 14, maxWidth: 235, lineHeight: 20 },
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 18,
  },
  tipText: {
    marginLeft: 8,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    marginTop: 2,
  },
  inputGroup: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, position: 'relative' },
  inputIcon: { marginRight: 10, marginTop: 1 },
  input: {
    flex: 1,
    height: 52,
    backgroundColor: '#FFFFFF',
    borderRadius: 13,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    fontSize: 16,
    color: '#0F172A',
  },
  inputFocused: {
    borderColor: '#2563EB',
    shadowColor: '#2563EB',
    shadowOpacity: 0.18,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  eye: { position: 'absolute', right: 12, padding: 6 },
  forgot: { color: '#334155', textAlign: 'right', marginBottom: 12, fontSize: 14, fontWeight: '700' },
  signInButton: {
    marginTop: 14,
    backgroundColor: '#2563EB',
    borderRadius: 13,
  },
  guestButton: {
    marginTop: 12,
    borderColor: '#2563EB',
    borderWidth: 1.5,
    backgroundColor: '#EFF6FF',
    borderRadius: 13,
  },
  guestButtonText: {
    color: '#1E40AF',
    fontWeight: '700',
  },
  error: { color: '#DC2626', marginTop: 12, textAlign: 'center', fontSize: 14, fontWeight: '600' },
});
