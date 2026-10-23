import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { theme } from '../theme';

interface StampProps {
  variant: 'OVERDUE' | 'PAID';
  label?: string;
  rotation?: number; // In degrees, defaults to -6
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Rubber verification stamp:
 * - OVERDUE: 2px solid MarginRed (#C2473A)
 * - PAID: 2px solid PaidGreen (#2F6B4F)
 * - Angled at -6 degrees with bold monospaced uppercase type
 */
export const Stamp: React.FC<StampProps> = ({
  variant,
  label,
  rotation = -6,
  style,
  textStyle,
}) => {
  const isPaid = variant === 'PAID';
  const color = isPaid ? theme.colors.paidGreen : theme.colors.marginRed;
  const text = label || (isPaid ? 'PAID' : 'OVERDUE');

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: color,
          transform: [{ rotate: `${rotation}deg` }],
        },
        style,
      ]}
    >
      <Text style={[styles.text, { color }, textStyle]}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 2,
    borderRadius: theme.borders.radius,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(243, 236, 221, 0.85)', // Tinted paper backdrop
    alignSelf: 'flex-start',
  },
  text: {
    fontFamily: theme.fonts.monoBold,
    fontSize: theme.typography.caption.fontSize,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
