import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { theme } from '../theme';

interface UnderlineInputProps extends TextInputProps {
  label: string;
  error?: string | null;
  prefix?: string;
  mandatory?: boolean;
  hint?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

/**
 * Tactical Underline-Only Entry Field:
 * - Rejects enclosed box containers
 * - Single 1.5px bottom ink rule (thickens on focus, turns MarginRed on error)
 * - Monospaced label above line
 * - Error message line below
 */
export const UnderlineInput: React.FC<UnderlineInputProps> = ({
  label,
  error,
  prefix,
  mandatory = false,
  hint,
  containerStyle,
  inputStyle,
  ...inputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const hasError = Boolean(error);
  const bottomBorderColor = hasError
    ? theme.colors.marginRed
    : isFocused
    ? theme.colors.ink
    : theme.colors.ink;
  const bottomBorderWidth = isFocused ? theme.borders.thick : theme.borders.medium;

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Label Row */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {mandatory && <Text style={styles.mandatoryText}>MANDATORY</Text>}
      </View>

      {/* Input Row with Underline Border */}
      <View
        style={[
          styles.inputRow,
          {
            borderBottomColor: bottomBorderColor,
            borderBottomWidth: bottomBorderWidth,
          },
        ]}
      >
        {prefix ? <Text style={styles.prefixText}>{prefix}</Text> : null}
        <TextInput
          {...inputProps}
          placeholderTextColor={theme.colors.muted}
          onFocus={(e) => {
            setIsFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={[styles.input, inputStyle]}
        />
      </View>

      {/* Error / Hint Row */}
      {hasError ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.sm,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing.xs,
  },
  label: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  mandatoryText: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  prefixText: {
    fontFamily: theme.fonts.monoSemiBold,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.ink,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.ink,
    paddingVertical: 0,
    margin: 0,
    letterSpacing: 0.5,
  },
  errorText: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.marginRed,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  hintText: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 4,
  },
});
