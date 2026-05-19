import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import { COLORS, FONTS } from '../utils/theme';

export default function FormInput({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  required,
  ...textInputProps
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}

      <View
        style={[
          styles.inputWrapper,
          focused && styles.inputWrapperFocused,
          error && styles.inputWrapperError,
        ]}
      >
        {leftIcon ? <View style={styles.leftIconWrap}>{leftIcon}</View> : null}

        <TextInput
          style={[styles.input, leftIcon && styles.inputWithLeft, rightIcon && styles.inputWithRight, inputStyle]}
          placeholderTextColor={COLORS.placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...textInputProps}
        />

        {rightIcon ? (
          <TouchableOpacity style={styles.rightIconWrap} onPress={onRightIconPress} activeOpacity={0.7}>
            {rightIcon}
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: COLORS.label,
    marginBottom: 6,
  },
  required: {
    color: COLORS.error,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBg,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    height: 52,
    overflow: 'hidden',
  },
  inputWrapperFocused: {
    borderColor: COLORS.borderFocus,
    backgroundColor: COLORS.white,
    shadowColor: COLORS.borderFocus,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  inputWrapperError: {
    borderColor: COLORS.borderError,
  },
  leftIconWrap: {
    paddingLeft: 14,
    paddingRight: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIconWrap: {
    paddingRight: 14,
    paddingLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    paddingHorizontal: 14,
    height: '100%',
  },
  inputWithLeft: {
    paddingLeft: 4,
  },
  inputWithRight: {
    paddingRight: 4,
  },
  error: {
    fontSize: 12,
    fontFamily: FONTS.medium,
    color: COLORS.error,
    marginTop: 4,
    marginLeft: 2,
  },
});
