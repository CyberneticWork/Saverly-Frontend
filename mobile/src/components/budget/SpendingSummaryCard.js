import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, shadows, spacing } from '../../theme';
import DonutChart from './DonutChart';

const DEFAULT_MONTHLY_CATEGORIES = [
  { name: 'Pantry & Dry Goods', amount: 8400, count: 4, percentage: 45, color: '#00A3FF' },
  { name: 'Dairy & Eggs', amount: 4200, count: 3, percentage: 23, color: '#FF9F1C' },
  { name: 'Fruits & Vegetables', amount: 3100, count: 5, percentage: 17, color: '#10B981' },
  { name: 'Meat & Seafood', amount: 2800, count: 2, percentage: 15, color: '#E91E63' },
];

const DEFAULT_WEEKLY_CATEGORIES = [
  { name: 'Pantry & Dry Goods', amount: 2400, count: 1, percentage: 44, color: '#00A3FF' },
  { name: 'Dairy & Eggs', amount: 1200, count: 2, percentage: 22, color: '#FF9F1C' },
  { name: 'Fruits & Vegetables', amount: 1050, count: 2, percentage: 19, color: '#10B981' },
  { name: 'Beverages', amount: 850, count: 1, percentage: 15, color: '#E91E63' },
];

export default function SpendingSummaryCard({
  budgetData,
  activePeriod,
  onPeriodChange,
  onOpenAnalytics,
}) {
  const [internalPeriod, setInternalPeriod] = useState('MONTHLY');
  const [chartType, setChartType] = useState('donut'); // 'donut' or 'bar'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const period = activePeriod || internalPeriod;

  const handlePeriodToggle = (p) => {
    if (onPeriodChange) onPeriodChange(p);
    else setInternalPeriod(p);
  };

  const isMonthly = period === 'MONTHLY';
  const periodData = isMonthly ? budgetData?.monthly : budgetData?.weekly;

  const totalSpent = periodData?.spent ?? (budgetData?.spent ?? (isMonthly ? 18500 : 5500));
  const serverCategories = periodData?.categories || budgetData?.categories;
  const categories = Array.isArray(serverCategories) && serverCategories.length > 0
    ? serverCategories
    : (isMonthly ? DEFAULT_MONTHLY_CATEGORIES : DEFAULT_WEEKLY_CATEGORIES);

  const comparison = periodData?.comparison || budgetData?.comparison || {
    previousSpent: isMonthly ? 20600 : 6200,
    difference: isMonthly ? -2100 : -700,
    percentageChange: isMonthly ? -10 : -11,
    trend: 'lower',
    periodLabel: isMonthly ? 'last month' : 'last week',
  };

  const formatRs = (num) => {
    if (num === null || num === undefined) return 'Rs. 0';
    return `Rs. ${Number(num).toLocaleString()}`;
  };

  const getCategoryIcon = (catName = '') => {
    const lower = catName.toLowerCase();
    if (lower.includes('pantry') || lower.includes('dry') || lower.includes('rice')) return 'nutrition-outline';
    if (lower.includes('dairy') || lower.includes('egg') || lower.includes('milk')) return 'cube-outline';
    if (lower.includes('fruit') || lower.includes('veg')) return 'leaf-outline';
    if (lower.includes('meat') || lower.includes('fish') || lower.includes('seafood')) return 'restaurant-outline';
    if (lower.includes('bakery') || lower.includes('bread')) return 'basket-outline';
    if (lower.includes('beverage') || lower.includes('drink')) return 'cafe-outline';
    if (lower.includes('snack')) return 'ice-cream-outline';
    return 'pricetag-outline';
  };

  return (
    <View style={styles.card}>
      {/* Top Header Row with Period Toggle */}
      <View style={styles.headerRow}>
        <View style={styles.titleWithIcon}>
          <View style={styles.iconCircle}>
            <Ionicons name="bar-chart-outline" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.title}>Spending Summary</Text>
            <Text style={styles.subtitle}>
              {isMonthly ? 'Monthly Category Breakdown' : 'Weekly Category Breakdown'}
            </Text>
          </View>
        </View>

        {/* Toggle Pill */}
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
      </View>

      {/* Total Spending & Period Comparison Header */}
      <View style={styles.totalRow}>
        <View>
          <Text style={styles.totalLabel}>
            {isMonthly ? 'Total Spent This Month' : 'Total Spent This Week'}
          </Text>
          <Text style={styles.totalAmount}>{formatRs(totalSpent)}</Text>
        </View>

        {/* Previous Period Comparison Badge */}
        {Boolean(comparison) && (
          <View
            style={[
              styles.comparisonPill,
              comparison.trend === 'lower' && styles.comparisonPillLower,
              comparison.trend === 'higher' && styles.comparisonPillHigher,
              comparison.trend === 'first_period' && styles.comparisonPillNeutral,
            ]}
          >
            {comparison.trend === 'lower' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="trending-down" size={14} color="#059669" />
                <Text style={styles.comparisonTextLower}>
                  {`${Math.abs(comparison.percentageChange || 0)}% less than ${comparison.periodLabel || 'last period'}`}
                </Text>
              </View>
            ) : comparison.trend === 'higher' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="trending-up" size={14} color="#DC2626" />
                <Text style={styles.comparisonTextHigher}>
                  {`+${Math.abs(comparison.percentageChange || 0)}% vs ${comparison.periodLabel || 'last period'}`}
                </Text>
              </View>
            ) : comparison.trend === 'first_period' ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="sparkles" size={13} color={colors.primary} />
                <Text style={styles.comparisonTextNeutral}>Initial baseline</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* Spending Breakdown with Graph Toggle (Donut vs Bar) */}
      <View style={styles.categorySection}>
        <View style={styles.categorySectionHeader}>
          <View>
            <Text style={styles.categorySectionTitle}>Spending Breakdown</Text>
            <Text style={styles.categorySectionCount}>{categories.length} categories</Text>
          </View>

          <View style={styles.chartControlsRow}>
            {/* Donut vs Bar Switcher */}
            <View style={styles.chartTypePill}>
              <TouchableOpacity
                style={[styles.chartTypeBtn, chartType === 'donut' && styles.chartTypeBtnActive]}
                onPress={() => setChartType('donut')}
              >
                <Ionicons
                  name="pie-chart"
                  size={12}
                  color={chartType === 'donut' ? '#fff' : colors.textLight}
                />
                <Text
                  style={[
                    styles.chartTypeText,
                    chartType === 'donut' && styles.chartTypeTextActive,
                  ]}
                >
                  Graph
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.chartTypeBtn, chartType === 'bar' && styles.chartTypeBtnActive]}
                onPress={() => setChartType('bar')}
              >
                <Ionicons
                  name="stats-chart"
                  size={12}
                  color={chartType === 'bar' ? '#fff' : colors.textLight}
                />
                <Text
                  style={[
                    styles.chartTypeText,
                    chartType === 'bar' && styles.chartTypeTextActive,
                  ]}
                >
                  Bars
                </Text>
              </TouchableOpacity>
            </View>

            {/* Direct Link to Budget & Analytics Full Screen */}
            {Boolean(onOpenAnalytics) ? (
              <TouchableOpacity
                style={styles.fullAnalyticsBtn}
                onPress={onOpenAnalytics}
                activeOpacity={0.7}
              >
                <Ionicons name="open-outline" size={14} color={colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* View 1: SVG Donut Chart Mode (Reference Design from Screenshot) */}
        {chartType === 'donut' ? (
          <View style={styles.donutViewWrap}>
            <DonutChart
              categories={categories}
              size={155}
              innerRadius={40}
              outerRadius={68}
              showLegend={true}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />

            {/* Category breakdown item cards underneath Donut */}
            <View style={styles.donutChipsGrid}>
              {categories.map((cat, idx) => {
                const iconName = getCategoryIcon(cat.name);
                const color = cat.color || colors.primary;
                const isSelected = selectedCategory?.name === cat.name;

                return (
                  <TouchableOpacity
                    key={`chip-${cat.name}-${idx}`}
                    style={[
                      styles.donutChip,
                      categories.length === 1 && { width: '100%' },
                      isSelected && {
                        borderColor: color,
                        backgroundColor: `${color}10`,
                        borderWidth: 1.5,
                      },
                    ]}
                    onPress={() => setSelectedCategory(isSelected ? null : cat)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.donutChipHeader}>
                      <View style={[styles.donutChipIcon, { backgroundColor: `${color}18` }]}>
                        <Ionicons name={iconName} size={15} color={color} />
                      </View>
                      <View style={[styles.donutChipBadge, { backgroundColor: `${color}15` }]}>
                        <Text style={[styles.donutChipBadgeText, { color }]}>{cat.percentage}%</Text>
                      </View>
                    </View>
                    <Text style={styles.donutChipName} numberOfLines={2}>
                      {cat.name}
                    </Text>
                    <Text style={styles.donutChipAmount}>
                      {formatRs(cat.amount)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          /* View 2: Horizontal Bar Chart Mode */
          <View style={styles.categoryList}>
            {categories.map((cat, idx) => {
              const barWidth = Math.min(100, Math.max(4, cat.percentage || 0));
              const iconName = getCategoryIcon(cat.name);
              const color = cat.color || colors.primary;

              return (
                <View key={`${cat.name}-${idx}`} style={styles.categoryItem}>
                  {/* Category Header: Name + Amount & Percentage */}
                  <View style={styles.categoryHeader}>
                    <View style={styles.catLeftGroup}>
                      <View style={[styles.catIconWrap, { backgroundColor: `${color}15` }]}>
                        <Ionicons name={iconName} size={14} color={color} />
                      </View>
                      <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                      {cat.count > 0 && (
                        <Text style={styles.catCount}>({cat.count})</Text>
                      )}
                    </View>

                    <View style={styles.catRightGroup}>
                      <Text style={styles.catAmount}>{formatRs(cat.amount)}</Text>
                      <Text style={styles.catPercentage}>{cat.percentage}%</Text>
                    </View>
                  </View>

                  {/* Simple Horizontal Progress Bar */}
                  <View style={styles.catTrack}>
                    <View
                      style={[
                        styles.catBarFill,
                        {
                          width: `${barWidth}%`,
                          backgroundColor: color,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Educational Note */}
      <View style={styles.footerNote}>
        <Ionicons name="information-circle-outline" size={14} color={colors.textLight} />
        <Text style={styles.footerNoteText}>
          Categorized automatically from OCR receipt scans & logged items
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginHorizontal: 20,
    marginTop: 20,
    ...shadows.md,
    borderWidth: 1,
    borderColor: '#E8F2ED',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
  title: {
    ...typography.h4,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 11.5,
    color: colors.textLight,
    fontWeight: '500',
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    backgroundColor: '#F8FBF9',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#EDF5F1',
  },
  totalLabel: {
    fontSize: 11.5,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  comparisonPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: '#fff',
    ...shadows.sm,
  },
  comparisonPillLower: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  comparisonPillHigher: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  comparisonPillNeutral: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
  },
  comparisonTextLower: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  comparisonTextHigher: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  comparisonTextNeutral: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  categorySection: {
    gap: 12,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categorySectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  categorySectionCount: {
    fontSize: 11.5,
    color: colors.textLight,
    fontWeight: '500',
  },
  categoryList: {
    gap: 12,
  },
  categoryItem: {
    gap: 6,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  catIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    maxWidth: 160,
  },
  catCount: {
    fontSize: 11,
    color: colors.textLight,
  },
  catRightGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  catPercentage: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    minWidth: 26,
    textAlign: 'right',
  },
  catTrack: {
    height: 7,
    backgroundColor: '#EEF3F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  catBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F2F6F4',
  },
  footerNoteText: {
    fontSize: 11,
    color: colors.textLight,
    flex: 1,
  },

  // Donut & Chart Mode Controls
  chartControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartTypePill: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F3',
    borderRadius: 10,
    padding: 2.5,
  },
  chartTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chartTypeBtnActive: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  chartTypeText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chartTypeTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  fullAnalyticsBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutViewWrap: {
    alignItems: 'center',
    marginTop: 4,
  },
  donutChipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
    marginTop: 16,
    width: '100%',
  },
  donutChip: {
    width: '48.5%',
    backgroundColor: '#F9FAF9',
    borderWidth: 1.5,
    borderColor: '#E8EFEA',
    borderRadius: 14,
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 96,
  },
  donutChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  donutChipIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutChipBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
  },
  donutChipBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  donutChipName: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 16,
    minHeight: 32,
    marginBottom: 4,
  },
  donutChipAmount: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#111827',
  },
});
