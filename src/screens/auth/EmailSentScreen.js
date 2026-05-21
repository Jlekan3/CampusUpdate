import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../utils/theme';

export default function EmailSentScreen({ navigation, route }) {
  const { email, type } = route?.params ?? {};
  const isSignup = type === 'signup';

  return (
    <SafeAreaView style={s.root} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* ── Blue top ── */}
      <View style={s.topBar}>
        <View style={s.iconCircle}>
          <Ionicons name="mail-open-outline" size={32} color="#FFFFFF" />
        </View>
        <Text style={s.topBarTitle}>Check Your Email</Text>
        <Text style={s.topBarSub}>
          {isSignup ? 'Confirm your account' : 'Password reset link sent'}
        </Text>
      </View>

      {/* ── White card ── */}
      <View style={s.card}>
        <Text style={s.heading}>
          {isSignup ? 'Almost there!' : 'Reset link sent!'}
        </Text>

        <Text style={s.body}>
          {isSignup
            ? "We've sent a confirmation link to:"
            : "We've sent a password reset link to:"}
        </Text>

        <View style={s.emailBox}>
          <Ionicons name="mail-outline" size={16} color={COLORS.primaryLight} />
          <Text style={s.emailText} numberOfLines={1}>{email}</Text>
        </View>

        <Text style={s.instruction}>
          {isSignup
            ? 'Click the link in the email to activate your account, then come back and sign in.'
            : 'Click the link in the email to set a new password. The link expires in 60 minutes.'}
        </Text>

        <View style={s.tipBox}>
          <Ionicons name="information-circle-outline" size={16} color='#92400E' style={{ marginTop: 1 }} />
          <Text style={s.tipText}>
            Didn't receive it? Check your spam or junk folder.
          </Text>
        </View>

        <TouchableOpacity
          style={s.btn}
          onPress={() => navigation.navigate('Login')}
          activeOpacity={0.85}
        >
          <Text style={s.btnText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primary },

  topBar: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 36,
    paddingHorizontal: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  topBarTitle: { fontSize: 22, fontFamily: FONTS.bold, color: '#FFFFFF', marginBottom: 6 },
  topBarSub: { fontSize: 14, fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.65)' },

  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 48,
  },
  heading: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.textPrimary, marginBottom: 10 },
  body: { fontSize: 15, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginBottom: 14, lineHeight: 22 },

  emailBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  emailText: { fontSize: 15, fontFamily: FONTS.semiBold, color: COLORS.primary, flex: 1 },

  instruction: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },

  tipBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#92400E',
    lineHeight: 19,
    flex: 1,
  },

  btn: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  btnText: { fontSize: 16, fontFamily: FONTS.bold, color: '#FFFFFF', letterSpacing: 0.3 },
});
