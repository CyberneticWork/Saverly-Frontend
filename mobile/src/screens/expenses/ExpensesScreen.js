import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { expensesAPI } from '../../services/api';
import { colors, typography, shadows, spacing } from '../../theme';
import AddExpenseModal from '../../components/expenses/AddExpenseModal';
import ExpenseDetailsModal from '../../components/expenses/ExpenseDetailsModal';

const PERIODS = [
  { key: 'all', label: 'All Time' },
  { key: 'month', label: 'This Month' },
  { key: 'week', label: 'This Week' },
];

const STORE_FILTERS = [
  'All Stores',
  'Keells',
  'Cargills Food City',
  'Arpico Supercentre',
  'SPAR Supermarket',
  'Glomark',
  'Local Grocery',
];

const CATEGORY_ICONS = {
  vegetables: { icon: 'leaf-outline', color: '#10B981', bg: '#ECFDF5' },
  fruits: { icon: 'nutrition-outline', color: '#F59E0B', bg: '#FEF3C7' },
  dairy: { icon: 'water-outline', color: '#3B82F6', bg: '#EFF6FF' },
  meat: { icon: 'restaurant-outline', color: '#EF4444', bg: '#FEF2F2' },
  beverages: { icon: 'cafe-outline', color: '#8B5CF6', bg: '#F5F3FF' },
  bakery: { icon: 'pizza-outline', color: '#D97706', bg: '#FFFBEB' },
  pantry: { icon: 'cube-outline', color: '#059669', bg: '#ECFDF5' },
  snacks: { icon: 'fast-food-outline', color: '#EC4899', bg: '#FDF2F8' },
  household: { icon: 'home-outline', color: '#6366F1', bg: '#EEF2FF' },
  personal: { icon: 'body-outline', color: '#14B8A6', bg: '#F0FDFA' },
  default: { icon: 'cart-outline', color: '#1C9A76', bg: '#E6F6F0' },
};

function getCategoryConfig(categoryName = '') {
  const lower = String(categoryName).toLowerCase();
  for (const [key, cfg] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return cfg;
  }
  return CATEGORY_ICONS.default;
}

export default function ExpensesScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({
    totalSpent: 0,
    thisMonthSpent: 0,
    thisWeekSpent: 0,
    count: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activePeriod, setActivePeriod] = useState('all');
  const [selectedStore, setSelectedStore] = useState('All Stores');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [error, setError] = useState(null);

  const fetchExpenses = useCallback(async () => {
    try {
      setError(null);
      const params = {
        period: activePeriod,
        ...(selectedStore !== 'All Stores' ? { store: selectedStore } : {}),
        ...(searchQuery.trim() ? { search: searchQuery.trim() } : {}),
      };
      const res = await expensesAPI.list(params);
      if (res?.data?.success) {
        setExpenses(res.data.data || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch expenses:', err?.message);
      setError(err?.response?.data?.message || err?.message || 'Failed to load expenses');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activePeriod, selectedStore, searchQuery]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Check if route params requested opening the add modal immediately
  useEffect(() => {
    if (route?.params?.openAddModal) {
      setShowAddModal(true);
      navigation.setParams({ openAddModal: undefined });
    }
  }, [route?.params?.openAddModal, navigation]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchExpenses();
  };

  const handleExpenseAdded = (newExpense) => {
    setShowAddModal(false);
    // Refresh to get updated list and backend metrics
    fetchExpenses();
  };

  const handleDeleteExpense = (expense) => {
    const doDelete = async () => {
      try {
        await expensesAPI.remove(expense.id || expense.invoiceId);
        setExpenses((prev) => prev.filter((e) => e.id !== expense.id));
        fetchExpenses();
      } catch (err) {
        Alert.alert('Error', err?.response?.data?.message || 'Could not delete expense.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Delete expense "${expense.name}"?`)) {
        doDelete();
      }
    } else {
      Alert.alert(
        'Delete Expense',
        `Are you sure you want to delete "${expense.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: doDelete },
        ]
      );
    }
  };

  const handleExpensePress = (item) => {
    setSelectedExpense(item);
    setShowDetailsModal(true);
  };

  const formatRs = (num) => {
    if (num === null || num === undefined) return 'Rs. 0';
    return `Rs. ${Number(num).toLocaleString('en-LK')}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const displayedTotal = useMemo(() => {
    if (activePeriod === 'month') return summary.thisMonthSpent;
    if (activePeriod === 'week') return summary.thisWeekSpent;
    return summary.totalSpent;
  }, [activePeriod, summary]);

  const renderExpenseItem = ({ item }) => {
    const catCfg = getCategoryConfig(item.categoryName);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleExpensePress(item)}
        activeOpacity={0.88}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.catIconWrap, { backgroundColor: catCfg.bg }]}>
            <Ionicons name={catCfg.icon} size={20} color={catCfg.color} />
          </View>
          <View style={styles.cardMain}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.cardMetaRow}>
              <View style={styles.storePill}>
                <Ionicons name="storefront-outline" size={11} color="#D97706" />
                <Text style={styles.storePillText} numberOfLines={1}>
                  {item.storeName || 'Local Grocery'}
                </Text>
              </View>
              <View style={styles.datePill}>
                <Ionicons name="calendar-outline" size={11} color={colors.textLight} />
                <Text style={styles.datePillText}>{formatDate(item.date)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardRight}>
            <Text style={styles.amountText}>{formatRs(item.amount)}</Text>
            <Text style={styles.unitText}>
              {item.quantity} {item.unit || 'unit'}
            </Text>
          </View>
        </View>

        {!!item.notes && (
          <View style={styles.notesRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={12} color={colors.textLight} />
            <Text style={styles.notesText} numberOfLines={1}>
              {item.notes}
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{item.categoryName || 'Grocery'}</Text>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.deleteActionBtn}
              onPress={() => handleDeleteExpense(item)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={16} color="#DC2626" />
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={16} color={colors.textLight} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* 1. Header with Back Arrow and Top Add Action */}
      <LinearGradient
        colors={['#0F766E', '#14765A']}
        style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}
      >
        <View style={styles.headerTopRow}>
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
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Grocery Expenses</Text>
            <Text style={styles.headerSub}>Manage & save manual expenses</Text>
          </View>

          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#0F766E" />
            <Text style={styles.headerAddBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {/* 2. Top Summary Card inside Header */}
        <View style={styles.summaryCard}>
          <View style={styles.periodTabs}>
            {PERIODS.map((p) => {
              const isActive = activePeriod === p.key;
              return (
                <TouchableOpacity
                  key={p.key}
                  style={[styles.periodTab, isActive && styles.periodTabActive]}
                  onPress={() => setActivePeriod(p.key)}
                >
                  <Text style={[styles.periodTabText, isActive && styles.periodTabTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.summaryStatsRow}>
            <View>
              <Text style={styles.summaryLabel}>Total Spent</Text>
              <Text style={styles.summaryAmount}>{formatRs(displayedTotal)}</Text>
            </View>
            <View style={styles.summaryBadge}>
              <Ionicons name="receipt-outline" size={14} color="#fff" />
              <Text style={styles.summaryBadgeText}>
                {expenses.length} {expenses.length === 1 ? 'item' : 'items'}
              </Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* 3. Search and Store Filters */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by item name, notes, or store..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>

        {/* Store Filter Pills */}
        <FlatList
          data={STORE_FILTERS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.storeFilterList}
          renderItem={({ item }) => {
            const isSelected = selectedStore === item;
            return (
              <TouchableOpacity
                style={[styles.storeChip, isSelected && styles.storeChipActive]}
                onPress={() => setSelectedStore(item)}
              >
                <Text style={[styles.storeChipText, isSelected && styles.storeChipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* 4. Expenses List */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading expenses...</Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          renderItem={renderExpenseItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name={error ? 'alert-circle-outline' : 'cart-outline'}
                  size={36}
                  color={error ? '#DC2626' : colors.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {error ? 'Could not load expenses' : 'No expenses found'}
              </Text>
              <Text style={styles.emptyDesc}>
                {error
                  ? error
                  : searchQuery || selectedStore !== 'All Stores'
                  ? 'No expenses matched your search or filters. Try adjusting your query.'
                  : 'Start recording your grocery purchases manually to track daily spending.'}
              </Text>
              {error ? (
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={fetchExpenses}
                  activeOpacity={0.88}
                >
                  <Ionicons name="refresh" size={18} color="#fff" />
                  <Text style={styles.emptyAddBtnText}>Retry</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => setShowAddModal(true)}
                  activeOpacity={0.88}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={styles.emptyAddBtnText}>Add First Expense</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      {/* 5. Floating Action Button (+ Add Expense) */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.88}
      >
        <LinearGradient colors={['#10B981', '#059669']} style={styles.fabGradient}>
          <Ionicons name="add" size={26} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* 6. Modals */}
      <AddExpenseModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onExpenseAdded={handleExpenseAdded}
      />

      <ExpenseDetailsModal
        visible={showDetailsModal}
        expense={selectedExpense}
        onClose={() => setShowDetailsModal(false)}
        onComparePrices={(exp) => {
          if (exp?.productId) {
            navigation.navigate('PriceCompare', { productId: exp.productId, productName: exp.name });
          } else if (exp?.name) {
            navigation.navigate('PriceCompare', { productName: exp.name });
          }
        }}
        onDeleteExpense={handleDeleteExpense}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FBFA',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    ...shadows.md,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSub: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 1,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    ...shadows.sm,
  },
  headerAddBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  summaryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 5,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodTabActive: {
    backgroundColor: '#fff',
  },
  periodTabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
  },
  periodTabTextActive: {
    color: '#0F766E',
    fontWeight: '700',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  summaryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: colors.text,
    padding: 0,
  },
  storeFilterList: {
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  storeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  storeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  storeChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  storeChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: colors.textLight,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E6EFEA',
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  catIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardMain: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  storePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  storePillText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#92400E',
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  datePillText: {
    fontSize: 11,
    color: colors.textLight,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  unitText: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 2,
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 11.5,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  categoryChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteActionBtn: {
    padding: 4,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    ...shadows.sm,
  },
  emptyAddBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    ...shadows.md,
  },
  fabGradient: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
