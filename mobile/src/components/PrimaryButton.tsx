import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Solid Ink Primary Command Button:
 * - Solid #1B1A17 with #F3ECDD paper text
 * - Uppercase monospaced letterforms
 * - Razor-sharp 2px corners, zero drop-shadow
 * - Physical pressed displacement (1px down, 1px right)
 */
export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  textStyle,
}) => {
  const handlePress = () => {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && !disabled && !loading && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={theme.colors.paper} size="small" />
      ) : (
        <Text style={[styles.text, disabled && styles.disabledText, textStyle]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.ink,
    borderWidth: theme.borders.medium,
    borderColor: theme.colors.ink,
    borderRadius: theme.borders.radius,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    transform: [{ translateX: 1 }, { translateY: 1 }],
    backgroundColor: '#2A2824',
  },
  disabled: {
    backgroundColor: theme.colors.muted,
    borderColor: theme.colors.muted,
    opacity: 0.6,
  },
  text: {
    fontFamily: theme.fonts.monoSemiBold,
    fontSize: theme.typography.label.fontSize,
    color: theme.colors.paper,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  disabledText: {
    color: theme.colors.paper,
  },
});
