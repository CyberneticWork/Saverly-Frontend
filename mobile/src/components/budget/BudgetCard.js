import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, shadows, spacing } from '../../theme';

export default function BudgetCard({ budgetData, onOpenSetBudget, activePeriod, onPeriodChange }) {
  const [internalPeriod, setInternalPeriod] = useState('MONTHLY');
  const period = activePeriod || internalPeriod;

  const handlePeriodToggle = (newPeriod) => {
    if (onPeriodChange) onPeriodChange(newPeriod);
    else setInternalPeriod(newPeriod);
  };

  const isMonthly = period === 'MONTHLY';
  const metrics = isMonthly ? budgetData?.monthly : budgetData?.weekly;
  const rawLimit = metrics?.limit ?? (isMonthly
    ? (budgetData?.budget?.monthlyLimit ?? (budgetData?.preferredPeriod === 'MONTHLY' ? budgetData?.limit : null))
    : (budgetData?.budget?.weeklyLimit ?? (budgetData?.preferredPeriod === 'WEEKLY' ? budgetData?.limit : null)));
  const limit = rawLimit !== null && rawLimit !== undefined && !isNaN(Number(rawLimit)) ? Number(rawLimit) : null;
  const spent = Number(metrics?.spent ?? (budgetData?.spent ?? 0)) || 0;
  const remaining = metrics?.remaining !== null && metrics?.remaining !== undefined
    ? Number(metrics.remaining)
    : (limit !== null ? limit - spent : null);
  const percentage = metrics?.percentage !== null && metrics?.percentage !== undefined
    ? Number(metrics.percentage)
    : (limit && limit > 0 ? Math.round((spent / limit) * 100) : 0);
  const status = metrics?.status ?? (limit && limit > 0 ? (spent > limit ? 'exceeded' : (percentage >= 80 ? 'warning' : 'on_track')) : 'unset');
  const receiptCount = metrics?.receiptCount ?? 0;

  const hasBudget = limit !== null && limit > 0;

  // Status Styling & Indicators
  let statusBadgeBg = '#E6F6F0';
  let statusBadgeText = colors.primary;
  let statusLabel = 'On Track';
  let progressBarColor = colors.primary;

  if (status === 'exceeded' || (hasBudget && remaining !== null && remaining < 0)) {
    statusBadgeBg = '#FEE2E2';
    statusBadgeText = '#DC2626';
    statusLabel = 'Over Budget';
    progressBarColor = '#DC2626';
  } else if (status === 'warning' || percentage >= 80) {
    statusBadgeBg = '#FEF3C7';
    statusBadgeText = '#D97706';
    statusLabel = 'Near Limit';
    progressBarColor = '#D97706';
  }

  const formatRs = (num) => {
    if (num === null || num === undefined) return 'Rs. 0';
    return `Rs. ${Number(num).toLocaleString()}`;
  };

  return (
    <View style={styles.card}>
      {/* Top Bar: Title, Monthly/Weekly Switcher, and Quick Edit Button */}
      <View style={styles.topRow}>
        <View style={styles.titleWithIcon}>
          <View style={styles.iconCircle}>
            <Ionicons name="pie-chart" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.cardTitle}>Budget Overview</Text>
            <Text style={styles.cardSubTitle}>
              {isMonthly ? 'Monthly Grocery Budget' : 'Weekly Grocery Budget'}
            </Text>
          </View>
        </View>

        <View style={styles.topRightControls}>
          {/* Monthly / Weekly Toggle */}
          <View style={styles.togglePill}>
            <TouchableOpacity
              style={[styles.toggleBtn, isMonthly && styles.toggleBtnActive]}
              onPress={() => handlePeriodToggle('MONTHLY')}
            >
              <Text style={[styles.toggleText, isMonthly && styles.toggleTextActive]}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, !isMonthly && styles.toggleBtnActive]}
              onPress={() => handlePeriodToggle('WEEKLY')}
            >
              <Text style={[styles.toggleText, !isMonthly && styles.toggleTextActive]}>Weekly</Text>
            </TouchableOpacity>
          </View>

          {hasBudget && (
            <TouchableOpacity
              style={styles.editIconBtn}
              onPress={onOpenSetBudget}
              accessibilityLabel="Update Budget"
            >
              <Ionicons name="pencil" size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!hasBudget ? (
        // Unset State
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="wallet-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>
            No {isMonthly ? 'Monthly' : 'Weekly'} Budget Set
          </Text>
          <Text style={styles.emptyDesc}>
            Set your budget to automatically track spending against scanned receipts and stay on target.
          </Text>

          {/* Example Preview */}
          <View style={styles.previewBox}>
            <Text style={styles.previewHeading}>Example Overview:</Text>
            <Text style={styles.previewFormula}>
              Budget Rs. 50,000 · Spent Rs. 18,500 · Remaining Rs. 31,500
            </Text>
          </View>

          <TouchableOpacity style={styles.setBtn} onPress={onOpenSetBudget} activeOpacity={0.88}>
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.setBtnText}>Set {isMonthly ? 'Monthly' : 'Weekly'} Budget</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Active Budget State
        <View style={styles.content}>
          {/* Example Highlight Formula Banner */}
          <View style={styles.formulaBanner}>
            <Ionicons name="sparkles" size={13} color={colors.primary} />
            <Text style={styles.formulaText} numberOfLines={1}>
              Budget {formatRs(limit)} · Spent {formatRs(spent)} · Remaining {remaining !== null && remaining < 0 ? `-Rs. ${Math.abs(remaining).toLocaleString()}` : formatRs(remaining)}
            </Text>
          </View>

          {/* 3 Essential Stat Cards: Budget, Spent, Remaining */}
          <View style={styles.statGrid}>
            {/* 1. Monthly Budget */}
            <View style={[styles.statCard, styles.budgetCard]}>
              <View style={styles.statHeader}>
                <Ionicons name="wallet-outline" size={14} color={colors.primary} />
                <Text style={styles.statLabel}>{isMonthly ? 'Monthly Budget' : 'Weekly Budget'}</Text>
              </View>
              <Text style={styles.statValue} numberOfLines={1}>
                {formatRs(limit)}
              </Text>
              <Text style={styles.statSub}>Target limit</Text>
            </View>

            {/* 2. Total Amount Spent */}
            <View style={[styles.statCard, styles.spentCard]}>
              <View style={styles.statHeader}>
                <Ionicons name="receipt-outline" size={14} color="#D97706" />
                <Text style={styles.statLabel}>Total Spent</Text>
              </View>
              <Text style={[styles.statValue, { color: '#B45309' }]} numberOfLines={1}>
                {formatRs(spent)}
              </Text>
              <Text style={styles.statSub}>
                {receiptCount > 0 ? `${receiptCount} ${receiptCount === 1 ? 'receipt' : 'receipts'}` : 'Scanned receipts'}
              </Text>
            </View>

            {/* 3. Remaining Budget */}
            <View
              style={[
                styles.statCard,
                remaining !== null && remaining < 0 ? styles.overCard : styles.remainingCard,
              ]}
            >
              <View style={styles.statHeader}>
                <Ionicons
                  name={remaining !== null && remaining < 0 ? 'alert-circle-outline' : 'shield-checkmark-outline'}
                  size={14}
                  color={remaining !== null && remaining < 0 ? '#DC2626' : colors.primary}
                />
                <Text style={styles.statLabel}>Remaining</Text>
              </View>
              <Text
                style={[
                  styles.statValue,
                  { color: remaining !== null && remaining < 0 ? '#DC2626' : colors.primaryDark },
                ]}
                numberOfLines={1}
              >
                {remaining !== null && remaining < 0
                  ? `-Rs. ${Math.abs(remaining).toLocaleString()}`
                  : formatRs(remaining)}
              </Text>
              <Text style={styles.statSub}>
                {remaining !== null && remaining < 0 ? 'Over budget' : 'Available balance'}
              </Text>
            </View>
          </View>

          {/* 4. Progress Bar for Budget Usage */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeaderRow}>
              <View style={styles.progressLabelGroup}>
                <Text style={styles.progressTitle}>Budget Usage</Text>
                <Text style={styles.progressPercentText}>{percentage}%</Text>
              </View>

              <View style={[styles.statusBadge, { backgroundColor: statusBadgeBg }]}>
                <View style={[styles.statusDot, { backgroundColor: statusBadgeText }]} />
                <Text style={[styles.statusBadgeText, { color: statusBadgeText }]}>
                  {statusLabel}
                </Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(100, Math.max(0, percentage))}%`,
                    backgroundColor: progressBarColor,
                  },
                ]}
              />
            </View>

            <View style={styles.progressFooterRow}>
              <Text style={styles.progressFooterLeft}>
                {formatRs(spent)} of {formatRs(limit)} used
              </Text>
              <Text
                style={[
                  styles.progressFooterRight,
                  { color: remaining !== null && remaining < 0 ? '#DC2626' : colors.textSecondary },
                ]}
              >
                {remaining !== null && remaining < 0
                  ? `Rs. ${Math.abs(remaining).toLocaleString()} over limit`
                  : `${formatRs(remaining)} left`}
              </Text>
            </View>
          </View>

          {/* 5. Set or Update Budget Quick Action Button */}
          <View style={styles.footerActionRow}>
            <TouchableOpacity
              style={styles.updateActionBtn}
              onPress={onOpenSetBudget}
              activeOpacity={0.85}
            >
              <Ionicons name="options-outline" size={15} color={colors.primary} />
              <Text style={styles.updateActionText}>Update Budget Target</Text>
            </TouchableOpacity>

            {receiptCount > 0 && (
              <View style={styles.receiptMeta}>
                <Ionicons name="document-text-outline" size={13} color={colors.textLight} />
                <Text style={styles.receiptMetaText}>
                  {receiptCount} verified {receiptCount === 1 ? 'bill' : 'bills'}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginHorizontal: 20,
    marginTop: -20,
    ...shadows.md,
    borderWidth: 1,
    borderColor: '#E8F2ED',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    ...typography.h4,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardSubTitle: {
    fontSize: 11.5,
    color: colors.textLight,
    fontWeight: '500',
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  togglePill: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F3',
    borderRadius: 12,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
  },
  toggleBtnActive: {
    backgroundColor: '#fff',
    ...shadows.sm,
  },
  toggleText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  editIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  emptyIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12.5,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    lineHeight: 18,
  },
  previewBox: {
    backgroundColor: '#F7FAF8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 14,
    width: '100%',
  },
  previewHeading: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textLight,
    marginBottom: 2,
  },
  previewFormula: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  setBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 6,
    ...shadows.sm,
  },
  setBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    gap: 12,
  },
  formulaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F2F9F5',
    borderWidth: 1,
    borderColor: '#D7EBE1',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  formulaText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primaryDark,
    letterSpacing: 0.2,
    flex: 1,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  budgetCard: {
    backgroundColor: '#FAFCFB',
    borderColor: '#E2ECE7',
  },
  spentCard: {
    backgroundColor: '#FFFDF9',
    borderColor: '#FEE8C8',
  },
  remainingCard: {
    backgroundColor: '#F6FCF9',
    borderColor: '#D4EFE3',
  },
  overCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statValue: {
    fontSize: 14.5,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  statSub: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textLight,
  },
  progressSection: {
    backgroundColor: '#F9FCFA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDF5F1',
    padding: 12,
    gap: 8,
  },
  progressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabelGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  progressTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.text,
  },
  progressPercentText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E6ECE9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressFooterLeft: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  progressFooterRight: {
    fontSize: 11,
    fontWeight: '700',
  },
  footerActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  updateActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: colors.primaryFaded,
  },
  updateActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  receiptMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  receiptMetaText: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '500',
  },
});
