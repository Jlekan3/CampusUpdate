import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, Text } from 'react-native';

const BOX_COUNT = 6;

export default function OTPInputGroup({ value = '', onChange, error }) {
  const inputs = useRef([]);
  const chars = value.split('');

  const handleChange = (text, index) => {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = chars.slice();
    next[index] = digit;
    const newVal = next.join('').slice(0, BOX_COUNT);
    onChange(newVal);

    if (digit && index < BOX_COUNT - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!chars[index] && index > 0) {
        const next = chars.slice();
        next[index - 1] = '';
        onChange(next.join(''));
        inputs.current[index - 1]?.focus();
      } else {
        const next = chars.slice();
        next[index] = '';
        onChange(next.join(''));
      }
    }
  };

  return (
    <View>
      <View style={styles.row}>
        {Array.from({ length: BOX_COUNT }).map((_, i) => (
          <TextInput
            key={i}
            ref={(r) => (inputs.current[i] = r)}
            style={[
              styles.box,
              chars[i] && styles.boxFilled,
              error && styles.boxError,
            ]}
            value={chars[i] || ''}
            onChangeText={(t) => handleChange(t, i)}
            onKeyPress={(e) => handleKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            textAlign="center"
            caretHidden
          />
        ))}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  boxFilled: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  boxError: {
    borderColor: '#EF4444',
  },
  error: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});
