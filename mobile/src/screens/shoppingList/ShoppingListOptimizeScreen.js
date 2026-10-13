import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useShoppingStore } from '../../store/shoppingStore';
import { colors, typography, shadows } from '../../theme';

export default function ShoppingListOptimizeScreen({ navigation, route }) {
  const { listId, listName: initialListName } = route.params;
  const { optimize, optimization, isLoading } = useShoppingStore();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('multi'); // 'multi' | 'single'

  useEffect(() => {
    optimize(listId);
  }, [listId]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await optimize(listId);
    setIsRefreshing(false);
  };

  const formatRs = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '0.00';
    return Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find Lowest Prices</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Analyzing community prices across all supermarkets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!optimization) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find Lowest Prices</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyCenter}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.emptyTitle}>No Price Data Found</Text>
          <Text style={styles.emptySub}>Add items with recorded prices or scan receipts to compare supermarkets.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const {
    bestSingleStore,
    supermarketComparison = [],
    itemCheapest = [],
    splitOptimalTotal = 0,
    totalPotentialSavings = 0,
    listName = initialListName,
    totalItems = 0,
  } = optimization;

  const highestStore = supermarketComparison.length > 0
    ? supermarketComparison[supermarketComparison.length - 1]
    : null;
  const maxStoreTotal = highestStore ? highestStore.total : 1;

  // Group items by the supermarket where they are cheapest
  const storeGroupsMap = {};
  (itemCheapest || []).forEach(item => {
    const storeName = item.cheapestAt?.name || 'Unassigned / No Store Price';
    const storeId = item.cheapestAt?.supermarketId || 'unassigned';
    if (!storeGroupsMap[storeName]) {
      storeGroupsMap[storeName] = {
        supermarketId: storeId,
        supermarketName: storeName,
        items: [],
        subtotal: 0,
        subtotalSavings: 0,
      };
    }
    const unitPrice = item.cheapestAt ? Number(item.cheapestAt.price) : 0;
    const qty = Number(item.quantity) || 1;
    const lineTotal = unitPrice * qty;
    const itemSavings = Number(item.savings) || 0;

    storeGroupsMap[storeName].items.push({
      ...item,
      purchasePrice: unitPrice,
      lineTotal,
      itemSavings,
    });
    storeGroupsMap[storeName].subtotal += lineTotal;
    storeGroupsMap[storeName].subtotalSavings += itemSavings;
  });
  const storeGroups = Object.values(storeGroupsMap);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>Supermarket Bill & Savings</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{listName || 'Shopping List'} · {totalItems} items</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} activeOpacity={0.7}>
          <Ionicons name="reload" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Segmented View Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'multi' && styles.tabButtonActive]}
          onPress={() => setActiveTab('multi')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="git-branch-outline"
            size={16}
            color={activeTab === 'multi' ? '#047857' : '#64748B'}
          />
          <Text style={[styles.tabButtonText, activeTab === 'multi' && styles.tabButtonTextActive]}>
            Multi-Store Bill
          </Text>
          {totalPotentialSavings > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>Save Rs.{formatRs(totalPotentialSavings).split('.')[0]}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'single' && styles.tabButtonActive]}
          onPress={() => setActiveTab('single')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="storefront-outline"
            size={16}
            color={activeTab === 'single' ? '#047857' : '#64748B'}
          />
          <Text style={[styles.tabButtonText, activeTab === 'single' && styles.tabButtonTextActive]}>
            Single Store Trip
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {activeTab === 'multi' ? (
          /* ==============================================================
             MULTI-SUPERMARKET PURCHASE BILL (MAXIMUM BILL SAVINGS)
             ============================================================== */
          <View>
            {/* Hero Bill Summary Card */}
            <LinearGradient
              colors={['#047857', '#065F46', '#064E3B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroTopBadge}>
                <Ionicons name="cart" size={14} color="#A7F3D0" />
                <Text style={styles.heroTopBadgeText}>FINAL MULTI-STORE PURCHASE BILL</Text>
              </View>

              <Text style={styles.heroTotalLabel}>TOTAL BILL AMOUNT</Text>
              <Text style={styles.heroTotalAmount}>Rs. {formatRs(splitOptimalTotal)}</Text>

              {totalPotentialSavings > 0 && (
                <View style={styles.heroSavingsBanner}>
                  <Ionicons name="sparkles" size={18} color="#FEF08A" />
                  <View>
                    <Text style={styles.heroSavingsTitle}>
                      Saving of Total Bill: Rs. {formatRs(totalPotentialSavings)}
                    </Text>
                    <Text style={styles.heroSavingsSub}>
                      Saved by buying each item where it's cheapest vs other stores
                    </Text>
                  </View>
                </View>
              )}
            </LinearGradient>

            {/* Supermarkets Visited Quick Pills */}
            <View style={styles.storesVisitedSection}>
              <Text style={styles.sectionSubtitleSmall}>Supermarkets to visit ({storeGroups.length}):</Text>
              <View style={styles.storePillsWrap}>
                {storeGroups.map((g, idx) => (
                  <View key={g.supermarketName + idx} style={styles.storePill}>
                    <Ionicons name="storefront" size={13} color="#047857" />
                    <Text style={styles.storePillName}>{g.supermarketName}</Text>
                    <Text style={styles.storePillCount}>({g.items.length} items · Rs. {formatRs(g.subtotal)})</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Store-by-Store Itemized Breakdown */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Itemized Purchase Plan</Text>
                <Text style={styles.sectionBadgeText}>{totalItems} Items Total</Text>
              </View>
              <Text style={styles.sectionSub}>
                Each item's purchase price, supermarket, and individual savings
              </Text>

              {storeGroups.map((group, gIdx) => (
                <View key={group.supermarketName + gIdx} style={styles.multiStoreGroupCard}>
                  {/* Store Header */}
                  <View style={styles.multiStoreHeader}>
                    <View style={styles.multiStoreTitleRow}>
                      <View style={styles.multiStoreIconCircle}>
                        <Ionicons name="storefront" size={18} color="#047857" />
                      </View>
                      <View>
                        <Text style={styles.multiStoreName}>{group.supermarketName}</Text>
                        <Text style={styles.multiStoreItemCount}>
                          Buy {group.items.length} {group.items.length === 1 ? 'item' : 'items'} here
                        </Text>
                      </View>
                    </View>

                    <View style={styles.multiStoreSubtotalBox}>
                      <Text style={styles.multiStoreSubtotalLabel}>Store Subtotal</Text>
                      <Text style={styles.multiStoreSubtotalAmount}>Rs. {formatRs(group.subtotal)}</Text>
                      {group.subtotalSavings > 0 && (
                        <Text style={styles.multiStoreSavingsBadge}>
                          Save Rs. {formatRs(group.subtotalSavings)}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.storeItemsDivider} />

                  {/* Items Table inside this Store */}
                  {group.items.map((item) => {
                    const hasCheapest = Boolean(item.cheapestAt);
                    return (
                      <TouchableOpacity
                        key={item.product.id}
                        style={styles.itemBillCard}
                        onPress={() => navigation.navigate('PriceCompare', { productId: item.product.id, productName: item.product.name })}
                        activeOpacity={0.7}
                      >
                        <View style={styles.itemBillLeft}>
                          <Text style={styles.itemBillName}>{item.product.name}</Text>
                          <Text style={styles.itemBillQty}>
                            Qty: {item.quantity} {item.product.defaultUnit || 'unit'} · {group.supermarketName}
                          </Text>

                          {/* Savings for each item */}
                          {item.itemSavings > 0 ? (
                            <View style={styles.itemSavingsTag}>
                              <Ionicons name="trending-down" size={12} color="#047857" />
                              <Text style={styles.itemSavingsTagText}>
                                Save Rs. {formatRs(item.itemSavings)} vs {item.highestAt?.name || 'highest store'}
                              </Text>
                            </View>
                          ) : (
                            <Text style={styles.itemBestPriceText}>Lowest available store price</Text>
                          )}
                        </View>

                        <View style={styles.itemBillRight}>
                          <Text style={styles.itemPurchasePriceLabel}>Purchase Price</Text>
                          <Text style={styles.itemPurchasePrice}>Rs. {formatRs(item.lineTotal)}</Text>
                          {item.quantity > 1 && (
                            <Text style={styles.itemUnitPrice}>@ Rs. {formatRs(item.purchasePrice)}</Text>
                          )}
                          <View style={styles.compareHintRow}>
                            <Text style={styles.compareHintText}>Compare</Text>
                            <Ionicons name="chevron-forward" size={11} color={colors.primary} />
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>

            {/* Final Bill Summary Receipt */}
            <View style={styles.finalReceiptCard}>
              <View style={styles.finalReceiptHeader}>
                <Ionicons name="receipt-outline" size={20} color="#0F172A" />
                <Text style={styles.finalReceiptTitle}>Final Bill Summary</Text>
              </View>

              <View style={styles.receiptLineRow}>
                <Text style={styles.receiptLineLabel}>Total Items Purchased:</Text>
                <Text style={styles.receiptLineVal}>{totalItems} items</Text>
              </View>

              <View style={styles.receiptLineRow}>
                <Text style={styles.receiptLineLabel}>Supermarkets Visited:</Text>
                <Text style={styles.receiptLineVal}>{storeGroups.length} stores</Text>
              </View>

              {Boolean(highestStore) ? (
                <View style={styles.receiptLineRow}>
                  <Text style={styles.receiptLineLabel}>{`If purchased at highest store (${highestStore.name}):`}</Text>
                  <Text style={styles.receiptLineValStrikethrough}>{`Rs. ${formatRs(maxStoreTotal)}`}</Text>
                </View>
              ) : null}

              <View style={styles.receiptDashedLine} />

              <View style={styles.receiptGrandRow}>
                <Text style={styles.receiptGrandLabel}>Total Bill Amount:</Text>
                <Text style={styles.receiptGrandTotal}>Rs. {formatRs(splitOptimalTotal)}</Text>
              </View>

              <View style={styles.receiptSavingsRow}>
                <Text style={styles.receiptSavingsLabel}>Saving of Total Bill:</Text>
                <Text style={styles.receiptSavingsTotal}>Rs. {formatRs(totalPotentialSavings)}</Text>
              </View>

              <View style={styles.savingsCallout}>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                <Text style={styles.savingsCalloutText}>
                  🎉 By buying these items across these supermarkets, you save Rs. {formatRs(totalPotentialSavings)} on your total grocery bill!
                </Text>
              </View>
            </View>
          </View>
        ) : (
          /* ==============================================================
             SINGLE STORE COMPARISON TRIP
             ============================================================== */
          <View>
            {bestSingleStore ? (
              <LinearGradient
                colors={['#059669', '#047857', '#065F46']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.singleHeroCard}
              >
                <View style={styles.summaryHeaderBadge}>
                  <Ionicons name="trophy" size={16} color="#FDE047" />
                  <Text style={styles.summaryBadgeText}>RECOMMENDED BEST SINGLE STORE</Text>
                </View>

                <Text style={styles.bestStoreName}>{bestSingleStore.name}</Text>
                <Text style={styles.bestStoreTotal}>Rs. {formatRs(bestSingleStore.total)}</Text>
                <Text style={styles.bestStoreSub}>
                  Covers {bestSingleStore.itemCount} of {bestSingleStore.totalItems} items ({bestSingleStore.coverage}% in stock)
                </Text>

                {bestSingleStore.savingsVsWorst > 0 && (
                  <View style={styles.singleSavingsBanner}>
                    <Ionicons name="sparkles" size={16} color="#FEF08A" />
                    <Text style={styles.savingsText}>
                      Save Rs. {formatRs(bestSingleStore.savingsVsWorst)} compared to {highestStore?.name || 'highest store'}!
                    </Text>
                  </View>
                )}
              </LinearGradient>
            ) : null}

            {/* Supermarket Comparison Ranking */}
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Supermarket Total Comparison</Text>
                <Text style={styles.sectionCountText}>{supermarketComparison.length} Stores</Text>
              </View>
              <Text style={styles.sectionSub}>Ranked by bill total and item availability</Text>

              {supermarketComparison.map((store, idx) => {
                const isBest = idx === 0;
                const diffFromBest = isBest ? 0 : Math.max(0, store.total - (supermarketComparison[0]?.total || 0));
                const barWidth = Math.max(20, Math.min(100, Math.round((store.total / maxStoreTotal) * 100)));

                return (
                  <View
                    key={store.supermarketId}
                    style={[styles.storeCard, isBest && styles.cheapestStoreCard]}
                  >
                    <View style={styles.storeCardTop}>
                      <View style={styles.storeLeftCol}>
                        <View style={styles.storeTitleRow}>
                          <View style={[styles.rankChip, isBest && styles.rankChipBest]}>
                            <Text style={[styles.rankChipText, isBest && styles.rankChipTextBest]}>
                              {isBest ? 'BEST VALUE' : `#${idx + 1}`}
                            </Text>
                          </View>
                          <Text style={styles.storeName}>{store.name}</Text>
                        </View>

                        <Text style={styles.storeCoverage}>
                          {store.coverage}% coverage · {store.itemCount}/{store.totalItems} items
                          {store.missingCount > 0 ? ` (${store.missingCount} missing)` : ' (All in stock)'}
                        </Text>
                      </View>

                      <View style={styles.storeRightCol}>
                        <Text style={[styles.storeTotal, isBest && styles.cheapestTotal]}>
                          Rs. {formatRs(store.total)}
                        </Text>
                        {store.savingsVsWorst > 0 ? (
                          <Text style={styles.storeSavings}>Save Rs. {formatRs(store.savingsVsWorst)}</Text>
                        ) : (
                          diffFromBest > 0 && <Text style={styles.storeExtra}>+Rs. {formatRs(diffFromBest)} vs best</Text>
                        )}
                      </View>
                    </View>

                    {Boolean(store.missingItems && store.missingItems.length > 0) ? (
                      <View style={styles.missingBadge}>
                        <Ionicons name="information-circle-outline" size={13} color="#D97706" />
                        <Text style={styles.missingText} numberOfLines={1}>
                          {`Missing at this store: ${store.missingItems.join(', ')}`}
                        </Text>
                      </View>
                    ) : null}

                    <View style={styles.storeBarTrack}>
                      <View
                        style={[
                          styles.storeBarFill,
                          {
                            width: `${barWidth}%`,
                            backgroundColor: isBest ? '#10B981' : (idx === supermarketComparison.length - 1 ? '#F87171' : '#60A5FA'),
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, padding: 24 },
  emptyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  loadingText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1E293B', marginTop: 8 },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 18 },
  content: { padding: 16, paddingBottom: 40 },

  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  /* Tabs */
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#fff',
    ...shadows.sm,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#047857',
    fontWeight: '800',
  },
  tabBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#047857',
  },

  /* Multi-Store Hero Card */
  heroCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
    ...shadows.md,
  },
  heroTopBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  heroTopBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A7F3D0',
    letterSpacing: 0.5,
  },
  heroTotalLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
  },
  heroTotalAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    marginVertical: 4,
  },
  heroSavingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(254,240,138,0.35)',
    width: '100%',
  },
  heroSavingsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FEF08A',
  },
  heroSavingsSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },

  /* Stores Visited Section */
  storesVisitedSection: {
    marginBottom: 16,
  },
  sectionSubtitleSmall: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  storePillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  storePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    ...shadows.sm,
  },
  storePillName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  storePillCount: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },

  /* Multi-Store Group Cards */
  section: { marginBottom: 20 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  sectionBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  sectionSub: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 14 },

  multiStoreGroupCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  multiStoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  multiStoreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  multiStoreIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  multiStoreName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  multiStoreItemCount: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  multiStoreSubtotalBox: {
    alignItems: 'flex-end',
  },
  multiStoreSubtotalLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  multiStoreSubtotalAmount: {
    fontSize: 17,
    fontWeight: '900',
    color: '#047857',
  },
  multiStoreSavingsBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    marginTop: 1,
  },
  storeItemsDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },

  /* Item Bill Card inside store */
  itemBillCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemBillLeft: { flex: 1, paddingRight: 10 },
  itemBillName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  itemBillQty: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  itemSavingsTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  itemSavingsTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#047857',
  },
  itemBestPriceText: {
    fontSize: 11,
    color: '#059669',
    marginTop: 4,
    fontWeight: '600',
  },

  itemBillRight: {
    alignItems: 'flex-end',
  },
  itemPurchasePriceLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  itemPurchasePrice: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  itemUnitPrice: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  compareHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 4,
  },
  compareHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
  },

  /* Final Bill Receipt Summary Box */
  finalReceiptCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  finalReceiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  finalReceiptTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  receiptLineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  receiptLineLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  receiptLineVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  receiptLineValStrikethrough: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  receiptDashedLine: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
  },
  receiptGrandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  receiptGrandLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  receiptGrandTotal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#047857',
  },
  receiptSavingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  receiptSavingsLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#059669',
  },
  receiptSavingsTotal: {
    fontSize: 17,
    fontWeight: '900',
    color: '#059669',
  },
  savingsCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  savingsCalloutText: {
    flex: 1,
    fontSize: 12,
    color: '#065F46',
    fontWeight: '700',
    lineHeight: 18,
  },

  /* Single Store Styles */
  singleHeroCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
    ...shadows.md,
  },
  summaryHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 10,
  },
  summaryBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FEF08A',
    letterSpacing: 0.5,
  },
  bestStoreName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  bestStoreTotal: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    marginTop: 4,
  },
  bestStoreSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  singleSavingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(254,240,138,0.3)',
  },
  savingsText: {
    fontSize: 13,
    color: '#FEF08A',
    fontWeight: '700',
  },

  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  storeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  cheapestStoreCard: {
    borderColor: '#10B981',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
  },
  storeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storeLeftCol: { flex: 1, paddingRight: 10 },
  storeTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  rankChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rankChipBest: {
    backgroundColor: '#10B981',
  },
  rankChipText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  rankChipTextBest: {
    color: '#fff',
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  storeCoverage: {
    fontSize: 12,
    color: '#64748B',
  },
  storeRightCol: { alignItems: 'flex-end' },
  storeTotal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  cheapestTotal: {
    color: '#047857',
  },
  storeSavings: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginTop: 2,
  },
  storeExtra: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 2,
  },
  missingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  missingText: {
    fontSize: 11,
    color: '#D97706',
    flex: 1,
  },
  storeBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  storeBarFill: {
    height: '100%',
    borderRadius: 3,
  },
});
