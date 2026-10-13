import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, shadows, spacing } from '../../theme';

export default function RecentExpensesSection({
  expenses = [],
  onSelectExpense,
  onOpenAddExpense,
  onViewAll,
}) {
  const formatRs = (num) => {
    if (num === null || num === undefined) return 'Rs. 0';
    return `Rs. ${Number(num).toLocaleString()}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <View style={styles.section}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={styles.iconCircle}>
            <Ionicons name="receipt-outline" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            <Text style={styles.sectionSubtitle}>Tracked items & grocery purchases</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={onOpenAddExpense}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add Expenses</Text>
        </TouchableOpacity>
      </View>

      {/* Example Formula Highlight Banner */}
      <View style={styles.examplePill}>
        <Ionicons name="sparkles" size={13} color={colors.primary} />
        <Text style={styles.examplePillText} numberOfLines={1}>
          Recent: Rice — Rs. 2,400 · Keells · 10 Oct
        </Text>
      </View>

      {expenses.length === 0 ? (
        // Empty State
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="cart-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>No expenses logged yet</Text>
          <Text style={styles.emptyDesc}>
            Log grocery purchases manually to track item costs and stay within your budget.
          </Text>

          <View style={styles.emptyPreviewPill}>
            <Text style={styles.emptyPreviewText}>
              Example: Rice — Rs. 2,400 · Keells · 10 Oct
            </Text>
          </View>

          <TouchableOpacity style={styles.emptyActionBtn} onPress={onOpenAddExpense} activeOpacity={0.88}>
            <Ionicons name="add-circle" size={16} color="#fff" />
            <Text style={styles.emptyActionBtnText}>Add Item Manually</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // List of Expenses
        <View style={styles.expenseList}>
          {expenses.slice(0, 5).map((item, index) => {
            const formattedDate = formatDate(item.date);
            const store = item.storeName || 'Local Grocery';

            return (
              <TouchableOpacity
                key={item.id || `exp-${index}`}
                style={styles.expenseRow}
                onPress={() => onSelectExpense && onSelectExpense(item)}
                activeOpacity={0.78}
              >
                {/* Store / Category Icon */}
                <View style={styles.itemIconWrap}>
                  <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
                </View>

                {/* Main Item Info: Rice — Rs. 2,400 · Keells · 10 Oct */}
                <View style={styles.itemMainCol}>
                  <View style={styles.itemHeaderLine}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemAmount}>
                      {formatRs(item.amount)}
                    </Text>
                  </View>

                  <View style={styles.itemMetaLine}>
                    <View style={styles.storeTag}>
                      <Ionicons name="storefront-outline" size={11} color={colors.textSecondary} />
                      <Text style={styles.storeText} numberOfLines={1}>
                        {store}
                      </Text>
                    </View>
                    <Text style={styles.metaDot}>·</Text>
                    <View style={styles.dateTag}>
                      <Ionicons name="calendar-outline" size={11} color={colors.textLight} />
                      <Text style={styles.dateText}>{formattedDate}</Text>
                    </View>
                  </View>
                </View>

                {/* Chevron indicating details */}
                <Ionicons name="chevron-forward" size={16} color={colors.textLight} style={styles.chevron} />
              </TouchableOpacity>
            );
          })}

          {Boolean(onViewAll) ? (
            <TouchableOpacity style={styles.viewAllFooter} onPress={onViewAll} activeOpacity={0.8}>
              <Text style={styles.viewAllText}>View All Expenses</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 20,
    marginTop: 22,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.h4,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: colors.textLight,
    fontWeight: '500',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    gap: 4,
    ...shadows.sm,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  examplePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F9F6',
    borderWidth: 1,
    borderColor: '#D7ECE0',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  examplePillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primaryDark,
    letterSpacing: 0.2,
    flex: 1,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDF4F1',
    ...shadows.sm,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 14,
    marginBottom: 12,
    lineHeight: 17,
  },
  emptyPreviewPill: {
    backgroundColor: '#F7FAF8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2ECE7',
    marginBottom: 14,
  },
  emptyPreviewText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
  },
  emptyActionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  expenseList: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAF1ED',
    overflow: 'hidden',
    ...shadows.sm,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F6F4',
    gap: 12,
  },
  itemIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemMainCol: {
    flex: 1,
  },
  itemHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  itemMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  storeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  storeText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
    maxWidth: 130,
  },
  metaDot: {
    fontSize: 11,
    color: colors.textLight,
  },
  dateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dateText: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '500',
  },
  chevron: {
    marginLeft: 2,
  },
  viewAllFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
    backgroundColor: '#FAFCFB',
  },
  viewAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primary,
  },
});
