import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LedgerPage } from '../../src/components/LedgerPage';
import { useAuth } from '../../src/context/AuthContext';
import { apiFetch, ApiError } from '../../src/api';
import { theme } from '../../src/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  // Screen flow: Step 1 (phone) -> Step 2 (otp)
  const [step, setStep] = useState<'phone' | 'otp'>('phone');

  // Step 1 state
  const [rawPhone, setRawPhone] = useState('');
  const [phoneFocused, setPhoneFocused] = useState(false);

  // Step 2 state: 6 single-digit slots
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const digitInputRefs = useRef<Array<React.ComponentRef<typeof TextInput> | null>>([]);

  // Timing and attempt counters
  const [resendSeconds, setResendSeconds] = useState(30);
  const [attemptsCount, setAttemptsCount] = useState(0);

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isOtpRejected, setIsOtpRejected] = useState(false);

  // Format phone display as 'XXXXX XXXXX'
  const formattedPhone = rawPhone.length > 5
    ? `${rawPhone.slice(0, 5)} ${rawPhone.slice(5, 10)}`
    : rawPhone;

  // Resend countdown timer for Step 2
  useEffect(() => {
    if (step !== 'otp' || resendSeconds <= 0) return;

    const timer = setInterval(() => {
      setResendSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [step, resendSeconds]);

  // Handle phone input changes (digits only, max 10)
  const handlePhoneChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, '').slice(0, 10);
    setRawPhone(digitsOnly);
    if (phoneError) setPhoneError(null);
  };

  // Step 1: Request 6-digit verification code
  const handleRequestOtp = async () => {
    setPhoneError(null);

    if (rawPhone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit Indian phone number.');
      return;
    }

    setLoading(true);
    try {
      await apiFetch('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: rawPhone }),
      });

      // Advance to Step 2
      setStep('otp');
      setOtpDigits(['', '', '', '', '', '']);
      setOtpError(null);
      setIsOtpRejected(false);
      setAttemptsCount(0);
      setResendSeconds(30);

      // Focus the first OTP slot shortly after rendering
      setTimeout(() => {
        digitInputRefs.current[0]?.focus();
      }, 150);
    } catch (err) {
      if (err instanceof ApiError) {
        setPhoneError(err.message);
      } else {
        setPhoneError('Failed to dispatch code. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Re-request OTP code from Step 2
  const handleResendOtp = async () => {
    if (resendSeconds > 0 || loading) return;

    setLoading(true);
    setOtpError(null);
    setIsOtpRejected(false);
    try {
      await apiFetch('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: rawPhone }),
      });

      setOtpDigits(['', '', '', '', '', '']);
      setAttemptsCount(0);
      setResendSeconds(30);
      digitInputRefs.current[0]?.focus();
    } catch (err) {
      if (err instanceof ApiError) {
        setOtpError(err.message);
      } else {
        setOtpError('Failed to resend code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Handle individual digit input and auto-advance
  const handleDigitChange = (text: string, index: number) => {
    if (isOtpRejected) {
      setIsOtpRejected(false);
      setOtpError(null);
    }

    const digitsOnly = text.replace(/\D/g, '');

    // Case 1: Pasted full or partial code (length > 1)
    if (digitsOnly.length > 1) {
      const pastedCode = digitsOnly.slice(0, 6);
      const nextDigits = [...otpDigits];
      for (let i = 0; i < 6; i++) {
        nextDigits[i] = pastedCode[i] || '';
      }
      setOtpDigits(nextDigits);

      const nextFocus = Math.min(pastedCode.length, 5);
      digitInputRefs.current[nextFocus]?.focus();
      return;
    }

    // Case 2: Single digit entered
    const singleDigit = digitsOnly.slice(-1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = singleDigit;
    setOtpDigits(nextDigits);

    if (singleDigit && index < 5) {
      digitInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace navigation across empty slots
  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        digitInputRefs.current[index - 1]?.focus();
        const nextDigits = [...otpDigits];
        nextDigits[index - 1] = '';
        setOtpDigits(nextDigits);
      }
    }
  };

  // Step 2: Verify code and authenticate
  const handleVerifyOtp = async () => {
    const fullCode = otpDigits.join('');

    if (fullCode.length !== 6) {
      setOtpError('Please enter all 6 digits of the code.');
      setIsOtpRejected(true);
      return;
    }

    setLoading(true);
    setOtpError(null);

    try {
      const data = await apiFetch<{ token: string; user: any }>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: rawPhone, code: fullCode }),
      });

      // Save token & user profile in secure store
      await login(data.token, data.user);

      // Navigate to ledger home
      router.replace('/');
    } catch (err) {
      const newAttempts = attemptsCount + 1;
      setAttemptsCount(newAttempts);
      setIsOtpRejected(true);

      const triesLeft = Math.max(0, 3 - newAttempts);

      if (err instanceof ApiError) {
        if (err.code === 'INVALID_OTP') {
          if (triesLeft > 0) {
            setOtpError(`That code doesn't match. ${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left.`);
          } else {
            setOtpError('Maximum verification attempts exceeded.');
          }
        } else if (err.code === 'TOO_MANY_ATTEMPTS') {
          setOtpError('Maximum verification attempts exceeded.');
        } else if (err.code === 'OTP_EXPIRED') {
          setOtpError('Verification code has expired. Please resend.');
        } else {
          setOtpError(err.message);
        }
      } else {
        setOtpError(`That code doesn't match. ${triesLeft} ${triesLeft === 1 ? 'try' : 'tries'} left.`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Return from Step 2 to Step 1
  const handleBackToStep1 = () => {
    setStep('phone');
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError(null);
    setIsOtpRejected(false);
    setAttemptsCount(0);
  };

  const isOtpComplete = otpDigits.join('').length === 6;

  // Format timer for display (e.g. 0:30, 0:09)
  const formattedTimer = `0:${resendSeconds < 10 ? '0' : ''}${resendSeconds}`;

  return (
    <LedgerPage contentContainerStyle={styles.container}>
      {/* Folio Register Header */}
      <View style={styles.folioHeader}>
        <View style={styles.folioLeftRow}>
          <Text style={styles.folioMeta}>SERIES 1938</Text>
          <Text style={styles.folioSlash}>/</Text>
          <Text style={styles.folioMeta}>REG. DEPT.</Text>
        </View>
        <View style={styles.folioRight}>
          <Text
            style={[
              styles.folioNumber,
              step === 'otp' && isOtpRejected && styles.folioNumberRejected,
            ]}
          >
            {step === 'phone'
              ? 'FOLIO NO. 01'
              : isOtpRejected
              ? 'FOLIO 02 · AUDIT REJECT'
              : 'FOLIO NO. 02'}
          </Text>
        </View>
      </View>

      {/* Sub-header rule line for Step 2 */}
      {step === 'otp' && !isOtpRejected && (
        <View style={styles.subFolioHeader}>
          <Text style={styles.subFolioLeft}>ENTRY STAGE II: AUTHENTICATION</Text>
          <Text style={styles.subFolioRight}>AUDIT SEC. 4</Text>
        </View>
      )}

      {/* Primary Journal Masthead */}
      <View style={styles.masthead}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {step === 'phone' ? 'MiniLedger' : 'Enter the code'}
          </Text>

          {step === 'phone' ? (
            <View style={styles.badgeStage1}>
              <Text style={styles.badgeText}>ENTRY STAGE I</Text>
            </View>
          ) : isOtpRejected ? (
            <View style={styles.stampRejected}>
              <Text style={styles.stampRejectedText}>REJECTED</Text>
              <Text style={styles.stampRejectedSub}>ENTRY MISMATCH</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.subtitle}>
          {step === 'phone'
            ? 'Who owes you?'
            : `Sent to +91 ${formattedPhone || '98765 43210'}`}
        </Text>
      </View>

      {/* Divider rule line */}
      <View style={styles.ruleDivider} />

      {/* STEP 1: Phone Entry Interface */}
      {step === 'phone' ? (
        <View style={styles.stepContent}>
          {/* Registry Identification Section */}
          <View style={styles.registryCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardIndex}>INDEX: 001-A</Text>
              <Text style={styles.cardStatusUnverified}>UNVERIFIED</Text>
            </View>
            <Text style={styles.cardDescription}>
              Record personal credentials to inspect counterparty obligations, unpaid tallies, and arrears balances.
            </Text>
          </View>

          {/* Phone Field */}
          <View style={styles.fieldSection}>
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>TELEPHONE APPARATUS [REC. 10-D]</Text>
              <Text style={styles.mandatoryText}>MANDATORY</Text>
            </View>

            <View
              style={[
                styles.phoneInputRow,
                phoneFocused && styles.inputFocused,
                Boolean(phoneError) && styles.inputError,
              ]}
            >
              <Text style={styles.phonePrefix}>+91</Text>
              <TextInput
                value={formattedPhone}
                onChangeText={handlePhoneChange}
                placeholder="98765 43210"
                placeholderTextColor={theme.colors.muted}
                keyboardType="phone-pad"
                maxLength={11}
                onFocus={() => setPhoneFocused(true)}
                onBlur={() => setPhoneFocused(false)}
                style={styles.phoneInput}
                autoFocus
              />
            </View>

            {/* Error or Hint Row */}
            {phoneError ? (
              <Text style={styles.errorMessage}>{phoneError}</Text>
            ) : null}

            <View style={styles.fieldMetaRow}>
              <Text style={styles.fieldHint}>FORMAT: 10 DIGITS (NATIONAL)</Text>
              <Text style={styles.charCounter}>{rawPhone.length}/10</Text>
            </View>
          </View>

          {/* Verification Audit Notice Box */}
          <View style={styles.noticeBox}>
            <View style={styles.checkboxSquare}>
              <View style={styles.checkboxDot} />
            </View>
            <Text style={styles.noticeText}>
              A single-use verification cipher (6 numeric glyphs) will be logged to server console.
            </Text>
          </View>

          {/* Primary Action Button */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (loading || rawPhone.length < 10) && styles.btnDisabled,
              ]}
              disabled={loading || rawPhone.length < 10}
              onPress={handleRequestOtp}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.btnLoadingRow}>
                  <ActivityIndicator size="small" color={theme.colors.paper} />
                  <Text style={[styles.primaryBtnText, { marginLeft: 8 }]}>DISPATCHING...</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>SEND CODE</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.btnCaption}>A 6-digit code will be sent.</Text>
          </View>

          {/* Footer Metadata */}
          <View style={styles.footerSection}>
            <View style={styles.footerRow}>
              <Text style={styles.footerMeta}>SEC: 44-B-01</Text>
              <Text style={styles.footerMetaWide}>BINDING COPY</Text>
              <Text style={styles.footerMeta}>ED. 1938</Text>
            </View>

            <View style={styles.stampWrapper}>
              <View style={styles.stampPending}>
                <Text style={styles.stampPendingText}>PENDING DISPATCH</Text>
              </View>
            </View>

            <View style={styles.footerFineRow}>
              <Text style={styles.footerFine}>NO DIGITAL SURROGATE</Text>
              <Text style={styles.footerFine}>PHYSICAL INK PROTOCOL</Text>
            </View>
          </View>
        </View>
      ) : (
        /* STEP 2: OTP Verification Interface */
        <View style={styles.stepContent}>
          {/* OTP Digit Register Panel */}
          <View style={styles.otpPanel}>
            <View style={styles.otpHeaderRow}>
              <Text style={styles.otpPanelLabel}>
                {isOtpRejected ? 'SECURE PASSKEY [06]' : 'DISPATCH DIGIT VERIFICATION (6-SLOT)'}
              </Text>
              <Text
                style={[
                  styles.otpPanelStatus,
                  isOtpRejected && styles.otpStatusInvalid,
                ]}
              >
                {isOtpRejected ? 'STATUS: INVALID' : 'COL. 01–06'}
              </Text>
            </View>

            {/* 6 Monospaced Underline Registers */}
            <View style={styles.otpGrid}>
              {otpDigits.map((digit, idx) => {
                const isActive = activeSlot === idx;
                return (
                  <View key={idx} style={styles.otpSlotWrapper}>
                    <TextInput
                      ref={(el) => {
                        digitInputRefs.current[idx] = el;
                      }}
                      value={digit}
                      onChangeText={(val) => handleDigitChange(val, idx)}
                      onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, idx)}
                      onFocus={() => setActiveSlot(idx)}
                      placeholder="—"
                      placeholderTextColor={theme.colors.rule}
                      keyboardType="number-pad"
                      maxLength={6}
                      selectTextOnFocus
                      style={[
                        styles.otpSlotInput,
                        isOtpRejected && styles.otpSlotInputRejected,
                        isActive && styles.otpSlotInputActive,
                      ]}
                    />
                    <View
                      style={[
                        styles.otpSlotUnderline,
                        isOtpRejected && styles.otpUnderlineRejected,
                        isActive && !isOtpRejected && styles.otpUnderlineActive,
                      ]}
                    />
                    {isOtpRejected && <View style={styles.otpUnderlineDouble} />}
                  </View>
                );
              })}
            </View>

            {/* Erroneous Feedback State */}
            {isOtpRejected && otpError && (
              <View style={styles.otpErrorNotice}>
                <Text style={styles.otpErrorIcon}>[!]</Text>
                <Text style={styles.otpErrorMessage}>{otpError}</Text>
              </View>
            )}

            {/* Dev Mode Server Log Note */}
            <View style={styles.devModeNotice}>
              <Text style={styles.devModeText}>
                Dev mode: the code is printed in the server log.
              </Text>
              <Text style={styles.devModeBadge}>STDOUT</Text>
            </View>
          </View>

          {/* Action Navigation: Wrong number? Change & Resend countdown */}
          <View style={styles.navigationRow}>
            <TouchableOpacity
              onPress={handleBackToStep1}
              style={styles.wrongNumberBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.wrongNumberText}>Wrong number? </Text>
              <Text style={styles.changeLink}>Change</Text>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              {resendSeconds > 0 ? (
                <Text style={styles.resendCountdownText}>
                  RESEND IN <Text style={styles.resendTimer}>{formattedTimer}</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResendOtp} disabled={loading} activeOpacity={0.7}>
                  <Text style={styles.resendActiveLink}>RESEND CODE</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Submit Button: OPEN THE LEDGER */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                (loading || !isOtpComplete) && styles.btnDisabled,
              ]}
              disabled={loading || !isOtpComplete}
              onPress={handleVerifyOtp}
              activeOpacity={0.8}
            >
              {loading ? (
                <View style={styles.btnLoadingRow}>
                  <ActivityIndicator size="small" color={theme.colors.paper} />
                  <Text style={[styles.primaryBtnText, { marginLeft: 8 }]}>VERIFYING...</Text>
                </View>
              ) : (
                <Text style={styles.primaryBtnText}>OPEN THE LEDGER</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Step 2 Footer Metadata */}
          <View style={styles.footerSection}>
            <View style={styles.footerRow}>
              <View>
                <Text style={styles.footerMeta}>REGISTRY RECORD</Text>
                <Text style={styles.footerRecordId}>FOLIO IDENT. #884-J</Text>
              </View>

              <View style={styles.stampGreen}>
                <Text style={styles.stampGreenText}>PHYSICAL INK PROTOCOL</Text>
              </View>
            </View>

            <View style={styles.step2AuditLines}>
              <View style={styles.footerRowTight}>
                <Text style={styles.footerMeta}>BINDING: LINEN-THREAD NO. 44</Text>
                <Text style={styles.footerMeta}>INDEX: 002-VOL-XX</Text>
              </View>
              <View style={styles.footerRowTight}>
                <Text style={styles.footerMeta}>CALCUTTA & BOMBAY ARCHIVE</Text>
                <Text style={styles.footerMeta}>STATUS: PENDING</Text>
              </View>
            </View>

            {/* Double Rule Closure */}
            <View style={styles.doubleClosure}>
              <View style={styles.closureLine} />
              <View style={styles.closureLine} />
            </View>
          </View>
        </View>
      )}
    </LedgerPage>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: theme.spacing.sm,
  },

  // Folio Header
  folioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingBottom: theme.spacing.xs,
  },
  folioLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  folioMeta: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.muted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  folioSlash: {
    fontFamily: theme.fonts.mono,
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.rule,
  },
  folioRight: {
    alignItems: 'flex-end',
  },
  folioNumber: {
    fontFamily: theme.fonts.monoSemiBold,
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.ink,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  folioNumberRejected: {
    color: theme.colors.marginRed,
    fontWeight: '700',
  },
  subFolioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 4,
  },
  subFolioLeft: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 10,
    color: theme.colors.marginRed,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  subFolioRight: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Primary Journal Masthead
  masthead: {
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontFamily: theme.fonts.serifSemiBold,
    fontSize: 32,
    lineHeight: 38,
    color: theme.colors.ink,
    letterSpacing: -0.5,
  },
  badgeStage1: {
    borderWidth: 1,
    borderColor: theme.colors.muted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    transform: [{ rotate: '-2deg' }],
  },
  badgeText: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  stampRejected: {
    borderWidth: 1.5,
    borderColor: theme.colors.marginRed,
    backgroundColor: theme.colors.paperShade,
    paddingHorizontal: 8,
    paddingVertical: 3,
    transform: [{ rotate: '-6deg' }],
    alignItems: 'center',
  },
  stampRejectedText: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 12,
    color: theme.colors.marginRed,
    letterSpacing: 1.5,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  stampRejectedSub: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: 8,
    color: theme.colors.marginRed,
    letterSpacing: 1,
    lineHeight: 10,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontFamily: theme.fonts.serif,
    fontStyle: 'italic',
    fontSize: 16,
    color: theme.colors.muted,
    marginTop: 4,
  },

  ruleDivider: {
    height: 1,
    backgroundColor: theme.colors.rule,
    marginBottom: theme.spacing.lg,
  },

  stepContent: {
    flexDirection: 'column',
  },

  // Registry Identification Card
  registryCard: {
    backgroundColor: '#FAF3E4',
    borderWidth: 1,
    borderColor: theme.colors.ink,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.rule,
    marginBottom: theme.spacing.sm,
  },
  cardIndex: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardStatusUnverified: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 11,
    color: theme.colors.marginRed,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cardDescription: {
    fontFamily: theme.fonts.serif,
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.ink,
  },

  // Phone Field
  fieldSection: {
    marginBottom: theme.spacing.md,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  fieldLabel: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: 12,
    color: theme.colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  mandatoryText: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.ink,
    paddingVertical: 6,
  },
  inputFocused: {
    borderBottomColor: theme.colors.ink,
    borderBottomWidth: 2.5,
  },
  inputError: {
    borderBottomColor: theme.colors.marginRed,
  },
  phonePrefix: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 16,
    color: theme.colors.ink,
    marginRight: 10,
  },
  phoneInput: {
    flex: 1,
    fontFamily: theme.fonts.monoMedium,
    fontSize: 16,
    color: theme.colors.ink,
    letterSpacing: 1.5,
    paddingVertical: 0,
    margin: 0,
  },
  errorMessage: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: 12,
    color: theme.colors.marginRed,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  fieldMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  fieldHint: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 0.4,
  },
  charCounter: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
  },

  // Verification Audit Notice Box
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EAE1CD40',
    borderWidth: 1,
    borderColor: theme.colors.rule,
    padding: theme.spacing.sm,
    gap: 10,
    marginBottom: theme.spacing.lg,
  },
  checkboxSquare: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: theme.colors.ink,
    backgroundColor: theme.colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxDot: {
    width: 6,
    height: 6,
    backgroundColor: theme.colors.ink,
  },
  noticeText: {
    flex: 1,
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    lineHeight: 15,
    color: theme.colors.ink,
  },

  // Primary Button
  actionSection: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  primaryBtn: {
    backgroundColor: theme.colors.ink,
    borderWidth: 1,
    borderColor: theme.colors.ink,
    borderRadius: 2,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 14,
    color: '#FFF9EE',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  btnCaption: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Footer Metadata
  footerSection: {
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.rule,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerRowTight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 3,
  },
  footerMeta: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 0.5,
  },
  footerMetaWide: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 2,
  },
  footerRecordId: {
    fontFamily: theme.fonts.monoSemiBold,
    fontSize: 12,
    color: theme.colors.ink,
    letterSpacing: 1.2,
    marginTop: 2,
  },
  stampWrapper: {
    alignItems: 'center',
    marginVertical: theme.spacing.md,
  },
  stampPending: {
    borderWidth: 2,
    borderColor: `${theme.colors.marginRed}CC`,
    paddingHorizontal: 16,
    paddingVertical: 6,
    transform: [{ rotate: '1deg' }],
  },
  stampPendingText: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 13,
    color: theme.colors.marginRed,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  stampGreen: {
    borderWidth: 2,
    borderColor: theme.colors.paidGreen,
    backgroundColor: '#FAF3E4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    transform: [{ rotate: '-6deg' }],
  },
  stampGreenText: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 11,
    color: theme.colors.paidGreen,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  footerFineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
  },
  footerFine: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 0.5,
  },

  // Step 2 OTP Panel
  otpPanel: {
    backgroundColor: '#FAF3E4',
    borderWidth: 1,
    borderColor: theme.colors.rule,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  otpHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  otpPanelLabel: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  otpPanelStatus: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 0.8,
  },
  otpStatusInvalid: {
    fontFamily: theme.fonts.monoBold,
    color: theme.colors.marginRed,
  },
  otpGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: theme.spacing.sm,
  },
  otpSlotWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  otpSlotInput: {
    width: '100%',
    fontFamily: theme.fonts.monoBold,
    fontSize: 24,
    color: theme.colors.ink,
    textAlign: 'center',
    paddingVertical: 4,
  },
  otpSlotInputRejected: {
    color: theme.colors.marginRed,
  },
  otpSlotInputActive: {
    color: theme.colors.ink,
  },
  otpSlotUnderline: {
    width: '100%',
    height: 2,
    backgroundColor: theme.colors.ink,
    marginTop: 2,
  },
  otpUnderlineActive: {
    height: 2.5,
    backgroundColor: theme.colors.ink,
  },
  otpUnderlineRejected: {
    backgroundColor: theme.colors.marginRed,
  },
  otpUnderlineDouble: {
    width: '100%',
    height: 1,
    backgroundColor: `${theme.colors.marginRed}4D`,
    marginTop: 2,
  },
  otpErrorNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.sm,
  },
  otpErrorIcon: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 13,
    color: theme.colors.marginRed,
  },
  otpErrorMessage: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 12,
    color: theme.colors.marginRed,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  devModeNotice: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#EAE1CD',
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: theme.spacing.sm,
  },
  devModeText: {
    fontFamily: theme.fonts.mono,
    fontSize: 11,
    color: theme.colors.muted,
  },
  devModeBadge: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 9,
    color: theme.colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Step 2 Navigation Row
  navigationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.rule,
    marginBottom: theme.spacing.sm,
  },
  wrongNumberBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wrongNumberText: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    color: theme.colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  changeLink: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 12,
    color: theme.colors.ink,
    textDecorationLine: 'underline',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resendContainer: {
    alignItems: 'flex-end',
  },
  resendCountdownText: {
    fontFamily: theme.fonts.mono,
    fontSize: 12,
    color: theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  resendTimer: {
    fontFamily: theme.fonts.monoBold,
    color: theme.colors.ink,
  },
  resendActiveLink: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 12,
    color: theme.colors.ink,
    textDecorationLine: 'underline',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  step2AuditLines: {
    marginTop: theme.spacing.sm,
  },
  doubleClosure: {
    marginTop: theme.spacing.md,
    gap: 2,
  },
  closureLine: {
    width: '100%',
    height: 1,
    backgroundColor: theme.colors.ink,
  },
});
