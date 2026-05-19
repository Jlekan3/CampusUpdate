import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Mail01Icon } from '@hugeicons/core-free-icons';
import { COLORS, FONTS, RADIUS, SHADOW } from '../../utils/theme';

export default function EmailSentScreen({ navigation, route }) {
  const { email, type } = route?.params ?? {};
  const isSignup = type === 'signup';

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* Blue header */}
      <View style={s.header} />

      {/* White card */}
      <View style={s.card}>
        {/* Icon */}
        <View style={s.iconWrap}>
          <HugeiconsIcon icon={Mail01Icon} size={36} color={COLORS.primary} variant="stroke" />
        </View>

        <Text style={s.title}>
          {isSignup ? 'Confirm Your Email' : 'Check Your Email'}
        </Text>

        <Text style={s.body}>
          {isSignup
            ? `We've sent a confirmation link to:`
            : `We've sent a password reset link to:`}
        </Text>

        <View style={s.emailBadge}>
          <Text style={s.emailText} numberOfLines={1}>{email}</Text>
        </View>

        <Text style={s.instruction}>
          {isSignup
            ? 'Click the link in the email to activate your account, then come back and sign in.'
            : 'Click the link in the email to reset your password. The link expires in 60 minutes.'}
        </Text>

        <View style={s.noteBox}>
          <Text style={s.noteText}>
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
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.primary },
  header: {
    height: Platform.OS === 'ios' ? 100 : 80,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 48,
    alignItems: 'center',
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primaryMuted,
    borderWidth: 1.5,
    borderColor: COLORS.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
  },
  emailBadge: {
    backgroundColor: COLORS.primaryMuted,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    maxWidth: '100%',
  },
  emailText: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: COLORS.primary,
    textAlign: 'center',
  },
  instruction: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  noteBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: RADIUS.sm,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 32,
    width: '100%',
  },
  noteText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: '#92400E',
    textAlign: 'center',
    lineHeight: 19,
  },
  btn: {
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    width: '100%',
    ...SHADOW.blue,
  },
  btnText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: COLORS.white,
    letterSpacing: 0.3,
  },
});
