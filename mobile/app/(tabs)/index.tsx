import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { LedgerPage } from '../../src/components/LedgerPage';
import { SummaryRow } from '../../src/components/SummaryRow';
import { Stamp } from '../../src/components/Stamp';
import { LoanDetailsSheet } from '../../src/components/LoanDetailsSheet';
import { apiFetch, getApiBaseUrl } from '../../src/api';
import { formatINR, formatLedgerDate } from '../../src/format';
import { theme } from '../../src/theme';

export interface SummaryData {
  totalLent: number;
  totalRepaid: number;
  overdueAmount: number;
}

export interface LoanItem {
  id: string;
  user_id: string;
  friend_name: string;
  amount_paise: number;
  due_date: string;
  repaid_at: string | null;
  status: 'pending' | 'overdue' | 'repaid';
  receipt_path: string | null;
  receiptUrl: string | null;
  created_at: string;
}

// Formats current day in bookkeeper folio format: e.g. "22 OCT 2026"
function getTodayDateString(): string {
  const d = new Date();
  const day = d.getDate().toString().padStart(2, '0');
  const monthNames = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
  ];
  const month = monthNames[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
}

export default function LedgerHomeScreen() {
  const router = useRouter();

  // Filter state: ALL, PENDING, OVERDUE, REPAID (filtered client-side)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'OVERDUE' | 'REPAID'>('ALL');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<LoanItem | null>(null);

  // TanStack Query 1: Summary totals
  const summaryQuery = useQuery<SummaryData>({
    queryKey: ['summary'],
    queryFn: () => apiFetch<SummaryData>('/summary'),
  });

  // TanStack Query 2: All loans (client-side filtered)
  const loansQuery = useQuery<{ loans: LoanItem[] }>({
    queryKey: ['loans'],
    queryFn: () => apiFetch<{ loans: LoanItem[] }>('/loans'),
  });

  const allLoans = loansQuery.data?.loans || [];

  // Client-side filtering
  const filteredLoans = useMemo(() => {
    if (filter === 'ALL') return allLoans;
    return allLoans.filter((item) => item.status === filter.toLowerCase());
  }, [allLoans, filter]);

  // "Rows fade up once on first load only"
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(8)).current;
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (!loansQuery.isLoading && loansQuery.data && !hasAnimatedRef.current) {
      hasAnimatedRef.current = true;
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loansQuery.isLoading, loansQuery.data]);

  // Pull to refresh handler
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loansQuery.refetch(), summaryQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const isInitialLoading = (loansQuery.isLoading || summaryQuery.isLoading) && !refreshing;
  const isErrorState = (loansQuery.isError || summaryQuery.isError) && !loansQuery.data;

  // Header Component for FlatList
  const renderHeader = () => {
    const summary = summaryQuery.data || { totalLent: 0, totalRepaid: 0, overdueAmount: 0 };

    return (
      <View style={styles.headerContainer}>
        {/* Top Ledger Meta Row */}
        <View style={styles.topMetaRow}>
          <Text style={styles.topMetaText}>SERIES 1938 / REG. DEPT.</Text>
          <Text style={styles.topMetaText}>FOLIO NO. 03</Text>
        </View>

        {/* Masthead Header Row: 'Ledger' and today's date */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Ledger</Text>
          <Text style={styles.headerDate}>{getTodayDateString()}</Text>
        </View>

        {/* Totals Sheet Row (LENT / REPAID / OVERDUE via formatINR) */}
        <SummaryRow
          totalLent={summary.totalLent}
          totalRepaid={summary.totalRepaid}
          overdueAmount={summary.overdueAmount}
        />

        {/* Filter Navigation Tabs (ALL, PENDING, OVERDUE, REPAID) */}
        <View style={styles.filterTabsRow}>
          {(['ALL', 'PENDING', 'OVERDUE', 'REPAID'] as const).map((tab) => {
            const isActive = filter === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setFilter(tab)}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Registry Table Column Subheader */}
        <View style={styles.tableHeaderRow}>
          <Text style={styles.tableColParticulars}>PARTICULARS & AUDIT DATE</Text>
          <Text style={styles.tableColDebit}>DEBIT / BALANCE</Text>
        </View>
      </View>
    );
  };

  // Footer Component for FlatList
  const renderFooter = () => {
    return (
      <View style={styles.footerContainer}>
        {/* Double Horizontal Ink Rule */}
        <View style={styles.doubleRule}>
          <View style={styles.ruleLine} />
          <View style={styles.ruleLine} />
        </View>

        {/* Bottom Action & Ledger Closing Signature */}
        <View style={styles.footerActionRow}>
          <View style={styles.footerMeta}>
            <Text style={styles.footerMetaTitle}>FOLIO CLOSED • EXAMINED</Text>
            <Text style={styles.footerMetaSub}>DISPATCHED TO ARCHIVE 1938</Text>
          </View>

          {/* Rectangular '+ New entry' button opening /add as a modal */}
          <TouchableOpacity
            style={styles.newEntryBtn}
            onPress={() => router.push('/add')}
            activeOpacity={0.8}
          >
            <Text style={styles.newEntryPlus}>+</Text>
            <Text style={styles.newEntryText}>NEW ENTRY</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Empty State matching 05-ledger-home-empty.html
  const renderEmptyComponent = () => {
    if (isInitialLoading) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={theme.colors.ink} />
          <Text style={styles.loadingText}>AUDITING FOLIO ARCHIVES...</Text>
        </View>
      );
    }

    if (isErrorState) {
      const errorMsg =
        loansQuery.error?.message ||
        summaryQuery.error?.message ||
        'Unable to reconcile ledger records with server. Check connectivity.';

      return (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>AUDIT FAILURE [REC. 500]</Text>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              loansQuery.refetch();
              summaryQuery.refetch();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText}>RETRY AUDIT</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptySpacerLine} />
        <View style={styles.emptySpacerLine} />
        <View style={styles.emptyContent}>
          <Text style={styles.emptyTitle}>Nothing on the books yet.</Text>
          <Text style={styles.emptySubtitle}>
            Tap + New entry when you lend someone money.
          </Text>
        </View>
        <View style={styles.emptySpacerLine} />
        <View style={styles.emptySpacerLine} />
      </View>
    );
  };

  // Render individual loan entry row
  const renderItem = ({ item }: { item: LoanItem }) => {
    const isOverdue = item.status === 'overdue';
    const isRepaid = item.status === 'repaid';

    // Construct full receipt image URL if thumbnail exists
    const fullReceiptUrl = item.receiptUrl
      ? item.receiptUrl.startsWith('http')
        ? item.receiptUrl
        : `${getApiBaseUrl().replace(/\/api$/, '')}${item.receiptUrl}`
      : null;

    return (
      <TouchableOpacity
        style={[
          styles.rowContainer,
          isOverdue && styles.rowOverdue,
        ]}
        onPress={() => setSelectedLoan(item)}
        activeOpacity={0.7}
      >
        {/* Left particulars column */}
        <View style={styles.particularsCol}>
          <View style={styles.nameRow}>
            {/* Optional receipt voucher thumbnail */}
            {fullReceiptUrl ? (
              <View style={styles.thumbnailWrapper}>
                <Image
                  source={{ uri: fullReceiptUrl }}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            <Text style={styles.friendName} numberOfLines={1}>
              {item.friend_name}
            </Text>
          </View>

          {/* Audit due/repaid date subline */}
          <Text style={[styles.dateText, isOverdue && styles.overdueDateText]}>
            {isRepaid
              ? `REPAID ${formatLedgerDate(item.repaid_at || item.due_date)}`
              : `DUE ${formatLedgerDate(item.due_date)}`}
          </Text>
        </View>

        {/* Right debit/balance column with Stamp */}
        <View style={styles.balanceCol}>
          {isOverdue ? (
            <Stamp variant="OVERDUE" style={styles.stampOffset} />
          ) : isRepaid ? (
            <Stamp variant="PAID" style={styles.stampOffset} />
          ) : (
            <Text style={styles.unsettledText}>UNSETTLED</Text>
          )}

          <Text
            style={[
              styles.amountText,
              isOverdue && styles.overdueAmountText,
              isRepaid && styles.repaidAmountText,
            ]}
          >
            {formatINR(item.amount_paise)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <LedgerPage scrollable={false} contentContainerStyle={styles.ledgerPageContent}>
      <Animated.View
        style={[
          styles.animatedWrapper,
          {
            opacity: hasAnimatedRef.current ? 1 : fadeAnim,
            transform: [
              {
                translateY: hasAnimatedRef.current ? 0 : translateYAnim,
              },
            ],
          },
        ]}
      >
        <FlatList
          data={filteredLoans}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmptyComponent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.ink}
              colors={[theme.colors.ink]}
            />
          }
        />
      </Animated.View>

      {/* Bookkeeper Bottom Sheet Details Modal */}
      <LoanDetailsSheet
        loan={selectedLoan}
        visible={selectedLoan !== null}
        onClose={() => setSelectedLoan(null)}
      />
    </LedgerPage>
  );
}

const styles = StyleSheet.create({
  ledgerPageContent: {
    paddingLeft: 54, // Clears double red left margin line
    paddingRight: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: 0,
    flex: 1,
  },
  animatedWrapper: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },

  // Header styles
  headerContainer: {
    width: '100%',
  },
  topMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(27, 26, 23, 0.2)',
  },
  topMetaText: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 8,
    paddingBottom: 10,
  },
  headerTitle: {
    fontFamily: theme.fonts.serifSemiBold,
    fontSize: theme.typography.display.fontSize,
    lineHeight: theme.typography.display.lineHeight,
    color: theme.colors.ink,
    letterSpacing: -0.5,
  },
  headerDate: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    color: theme.colors.muted,
    letterSpacing: 0.5,
  },

  // Filter Tabs
  filterTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.rule,
  },
  filterTab: {
    paddingVertical: 6,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: theme.colors.ink,
  },
  filterTabText: {
    fontFamily: theme.fonts.monoSemiBold,
    fontSize: 13,
    color: theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  filterTabTextActive: {
    color: theme.colors.ink,
  },

  // Table Subheader
  tableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1.5,
    borderColor: theme.colors.ink,
    marginTop: 6,
  },
  tableColParticulars: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tableColDebit: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Entry Row Styles
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.rule,
  },
  rowOverdue: {
    backgroundColor: 'rgba(194, 71, 58, 0.08)', // Red tint at 8%
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.marginRed, // Red left rule
    paddingLeft: 8,
  },
  particularsCol: {
    flex: 1,
    paddingRight: 8,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  thumbnailWrapper: {
    width: 26,
    height: 26,
    borderWidth: 1,
    borderColor: theme.colors.ink,
    backgroundColor: theme.colors.paper,
    borderRadius: 2,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  friendName: {
    fontFamily: theme.fonts.serif,
    fontSize: 16,
    color: theme.colors.ink,
    flexShrink: 1,
  },
  dateText: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  overdueDateText: {
    color: theme.colors.marginRed,
    fontFamily: theme.fonts.monoMedium,
  },
  balanceCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  stampOffset: {
    marginRight: 2,
  },
  unsettledText: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingRight: 4,
  },
  amountText: {
    fontFamily: theme.fonts.serifSemiBold,
    fontSize: 18,
    color: theme.colors.ink,
  },
  overdueAmountText: {
    color: theme.colors.marginRed,
    fontFamily: theme.fonts.serifBold,
  },
  repaidAmountText: {
    color: theme.colors.muted,
    textDecorationLine: 'line-through',
  },

  // Empty State
  emptyContainer: {
    paddingVertical: 12,
  },
  emptySpacerLine: {
    height: 38,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.rule,
  },
  emptyContent: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: theme.fonts.serif,
    fontStyle: 'italic',
    fontSize: 20,
    color: theme.colors.ink,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.4,
  },

  // Loading & Error States
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: 12,
    color: theme.colors.muted,
    letterSpacing: 1.2,
  },
  errorBox: {
    backgroundColor: '#FAF3E4',
    borderWidth: 1,
    borderColor: theme.colors.marginRed,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.lg,
    alignItems: 'center',
  },
  errorTitle: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 12,
    color: theme.colors.marginRed,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  errorText: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.ink,
    textAlign: 'center',
    marginVertical: 8,
    lineHeight: 16,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: theme.colors.ink,
    backgroundColor: theme.colors.paper,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 4,
    borderRadius: 2,
  },
  retryBtnText: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 11,
    color: theme.colors.ink,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  // Footer Actions
  footerContainer: {
    marginTop: 16,
    paddingBottom: 24,
  },
  doubleRule: {
    gap: 3,
    marginBottom: 10,
  },
  ruleLine: {
    width: '100%',
    height: 1,
    backgroundColor: theme.colors.ink,
  },
  footerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerMeta: {
    flex: 1,
  },
  footerMetaTitle: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  footerMetaSub: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  newEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.ink,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: 2,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  newEntryPlus: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 15,
    color: '#FFF9EE',
    lineHeight: 16,
  },
  newEntryText: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 12,
    color: '#FFF9EE',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
