import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LedgerPage } from '../src/components/LedgerPage';
import { apiFetch, ApiError } from '../src/api';
import { theme } from '../src/theme';
import { rupeesToPaise } from '../src/format';

export default function AddEntryModal() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Field states
  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');

  // Default due date: 7 days ahead
  const [dueDate, setDueDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Receipt image asset
  const [receiptAsset, setReceiptAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Form submission and validation states
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    friendName?: string | null;
    amount?: string | null;
    dueDate?: string | null;
    general?: string | null;
  }>({});

  // Format date display: e.g. "Sat, 31 Oct 2026"
  const formattedDueDate = dueDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Date picker handler
  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (event.type === 'set' && selectedDate) {
      setDueDate(selectedDate);
      if (errors.dueDate) setErrors((prev) => ({ ...prev, dueDate: null }));
    }
  };

  // Image source chooser: camera or photo library
  const handlePickReceipt = () => {
    Alert.alert(
      'Attach Voucher Receipt',
      'Select document capture source:',
      [
        { text: 'Take Photo (Camera)', onPress: pickFromCamera },
        { text: 'Choose from Library', onPress: pickFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const pickFromCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Camera access is required to capture paper receipt vouchers.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setReceiptAsset(result.assets[0]);
      }
    } catch {
      Alert.alert('Camera Error', 'Could not access device camera.');
    }
  };

  const pickFromGallery = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Photo library access is required to attach receipt documents.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setReceiptAsset(result.assets[0]);
      }
    } catch {
      Alert.alert('Gallery Error', 'Could not access photo library.');
    }
  };

  // Client-side validation mirroring backend Zod rules
  const validateForm = (): boolean => {
    const nextErrors: typeof errors = {};
    const trimmedName = friendName.trim();
    const trimmedAmount = amount.trim();

    // 1. Friend Name: 1-80 characters, trimmed
    if (!trimmedName) {
      nextErrors.friendName = 'Put a name on it.';
    } else if (trimmedName.length > 80) {
      nextErrors.friendName = 'Friend name cannot exceed 80 characters.';
    }

    // 2. Amount: decimal regex, positive number > 0, max 2 decimals, max 1 crore
    const amountRegex = /^(?:[1-9]\d*|0)(?:\.\d{1,2})?$/;
    if (!trimmedAmount) {
      nextErrors.amount = 'Amount must be more than zero.';
    } else if (!amountRegex.test(trimmedAmount)) {
      nextErrors.amount = 'Enter a valid amount (at most 2 decimal places).';
    } else {
      const paise = rupeesToPaise(trimmedAmount);
      if (paise <= 0) {
        nextErrors.amount = 'Amount must be more than zero.';
      } else if (paise > 1_000_000_000) {
        nextErrors.amount = 'Amount cannot exceed ₹1,00,00,000 (1 crore).';
      }
    }

    // 3. Due Date: YYYY-MM-DD not in the past
    const todayStr = new Date().toISOString().split('T')[0];
    const dueStr = dueDate.toISOString().split('T')[0];
    if (dueStr < todayStr) {
      nextErrors.dueDate = 'Due date cannot be in the past.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  // Submit as multipart/form-data
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    setErrors({});

    try {
      const formData = new FormData();
      formData.append('friend_name', friendName.trim());
      formData.append('amount', amount.trim());
      formData.append('due_date', dueDate.toISOString().split('T')[0]);

      if (receiptAsset) {
        const uri = receiptAsset.uri;
        const filename = receiptAsset.fileName || uri.split('/').pop() || 'receipt.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const mimeType = match ? `image/${match[1]}` : (receiptAsset.mimeType || 'image/jpeg');

        formData.append('receipt', {
          uri,
          name: filename,
          type: mimeType,
        } as any);
      }

      await apiFetch('/loans', {
        method: 'POST',
        body: formData,
      });

      // Invalidate queries so the home ledger and totals update immediately
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });

      // Close modal
      router.back();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ general: err.message });
      } else {
        setErrors({ general: 'Failed to record entry. Check your connection.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const hasAnyError = Boolean(errors.friendName || errors.amount || errors.dueDate || errors.general);

  return (
    <LedgerPage contentContainerStyle={styles.container}>
      {/* Folio Registry Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.folioMetaRow}>
          <Text style={styles.folioMeta}>SERIES 1938 / REG. DEPT.</Text>
          <Text style={styles.folioMeta}>
            {hasAnyError ? 'FOLIO NO. 04 · ENTRY REJECTED' : 'FOLIO NO. 04 · DISPATCH'}
          </Text>
        </View>

        <View style={styles.mastheadRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.cancelBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.cancelBtnText}>[ CANCEL ]</Text>
          </TouchableOpacity>

          <View style={styles.titleWithBadge}>
            <Text style={styles.title}>New entry</Text>
            <View
              style={[
                styles.statusBadge,
                hasAnyError && styles.statusBadgeRejected,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  hasAnyError && styles.statusBadgeTextRejected,
                ]}
              >
                {hasAnyError ? 'AUDIT REJECTED' : 'UNCOMMITTED'}
              </Text>
            </View>
          </View>

          <Text style={styles.formCode}>FORM 12-A</Text>
        </View>
      </View>

      {/* Primary Ink Boundary Line */}
      <View style={styles.primaryBoundaryRule} />

      {/* General Server Error Banner */}
      {errors.general ? (
        <View style={styles.generalErrorBox}>
          <Text style={styles.generalErrorText}>{errors.general}</Text>
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
        {/* Field 1: Friend Name / Debtor Narrative */}
        <View style={styles.fieldBlock}>
          <Text
            style={[
              styles.fieldLabel,
              Boolean(errors.friendName) && styles.fieldLabelError,
            ]}
          >
            FRIEND NAME / RECIPIENT
          </Text>

          <View
            style={[
              styles.inputRowUnderline,
              Boolean(errors.friendName) && styles.inputRowUnderlineError,
            ]}
          >
            <TextInput
              value={friendName}
              onChangeText={(text) => {
                setFriendName(text);
                if (errors.friendName) setErrors((prev) => ({ ...prev, friendName: null }));
              }}
              placeholder="ENTER FULL NAME"
              placeholderTextColor={theme.colors.muted}
              style={[
                styles.textInputMain,
                Boolean(errors.friendName) && styles.textInputError,
              ]}
              autoFocus
            />
          </View>

          {errors.friendName ? (
            <Text style={styles.fieldErrorText}>{errors.friendName}</Text>
          ) : (
            <Text style={styles.fieldHint}>ACCOUNT RECORD ID: [AUTOGENERATED]</Text>
          )}
        </View>

        {/* Field 2: Amount */}
        <View style={styles.fieldBlock}>
          <View style={styles.fieldLabelRow}>
            <Text
              style={[
                styles.fieldLabel,
                Boolean(errors.amount) && styles.fieldLabelError,
              ]}
            >
              AMOUNT RECORDED
            </Text>
            <Text style={styles.fieldLabelRight}>CURRENCY: INR (₹)</Text>
          </View>

          <View
            style={[
              styles.amountInputRow,
              Boolean(errors.amount) && styles.inputRowUnderlineError,
            ]}
          >
            <Text
              style={[
                styles.rupeePrefix,
                Boolean(errors.amount) && styles.rupeePrefixError,
              ]}
            >
              ₹
            </Text>
            <TextInput
              value={amount}
              onChangeText={(text) => {
                setAmount(text);
                if (errors.amount) setErrors((prev) => ({ ...prev, amount: null }));
              }}
              placeholder="0.00"
              placeholderTextColor={theme.colors.muted}
              keyboardType="decimal-pad"
              style={[
                styles.amountInputText,
                Boolean(errors.amount) && styles.amountInputTextError,
              ]}
            />
          </View>

          {errors.amount ? (
            <Text style={styles.fieldErrorText}>{errors.amount}</Text>
          ) : (
            <View style={styles.amountMetaRow}>
              <Text style={styles.fieldHint}>ENTER AMOUNT LENT IN RUPEES</Text>
              <Text style={styles.debitItemBadge}>DEBIT ITEM</Text>
            </View>
          )}
        </View>

        {/* Field 3: Due Date */}
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>MATURITY / DUE DATE</Text>

          <View style={styles.dateSelectorRow}>
            <View style={styles.dateValueWrapper}>
              <Text style={styles.calendarIcon}>[D]</Text>
              <Text style={styles.dateDisplayText}>{formattedDueDate}</Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.changeDateLink}>CHANGE</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display="default"
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          )}

          {errors.dueDate ? (
            <Text style={styles.fieldErrorText}>{errors.dueDate}</Text>
          ) : (
            <Text style={styles.fieldHint}>
              DEFAULT: 7 DAYS AHEAD · NO PAST DATES
            </Text>
          )}
        </View>

        {/* Field 4: Optional Receipt Voucher */}
        <View style={styles.fieldBlock}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>RECEIPT / VOUCHER (OPTIONAL)</Text>
            <Text style={styles.fieldLabelRight}>ANNEXURE 'A'</Text>
          </View>

          {receiptAsset ? (
            <View style={styles.voucherAttachedBox}>
              <View style={styles.voucherLeft}>
                <View style={styles.voucherThumbnailWrapper}>
                  <Image
                    source={{ uri: receiptAsset.uri }}
                    style={styles.voucherThumbnailImage}
                    resizeMode="cover"
                  />
                </View>

                <View style={styles.voucherInfo}>
                  <Text style={styles.voucherFilename} numberOfLines={1}>
                    {receiptAsset.fileName || 'VOUCHER_ATTACHMENT.JPG'}
                  </Text>
                  <Text style={styles.voucherSubText}>
                    {receiptAsset.fileSize
                      ? `${Math.round(receiptAsset.fileSize / 1024)} KB · VERIFIED VOUCHER`
                      : 'VERIFIED VOUCHER'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => setReceiptAsset(null)}
                style={styles.removeVoucherBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.removeVoucherText}>REMOVE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.attachPhotoBox}
              onPress={handlePickReceipt}
              activeOpacity={0.7}
            >
              <View style={styles.attachLeft}>
                <Text style={styles.attachIcon}>+</Text>
                <Text style={styles.attachTitle}>ATTACH PHOTO</Text>
              </View>
              <Text style={styles.attachTypes}>.JPG .PNG .WEBP · MAX 5 MB</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Submission Action */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            disabled={submitting}
            onPress={handleSubmit}
            activeOpacity={0.8}
          >
            {submitting ? (
              <View style={styles.submittingRow}>
                <ActivityIndicator size="small" color="#FFF9EE" />
                <Text style={[styles.submitBtnText, { marginLeft: 8 }]}>
                  RECORDING IN FOLIO...
                </Text>
              </View>
            ) : (
              <Text style={styles.submitBtnText}>WRITE IT DOWN</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footnoteRow}>
            <View
              style={[
                styles.footnoteDot,
                hasAnyError && styles.footnoteDotError,
              ]}
            />
            <Text
              style={[
                styles.footnoteText,
                hasAnyError && styles.footnoteTextError,
              ]}
            >
              {hasAnyError
                ? 'CORRECT DISCREPANCIES BEFORE FOLIO RECORDING'
                : 'ENTRY WILL BE RECORDED IN FOLIO 04 · PERMANENT INK'}
            </Text>
            <View
              style={[
                styles.footnoteDot,
                hasAnyError && styles.footnoteDotError,
              ]}
            />
          </View>
        </View>
      </ScrollView>
    </LedgerPage>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  topHeader: {
    marginBottom: 6,
  },
  folioMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.rule,
  },
  folioMeta: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  mastheadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
  },
  cancelBtn: {
    paddingVertical: 2,
  },
  cancelBtnText: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: 12,
    color: theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: theme.fonts.serifSemiBold,
    fontSize: 24,
    color: theme.colors.ink,
    letterSpacing: -0.3,
  },
  statusBadge: {
    borderWidth: 1.5,
    borderColor: theme.colors.muted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    transform: [{ rotate: '-4deg' }],
  },
  statusBadgeRejected: {
    borderColor: theme.colors.marginRed,
  },
  statusBadgeText: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statusBadgeTextRejected: {
    color: theme.colors.marginRed,
  },
  formCode: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 10,
    color: theme.colors.marginRed,
    letterSpacing: 1,
  },
  primaryBoundaryRule: {
    width: '100%',
    height: 1.5,
    backgroundColor: theme.colors.ink,
    marginBottom: theme.spacing.md,
  },
  generalErrorBox: {
    backgroundColor: '#FAF3E4',
    borderWidth: 1,
    borderColor: theme.colors.marginRed,
    padding: 8,
    marginBottom: theme.spacing.md,
  },
  generalErrorText: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 11,
    color: theme.colors.marginRed,
    textAlign: 'center',
  },
  formContent: {
    gap: 18,
    paddingBottom: 24,
  },
  fieldBlock: {
    width: '100%',
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  fieldLabel: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: 11,
    color: theme.colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  fieldLabelError: {
    color: theme.colors.marginRed,
  },
  fieldLabelRight: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputRowUnderline: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.ink,
    paddingVertical: 4,
  },
  inputRowUnderlineError: {
    borderBottomColor: theme.colors.marginRed,
  },
  textInputMain: {
    fontFamily: theme.fonts.serifSemiBold,
    fontSize: 20,
    color: theme.colors.ink,
    paddingVertical: 2,
    margin: 0,
  },
  textInputError: {
    color: theme.colors.marginRed,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.ink,
    paddingVertical: 2,
  },
  rupeePrefix: {
    fontFamily: theme.fonts.serifSemiBold,
    fontSize: 28,
    color: theme.colors.ink,
    marginRight: 6,
  },
  rupeePrefixError: {
    color: theme.colors.marginRed,
  },
  amountInputText: {
    flex: 1,
    fontFamily: theme.fonts.serifSemiBold,
    fontSize: 28,
    color: theme.colors.ink,
    paddingVertical: 0,
    margin: 0,
  },
  amountInputTextError: {
    color: theme.colors.marginRed,
  },
  amountMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  debitItemBadge: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 10,
    color: theme.colors.marginRed,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  dateSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.ink,
    paddingVertical: 8,
  },
  dateValueWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarIcon: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 12,
    color: theme.colors.ink,
  },
  dateDisplayText: {
    fontFamily: theme.fonts.monoSemiBold,
    fontSize: 14,
    color: theme.colors.ink,
    letterSpacing: 0.5,
  },
  changeDateLink: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 11,
    color: theme.colors.marginRed,
    textDecorationLine: 'underline',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  fieldHint: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  fieldErrorText: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 11,
    color: theme.colors.marginRed,
    marginTop: 4,
    letterSpacing: 0.4,
  },
  voucherAttachedBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF3E4',
    borderWidth: 1,
    borderColor: theme.colors.ink,
    padding: 10,
  },
  voucherLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  voucherThumbnailWrapper: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: theme.colors.ink,
    backgroundColor: theme.colors.paper,
    overflow: 'hidden',
  },
  voucherThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  voucherInfo: {
    flex: 1,
  },
  voucherFilename: {
    fontFamily: theme.fonts.monoMedium,
    fontSize: 12,
    color: theme.colors.ink,
  },
  voucherSubText: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  removeVoucherBtn: {
    paddingLeft: 8,
  },
  removeVoucherText: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 11,
    color: theme.colors.marginRed,
    textDecorationLine: 'underline',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  attachPhotoBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF3E4',
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: 2,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  attachLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachIcon: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 14,
    color: theme.colors.ink,
  },
  attachTitle: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 12,
    color: theme.colors.ink,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  attachTypes: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 0.4,
  },
  submitSection: {
    marginTop: 8,
    gap: 8,
  },
  submitBtn: {
    backgroundColor: theme.colors.ink,
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: 2,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submittingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: theme.fonts.monoBold,
    fontSize: 14,
    color: '#FFF9EE',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  footnoteRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingTop: 2,
  },
  footnoteDot: {
    width: 5,
    height: 5,
    backgroundColor: theme.colors.muted,
  },
  footnoteDotError: {
    backgroundColor: theme.colors.marginRed,
  },
  footnoteText: {
    fontFamily: theme.fonts.mono,
    fontSize: 10,
    color: theme.colors.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  footnoteTextError: {
    color: theme.colors.marginRed,
    fontFamily: theme.fonts.monoBold,
  },
});
