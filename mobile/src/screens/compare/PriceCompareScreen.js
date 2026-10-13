import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { pricesAPI, shoppingListsAPI } from '../../services/api';
import { colors, typography, shadows } from '../../theme';

export default function PriceCompareScreen({ navigation, route }) {
  const { productId, productName, item } = route.params || {};
  const [comparisonResult, setComparisonResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  const queryIdentifier = productId || productName || item?.productId || item?.name;

  const loadComparison = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    setErrorMsg(null);
    try {
      let res;
      if (productId) {
        res = await pricesAPI.compare({ productId });
      } else if (productName || item?.name) {
        res = await pricesAPI.compare({ productName: productName || item?.name });
      } else {
        throw new Error('No product specified for comparison.');
      }

      const payload = res.data;
      if (payload && payload.data && Array.isArray(payload.data) && payload.data.length > 0) {
        setComparisonResult(payload.data[0]);
      } else if (payload && payload.comparison && productId && payload.comparison[productId]) {
        // Fallback mapping
        const storeMap = payload.comparison[productId];
        const storeEntries = Object.values(storeMap);
        setComparisonResult({
          product: payload.products?.[0] || { name: productName || 'Product' },
          prices: storeEntries,
          lowestPrice: storeEntries[0]?.effectivePrice || storeEntries[0]?.price,
          highestPrice: storeEntries[storeEntries.length - 1]?.effectivePrice || storeEntries[storeEntries.length - 1]?.price,
          maxSavings: 0,
        });
      } else {
        setComparisonResult(null);
      }
    } catch (err) {
      console.warn('Failed to load comparison:', err);
      setErrorMsg('Could not find price comparison for this item.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [productId, productName, item]);

  useEffect(() => {
    loadComparison();
  }, [loadComparison]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadComparison(true);
  };

  const formatRs = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '0.00';
    return Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Price Comparison</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Comparing community prices across supermarkets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const product = comparisonResult?.product || item || { name: productName || 'Product' };
  const entries = comparisonResult?.prices || [];
  const lowestPrice = comparisonResult?.lowestPrice ?? (entries[0]?.effectivePrice ?? entries[0]?.price);
  const highestPrice = comparisonResult?.highestPrice ?? (entries[entries.length - 1]?.effectivePrice ?? entries[entries.length - 1]?.price);
  const maxSavings = comparisonResult?.maxSavings ?? (entries.length > 1 ? Math.max(0, highestPrice - lowestPrice) : 0);
  const cheapestStoreName = comparisonResult?.cheapestStore || entries[0]?.supermarketName || 'Cheapest Store';
  const mostExpensiveStoreName = comparisonResult?.mostExpensiveStore || entries[entries.length - 1]?.supermarketName || 'Highest Store';

  const maxPriceForBar = highestPrice > 0 ? highestPrice : 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Top Header with Back Navigation */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>Compare All Prices</Text>
          <Text style={styles.headerSub} numberOfLines={1}>{product.name}</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn} activeOpacity={0.7}>
          <Ionicons name="reload" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Product Card Header */}
        <LinearGradient
          colors={['#0F766E', '#115E59', '#134E4A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.productBanner}
        >
          <View style={styles.productBannerTop}>
            <View style={styles.iconCircle}>
              <Ionicons name="cart" size={28} color="#2DD4BF" />
            </View>
            <View style={styles.productBannerInfo}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productMeta}>
                {product.brand ? `${product.brand} · ` : ''}
                {product.category?.name ? `${product.category.name} · ` : ''}
                Per {product.defaultUnit || 'unit'}
              </Text>
            </View>
          </View>

          {entries.length > 1 && maxSavings > 0 ? (
            <View style={styles.heroSavingsBadge}>
              <View style={styles.heroSavingsIcon}>
                <Ionicons name="sparkles" size={18} color="#FDE047" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroSavingsTitle}>
                  Save Rs. {formatRs(maxSavings)} by choosing {cheapestStoreName}!
                </Text>
                <Text style={styles.heroSavingsSub}>
                  Lowest price Rs. {formatRs(lowestPrice)} vs Rs. {formatRs(highestPrice)} at {mostExpensiveStoreName}
                </Text>
              </View>
            </View>
          ) : null}
        </LinearGradient>

        {/* 3-Column Summary Metrics */}
        {entries.length > 1 && (
          <View style={styles.metricsRow}>
            <View style={[styles.metricCard, styles.metricCardCheapest]}>
              <View style={styles.metricIconWrapCheapest}>
                <Ionicons name="trophy" size={14} color="#059669" />
              </View>
              <Text style={styles.metricLabel}>LOWEST PRICE</Text>
              <Text style={styles.metricStore} numberOfLines={1}>{cheapestStoreName}</Text>
              <Text style={styles.metricPriceCheapest}>Rs. {formatRs(lowestPrice)}</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricIconWrapSavings}>
                <Ionicons name="wallet-outline" size={14} color="#2563EB" />
              </View>
              <Text style={styles.metricLabel}>MAX SAVINGS</Text>
              <Text style={styles.metricStore}>Per {product.defaultUnit || 'unit'}</Text>
              <Text style={styles.metricPriceSavings}>Rs. {formatRs(maxSavings)}</Text>
            </View>

            <View style={styles.metricCard}>
              <View style={styles.metricIconWrapHighest}>
                <Ionicons name="trending-up-outline" size={14} color="#DC2626" />
              </View>
              <Text style={styles.metricLabel}>HIGHEST</Text>
              <Text style={styles.metricStore} numberOfLines={1}>{mostExpensiveStoreName}</Text>
              <Text style={styles.metricPriceHighest}>Rs. {formatRs(highestPrice)}</Text>
            </View>
          </View>
        )}

        {/* Supermarket Comparison Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Supermarket Price Comparison</Text>
            <View style={styles.storeCountBadge}>
              <Text style={styles.storeCountText}>{entries.length} {entries.length === 1 ? 'store' : 'stores'}</Text>
            </View>
          </View>
          <Text style={styles.sectionSub}>Ranked from lowest price to highest price</Text>

          {entries.map((entry, idx) => {
            const effPrice = entry.effectivePrice ?? (entry.isOnSale ? entry.salePrice : entry.price);
            const isCheapest = idx === 0;
            const savingsVsHighest = entry.savingsVsHighest !== undefined
              ? entry.savingsVsHighest
              : Math.max(0, highestPrice - effPrice);
            const diffFromCheapest = entry.differenceFromCheapest !== undefined
              ? entry.differenceFromCheapest
              : Math.max(0, effPrice - lowestPrice);
            const savingsPct = highestPrice > 0 ? Math.round(((highestPrice - effPrice) / highestPrice) * 100) : 0;

            const barPct = Math.max(15, Math.min(100, Math.round((effPrice / maxPriceForBar) * 100)));

            return (
              <View
                key={entry.id || entry.supermarketId || `store-${idx}`}
                style={[styles.storeCard, isCheapest && styles.cheapestStoreCard]}
              >
                {/* Store Header Row */}
                <View style={styles.storeHeader}>
                  <View style={styles.storeLeft}>
                    {/* Rank Badge */}
                    <View style={[styles.rankBadge, isCheapest && styles.rankBadgeCheapest]}>
                      {isCheapest ? (
                        <Ionicons name="trophy" size={12} color="#fff" />
                      ) : (
                        <Text style={styles.rankText}>#{idx + 1}</Text>
                      )}
                      {Boolean(isCheapest) ? <Text style={styles.rankTextCheapest}>BEST PRICE</Text> : null}
                    </View>

                    {/* Store Color & Name */}
                    <View style={styles.storeNameGroup}>
                      <View style={[styles.storeDot, { backgroundColor: entry.primaryColor || (isCheapest ? '#059669' : '#3B82F6') }]} />
                      <Text style={styles.storeName}>{entry.supermarketName}</Text>
                    </View>
                  </View>

                  {/* Price */}
                  <View style={styles.storePriceGroup}>
                    {Boolean(entry.isOnSale && entry.price > effPrice) ? (
                      <Text style={styles.originalPrice}>Rs. {formatRs(entry.price)}</Text>
                    ) : null}
                    <Text style={[styles.effectivePrice, isCheapest && styles.effectivePriceCheapest]}>
                      Rs. {formatRs(effPrice)}
                    </Text>
                  </View>
                </View>

                {/* Savings Breakdown Row */}
                <View style={styles.savingsRow}>
                  {isCheapest ? (
                    <View style={styles.bestDealCallout}>
                      <Ionicons name="checkmark-circle" size={14} color="#059669" />
                      <Text style={styles.bestDealText}>
                        Lowest price available! {entries.length > 1 ? `Save Rs. ${formatRs(savingsVsHighest)} (${savingsPct}%) vs ${mostExpensiveStoreName}` : ''}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.otherStoreSavingsWrap}>
                      {savingsVsHighest > 0 ? (
                        <View style={styles.savingPill}>
                          <Ionicons name="arrow-down-circle" size={13} color="#059669" />
                          <Text style={styles.savingPillText}>
                            Save Rs. {formatRs(savingsVsHighest)} vs {mostExpensiveStoreName}
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.highestPill}>
                          <Text style={styles.highestPillText}>Highest Price</Text>
                        </View>
                      )}

                      {diffFromCheapest > 0 && (
                        <Text style={styles.moreThanCheapestText}>
                          +Rs. {formatRs(diffFromCheapest)} vs {cheapestStoreName}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Price Bar Visualization */}
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        width: `${barPct}%`,
                        backgroundColor: isCheapest ? '#10B981' : (idx === entries.length - 1 ? '#F87171' : '#60A5FA'),
                      },
                    ]}
                  />
                </View>

                {/* Footer metadata */}
                <View style={styles.cardFooter}>
                  <View style={styles.verifiedTag}>
                    <Ionicons name="shield-checkmark" size={12} color="#059669" />
                    <Text style={styles.verifiedText}>Community Price · {entry.source || 'receipt'}</Text>
                  </View>
                  {Boolean(entry.recordedAt) ? (
                    <Text style={styles.timestampText}>
                      {`Updated ${new Date(entry.recordedAt).toLocaleDateString()}`}
                    </Text>
                  ) : null}
                </View>
              </View>
            );
          })}

          {entries.length === 0 && (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="search-outline" size={32} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>No community prices recorded yet</Text>
              <Text style={styles.emptyText}>
                Be the first to record prices for "{product.name}"! When any user scans a receipt or adds an expense with this item, all supermarket prices and savings will automatically display here.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  productBanner: {
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    ...shadows.md,
  },
  productBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productBannerInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  productMeta: {
    fontSize: 13,
    color: '#CCFBF1',
    marginTop: 3,
  },
  heroSavingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(253,224,71,0.3)',
  },
  heroSavingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(253,224,71,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSavingsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FEF08A',
  },
  heroSavingsSub: {
    fontSize: 12,
    color: '#E2E8F0',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    ...shadows.sm,
  },
  metricCardCheapest: {
    borderColor: '#10B981',
    backgroundColor: '#F0FDF4',
  },
  metricIconWrapCheapest: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricIconWrapSavings: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricIconWrapHighest: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  metricStore: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    fontWeight: '500',
  },
  metricPriceCheapest: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
    marginTop: 4,
  },
  metricPriceSavings: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2563EB',
    marginTop: 4,
  },
  metricPriceHighest: {
    fontSize: 15,
    fontWeight: '800',
    color: '#DC2626',
    marginTop: 4,
  },
  section: {
    marginTop: 6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  storeCountBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  storeCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
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
    backgroundColor: '#FAFCFB',
    borderWidth: 2,
  },
  storeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  storeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  rankBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rankBadgeCheapest: {
    backgroundColor: '#059669',
  },
  rankText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  rankTextCheapest: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  storeNameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  storeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    flex: 1,
  },
  storePriceGroup: {
    alignItems: 'flex-end',
  },
  originalPrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  effectivePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  effectivePriceCheapest: {
    color: '#059669',
  },
  savingsRow: {
    marginBottom: 10,
  },
  bestDealCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  bestDealText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  otherStoreSavingsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  savingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  savingPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  highestPill: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  highestPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  moreThanCheapestText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '500',
  },
  barTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    color: '#64748B',
  },
  timestampText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 12,
  },
  emptyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
