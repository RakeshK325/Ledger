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

interface OutlineButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * Ruled Outline Secondary Command:
 * - Transparent / Paper surface with 1.5px solid Ink border
 * - Uppercase monospaced typography
 * - Inverts to solid Ink on press
 */
export const OutlineButton: React.FC<OutlineButtonProps> = ({
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
      {({ pressed }) => (
        <>
          {loading ? (
            <ActivityIndicator
              color={pressed ? theme.colors.paper : theme.colors.ink}
              size="small"
            />
          ) : (
            <Text
              style={[
                styles.text,
                pressed && !disabled && styles.pressedText,
                disabled && styles.disabledText,
                textStyle,
              ]}
            >
              {title}
            </Text>
          )}
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: 'transparent',
    borderWidth: theme.borders.medium,
    borderColor: theme.colors.ink,
    borderRadius: theme.borders.radius,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    backgroundColor: theme.colors.ink,
    transform: [{ translateX: 1 }, { translateY: 1 }],
  },
  disabled: {
    borderColor: theme.colors.muted,
    opacity: 0.5,
  },
  text: {
    fontFamily: theme.fonts.monoSemiBold,
    fontSize: theme.typography.label.fontSize,
    color: theme.colors.ink,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  pressedText: {
    color: theme.colors.paper,
  },
  disabledText: {
    color: theme.colors.muted,
  },
});
