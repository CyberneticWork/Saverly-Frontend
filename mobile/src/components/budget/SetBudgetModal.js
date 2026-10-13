import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, shadows, spacing } from '../../theme';
import { budgetAPI } from '../../services/api';

const WEEKLY_PRESETS = [5000, 10000, 15000, 25000, 40000];
const MONTHLY_PRESETS = [25000, 50000, 75000, 100000, 150000];

export default function SetBudgetModal({ visible, onClose, onBudgetSaved, currentBudget, initialPeriod }) {
  const [period, setPeriod] = useState(initialPeriod || 'MONTHLY');
  const [amount, setAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const parseAmount = (val) => {
    if (!val) return 0;
    const cleaned = String(val).replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  const isUpdating = Boolean(
    currentBudget?.monthly?.limit ||
    currentBudget?.weekly?.limit ||
    currentBudget?.budget?.monthlyLimit ||
    currentBudget?.budget?.weeklyLimit ||
    currentBudget?.limit
  );

  useEffect(() => {
    if (visible) {
      setErrorMessage('');
      const pref = initialPeriod || currentBudget?.preferredPeriod || currentBudget?.period || 'MONTHLY';
      setPeriod(pref);

      let initialVal = '';
      if (pref === 'MONTHLY' && (currentBudget?.monthly?.limit || currentBudget?.budget?.monthlyLimit)) {
        initialVal = String(currentBudget.monthly?.limit || currentBudget.budget?.monthlyLimit);
      } else if (pref === 'WEEKLY' && (currentBudget?.weekly?.limit || currentBudget?.budget?.weeklyLimit)) {
        initialVal = String(currentBudget.weekly?.limit || currentBudget.budget?.weeklyLimit);
      } else if (currentBudget?.limit) {
        initialVal = String(currentBudget.limit);
      } else {
        // Sensible default prefill so the user is never confused by an empty input with a placeholder
        initialVal = pref === 'MONTHLY' ? '50000' : '15000';
      }
      setAmount(initialVal);
    }
  }, [visible, currentBudget, initialPeriod]);

  const numAmount = parseAmount(amount);
  const presets = period === 'WEEKLY' ? WEEKLY_PRESETS : MONTHLY_PRESETS;

  const handlePeriodToggle = (newPeriod) => {
    if (newPeriod === period) return;
    setPeriod(newPeriod);
    setErrorMessage('');
    const currentNum = parseAmount(amount);
    if (currentNum > 0) {
      if (newPeriod === 'WEEKLY' && period === 'MONTHLY') {
        setAmount(String(Math.round(currentNum / 4)));
      } else if (newPeriod === 'MONTHLY' && period === 'WEEKLY') {
        setAmount(String(Math.round(currentNum * 4)));
      }
    } else {
      setAmount(newPeriod === 'MONTHLY' ? '50000' : '15000');
    }
  };

  const handleSave = async () => {
    const validAmount = parseAmount(amount);
    if (!validAmount || validAmount <= 0) {
      const msg = 'Please enter a valid budget amount in Rs.';
      setErrorMessage(msg);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      } else {
        Alert.alert('Invalid Amount', msg);
      }
      return;
    }

    setErrorMessage('');
    setIsSaving(true);
    try {
      const payload = {
        period,
        amount: validAmount,
        currency: 'LKR',
      };
      const res = await budgetAPI.setBudget(payload);
      const savedData = res?.data?.data || res?.data;
      if (onBudgetSaved) {
        onBudgetSaved(savedData);
      }
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save budget.';
      setErrorMessage(msg);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.alert) {
        window.alert(msg);
      } else {
        Alert.alert('Error', msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconBadge}>
                <Ionicons name="wallet-outline" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>{isUpdating ? 'Update Grocery Budget' : 'Set Grocery Budget'}</Text>
                <Text style={styles.subtitle}>
                  {isUpdating ? 'Modify your spending target' : 'Track spending against target'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Period Segmented Control */}
            <View style={styles.periodContainer}>
              <TouchableOpacity
                style={[styles.periodBtn, period === 'MONTHLY' && styles.periodBtnActive]}
                onPress={() => handlePeriodToggle('MONTHLY')}
              >
                <Ionicons
                  name="calendar"
                  size={16}
                  color={period === 'MONTHLY' ? '#fff' : colors.textSecondary}
                />
                <Text style={[styles.periodText, period === 'MONTHLY' && styles.periodTextActive]}>
                  Monthly
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.periodBtn, period === 'WEEKLY' && styles.periodBtnActive]}
                onPress={() => handlePeriodToggle('WEEKLY')}
              >
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={period === 'WEEKLY' ? '#fff' : colors.textSecondary}
                />
                <Text style={[styles.periodText, period === 'WEEKLY' && styles.periodTextActive]}>
                  Weekly
                </Text>
              </TouchableOpacity>
            </View>

            {/* Amount Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.label}>
                {period === 'MONTHLY' ? 'Monthly Budget Limit' : 'Weekly Budget Limit'}
              </Text>
              <View style={styles.inputRow}>
                <Text style={styles.currencyPrefix}>Rs.</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="numeric"
                  placeholder={period === 'MONTHLY' ? '50,000' : '15,000'}
                  placeholderTextColor={colors.textLight}
                  value={amount}
                  onChangeText={(val) => {
                    setAmount(val);
                    if (errorMessage) setErrorMessage('');
                  }}
                  autoFocus
                />
              </View>
            </View>

            {/* Quick Presets */}
            <View style={styles.presetsSection}>
              <Text style={styles.presetsLabel}>Quick Presets:</Text>
              <View style={styles.presetsRow}>
                {presets.map((preset) => (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.presetChip, numAmount === preset && styles.presetChipActive]}
                    onPress={() => {
                      setAmount(String(preset));
                      if (errorMessage) setErrorMessage('');
                    }}
                  >
                    <Text
                      style={[styles.presetText, numAmount === preset && styles.presetTextActive]}
                    >
                      {preset >= 1000 ? `Rs. ${preset / 1000}k` : `Rs. ${preset}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Projection Note */}
            {numAmount > 0 && (
              <View style={styles.projectionCard}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.projectionText}>
                  {period === 'MONTHLY'
                    ? `Equivalent to approx. Rs. ${Math.round(numAmount / 4).toLocaleString()} / week`
                    : `Equivalent to approx. Rs. ${(numAmount * 4).toLocaleString()} / month`}
                </Text>
              </View>
            )}

            {/* Error Message Display */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={16} color="#DC2626" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Actions */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onClose}
                disabled={isSaving}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.saveText}>{isUpdating ? 'Update Budget' : 'Save Budget'}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 35, 30, 0.65)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h4,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F7F4',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  periodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  periodBtnActive: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  periodTextActive: {
    color: '#fff',
  },
  inputWrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    height: 52,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  presetsSection: {
    marginBottom: 16,
  },
  presetsLabel: {
    fontSize: 12,
    color: colors.textLight,
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F3F6F5',
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  presetChipActive: {
    backgroundColor: colors.primaryFaded,
    borderColor: colors.primary,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  projectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryFaded,
    padding: 12,
    borderRadius: 14,
    marginBottom: 20,
  },
  projectionText: {
    flex: 1,
    fontSize: 12.5,
    color: colors.primaryDark,
    lineHeight: 18,
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1.6,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
});
