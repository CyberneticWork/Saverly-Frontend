import React from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, shadows, spacing } from '../../theme';

export default function ExpenseDetailsModal({
  visible,
  expense,
  onClose,
  onComparePrices,
  onViewReceipt,
  onDeleteExpense,
}) {
  if (!expense) return null;

  const formatDate = (d) => {
    if (!d) return 'Recent';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatRs = (num) => {
    if (num === null || num === undefined) return 'Rs. 0';
    return `Rs. ${Number(num).toLocaleString()}`;
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
              <View style={styles.iconCircle}>
                <Ionicons name="wallet-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Expense Details</Text>
                <Text style={styles.subtitle}>Saved grocery expense</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Amount Banner */}
            <View style={styles.amountCard}>
              <Text style={styles.amountLabel}>Total Amount</Text>
              <Text style={styles.amountValue}>{formatRs(expense.amount)}</Text>
              <View style={styles.badgeRow}>
                <View style={styles.statusPill}>
                  <Ionicons name="checkmark-circle" size={13} color={colors.primary} />
                  <Text style={styles.statusPillText}>
                    {expense.status === 'VERIFIED' ? 'Recorded Expense' : 'Pending'}
                  </Text>
                </View>
                <View style={styles.datePill}>
                  <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
                  <Text style={styles.datePillText}>{formatDate(expense.date)}</Text>
                </View>
              </View>
            </View>

            {/* Detail Rows */}
            <View style={styles.detailsGroup}>
              {/* Item Name */}
              <View style={styles.detailItem}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
                </View>
                <View style={styles.detailTextCol}>
                  <Text style={styles.detailLabel}>Item Name</Text>
                  <Text style={styles.detailValue}>{expense.name}</Text>
                </View>
              </View>

              {/* Supermarket / Store */}
              <View style={styles.detailItem}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="storefront-outline" size={16} color="#D97706" />
                </View>
                <View style={styles.detailTextCol}>
                  <Text style={styles.detailLabel}>Store / Supermarket</Text>
                  <Text style={styles.detailValue}>{expense.storeName || 'Local Grocery'}</Text>
                </View>
              </View>

              {/* Category */}
              <View style={styles.detailItem}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="grid-outline" size={16} color="#2563EB" />
                </View>
                <View style={styles.detailTextCol}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{expense.categoryName || 'Grocery'}</Text>
                </View>
              </View>

              {/* Quantity & Unit Price */}
              <View style={styles.detailItem}>
                <View style={styles.detailIconWrap}>
                  <Ionicons name="cube-outline" size={16} color="#7C3AED" />
                </View>
                <View style={styles.detailTextCol}>
                  <Text style={styles.detailLabel}>Quantity & Unit Price</Text>
                  <Text style={styles.detailValue}>
                    {expense.quantity || 1} {expense.unit || 'unit'} · {formatRs(expense.unitPrice || expense.amount)}
                  </Text>
                </View>
              </View>

              {/* Notes (if present) */}
              {!!expense.notes && (
                <View style={styles.detailItem}>
                  <View style={styles.detailIconWrap}>
                    <Ionicons name="document-text-outline" size={16} color="#059669" />
                  </View>
                  <View style={styles.detailTextCol}>
                    <Text style={styles.detailLabel}>Notes</Text>
                    <Text style={styles.detailValue}>{expense.notes}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsCol}>
              {Boolean(onComparePrices) ? (
                <TouchableOpacity
                  style={styles.compareBtn}
                  onPress={() => {
                    onClose();
                    onComparePrices(expense);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="git-compare-outline" size={18} color={colors.primary} />
                  <Text style={styles.compareBtnText}>Compare Price Across Supermarkets</Text>
                </TouchableOpacity>
              ) : null}

              {Boolean(!expense.isManual && expense.imageUrl && onViewReceipt) ? (
                <TouchableOpacity
                  style={styles.receiptBtn}
                  onPress={() => {
                    onClose();
                    onViewReceipt(expense.invoiceId);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
                  <Text style={styles.receiptBtnText}>View Scanned Receipt Bill</Text>
                </TouchableOpacity>
              ) : null}

              {Boolean(onDeleteExpense) ? (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => {
                    onClose();
                    onDeleteExpense(expense);
                  }}
                  activeOpacity={0.85}
                >
                  <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  <Text style={styles.deleteBtnText}>Delete Expense</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
                <Text style={styles.doneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Styles for ExpenseDetailsModal
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
    padding: 22,
    maxHeight: '85%',
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h4,
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    gap: 16,
    paddingBottom: 6,
  },
  amountCard: {
    backgroundColor: '#F3F9F6',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D7ECE0',
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryDark,
    marginVertical: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    ...shadows.sm,
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    ...shadows.sm,
  },
  datePillText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  detailsGroup: {
    backgroundColor: '#FAFCFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8F1EC',
    padding: 12,
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E4EDE8',
  },
  detailTextCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textLight,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },
  actionsCol: {
    gap: 10,
    marginTop: 4,
  },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primaryFaded,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#C7E7DA',
  },
  compareBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.primary,
  },
  receiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5F7F6',
    paddingVertical: 12,
    borderRadius: 14,
  },
  receiptBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#DC2626',
  },
  doneBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
