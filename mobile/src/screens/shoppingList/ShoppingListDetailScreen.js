import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Modal, ActivityIndicator, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { productsAPI } from '../../services/api';
import { useShoppingStore } from '../../store/shoppingStore';
import { colors, typography, shadows } from '../../theme';

export default function ShoppingListDetailScreen({ navigation, route }) {
  const { listId, listName } = route.params;
  const { currentList, fetchList, addItem, removeItem, toggleCheck } = useShoppingStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: listName });
    loadList();
  }, [listId]);

  const loadList = async () => {
    setIsLoading(true);
    await fetchList(listId);
    setIsLoading(false);
  };

  const formatRs = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '0.00';
    return Number(val).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleSearch = async (q) => {
    setSearchQuery(q);
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await productsAPI.search(q.trim(), { limit: 10 });
      setSearchResults(res.data.data || []);
    } catch {} finally { setSearching(false); }
  };

  const handleAddProduct = async (product) => {
    try {
      await addItem(listId, product.id, 1, product.defaultUnit);
      setShowAddModal(false);
      setSearchQuery('');
      setSearchResults([]);
      await fetchList(listId);
    } catch { Alert.alert('Error', 'Could not add item.'); }
  };

  const handleRemoveItem = (item) => {
    Alert.alert('Remove Item', `Remove "${item.product.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await removeItem(listId, item.id);
        await fetchList(listId);
      }},
    ]);
  };

  const items = currentList?.items || [];
  const checkedCount = items.filter(i => i.isChecked).length;
  const totalBill = currentList?.totalEstimatedBill ?? 0;
  const totalSavings = currentList?.totalEstimatedSavings ?? 0;

  // Group items by best purchase supermarket for the bill modal
  const storeGroupsMap = {};
  items.forEach(item => {
    const storeName = item.bestStore || 'Unassigned Store';
    if (!storeGroupsMap[storeName]) {
      storeGroupsMap[storeName] = {
        name: storeName,
        items: [],
        subtotal: 0,
        subtotalSavings: 0,
      };
    }
    const unitPrice = item.bestPrice ? Number(item.bestPrice) : 0;
    const qty = Number(item.quantity) || 1;
    const lineTotal = unitPrice * qty;
    const itemSavings = Number(item.itemSavings) || 0;

    storeGroupsMap[storeName].items.push({
      ...item,
      unitPrice,
      lineTotal,
      itemSavings,
    });
    storeGroupsMap[storeName].subtotal += lineTotal;
    storeGroupsMap[storeName].subtotalSavings += itemSavings;
  });
  const storeGroups = Object.values(storeGroupsMap);

  const renderItem = ({ item }) => {
    const hasPrice = item.bestPrice !== null && item.bestPrice !== undefined;
    const unitPrice = hasPrice ? Number(item.bestPrice) : 0;
    const qty = Number(item.quantity) || 1;
    const lineTotal = unitPrice * qty;
    const itemSavings = Number(item.itemSavings) || 0;

    return (
      <TouchableOpacity
        style={[styles.itemCard, item.isChecked && styles.itemCardChecked]}
        onPress={() => toggleCheck(listId, item.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.checkbox, item.isChecked && styles.checkboxChecked]}>
          {Boolean(item.isChecked) ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
        </View>

        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, item.isChecked && styles.itemNameChecked]}>
            {item.product.name}
          </Text>
          <Text style={styles.itemMeta}>
            {item.quantity} {item.unit || item.product.defaultUnit}
            {item.product.category && ` · ${item.product.category.name}`}
          </Text>

          {/* Supermarket, Purchase Price & Savings Details */}
          {hasPrice ? (
            <View style={styles.priceRow}>
              {item.bestStore ? (
                <View style={styles.storeBadge}>
                  <Ionicons name="storefront-outline" size={12} color="#047857" />
                  <Text style={styles.storeBadgeText} numberOfLines={1}>{item.bestStore}</Text>
                </View>
              ) : null}

              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Price: </Text>
                <Text style={styles.priceValue}>Rs. {formatRs(lineTotal)}</Text>
                {qty > 1 && (
                  <Text style={styles.unitPriceText}> (@ Rs. {formatRs(unitPrice)})</Text>
                )}
              </View>

              {itemSavings > 0 && (
                <View style={styles.itemSavingsBadge}>
                  <Ionicons name="trending-down" size={11} color="#059669" />
                  <Text style={styles.itemSavingsText}>Save Rs. {formatRs(itemSavings)}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noPriceRow}>
              <Ionicons name="help-circle-outline" size={13} color="#94A3B8" />
              <Text style={styles.noPriceText}>No supermarket price recorded yet</Text>
            </View>
          )}
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.viewPricesBtn}
            onPress={() => navigation.navigate('PriceCompare', { productId: item.product.id, productName: item.product.name })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.viewPricesText}>Compare</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleRemoveItem(item)} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {/* Progress bar */}
      {items.length > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>{checkedCount} of {items.length} items checked</Text>
            {checkedCount === items.length && items.length > 0 && (
              <Text style={styles.allDoneText}>🎉 All done!</Text>
            )}
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(checkedCount / items.length) * 100}%` }]} />
          </View>
        </View>
      )}

      {/* Multi-Store Bill & Total Savings Summary Banner */}
      {items.length > 0 && (
        <TouchableOpacity
          style={styles.billSummaryBanner}
          onPress={() => setShowBillModal(true)}
          activeOpacity={0.85}
        >
          <View style={styles.billSummaryLeft}>
            <View style={styles.billTitleRow}>
              <Ionicons name="receipt-outline" size={15} color="#059669" />
              <Text style={styles.billSummaryLabel}>TOTAL ESTIMATED BILL</Text>
            </View>
            <Text style={styles.billTotalAmount}>Rs. {formatRs(totalBill)}</Text>
            <Text style={styles.billSubtext}>Purchased across lowest price supermarkets</Text>
          </View>

          <View style={styles.billSummaryRight}>
            {totalSavings > 0 && (
              <View style={styles.totalSavingsPill}>
                <Ionicons name="sparkles" size={13} color="#065F46" />
                <Text style={styles.totalSavingsPillText}>Save Rs. {formatRs(totalSavings)}</Text>
              </View>
            )}
            <View style={styles.viewBillReceiptBtn}>
              <Text style={styles.viewBillReceiptText}>View Bill</Text>
              <Ionicons name="chevron-forward" size={13} color="#059669" />
            </View>
          </View>
        </TouchableOpacity>
      )}

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyTitle}>List is empty</Text>
            <Text style={styles.emptyText}>Add products to start comparing prices across supermarkets</Text>
          </View>
        )}
      />

      {/* Bottom Action Ribbon */}
      {items.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.billActionBtn}
            onPress={() => setShowBillModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="receipt" size={18} color={colors.primary} />
            <Text style={styles.billActionBtnText}>Final Bill</Text>
            {totalSavings > 0 && (
              <View style={styles.miniSavingsBadge}>
                <Text style={styles.miniSavingsText}>-Rs.{formatRs(totalSavings).split('.')[0]}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optimizeBtn}
            onPress={() => navigation.navigate('ShoppingListOptimize', { listId, listName })}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={18} color="#fff" />
            <Text style={styles.optimizeBtnText}>Find Best Store</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Final Multi-Supermarket Purchase Bill Modal */}
      <Modal visible={showBillModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.billModal}>
            <View style={styles.billModalHeader}>
              <View>
                <View style={styles.billHeaderRow}>
                  <Ionicons name="receipt" size={22} color="#059669" />
                  <Text style={styles.billModalTitle}>Final Purchase Bill</Text>
                </View>
                <Text style={styles.billModalSub}>
                  Breakdown by supermarket & savings per item
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowBillModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.billModalScroll}>
              {/* Grand Total Highlight */}
              <View style={styles.receiptHeroCard}>
                <Text style={styles.receiptHeroLabel}>GRAND TOTAL BILL AMOUNT</Text>
                <Text style={styles.receiptHeroTotal}>Rs. {formatRs(totalBill)}</Text>
                {totalSavings > 0 ? (
                  <View style={styles.receiptHeroSavingsBadge}>
                    <Ionicons name="sparkles" size={16} color="#FEF08A" />
                    <Text style={styles.receiptHeroSavingsText}>
                      Saving of Total Bill: Rs. {formatRs(totalSavings)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Grouped by Supermarket */}
              <Text style={styles.receiptSectionTitle}>Supermarket Purchase Plan</Text>

              {storeGroups.map((group, gIdx) => (
                <View key={group.name + gIdx} style={styles.receiptStoreCard}>
                  <View style={styles.receiptStoreHeader}>
                    <View style={styles.receiptStoreTitleRow}>
                      <View style={styles.storeIconWrap}>
                        <Ionicons name="storefront" size={16} color="#059669" />
                      </View>
                      <View>
                        <Text style={styles.receiptStoreName}>{group.name}</Text>
                        <Text style={styles.receiptStoreItemsCount}>{group.items.length} items</Text>
                      </View>
                    </View>
                    <View style={styles.receiptStoreSubtotalWrap}>
                      <Text style={styles.receiptStoreSubtotal}>Rs. {formatRs(group.subtotal)}</Text>
                      {group.subtotalSavings > 0 && (
                        <Text style={styles.receiptStoreSavings}>Save Rs. {formatRs(group.subtotalSavings)}</Text>
                      )}
                    </View>
                  </View>

                  {/* Store Items List */}
                  <View style={styles.receiptStoreDivider} />
                  {group.items.map((it) => (
                    <View key={it.id} style={styles.receiptItemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.receiptItemName}>{it.product.name}</Text>
                        <Text style={styles.receiptItemMeta}>
                          Qty: {it.quantity} {it.unit || it.product.defaultUnit || 'unit'} · {group.name}
                        </Text>
                      </View>
                      <View style={styles.receiptItemPriceWrap}>
                        <Text style={styles.receiptItemPrice}>Rs. {formatRs(it.lineTotal)}</Text>
                        {it.itemSavings > 0 ? (
                          <Text style={styles.receiptItemSavings}>Save Rs. {formatRs(it.itemSavings)}</Text>
                        ) : (
                          <Text style={styles.receiptItemNoSavings}>Best Price</Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              ))}

              {/* Final Receipt Summary Box */}
              <View style={styles.receiptSummaryBox}>
                <View style={styles.receiptSummaryRow}>
                  <Text style={styles.receiptSummaryLabel}>Items to Purchase:</Text>
                  <Text style={styles.receiptSummaryValue}>{items.length} items</Text>
                </View>
                <View style={styles.receiptSummaryRow}>
                  <Text style={styles.receiptSummaryLabel}>Supermarkets Visited:</Text>
                  <Text style={styles.receiptSummaryValue}>{storeGroups.length} stores</Text>
                </View>
                <View style={styles.receiptSummaryDivider} />
                <View style={styles.receiptSummaryRow}>
                  <Text style={styles.receiptSummaryLabelBold}>Total Bill Amount:</Text>
                  <Text style={styles.receiptSummaryTotalBold}>Rs. {formatRs(totalBill)}</Text>
                </View>
                <View style={styles.receiptSummaryRow}>
                  <Text style={styles.receiptSummarySavingsLabel}>Saving of Total Bill:</Text>
                  <Text style={styles.receiptSummarySavingsValue}>Rs. {formatRs(totalSavings)}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.optimizeLinkBtn}
                onPress={() => {
                  setShowBillModal(false);
                  navigation.navigate('ShoppingListOptimize', { listId, listName });
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="flash" size={18} color="#fff" />
                <Text style={styles.optimizeLinkBtnText}>Compare Store-by-Store Alternatives</Text>
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Product Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product</Text>
              <TouchableOpacity onPress={() => { setShowAddModal(false); setSearchQuery(''); setSearchResults([]); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={18} color={colors.textLight} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a product..."
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
              />
              {Boolean(searching) ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            </View>
            <FlatList
              data={searchResults}
              keyExtractor={item => item.id}
              style={{ maxHeight: 320 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.searchResult} onPress={() => handleAddProduct(item)}>
                  <View style={styles.searchResultIcon}>
                    <Ionicons name="cube-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.searchResultInfo}>
                    <Text style={styles.searchResultName}>{item.name}</Text>
                    <Text style={styles.searchResultMeta}>{item.category?.name} · {item.defaultUnit}</Text>
                  </View>
                  <Ionicons name="add-circle" size={24} color={colors.primary} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={() =>
                searchQuery.length > 1 && !searching ? (
                  <View style={styles.noResultsBox}>
                    <Text style={styles.noResults}>No existing product found for "{searchQuery}"</Text>
                    <TouchableOpacity
                      style={styles.addCustomBtn}
                      onPress={async () => {
                        try {
                          await addItem(listId, { productName: searchQuery.trim(), quantity: 1, unit: 'unit' });
                          setShowAddModal(false);
                          setSearchQuery('');
                          setSearchResults([]);
                          await fetchList(listId);
                        } catch {
                          Alert.alert('Error', 'Could not add item.');
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add-circle" size={18} color="#fff" />
                      <Text style={styles.addCustomBtnText}>Add "{searchQuery}" to list</Text>
                    </TouchableOpacity>
                  </View>
                ) : null
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progressContainer: { backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { ...typography.body, color: colors.textSecondary, fontWeight: '600', fontSize: 13 },
  allDoneText: { ...typography.body, color: colors.success, fontWeight: '600', fontSize: 13 },
  progressBar: { height: 6, backgroundColor: colors.border, borderRadius: 3 },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },

  /* Top Bill Banner */
  billSummaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ECFDF5',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    ...shadows.sm,
  },
  billSummaryLeft: { flex: 1 },
  billTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  billSummaryLabel: { fontSize: 11, fontWeight: '800', color: '#047857', letterSpacing: 0.5 },
  billTotalAmount: { fontSize: 22, fontWeight: '900', color: '#065F46' },
  billSubtext: { fontSize: 11, color: '#059669', marginTop: 2 },
  billSummaryRight: { alignItems: 'flex-end', gap: 6 },
  totalSavingsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },
  totalSavingsPillText: { fontSize: 12, fontWeight: '800', color: '#065F46' },
  viewBillReceiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 2 },
  viewBillReceiptText: { fontSize: 12, fontWeight: '700', color: '#059669' },

  listContent: { padding: 16, paddingBottom: 150 },
  itemCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 14, padding: 14, marginBottom: 10, ...shadows.sm,
  },
  itemCardChecked: { opacity: 0.6 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2,
    borderColor: colors.border, marginRight: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  itemInfo: { flex: 1 },
  itemName: { ...typography.body, fontWeight: '700', color: colors.text, fontSize: 15 },
  itemNameChecked: { textDecorationLine: 'line-through', color: colors.textLight },
  itemMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  storeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  storeBadgeText: { fontSize: 11, fontWeight: '700', color: '#047857' },
  priceContainer: { flexDirection: 'row', alignItems: 'center' },
  priceLabel: { fontSize: 12, color: colors.textSecondary },
  priceValue: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  unitPriceText: { fontSize: 11, color: colors.textLight },
  itemSavingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itemSavingsText: { fontSize: 11, fontWeight: '700', color: '#047857' },
  noPriceRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  noPriceText: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic' },

  itemActions: { alignItems: 'flex-end', gap: 10, marginLeft: 8 },
  viewPricesBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewPricesText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  removeBtn: { padding: 2 },

  /* Bottom Bar */
  bottomBar: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 80,
    flexDirection: 'row',
    gap: 8,
  },
  billActionBtn: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: colors.primary,
    ...shadows.sm,
  },
  billActionBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  miniSavingsBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  miniSavingsText: { fontSize: 10, fontWeight: '800', color: '#047857' },
  optimizeBtn: {
    flex: 1,
    backgroundColor: colors.secondary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    ...shadows.md,
  },
  optimizeBtnText: { ...typography.button, color: '#fff', fontSize: 14 },

  fab: {
    position: 'absolute', bottom: 24, right: 16,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
    ...shadows.lg,
  },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { ...typography.h3, color: colors.text, marginBottom: 8 },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 30 },

  /* Add modal */
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { ...typography.h3, color: colors.text },
  closeBtn: { padding: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.background, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  searchResult: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.divider },
  searchResultIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryFaded, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  searchResultInfo: { flex: 1 },
  searchResultName: { ...typography.body, fontWeight: '600', color: colors.text },
  searchResultMeta: { ...typography.caption, color: colors.textSecondary },
  noResults: { textAlign: 'center', color: colors.textSecondary, paddingVertical: 12 },
  noResultsBox: { alignItems: 'center', paddingVertical: 16 },
  addCustomBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, marginTop: 8,
  },
  addCustomBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  /* Final Purchase Bill Modal */
  billModal: { backgroundColor: '#F8FAFC', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  billModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  billHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  billModalTitle: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  billModalSub: { fontSize: 12, color: '#64748B', marginTop: 3 },
  billModalScroll: { maxHeight: 520 },

  receiptHeroCard: {
    backgroundColor: '#047857',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    ...shadows.sm,
  },
  receiptHeroLabel: { fontSize: 11, fontWeight: '800', color: '#A7F3D0', letterSpacing: 0.5 },
  receiptHeroTotal: { fontSize: 30, fontWeight: '900', color: '#fff', marginVertical: 4 },
  receiptHeroSavingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 4,
  },
  receiptHeroSavingsText: { fontSize: 13, fontWeight: '800', color: '#FEF08A' },

  receiptSectionTitle: { fontSize: 14, fontWeight: '800', color: '#334155', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  receiptStoreCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm,
  },
  receiptStoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptStoreTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  storeIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  receiptStoreName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  receiptStoreItemsCount: { fontSize: 11, color: '#64748B' },
  receiptStoreSubtotalWrap: { alignItems: 'flex-end' },
  receiptStoreSubtotal: { fontSize: 15, fontWeight: '800', color: '#047857' },
  receiptStoreSavings: { fontSize: 11, fontWeight: '700', color: '#059669' },
  receiptStoreDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },

  receiptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F8FAFC',
  },
  receiptItemName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  receiptItemMeta: { fontSize: 11, color: '#64748B', marginTop: 1 },
  receiptItemPriceWrap: { alignItems: 'flex-end' },
  receiptItemPrice: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  receiptItemSavings: { fontSize: 11, fontWeight: '700', color: '#059669' },
  receiptItemNoSavings: { fontSize: 10, color: '#94A3B8' },

  receiptSummaryBox: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginTop: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
  },
  receiptSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  receiptSummaryLabel: { fontSize: 13, color: '#64748B' },
  receiptSummaryValue: { fontSize: 13, fontWeight: '700', color: '#334155' },
  receiptSummaryDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
  receiptSummaryLabelBold: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  receiptSummaryTotalBold: { fontSize: 18, fontWeight: '900', color: '#047857' },
  receiptSummarySavingsLabel: { fontSize: 14, fontWeight: '800', color: '#059669' },
  receiptSummarySavingsValue: { fontSize: 15, fontWeight: '900', color: '#059669' },

  optimizeLinkBtn: {
    backgroundColor: colors.secondary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    ...shadows.md,
  },
  optimizeLinkBtnText: { ...typography.button, color: '#fff', fontSize: 14 },
});
