import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatINR } from '../format';
import { theme } from '../theme';

interface SummaryRowProps {
  totalLent: number;
  totalRepaid: number;
  overdueAmount: number;
}

/**
 * 3-Column Totals Sheet:
 * - Double horizontal ink rules above
 * - LENT / REPAID / OVERDUE columns formatted via formatINR
 * - Overdue figure and background highlighted in Margin Red when > 0
 */
export const SummaryRow: React.FC<SummaryRowProps> = ({
  totalLent,
  totalRepaid,
  overdueAmount,
}) => {
  const hasOverdue = overdueAmount > 0;

  return (
    <View style={styles.container}>
      {/* Double horizontal rule above */}
      <View style={styles.doubleRule}>
        <View style={styles.ruleLine} />
        <View style={styles.ruleLine} />
      </View>

      {/* 3-Column Sheet */}
      <View style={styles.grid}>
        {/* Col 1: LENT / DR */}
        <View style={styles.col}>
          <Text style={styles.colLabel}>LENT / DR</Text>
          <Text style={styles.colValue}>{formatINR(totalLent)}</Text>
        </View>

        {/* Col 2: REPAID / CR */}
        <View style={[styles.col, styles.colDivider]}>
          <Text style={styles.colLabel}>REPAID / CR</Text>
          <Text style={styles.colValue}>{formatINR(totalRepaid)}</Text>
        </View>

        {/* Col 3: OVERDUE */}
        <View style={[styles.col, styles.colDivider, hasOverdue && styles.overdueCol]}>
          <Text style={[styles.colLabel, hasOverdue && styles.overdueLabel]}>
            OVERDUE
          </Text>
          <Text style={[styles.colValue, hasOverdue && styles.overdueValue]}>
            {formatINR(overdueAmount)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: theme.spacing.sm,
  },
  doubleRule: {
    gap: 3,
    marginBottom: 3,
  },
  ruleLine: {
    width: '100%',
    height: 1.5,
    backgroundColor: theme.colors.ink,
  },
  grid: {
    flexDirection: 'row',
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: theme.colors.ink,
    backgroundColor: 'transparent',
  },
  col: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  colDivider: {
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.rule,
  },
  overdueCol: {
    backgroundColor: 'rgba(194, 71, 58, 0.05)',
  },
  colLabel: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  overdueLabel: {
    color: theme.colors.marginRed,
    fontFamily: theme.fonts.monoBold,
  },
  colValue: {
    fontFamily: theme.fonts.serifSemiBold,
    fontSize: 18,
    color: theme.colors.ink,
    marginTop: 2,
  },
  overdueValue: {
    color: theme.colors.marginRed,
  },
});
