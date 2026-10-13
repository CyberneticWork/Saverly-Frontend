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

export default function SetBudgetModal({ visible, onClose, onBudgetSaved, currentBudget }) {
  const [period, setPeriod] = useState('MONTHLY');
  const [amount, setAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isUpdating = Boolean(
    currentBudget?.monthly?.limit ||
    currentBudget?.weekly?.limit ||
    currentBudget?.limit
  );

  useEffect(() => {
    if (visible && currentBudget) {
      const pref = currentBudget.preferredPeriod || currentBudget.period || 'MONTHLY';
      setPeriod(pref);
      if (pref === 'MONTHLY' && currentBudget.monthly?.limit) {
        setAmount(String(currentBudget.monthly.limit));
      } else if (pref === 'WEEKLY' && currentBudget.weekly?.limit) {
        setAmount(String(currentBudget.weekly.limit));
      } else if (currentBudget.limit) {
        setAmount(String(currentBudget.limit));
      } else {
        setAmount('');
      }
    } else if (visible) {
      setPeriod('MONTHLY');
      setAmount('');
    }
  }, [visible, currentBudget]);

  const numAmount = parseFloat(amount) || 0;
  const presets = period === 'WEEKLY' ? WEEKLY_PRESETS : MONTHLY_PRESETS;

  const handleSave = async () => {
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid budget amount in Rs.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        period,
        amount: numAmount,
        currency: 'LKR',
      };
      const res = await budgetAPI.setBudget(payload);
      if (onBudgetSaved) {
        onBudgetSaved(res.data.data);
      }
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save budget.';
      Alert.alert('Error', msg);
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
                onPress={() => setPeriod('MONTHLY')}
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
                onPress={() => setPeriod('WEEKLY')}
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
                  onChangeText={setAmount}
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
                    onPress={() => setAmount(String(preset))}
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
});
