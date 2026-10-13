import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Dimensions, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { budgetAPI, invoicesAPI, productsAPI, expensesAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { colors, typography, spacing, shadows } from '../../theme';
import BrandLogo from '../../components/BrandLogo';
import BudgetCard from '../../components/budget/BudgetCard';
import SetBudgetModal from '../../components/budget/SetBudgetModal';
import AddCommunityItemModal from '../../components/community/AddCommunityItemModal';
import RecentExpensesSection from '../../components/expenses/RecentExpensesSection';
import ExpenseDetailsModal from '../../components/expenses/ExpenseDetailsModal';
import AddExpenseModal from '../../components/expenses/AddExpenseModal';
import SpendingSummaryCard from '../../components/budget/SpendingSummaryCard';
import QuickActionsBar from '../../components/navigation/QuickActionsBar';
import FloatingQuickActionMenu from '../../components/navigation/FloatingQuickActionMenu';

const { width } = Dimensions.get('window');

const INITIAL_RECENT_EXPENSES = [
  {
    id: 'exp-1',
    name: 'Rice',
    amount: 2400,
    storeName: 'Keells',
    date: new Date(2026, 9, 10).toISOString(),
    categoryName: 'Pantry & Dry Goods',
    quantity: 1,
    unit: 'pack',
    status: 'VERIFIED',
  },
  {
    id: 'exp-2',
    name: 'Fresh Milk 1L',
    amount: 520,
    storeName: 'Cargills Food City',
    date: new Date(2026, 9, 9).toISOString(),
    categoryName: 'Dairy & Eggs',
    quantity: 1,
    unit: 'L',
    status: 'VERIFIED',
  },
  {
    id: 'exp-3',
    name: 'Eggs (Pack of 10)',
    amount: 680,
    storeName: 'Keells',
    date: new Date(2026, 9, 8).toISOString(),
    categoryName: 'Dairy & Eggs',
    quantity: 1,
    unit: 'pack',
    status: 'VERIFIED',
  },
  {
    id: 'exp-4',
    name: 'Red Onions 500g',
    amount: 390,
    storeName: 'Arpico Supercentre',
    date: new Date(2026, 9, 6).toISOString(),
    categoryName: 'Fruits & Vegetables',
    quantity: 0.5,
    unit: 'kg',
    status: 'VERIFIED',
  },
];

const STATUS_CONFIG = {
  VERIFIED: { bg: '#E6F6F0', text: colors.primary, label: 'Verified' },
  REVIEW: { bg: '#F5F3FF', text: '#7C3AED', label: 'In Review' },
  PENDING: { bg: '#FFFBEB', text: '#D97706', label: 'Draft' },
  PROCESSING: { bg: '#EFF6FF', text: '#2563EB', label: 'Processing' },
  REJECTED: { bg: '#FEF2F2', text: '#DC2626', label: 'Rejected' },
};

export default function HomeScreen({ navigation, route }) {
  const { user } = useAuthStore();
  const scrollRef = useRef(null);
  const [budgetData, setBudgetData] = useState(null);
  const [activePeriod, setActivePeriod] = useState('MONTHLY');
  const [recentExpenses, setRecentExpenses] = useState(INITIAL_RECENT_EXPENSES);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showExpenseDetailsModal, setShowExpenseDetailsModal] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [communityProducts, setCommunityProducts] = useState([]);
  const [communityTab, setCommunityTab] = useState('recent'); // 'recent' | 'week' | 'month'
  const [communityLoading, setCommunityLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // Feature 5: Handle Direct Navigation Quick Actions from other screens or route params
  useEffect(() => {
    if (route?.params?.action) {
      const act = route.params.action;
      if (act === 'addItem') {
        setShowAddExpenseModal(true);
      } else if (act === 'setBudget') {
        setShowBudgetModal(true);
      } else if (act === 'scanReceipt') {
        navigation.navigate('Invoice', {
          screen: 'InvoiceScan',
        });
      } else if (act === 'companyPrices') {
        navigation.navigate('CompanyPrices');
      } else if (act === 'dashboard') {
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      }
      navigation.setParams({ action: null });
    }
  }, [route?.params?.action, navigation]);

  const loadCommunityData = useCallback(async (tab = 'recent') => {
    setCommunityLoading(true);
    try {
      let res;
      if (tab === 'recent') {
        res = await productsAPI.getCommunityData({ type: 'recent', limit: 8 });
      } else if (tab === 'week') {
        res = await productsAPI.getCommunityData({ type: 'best-selling', period: 'week', limit: 8 });
      } else if (tab === 'month') {
        res = await productsAPI.getCommunityData({ type: 'best-selling', period: 'month', limit: 8 });
      }
      const data = res?.data?.data || [];
      if (Array.isArray(data)) {
        setCommunityProducts(data);
      }
    } catch (err) {
      console.warn('Community data load error:', err);
    } finally {
      setCommunityLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [bRes, invRes, expRes, commRes] = await Promise.all([
        budgetAPI.getCurrent().catch(() => null),
        invoicesAPI.list({ limit: 4 }).catch(() => null),
        expensesAPI.list({ limit: 8 }).catch(() => null),
        productsAPI.getCommunityData({
          type: communityTab === 'recent' ? 'recent' : 'best-selling',
          period: communityTab === 'month' ? 'month' : 'week',
          limit: 8,
        }).catch(() => null),
      ]);

      if (bRes?.data?.data) {
        setBudgetData(bRes.data.data);
        if (bRes.data.data.preferredPeriod) {
          setActivePeriod(bRes.data.data.preferredPeriod);
        }
      }

      if (expRes?.data?.data && Array.isArray(expRes.data.data)) {
        setRecentExpenses(expRes.data.data);
      }

      const rawInvoices = invRes?.data?.data || invRes?.data?.invoices || [];
      setRecentInvoices(Array.isArray(rawInvoices) ? rawInvoices.slice(0, 4) : []);

      const rawCommunity = commRes?.data?.data || [];
      if (Array.isArray(rawCommunity) && rawCommunity.length > 0) {
        setCommunityProducts(rawCommunity);
      }
    } catch (err) {
      console.warn('Dashboard load error:', err);
    }
  }, [communityTab]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleTabChange = async (newTab) => {
    setCommunityTab(newTab);
    await loadCommunityData(newTab);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadCommunityData(communityTab)]);
    setRefreshing(false);
  };

  const handleBudgetSaved = async (updatedBudget) => {
    if (updatedBudget) {
      setBudgetData(updatedBudget);
      if (updatedBudget?.preferredPeriod) {
        setActivePeriod(updatedBudget.preferredPeriod);
      }
    }
    // Re-fetch data so budget overview, spent metrics, and progress immediately refresh
    await loadData();
  };

  const handleItemAdded = () => {
    loadData();
    loadCommunityData(communityTab);
  };

  const handleExpenseSelected = (expense) => {
    setSelectedExpense(expense);
    setShowExpenseDetailsModal(true);
  };

  const handleExpenseAdded = (newExpense) => {
    setRecentExpenses((prev) => [newExpense, ...prev.filter((e) => e.id !== newExpense.id)]);
    // Re-fetch data so budget spent and progress bar recalculate immediately
    loadData();
  };

  const handleExpenseDeleted = async (expense) => {
    try {
      await expensesAPI.remove(expense.id || expense.invoiceId);
      setRecentExpenses((prev) => prev.filter((e) => e.id !== expense.id));
      setShowExpenseDetailsModal(false);
      setSelectedExpense(null);
      loadData();
    } catch (err) {
      console.warn('Failed to delete expense from dashboard:', err);
    }
  };

  const handleComparePrices = (expense) => {
    if (expense?.productId) {
      navigation.navigate('PriceCompare', { productId: expense.productId, productName: expense.name });
    } else if (expense?.name) {
      navigation.navigate('PriceCompare', { productName: expense.name });
    }
  };

  const handleViewReceipt = (invoiceId) => {
    navigation.navigate('Invoice', {
      screen: 'InvoiceReview',
      params: { invoiceId },
    });
  };

  const handleDirectUploadImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaType?.Images || ['images'],
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        navigation.navigate('Invoice', {
          screen: 'InvoiceScan',
          params: {
            initialImageUri: result.assets[0].uri,
            autoScan: true,
            timestamp: Date.now(),
          },
        });
      }
    } catch (err) {
      console.warn('Direct upload image picker error:', err);
      navigation.navigate('Invoice', {
        screen: 'InvoiceScan',
        params: { autoLaunch: 'gallery', timestamp: Date.now() },
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View>
              <View style={styles.brandRow}>
                <BrandLogo width={96} variant="mark" withTagline={false} />
                <Text style={styles.appName}>Saverly</Text>
              </View>
              <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'Shopper'} 👋</Text>
              <Text style={styles.headerSub}>Smart Grocery Budget & Price Tracker</Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerActionBtn}
                onPress={() => setShowBudgetModal(true)}
              >
                <Ionicons name="wallet-outline" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerActionBtn}
                onPress={() => navigation.navigate('Profile')}
              >
                <Ionicons name="person-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Core MVP Widget: Budget Progress Card (Weekly / Monthly Toggle) */}
        <BudgetCard
          budgetData={budgetData}
          activePeriod={activePeriod}
          onPeriodChange={setActivePeriod}
          onOpenSetBudget={() => setShowBudgetModal(true)}
        />

        {/* Prominent Quick Receipt Scanner Hero Card */}
        <View style={styles.scannerHeroSection}>
          <LinearGradient
            colors={['#14765A', '#1C9A76', '#26A683']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scannerHeroCard}
          >
            <View style={styles.scannerHeroTop}>
              <View style={styles.scannerHeroIconBadge}>
                <Ionicons name="scan" size={24} color="#fff" />
              </View>
              <View style={styles.scannerHeroInfo}>
                <View style={styles.scannerTagRow}>
                  <View style={styles.scannerHeroTag}>
                    <Text style={styles.scannerHeroTagText}>Smart OCR</Text>
                  </View>
                  <Text style={styles.scannerLangText}>Sinhala & English • Keells • Cargills</Text>
                </View>
                <Text style={styles.scannerHeroTitle}>Quick Receipt Scanner</Text>
                <Text style={styles.scannerHeroDesc}>
                  Auto-extract items & prices from printed, bilingual & faded bills
                </Text>
              </View>
            </View>

            {/* Prominent Camera and Upload Buttons */}
            <View style={styles.scannerHeroButtonsRow}>
              <TouchableOpacity
                style={styles.scannerCameraBtn}
                onPress={() => navigation.navigate('Invoice', { screen: 'InvoiceScan', params: { autoLaunch: 'camera', timestamp: Date.now() } })}
                activeOpacity={0.88}
              >
                <Ionicons name="camera" size={17} color="#14765A" />
                <Text style={styles.scannerCameraBtnText}>Open Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.scannerGalleryBtn}
                onPress={handleDirectUploadImage}
                activeOpacity={0.88}
              >
                <Ionicons name="image-outline" size={17} color="#fff" />
                <Text style={styles.scannerGalleryBtnText}>Upload Image</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* 5. Quick Actions and Navigation */}
        <QuickActionsBar
          onAddItem={() => setShowAddExpenseModal(true)}
          onSetBudget={() => setShowBudgetModal(true)}
          onScanReceipt={() =>
            navigation.navigate('Invoice', {
              screen: 'InvoiceScan',
            })
          }
          onOpenLists={() =>
            navigation.navigate('Shopping', { screen: 'ShoppingListMain' })
          }
        />

        {/* 2. Recent Expenses Section */}
        <RecentExpensesSection
          expenses={recentExpenses}
          onSelectExpense={handleExpenseSelected}
          onOpenAddExpense={() => setShowAddExpenseModal(true)}
          onViewAll={() => navigation.navigate('Expenses')}
        />

        {/* 4. Spending Summary Card (Period Spending, Category Breakdown & Donut Graph) */}
        <SpendingSummaryCard
          budgetData={budgetData}
          activePeriod={activePeriod}
          onPeriodChange={setActivePeriod}
          onOpenAnalytics={() => navigation.navigate('BudgetAnalytics')}
        />

        {/* Recent Scanned Receipts */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleWithIcon}>
              <Ionicons name="receipt-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Recent Receipts</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Invoice', { screen: 'InvoiceList' })}>
              <Text style={styles.seeAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {recentInvoices.length === 0 ? (
            <View style={styles.emptyReceiptCard}>
              <Ionicons name="scan-outline" size={32} color={colors.textLight} />
              <Text style={styles.emptyReceiptTitle}>No receipts logged yet</Text>
              <Text style={styles.emptyReceiptDesc}>
                Take a photo of your supermarket bill to auto-extract prices and track spending.
              </Text>
              <TouchableOpacity
                style={styles.emptyReceiptBtn}
                onPress={() => navigation.navigate('Invoice', { screen: 'InvoiceScan' })}
              >
                <Ionicons name="camera" size={16} color="#fff" />
                <Text style={styles.emptyReceiptBtnText}>Scan First Receipt</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.receiptsList}>
              {recentInvoices.map((inv) => {
                const cfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.PENDING;
                const storeName = inv.supermarket?.name || inv.parsedData?.storeName || 'Supermarket Receipt';
                const total = inv.totalAmount || inv.total || (inv.items?.reduce((s, it) => s + (it.totalPrice || it.unitPrice || 0), 0)) || 0;
                const itemCount = inv.items?.length || inv._count?.items || 0;
                const dateStr = inv.invoiceDate || inv.createdAt;

                return (
                  <TouchableOpacity
                    key={inv.id}
                    style={styles.receiptItem}
                    onPress={() => {
                      if (inv.status === 'PENDING' || inv.status === 'REVIEW') {
                        navigation.navigate('Invoice', { screen: 'InvoiceReview', params: { invoiceId: inv.id } });
                      } else {
                        navigation.navigate('Invoice', { screen: 'InvoiceList' });
                      }
                    }}
                  >
                    <View style={styles.receiptStoreIcon}>
                      <Ionicons name="storefront" size={20} color={colors.primary} />
                    </View>

                    <View style={styles.receiptMainInfo}>
                      <Text style={styles.receiptStoreName} numberOfLines={1}>
                        {storeName}
                      </Text>
                      <View style={styles.receiptSubInfo}>
                        <Text style={styles.receiptDate}>
                          {dateStr ? new Date(dateStr).toLocaleDateString() : 'Recent'}
                        </Text>
                        <Text style={styles.receiptDot}>•</Text>
                        <Text style={styles.receiptItemCount}>{itemCount} items</Text>
                      </View>
                    </View>

                    <View style={styles.receiptRightCol}>
                      <Text style={styles.receiptAmount}>
                        LKR {Number(total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                      <View style={[styles.receiptStatusPill, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.receiptStatusText, { color: cfg.text }]}>
                          {cfg.label}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Community Price Data Section */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionTitleWithIcon}>
              <Ionicons name="people-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Community Price Data</Text>
            </View>
            <TouchableOpacity onPress={() => setShowAddModal(true)}>
              <Text style={styles.seeAllText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.communitySectionSubtitle}>
            Crowdsourced receipt prices & best selling items
          </Text>

          {/* Segmented Filter Tabs */}
          <View style={styles.communityTabsRow}>
            <TouchableOpacity
              style={[
                styles.communityTabBtn,
                communityTab === 'recent' && styles.communityTabBtnActive,
              ]}
              onPress={() => handleTabChange('recent')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="receipt-outline"
                size={13}
                color={communityTab === 'recent' ? '#fff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.communityTabBtnText,
                  communityTab === 'recent' && styles.communityTabBtnTextActive,
                ]}
              >
                Recent Scans
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.communityTabBtn,
                communityTab === 'week' && styles.communityTabBtnActive,
              ]}
              onPress={() => handleTabChange('week')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="flame"
                size={13}
                color={communityTab === 'week' ? '#fff' : '#D97706'}
              />
              <Text
                style={[
                  styles.communityTabBtnText,
                  communityTab === 'week' && styles.communityTabBtnTextActive,
                ]}
              >
                Best Selling (Week)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.communityTabBtn,
                communityTab === 'month' && styles.communityTabBtnActive,
              ]}
              onPress={() => handleTabChange('month')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="trophy"
                size={13}
                color={communityTab === 'month' ? '#fff' : '#2563EB'}
              />
              <Text
                style={[
                  styles.communityTabBtnText,
                  communityTab === 'month' && styles.communityTabBtnTextActive,
                ]}
              >
                Best Selling (Month)
              </Text>
            </TouchableOpacity>
          </View>

          {communityLoading ? (
            <View style={styles.communityLoadingBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.communityLoadingText}>Updating community items...</Text>
            </View>
          ) : communityProducts.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.communityScroll}>
              {communityProducts.map((prod, idx) => {
                const effectivePrice = prod.price ?? prod.prices?.[0]?.price ?? null;
                const storeName = prod.supermarketName || prod.supermarket?.name || prod.prices?.[0]?.supermarket?.name || null;

                return (
                  <TouchableOpacity
                    key={prod.id || `${prod.name}-${idx}`}
                    style={styles.communityCard}
                    onPress={() => navigation.navigate('Search', { screen: 'ProductDetail', params: { productId: prod.id || prod.productId } })}
                    activeOpacity={0.75}
                  >
                    <View style={styles.communityCardTop}>
                      <Text style={styles.communityCatName} numberOfLines={1}>
                        {prod.category?.name || 'Grocery'}
                      </Text>
                      {prod.rank ? (
                        <View style={styles.rankPill}>
                          <Text style={styles.rankPillText}>{`#${prod.rank}`}</Text>
                        </View>
                      ) : prod.source === 'receipt' ? (
                        <View style={styles.receiptPill}>
                          <Text style={styles.receiptPillText}>Receipt</Text>
                        </View>
                      ) : null}
                    </View>

                    {Boolean(prod.brand) ? (
                      <Text style={styles.communityBrandName} numberOfLines={1}>
                        {prod.brand}
                      </Text>
                    ) : null}

                    <Text style={styles.communityProdName} numberOfLines={2}>
                      {prod.name}
                    </Text>

                    <View style={styles.communityPriceRow}>
                      {effectivePrice != null ? (
                        <Text style={styles.communityPriceVal}>
                          <Text style={styles.communityPriceLabel}>Price: </Text>
                          {`LKR ${Number(effectivePrice).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </Text>
                      ) : (
                        <Text style={styles.communityNoPrice}>No price recorded</Text>
                      )}
                    </View>

                    {Boolean(prod.totalQuantity) ? (
                      <View style={styles.communitySalesVol}>
                        <Ionicons name="cart-outline" size={11} color="#D97706" />
                        <Text style={styles.communitySalesVolText}>
                          {`${prod.totalQuantity} units bought ${prod.period === 'week' ? 'this wk' : prod.period === 'month' ? 'this mo' : ''}`}
                        </Text>
                      </View>
                    ) : null}

                    {Boolean(storeName) ? (
                      <View style={styles.communityStoreTag}>
                        <Ionicons name="location-outline" size={11} color={colors.textLight} />
                        <Text style={styles.communityStoreText} numberOfLines={1}>
                          {storeName}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <View style={styles.communityEmptyBox}>
              <Text style={styles.communityEmptyText}>No items found for this selection yet.</Text>
            </View>
          )}
        </View>

        {/* Community Price Data Promotional Card / Banner */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.companyBannerCard}
            onPress={() => navigation.navigate('CompanyPrices')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#0F4C3A', '#166E53', '#1C9A76']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.companyBannerGradient}
            >
              <View style={styles.companyBannerContent}>
                <View style={styles.companyBannerBadgeRow}>
                  <Ionicons name="business" size={12} color="#A7F3D0" />
                  <Text style={styles.companyBannerBadgeText}>OFFICIAL STORE CATALOG</Text>
                </View>
                <Text style={styles.companyBannerTitle}>Community Price Data</Text>
                <Text style={styles.companyBannerDesc}>
                  Compare official catalog prices from Cargills, Keells, Arpico, SuperSave, FreshMart & more.
                </Text>
                <View style={styles.companyBannerBtn}>
                  <Text style={styles.companyBannerBtnText}>View Community Prices</Text>
                  <Ionicons name="arrow-forward" size={14} color="#0F4C3A" />
                </View>
              </View>

              <View style={styles.companyBannerIconWrap}>
                <Ionicons name="storefront" size={56} color="rgba(255,255,255,0.18)" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Set Budget Modal */}
      <SetBudgetModal
        visible={showBudgetModal}
        currentBudget={budgetData}
        initialPeriod={activePeriod}
        onBudgetSaved={handleBudgetSaved}
        onClose={() => setShowBudgetModal(false)}
      />

      {/* Add Community Item Modal */}
      <AddCommunityItemModal
        visible={showAddModal}
        onItemAdded={handleItemAdded}
        onClose={() => setShowAddModal(false)}
      />

      {/* Expense Details Modal */}
      <ExpenseDetailsModal
        visible={showExpenseDetailsModal}
        expense={selectedExpense}
        onClose={() => {
          setShowExpenseDetailsModal(false);
          setSelectedExpense(null);
        }}
        onComparePrices={handleComparePrices}
        onViewReceipt={handleViewReceipt}
        onDeleteExpense={handleExpenseDeleted}
      />

      {/* Add Manual Expense Modal */}
      <AddExpenseModal
        visible={showAddExpenseModal}
        onExpenseAdded={handleExpenseAdded}
        onClose={() => setShowAddExpenseModal(false)}
      />

      {/* Feature 5: Floating Quick Action Menu for easy 1-tap reach during scrolling */}
      <FloatingQuickActionMenu
        onAddItem={() => setShowAddExpenseModal(true)}
        onSetBudget={() => setShowBudgetModal(true)}
        onScanReceipt={() =>
          navigation.navigate('Invoice', {
            screen: 'InvoiceScan',
          })
        }
        onOpenLists={() =>
          navigation.navigate('Shopping', { screen: 'ShoppingListMain' })
        }
        onOpenCompanyPrices={() =>
          navigation.navigate('CompanyPrices')
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.primaryDark },
  scroll: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 38,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: -6,
  },
  appName: {
    fontSize: 14,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.5,
    marginLeft: -4,
  },
  greeting: {
    ...typography.h3,
    fontSize: 22,
    color: '#fff',
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Prominent Scanner Hero Section
  scannerHeroSection: {
    marginHorizontal: 20,
    marginTop: 18,
  },
  scannerHeroCard: {
    borderRadius: 20,
    padding: 18,
    ...shadows.md,
  },
  scannerHeroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  scannerHeroIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerHeroInfo: {
    flex: 1,
  },
  scannerTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  scannerHeroTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  scannerHeroTagText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  scannerLangText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '500',
  },
  scannerHeroTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 2,
  },
  scannerHeroDesc: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.88)',
    lineHeight: 16,
  },
  scannerHeroButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scannerCameraBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingVertical: 11,
    borderRadius: 14,
    ...shadows.sm,
  },
  scannerCameraBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#14765A',
  },
  scannerGalleryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingVertical: 11,
    borderRadius: 14,
  },
  scannerGalleryBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#fff',
  },

  // Core MVP Actions Section
  actionsSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: (width - 52) / 2,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EDF3F0',
    ...shadows.sm,
  },
  actionCardPrimary: {
    borderWidth: 0,
    ...shadows.md,
  },
  actionCardGradient: {
    padding: 16,
    height: 135,
    justifyContent: 'space-between',
  },
  actionCardInner: {
    padding: 16,
    height: 135,
    justifyContent: 'space-between',
  },
  actionCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionIconPillPrimary: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  actionIconPill: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitlePrimary: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    marginTop: 6,
  },
  actionDescPrimary: {
    fontSize: 11.5,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 15,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
  },
  actionDesc: {
    fontSize: 11.5,
    color: colors.textSecondary,
    lineHeight: 15,
  },

  // Sections Common
  section: {
    paddingHorizontal: 20,
    paddingTop: 26,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  // Receipts List
  receiptsList: {
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#EDF3F0',
    ...shadows.sm,
  },
  receiptItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F8F7',
    gap: 12,
  },
  receiptStoreIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptMainInfo: {
    flex: 1,
  },
  receiptStoreName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  receiptSubInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  receiptDate: {
    fontSize: 12,
    color: colors.textLight,
  },
  receiptDot: {
    fontSize: 12,
    color: colors.textLight,
  },
  receiptItemCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  receiptRightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  receiptAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  receiptStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  receiptStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyReceiptCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDF3F0',
    ...shadows.sm,
  },
  emptyReceiptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  emptyReceiptDesc: {
    fontSize: 12.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    ...shadows.sm,
  },
  emptyReceiptBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  communitySectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -8,
    marginBottom: 10,
  },
  communityTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  communityTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    gap: 5,
  },
  communityTabBtnActive: {
    backgroundColor: colors.primary,
  },
  communityTabBtnText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  communityTabBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  communityLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  communityLoadingText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  communityEmptyBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EDF3F0',
  },
  communityEmptyText: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Community Feed
  communityScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  communityCard: {
    width: 175,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#EDF3F0',
    justifyContent: 'space-between',
    ...shadows.sm,
  },
  communityCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  communityCatName: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flex: 1,
  },
  rankPill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: '#F59E0B',
  },
  rankPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  receiptPill: {
    backgroundColor: '#E6F6F0',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  receiptPillText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: colors.primary,
  },
  communityBrandName: {
    fontSize: 10.5,
    color: colors.textLight,
    marginBottom: 2,
  },
  communityProdName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    minHeight: 34,
  },
  communityPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 4,
  },
  communityPriceLabel: {
    fontSize: 11,
    color: colors.textLight,
  },
  communityPriceVal: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  communityNoPrice: {
    fontSize: 11,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  communitySalesVol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 4,
  },
  communitySalesVolText: {
    fontSize: 10,
    color: '#B45309',
    fontWeight: '600',
  },
  communityStoreTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F6F9F8',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  communityStoreText: {
    fontSize: 10.5,
    color: colors.textSecondary,
    fontWeight: '500',
  },

  // Company Banner
  companyBannerCard: {
    borderRadius: 18,
    overflow: 'hidden',
    ...shadows.md,
  },
  companyBannerGradient: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  companyBannerContent: {
    flex: 1,
    paddingRight: 10,
  },
  companyBannerBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  companyBannerBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A7F3D0',
    letterSpacing: 0.6,
  },
  companyBannerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  companyBannerDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 16,
    marginBottom: 12,
  },
  companyBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    ...shadows.sm,
  },
  companyBannerBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F4C3A',
  },
  companyBannerIconWrap: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
