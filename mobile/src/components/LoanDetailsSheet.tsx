import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
  Animated,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { Stamp } from './Stamp';
import { apiFetch, getApiBaseUrl, ApiError } from '../api';
import { formatINR, formatLedgerDate } from '../format';
import { theme } from '../theme';
import { LoanItem } from '../types/loan';

interface LoanDetailsSheetProps {
  loan: LoanItem | null;
  visible: boolean;
  onClose: () => void;
  onRepaidSuccess?: (repaidLoan: LoanItem) => void;
}

/**
 * Authentic Bookkeeper Bottom Sheet Modal:
 * - Flat ink scrim backdrop
 * - Hand-ruled drag handle
 * - Double red margin lines
 * - Debtor narrative, large amount, dates, receipt attachment
 * - Confirmed "MARK AS REPAID" with quick scale-in celebration (1.4 -> 1) & light haptic
 */
export const LoanDetailsSheet: React.FC<LoanDetailsSheetProps> = ({
  loan,
  visible,
  onClose,
  onRepaidSuccess,
}) => {
  const queryClient = useQueryClient();

  const [currentLoan, setCurrentLoan] = useState<LoanItem | null>(loan);
  const [loading, setLoading] = useState(false);
  const [justRepaid, setJustRepaid] = useState(false);

  // Celebratory scale animation: 1.4 down to 1.0 (the only celebratory animation in the app)
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Sync loan prop changes
  useEffect(() => {
    setCurrentLoan(loan);
    setJustRepaid(false);
    scaleAnim.setValue(1);
  }, [loan]);

  if (!loan) return null;

  const activeLoan = currentLoan || loan;
  const isOverdue = activeLoan.status === 'overdue';
  const isRepaid = activeLoan.status === 'repaid';

  // Construct absolute URL for receipt image
  const fullReceiptUrl = activeLoan.receiptUrl
    ? activeLoan.receiptUrl.startsWith('http')
      ? activeLoan.receiptUrl
      : `${getApiBaseUrl().replace(/\/api$/, '')}${activeLoan.receiptUrl}`
    : null;

  // Handle Mark as Repaid with confirmation
  const handleMarkAsRepaid = () => {
    Alert.alert(
      'Confirm Repayment',
      `Mark debt of ${formatINR(activeLoan.amount_paise)} from ${activeLoan.friend_name} as settled in full?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Repaid',
          style: 'default',
          onPress: executeRepayment,
        },
      ]
    );
  };

  const executeRepayment = async () => {
    setLoading(true);
    try {
      const response = await apiFetch<{ loan: LoanItem }>(`/loans/${activeLoan.id}/repay`, {
        method: 'PATCH',
      });

      const updated = response.loan;
      setCurrentLoan(updated);
      setJustRepaid(true);

      // Light haptic feedback (celebration)
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        // Optional fallback on unsupported platforms
      }

      // Celebratory scale-in animation: 1.4 -> 1.0
      scaleAnim.setValue(1.4);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 90,
        useNativeDriver: true,
      }).start();

      // Invalidate queries so lists and summaries update
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });

      if (onRepaidSuccess) {
        onRepaidSuccess(updated);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to record repayment.';
      Alert.alert('Audit Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Flat Ink Scrim (zero glass blur, pure ink density) */}
      <View style={styles.scrim}>
        <TouchableOpacity
          style={styles.scrimTouchable}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Bottom Sheet Card */}
        <View style={styles.sheetContainer}>
          {/* Authentic Hand-ruled Drag Bar */}
          <View style={styles.dragHandleWrapper}>
            <View style={styles.dragHandleLine} />
          </View>

          {/* Modal Foliation Sub-header */}
          <View style={styles.folioSubHeader}>
            <Text style={styles.folioRef}>
              ENTRY REF. #{activeLoan.id.slice(0, 8).toUpperCase()}
            </Text>
            <Text style={styles.folioAudit}>
              {isRepaid ? 'AUDIT POSTED' : 'FOLIO 03 · LINE 02'}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* Sheet Content Area with Signature Double Left Margin Rule */}
            <View style={styles.contentWrapper}>
              {/* Double Left Margin Red Rules */}
              <View style={styles.marginRuleContainer} pointerEvents="none">
                <View style={styles.marginRuleLine} />
                <View style={styles.marginRuleLine} />
              </View>

              <View style={styles.mainNarrative}>
                {/* Account Holder Name */}
                <View style={styles.debtorHeaderRow}>
                  <Text style={styles.debtorName}>{activeLoan.friend_name}</Text>
                  <Text style={styles.folioCode}>FOLIO 88</Text>
                </View>

                {/* Amount Row with Overlaid Stamp */}
                <View style={styles.amountStampRow}>
                  <View style={styles.amountWrapper}>
                    <Text
                      style={[
                        styles.amountDisplay,
                        isOverdue && styles.amountOverdue,
                        isRepaid && styles.amountRepaid,
                      ]}
                    >
                      {formatINR(activeLoan.amount_paise)}
                    </Text>

                    {/* Strikethrough ink line on repaid amount */}
                    {isRepaid && <View style={styles.strikethroughLine} />}
                  </View>

                  {/* Stamp Container */}
                  <View style={styles.stampPlacement}>
                    {isRepaid ? (
                      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                        <Stamp variant="PAID" />
                      </Animated.View>
                    ) : isOverdue ? (
                      <Stamp variant="OVERDUE" />
                    ) : (
                      <View style={styles.unsettledBadge}>
                        <Text style={styles.unsettledText}>PENDING</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Meta Annotation Line */}
                <View style={styles.metaLine}>
                  <Text style={styles.metaText}>
                    LENT {formatLedgerDate(activeLoan.created_at)}
                  </Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text
                    style={[
                      styles.metaText,
                      isOverdue && styles.metaDueOverdue,
                    ]}
                  >
                    DUE {formatLedgerDate(activeLoan.due_date)}
                  </Text>
                  {isRepaid && (
                    <>
                      <Text style={styles.metaDot}>·</Text>
                      <Text style={styles.metaSettled}>
                        REPAID {formatLedgerDate(activeLoan.repaid_at)}
                      </Text>
                    </>
                  )}
                  {isOverdue && (
                    <>
                      <Text style={styles.metaDot}>·</Text>
                      <Text style={styles.metaDueOverdue}>ARREARS</Text>
                    </>
                  )}
                </View>

                {/* Ruled Horizontal Division */}
                <View style={styles.horizontalDivider} />

                {/* Taped-in Cash Memo / Receipt Voucher Artifact */}
                {fullReceiptUrl ? (
                  <View style={styles.receiptArtifactWrapper}>
                    {/* Translucent Gummed Tape Strip */}
                    <View style={styles.gummedTapeTab} />

                    <View style={styles.receiptVoucherBox}>
                      <View style={styles.receiptHeader}>
                        <Text style={styles.receiptTitle}>VOUCHER RECORD</Text>
                        <Text style={styles.receiptDate}>
                          {formatLedgerDate(activeLoan.created_at)}
                        </Text>
                      </View>

                      <View style={styles.receiptImageContainer}>
                        <Image
                          source={{ uri: fullReceiptUrl }}
                          style={styles.receiptFullImage}
                          resizeMode="cover"
                        />
                      </View>

                      <View style={styles.receiptFooter}>
                        <Text style={styles.receiptFooterText}>[ ATTACHMENT: RECEIPT ]</Text>
                        <Text style={styles.receiptAudited}>AUDITED</Text>
                      </View>
                    </View>
                  </View>
                ) : null}

                {/* Audit Status Notice Box */}
                <View style={styles.auditNoticeBox}>
                  <View style={styles.auditStatusRow}>
                    <View
                      style={[
                        styles.auditStatusDot,
                        isRepaid ? styles.dotGreen : isOverdue ? styles.dotRed : styles.dotInk,
                      ]}
                    />
                    <Text style={styles.auditStatusText}>
                      {isRepaid
                        ? 'STATUS: SETTLED IN FULL'
                        : isOverdue
                        ? 'STATUS: OVERDUE ARREARS'
                        : 'STATUS: PENDING SETTLEMENT'}
                    </Text>
                  </View>
                  <Text style={styles.auditFolioBalanced}>FOLIO 03 BALANCED</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionSection}>
                  {!isRepaid ? (
                    <TouchableOpacity
                      style={styles.repayBtn}
                      onPress={handleMarkAsRepaid}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      {loading ? (
                        <View style={styles.btnLoadingRow}>
                          <ActivityIndicator size="small" color="#F3ECDD" />
                          <Text style={[styles.repayBtnText, { marginLeft: 8 }]}>
                            RECORDING POSTING...
                          </Text>
                        </View>
                      ) : (
                        <Text style={styles.repayBtnText}>MARK AS REPAID</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.settledBanner}>
                      <Text style={styles.settledBannerText}>
                        SETTLED IN FULL ON {formatLedgerDate(activeLoan.repaid_at)}
                      </Text>
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={onClose}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.closeBtnText}>CLOSE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(27, 26, 23, 0.65)', // Pure ink flat density scrim
    justifyContent: 'flex-end',
  },
  scrimTouchable: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#EAE1CD', // Tinted ledger paper stock
    borderTopWidth: 1.5,
    borderTopColor: theme.colors.ink,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    maxHeight: '85%',
  },
  dragHandleWrapper: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
  },
  dragHandleLine: {
    width: 42,
    height: 1.5,
    backgroundColor: theme.colors.ink,
  },
  folioSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.rule,
  },
  folioRef: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  folioAudit: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  contentWrapper: {
    position: 'relative',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
  },
  marginRuleContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 20,
    width: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  marginRuleLine: {
    width: 1,
    height: '100%',
    backgroundColor: theme.colors.marginRed,
    opacity: 0.85,
  },
  mainNarrative: {
    paddingLeft: 22,
  },
  debtorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  debtorName: {
    fontFamily: theme.fonts.serifSemiBold,
    fontSize: 24,
    color: theme.colors.ink,
    letterSpacing: -0.3,
  },
  folioCode: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  amountStampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  amountWrapper: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  amountDisplay: {
    fontFamily: theme.fonts.serifSemiBold,
    fontSize: 32,
    color: theme.colors.ink,
    letterSpacing: -0.5,
  },
  amountOverdue: {
    color: theme.colors.marginRed,
  },
  amountRepaid: {
    color: theme.colors.muted,
  },
  strikethroughLine: {
    position: 'absolute',
    top: '55%',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: theme.colors.ink,
  },
  stampPlacement: {
    transform: [{ rotate: '-4deg' }],
  },
  unsettledBadge: {
    borderWidth: 1,
    borderColor: theme.colors.muted,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  unsettledText: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 10,
  },
  metaText: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  metaDot: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
  },
  metaDueOverdue: {
    color: theme.colors.marginRed,
    fontFamily: theme.fonts.monoBold,
  },
  metaSettled: {
    color: theme.colors.paidGreen,
    fontFamily: theme.fonts.monoBold,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: theme.colors.rule,
    marginVertical: 10,
  },
  receiptArtifactWrapper: {
    position: 'relative',
    alignItems: 'center',
    marginVertical: 10,
  },
  gummedTapeTab: {
    position: 'absolute',
    top: -8,
    width: 64,
    height: 14,
    backgroundColor: '#D9CEB2',
    borderWidth: 1,
    borderColor: '#B8AA8A',
    zIndex: 10,
    transform: [{ rotate: '-1deg' }],
  },
  receiptVoucherBox: {
    width: '100%',
    backgroundColor: '#F3ECDD',
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: 2,
    padding: 10,
    transform: [{ rotate: '0.8deg' }],
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.rule,
    paddingBottom: 4,
    marginBottom: 6,
  },
  receiptTitle: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 11,
    color: theme.colors.ink,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  receiptDate: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
  },
  receiptImageContainer: {
    width: '100%',
    height: 180,
    backgroundColor: theme.colors.paperShade,
    borderWidth: 1,
    borderColor: theme.colors.rule,
    overflow: 'hidden',
  },
  receiptFullImage: {
    width: '100%',
    height: '100%',
  },
  receiptFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
  },
  receiptFooterText: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  receiptAudited: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 9,
    color: theme.colors.paidGreen,
    letterSpacing: 1,
    borderWidth: 1,
    borderColor: theme.colors.paidGreen,
    paddingHorizontal: 4,
    paddingVertical: 1,
    textTransform: 'uppercase',
  },
  auditNoticeBox: {
    backgroundColor: '#F3ECDD',
    borderWidth: 1,
    borderColor: theme.colors.rule,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  auditStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  auditStatusDot: {
    width: 6,
    height: 6,
  },
  dotGreen: {
    backgroundColor: theme.colors.paidGreen,
  },
  dotRed: {
    backgroundColor: theme.colors.marginRed,
  },
  dotInk: {
    backgroundColor: theme.colors.ink,
  },
  auditStatusText: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: 10,
    color: theme.colors.ink,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  auditFolioBalanced: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
  },
  actionSection: {
    marginTop: 8,
    gap: 8,
  },
  repayBtn: {
    backgroundColor: theme.colors.ink,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: 2,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  repayBtnText: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 13,
    color: '#F3ECDD',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settledBanner: {
    backgroundColor: '#FAF3E4',
    borderWidth: 1.5,
    borderColor: theme.colors.paidGreen,
    paddingVertical: 10,
    alignItems: 'center',
  },
  settledBannerText: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 11,
    color: theme.colors.paidGreen,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  closeBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: 2,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 13,
    color: theme.colors.ink,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
