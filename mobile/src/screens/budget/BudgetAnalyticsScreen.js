import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { budgetAPI } from '../../services/api';
import { colors, typography, shadows } from '../../theme';
import DonutChart from '../../components/budget/DonutChart';
import SetBudgetModal from '../../components/budget/SetBudgetModal';

const { width } = Dimensions.get('window');

const FALLBACK_CATEGORIES = [
  { name: 'Transport', amount: 9990, percentage: 37, color: '#00A3FF', icon: 'bus-outline' },
  { name: 'Food', amount: 7560, percentage: 28, color: '#FF9F1C', icon: 'restaurant-outline' },
  { name: 'Shopping', amount: 5400, percentage: 20, color: '#E91E63', icon: 'cart-outline' },
  { name: 'Bills', amount: 4050, percentage: 15, color: '#FF3B30', icon: 'receipt-outline' },
];

export default function BudgetAnalyticsScreen({ navigation }) {
  const [budgetData, setBudgetData] = useState(null);
  const [activePeriod, setActivePeriod] = useState('MONTHLY');
  const [showEditBudgetModal, setShowEditBudgetModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const res = await budgetAPI.getCurrent().catch(() => null);
      if (res?.data?.data) {
        setBudgetData(res.data.data);
        if (res.data.data.preferredPeriod) {
          setActivePeriod(res.data.data.preferredPeriod);
        }
      }
    } catch (err) {
      console.warn('BudgetAnalytics load error:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const isMonthly = activePeriod === 'MONTHLY';
  const periodData = isMonthly ? budgetData?.monthly : budgetData?.weekly;

  const totalBudget = periodData?.amount ?? (budgetData?.amount ?? (isMonthly ? 50000 : 15000));
  const totalSpent = periodData?.spent ?? (budgetData?.spent ?? (isMonthly ? 18500 : 5500));
  const remainingBudget = Math.max(0, totalBudget - totalSpent);
  const percentUsed = Math.min(100, Math.round((totalSpent / (totalBudget || 1)) * 100));

  const serverCategories = periodData?.categories || budgetData?.categories;
  const categories = Array.isArray(serverCategories) && serverCategories.length > 0
    ? serverCategories.map((c, i) => ({
        ...c,
        color: c.color || PALETTE[i % PALETTE.length],
        icon: getCategoryIcon(c.name),
      }))
    : FALLBACK_CATEGORIES;

  const formatRs = (num) => {
    if (num === null || num === undefined) return 'Rs. 0';
    return `Rs. ${Number(num).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home', { screen: 'HomeMain' });
            }
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Budget & Analytics</Text>
        <View style={styles.periodPill}>
          <TouchableOpacity
            style={[styles.periodOption, isMonthly && styles.periodOptionActive]}
            onPress={() => setActivePeriod('MONTHLY')}
          >
            <Text style={[styles.periodText, isMonthly && styles.periodTextActive]}>M</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodOption, !isMonthly && styles.periodOptionActive]}
            onPress={() => setActivePeriod('WEEKLY')}
          >
            <Text style={[styles.periodText, !isMonthly && styles.periodTextActive]}>W</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Remaining Budget Card (Matching Reference Design) */}
        <View style={styles.budgetCard}>
          <Text style={styles.remainingLabel}>Remaining Budget</Text>
          <Text style={styles.remainingAmount}>{formatRs(remainingBudget)}</Text>

          {/* Budget Usage Progress Bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percentUsed}%` }]} />
          </View>

          {/* Budget vs Spent Row */}
          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Total Budget</Text>
              <Text style={styles.statValue}>{formatRs(totalBudget)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCol}>
              <Text style={styles.statLabel}>Total Spent</Text>
              <Text style={styles.statValue}>{formatRs(totalSpent)}</Text>
            </View>
          </View>
        </View>

        {/* Section: Spending Breakdown */}
        <View style={styles.breakdownSection}>
          <View style={styles.breakdownHeaderRow}>
            <Text style={styles.sectionTitle}>Spending Breakdown</Text>
            <Text style={styles.sectionSubtitle}>
              {isMonthly ? 'This Month' : 'This Week'}
            </Text>
          </View>

          {/* Donut Chart with Side Legend */}
          <View style={styles.chartCard}>
            <DonutChart
              categories={categories}
              size={180}
              innerRadius={48}
              outerRadius={78}
              showLegend={true}
              onSelectCategory={setSelectedCategory}
            />
          </View>

          {/* Category List Cards (Matching Reference Layout) */}
          <View style={styles.categoryList}>
            {categories.map((cat, idx) => {
              const iconName = cat.icon || getCategoryIcon(cat.name);
              const isSelected = selectedCategory?.name === cat.name;

              return (
                <TouchableOpacity
                  key={`item-${cat.name}-${idx}`}
                  style={[
                    styles.catCard,
                    isSelected && { borderColor: cat.color, backgroundColor: `${cat.color}08` },
                  ]}
                  onPress={() => setSelectedCategory(isSelected ? null : cat)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.catIconWrap, { backgroundColor: `${cat.color}20` }]}>
                    <Ionicons name={iconName} size={20} color={cat.color} />
                  </View>

                  <View style={styles.catInfoWrap}>
                    <Text style={styles.catName} numberOfLines={1}>
                      {cat.name}
                    </Text>
                    <Text style={styles.catPercent}>
                      {cat.percentage ? `${cat.percentage}%` : '0%'}
                    </Text>
                  </View>

                  <View style={styles.catAmountWrap}>
                    <Text style={styles.catAmountText}>
                      {formatRs(cat.amount)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating "Edit Budget" Button (Matching Reference Design) */}
      <View style={styles.floatingButtonContainer}>
        <TouchableOpacity
          style={styles.editBudgetBtn}
          onPress={() => setShowEditBudgetModal(true)}
          activeOpacity={0.88}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.editBudgetBtnText}>Edit Budget</Text>
        </TouchableOpacity>
      </View>

      {/* Set / Edit Budget Modal */}
      <SetBudgetModal
        visible={showEditBudgetModal}
        currentBudget={budgetData}
        onBudgetSaved={(updated) => {
          setBudgetData(updated);
          setShowEditBudgetModal(false);
          loadData();
        }}
        onClose={() => setShowEditBudgetModal(false)}
      />
    </SafeAreaView>
  );
}

const PALETTE = [
  '#00A3FF', // Transport (Blue)
  '#FF9F1C', // Food (Orange)
  '#E91E63', // Shopping (Pink)
  '#FF3B30', // Bills (Red)
  '#10B981', // Groceries (Green)
  '#8B5CF6', // Dairy (Purple)
];

function getCategoryIcon(catName = '') {
  const lower = catName.toLowerCase();
  if (lower.includes('transport') || lower.includes('travel') || lower.includes('bus')) return 'bus-outline';
  if (lower.includes('food') || lower.includes('dining') || lower.includes('meal')) return 'restaurant-outline';
  if (lower.includes('shop') || lower.includes('market') || lower.includes('keells') || lower.includes('cargills')) return 'cart-outline';
  if (lower.includes('bill') || lower.includes('util') || lower.includes('elect')) return 'receipt-outline';
  if (lower.includes('pantry') || lower.includes('dry') || lower.includes('rice')) return 'nutrition-outline';
  if (lower.includes('dairy') || lower.includes('milk') || lower.includes('egg')) return 'cube-outline';
  if (lower.includes('fruit') || lower.includes('veg')) return 'leaf-outline';
  if (lower.includes('meat') || lower.includes('fish')) return 'fish-outline';
  return 'pricetag-outline';
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F7F9FA',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F7F9FA',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  periodPill: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 14,
    padding: 3,
  },
  periodOption: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 11,
  },
  periodOptionActive: {
    backgroundColor: '#fff',
    ...shadows.sm,
  },
  periodText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
  },
  periodTextActive: {
    color: colors.primary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  // Remaining Budget Card
  budgetCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    ...shadows.sm,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  remainingLabel: {
    fontSize: 13,
    color: colors.textLight,
    fontWeight: '600',
    marginBottom: 4,
  },
  remainingAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#059669', // Vibrant Green like in screenshot
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  progressTrack: {
    width: '100%',
    height: 9,
    backgroundColor: '#EEF2F6',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 18,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1', // Indigo / Purple bar like reference
    borderRadius: 5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '600',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },

  // Spending Breakdown Section
  breakdownSection: {
    marginTop: 22,
  },
  breakdownHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 12,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    marginBottom: 16,
  },

  // Category List
  categoryList: {
    gap: 10,
  },
  catCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.2,
    borderColor: '#EDF2F7',
    ...shadows.sm,
  },
  catIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  catInfoWrap: {
    flex: 1,
  },
  catName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  catPercent: {
    fontSize: 12,
    color: colors.textLight,
    fontWeight: '600',
    marginTop: 2,
  },
  catAmountWrap: {
    alignItems: 'flex-end',
  },
  catAmountText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },

  // Floating Edit Budget Button
  floatingButtonContainer: {
    position: 'absolute',
    right: 20,
    bottom: 24,
  },
  editBudgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366F1', // Indigo / Purple pill like in screenshot
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 22,
    ...shadows.md,
  },
  editBudgetBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
