import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ViewStyle,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface LedgerPageProps {
  children: React.ReactNode;
  scrollable?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const RULE_LINE_HEIGHT = 40;
const LINE_COUNT = Math.ceil((SCREEN_HEIGHT * 2) / RULE_LINE_HEIGHT);

/**
 * Authentic accounting folio sheet background:
 * - Natural unbleached pulp canvas (#F3ECDD)
 * - Rhythmic 40px ruled lines (#CBD5CF)
 * - Signature double vertical margin rule in Margin Red (#C2473A)
 */
export const LedgerPage: React.FC<LedgerPageProps> = ({
  children,
  scrollable = true,
  style,
  contentContainerStyle,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }, style]}>
      {/* Rhythmic accounting horizontal ruling lines */}
      <View style={styles.rulesContainer} pointerEvents="none">
        {Array.from({ length: LINE_COUNT }).map((_, i) => (
          <View key={i} style={[styles.ruleLine, { top: i * RULE_LINE_HEIGHT }]} />
        ))}
      </View>

      {/* Signature Double Left Margin Rule: two 1px red lines separated by 3px */}
      <View style={styles.marginRuleContainer} pointerEvents="none">
        <View style={styles.marginRuleLine} />
        <View style={styles.marginRuleLine} />
      </View>

      {/* Folio content container positioned to the right of the margin lines */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scrollable ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.contentContainer, styles.flexOne, contentContainerStyle]}>
            {children}
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.paper,
    position: 'relative',
    overflow: 'hidden',
  },
  keyboardAvoid: {
    flex: 1,
    zIndex: 2,
  },
  flexOne: {
    flex: 1,
  },
  rulesContainer: {
    ...StyleSheet.absoluteFill,
    zIndex: 0,
  },
  ruleLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.colors.rule,
    opacity: 0.85,
  },
  marginRuleContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 44,
    width: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  marginRuleLine: {
    width: 1,
    height: '100%',
    backgroundColor: theme.colors.marginRed,
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
    zIndex: 2,
  },
  contentContainer: {
    paddingLeft: 56, // Clears the double margin rule with comfortable gutter
    paddingRight: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
});
