import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { productsAPI, categoriesAPI, shoppingListsAPI } from '../../services/api';
import { colors, typography, spacing, shadows } from '../../theme';

const { width } = Dimensions.get('window');

const STORE_THEME_COLORS = {
  'cargills': '#D32F2F',
  'keells': '#00843D',
  'arpico': '#005BAA',
  'freshmart': '#2E7D32',
  'supersave': '#1565C0',
  'valueplus': '#E65100',
  'ecogrocer': '#6A1B9A',
};

const getStoreColor = (name = '', fallback = colors.primary) => {
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(STORE_THEME_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return fallback;
};

export default function CompanyPricesScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const initialStoreId = route?.params?.supermarketId || null;

  const [supermarkets, setSupermarkets] = useState([]);
  const [selectedSupermarketId, setSelectedSupermarketId] = useState(initialStoreId);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [addingToListId, setAddingToListId] = useState(null);
  const searchTimeoutRef = useRef(null);

  // Debounce search input
  const handleSearchChange = (text) => {
    setSearchQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(text.trim());
    }, 350);
  };

  // Load categories
  useEffect(() => {
    categoriesAPI.list().then(res => {
      const data = res?.data?.data || res?.data || [];
      if (Array.isArray(data)) setCategories(data);
    }).catch(() => {});
  }, []);

  // Fetch company prices
  const fetchPrices = useCallback(async (pageNum = 1, shouldAppend = false) => {
    if (pageNum === 1) setIsLoading(true);
    try {
      const params = {
        page: pageNum,
        limit: 20,
      };
      if (selectedSupermarketId) params.supermarketId = selectedSupermarketId;
      if (selectedCategory) params.category = selectedCategory;
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await productsAPI.getCompanyPrices(params);
      const resData = res?.data;

      if (resData?.supermarkets && Array.isArray(resData.supermarkets)) {
        setSupermarkets(resData.supermarkets);
      }

      const items = resData?.data || [];
      const total = resData?.pagination?.total ?? items.length;
      setTotalCount(total);

      if (shouldAppend) {
        setProducts(prev => [...prev, ...items]);
      } else {
        setProducts(items);
      }

      setHasMore(items.length >= 20);
      setPage(pageNum);
    } catch (err) {
      console.warn('Error fetching company prices:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedSupermarketId, selectedCategory, debouncedSearch]);

  useEffect(() => {
    fetchPrices(1, false);
  }, [fetchPrices]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchPrices(1, false);
  };

  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchPrices(page + 1, true);
    }
  };

  // Add product to default shopping list
  const handleAddToList = async (prod) => {
    try {
      setAddingToListId(prod.id);
      const listsRes = await shoppingListsAPI.list();
      const lists = listsRes?.data?.data || listsRes?.data || [];
      let targetListId = lists[0]?.id;

      if (!targetListId) {
        const createRes = await shoppingListsAPI.create({ name: 'My Shopping List' });
        targetListId = createRes?.data?.data?.id;
      }

      if (targetListId) {
        await shoppingListsAPI.addItem(targetListId, {
          productId: prod.id,
          quantity: 1,
          unit: prod.defaultUnit || 'unit',
        });
        Alert.alert('Added to Shopping List', `"${prod.name}" added to your shopping list!`);
      }
    } catch {
      Alert.alert('Notice', 'Could not add to shopping list.');
    } finally {
      setAddingToListId(null);
    }
  };

  const selectedStoreObj = supermarkets.find(s => s.id === selectedSupermarketId);

  const renderSupermarketPills = () => (
    <View style={styles.storeCarouselContainer}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: null, name: 'All Stores', slug: 'all', _count: { prices: totalCount } }, ...supermarkets]}
        keyExtractor={item => item.id || 'all'}
        contentContainerStyle={styles.storePillList}
        renderItem={({ item }) => {
          const isSelected = selectedSupermarketId === item.id;
          const storeColor = item.primaryColor || getStoreColor(item.name, colors.primary);

          return (
            <TouchableOpacity
              style={[
                styles.storePill,
                isSelected && { backgroundColor: storeColor, borderColor: storeColor },
              ]}
              onPress={() => setSelectedSupermarketId(item.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.storeDot,
                  { backgroundColor: isSelected ? '#fff' : storeColor },
                ]}
              />
              <Text
                style={[
                  styles.storePillText,
                  isSelected && styles.storePillTextActive,
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              {Boolean(item._count?.prices && item._count.prices > 0) ? (
                <View style={[styles.storeCountBadge, isSelected && styles.storeCountBadgeActive]}>
                  <Text style={[styles.storeCountText, isSelected && styles.storeCountTextActive]}>
                    {item._count.prices}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  const renderCategoryFilters = () => (
    <View style={styles.catWrapper}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: '', name: 'All Items', slug: '' }, ...categories]}
        keyExtractor={item => item.id || 'all-cats'}
        contentContainerStyle={styles.catList}
        renderItem={({ item }) => {
          const isSelected = selectedCategory === item.slug;
          return (
            <TouchableOpacity
              style={[styles.catChip, isSelected && styles.catChipActive]}
              onPress={() => setSelectedCategory(isSelected ? '' : item.slug)}
              activeOpacity={0.7}
            >
              <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                {item.name}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  const renderProductItem = ({ item }) => {
    const storeName = item.supermarket?.name || 'Catalog';
    const storeColor = item.supermarket?.primaryColor || getStoreColor(storeName, colors.primary);

    return (
      <View style={styles.productCard}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText} numberOfLines={1}>
              {item.category?.name || 'Grocery'}
            </Text>
          </View>
          <View style={[styles.storeBadge, { backgroundColor: `${storeColor}18`, borderColor: `${storeColor}40` }]}>
            <Ionicons name="business" size={11} color={storeColor} style={{ marginRight: 4 }} />
            <Text style={[styles.storeBadgeText, { color: storeColor }]} numberOfLines={1}>
              {storeName}
            </Text>
          </View>
        </View>

        {/* Product Info & Pricing */}
        <View style={styles.cardBody}>
          <View style={styles.productInfoLeft}>
            {Boolean(item.brand) ? (
              <Text style={styles.brandText} numberOfLines={1}>{item.brand}</Text>
            ) : null}
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.unitText}>{`Unit: ${item.defaultUnit || 'unit'}`}</Text>
          </View>

          <View style={styles.priceContainer}>
            {item.currentPrice != null ? (
              <View>
                <Text style={styles.priceLabel}>Community Price</Text>
                <Text style={styles.priceAmount}>
                  {`LKR ${Number(item.currentPrice).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </Text>
                {Boolean(item.isOnSale && item.salePrice) ? (
                  <View style={styles.saleTag}>
                    <Ionicons name="pricetag" size={10} color="#fff" />
                    <Text style={styles.saleTagText}>ON SALE</Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={styles.noPriceText}>Price not set</Text>
            )}
          </View>
        </View>

        {/* Multi-Store Comparison Snippet */}
        {item.storeCount > 1 ? (
          <View style={styles.compareSnippet}>
            <Ionicons name="git-compare-outline" size={13} color={colors.primary} />
            <Text style={styles.compareSnippetText}>
              {`Available in ${item.storeCount} stores${item.savings > 0 ? ` · Save up to LKR ${item.savings.toFixed(2)}` : ''}`}
            </Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.compareBtn}
            onPress={() => navigation.navigate('PriceCompare', { productId: item.id, productName: item.name })}
            activeOpacity={0.7}
          >
            <Ionicons name="swap-horizontal-outline" size={15} color={colors.primary} />
            <Text style={styles.compareBtnText}>Compare Stores</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.addListBtn}
            onPress={() => handleAddToList(item)}
            disabled={addingToListId === item.id}
            activeOpacity={0.7}
          >
            {addingToListId === item.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="cart-outline" size={15} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.addListBtnText}>Add to List</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      {/* Top Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('Home', { screen: 'HomeMain' });
              }
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={styles.headerRowBadge}>
              <Ionicons name="business-outline" size={14} color="#A7F3D0" />
              <Text style={styles.headerBadgeText}>COMMUNITY CATALOG PRICES</Text>
            </View>
            <Text style={styles.headerTitle}>Community Price Data</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textLight} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products, brands..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')} style={{ padding: 4 }}>
              <Ionicons name="close-circle" size={18} color={colors.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Supermarkets and Categories Horizontal Filters */}
      {renderSupermarketPills()}
      {renderCategoryFilters()}

      {/* Results Header Info */}
      <View style={styles.resultsInfoRow}>
        <Text style={styles.resultsCountText}>
          {totalCount} {totalCount === 1 ? 'item' : 'items'} found
          {selectedStoreObj ? ` at ${selectedStoreObj.name}` : ' across stores'}
        </Text>
        {Boolean(selectedSupermarketId || selectedCategory || debouncedSearch) ? (
          <TouchableOpacity
            onPress={() => {
              setSelectedSupermarketId(null);
              setSelectedCategory('');
              setSearchQuery('');
              setDebouncedSearch('');
            }}
          >
            <Text style={styles.clearFilterText}>Reset Filters</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Product List */}
      {isLoading ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading community catalog prices...</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="storefront-outline" size={40} color={colors.textLight} />
              </View>
              <Text style={styles.emptyTitle}>No Community Prices Found</Text>
              <Text style={styles.emptySubtitle}>
                No supermarket items match your current filter or search criteria.
              </Text>
              <TouchableOpacity
                style={styles.emptyResetBtn}
                onPress={() => {
                  setSelectedSupermarketId(null);
                  setSelectedCategory('');
                  setSearchQuery('');
                  setDebouncedSearch('');
                }}
              >
                <Text style={styles.emptyResetBtnText}>View All Community Prices</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...shadows.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    padding: 6,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerRowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  headerBadgeText: {
    color: '#A7F3D0',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginLeft: 4,
  },
  headerTitle: {
    ...typography.h3,
    color: '#fff',
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
    ...shadows.sm,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    paddingVertical: 0,
  },
  storeCarouselContainer: {
    marginTop: 10,
  },
  storePillList: {
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  storePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.xs,
  },
  storeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  storePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  storePillTextActive: {
    color: '#fff',
  },
  storeCountBadge: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 6,
  },
  storeCountBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  storeCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  storeCountTextActive: {
    color: '#fff',
  },
  catWrapper: {
    marginTop: 8,
  },
  catList: {
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  catChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  catChipActive: {
    backgroundColor: colors.primaryFaded,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  catChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  catChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  resultsInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginTop: 10,
    marginBottom: 4,
  },
  resultsCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  clearFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 40,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E6EFE9',
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: '50%',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  storeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productInfoLeft: {
    flex: 1,
    paddingRight: 10,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  productName: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 19,
  },
  unitText: {
    fontSize: 11,
    color: colors.textLight,
    marginTop: 3,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textLight,
    textTransform: 'uppercase',
  },
  priceAmount: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginTop: 1,
  },
  saleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    gap: 3,
  },
  saleTagText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },
  noPriceText: {
    fontSize: 12,
    color: colors.textLight,
    fontStyle: 'italic',
  },
  compareSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 10,
    gap: 5,
  },
  compareSnippetText: {
    fontSize: 11,
    color: colors.primaryDark,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  compareBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryFaded,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  compareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  addListBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 5,
  },
  addListBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    ...typography.h4,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyResetBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyResetBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});
