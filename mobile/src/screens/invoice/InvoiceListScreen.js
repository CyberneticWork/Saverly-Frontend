import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { invoicesAPI } from '../../services/api';
import { colors, typography, shadows } from '../../theme';

const STATUS_COLORS = {
  PENDING: '#FFA726',
  PROCESSING: '#29B6F6',
  REVIEW: '#AB47BC',
  VERIFIED: '#66BB6A',
  REJECTED: '#EF5350',
};

const STATUS_LABELS = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  REVIEW: 'Under Review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

export default function InvoiceListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadInvoices = useCallback(async () => {
    try {
      const res = await invoicesAPI.list();
      setInvoices(res.data.data || []);
    } catch {} finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { loadInvoices(); }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadInvoices();
  };

  const renderInvoice = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('InvoiceReview', { invoiceId: item.id })}
      activeOpacity={0.8}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.iconBg, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
          <Ionicons name="receipt-outline" size={22} color={STATUS_COLORS[item.status]} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.storeName} numberOfLines={1}>
            {item.storeName || item.supermarket?.name || item.parsedData?.storeName || 'Unknown Store'}
          </Text>
          <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          <Text style={styles.itemCount}>{item._count?.items || 0} items extracted</Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        {item.total != null ? (
          <Text style={styles.total}>{`LKR ${Number(item.total).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`}</Text>
        ) : null}
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
            {STATUS_LABELS[item.status]}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textLight} style={{ marginTop: 6 }} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <LinearGradient
        colors={['#1B5E20', '#2E7D32']}
        style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}
      >
        <View style={styles.headerTopRow}>
          {Boolean(navigation.canGoBack()) ? (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Scanned Bills</Text>
            <Text style={styles.headerSub}>OCR supermarket receipts & bills</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Cross-Link Banner to Expenses Page */}
      <TouchableOpacity
        style={styles.expensesBanner}
        onPress={() => navigation.navigate('Expenses')}
        activeOpacity={0.85}
      >
        <View style={styles.expensesBannerLeft}>
          <View style={styles.expensesBannerIconWrap}>
            <Ionicons name="wallet-outline" size={16} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.expensesBannerTitle}>Manual Grocery Expenses</Text>
            <Text style={styles.expensesBannerSub}>View and save manual items separately</Text>
          </View>
        </View>
        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={item => item.id}
          renderItem={renderInvoice}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListHeaderComponent={() => (
            <View style={styles.statsRow}>
              {Object.entries(STATUS_LABELS).map(([key, label]) => {
                const count = invoices.filter(i => i.status === key).length;
                if (count === 0) return null;
                return (
                  <View key={key} style={[styles.statChip, { backgroundColor: STATUS_COLORS[key] + '15' }]}>
                    <Text style={[styles.statCount, { color: STATUS_COLORS[key] }]}>{count}</Text>
                    <Text style={[styles.statLabel, { color: STATUS_COLORS[key] }]}>{label}</Text>
                  </View>
                );
              })}
            </View>
          )}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🧾</Text>
              <Text style={styles.emptyTitle}>No scanned receipt bills</Text>
              <Text style={styles.emptyText}>
                Take a photo or upload an image of your supermarket bill to auto-extract line items and prices.
              </Text>
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => navigation.navigate('InvoiceScan')}
              >
                <Ionicons name="scan" size={18} color="#fff" />
                <Text style={styles.scanBtnText}>Scan a Receipt</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('InvoiceScan')}>
        <Ionicons name="scan" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 20, paddingTop: 10 },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...typography.h2, color: '#fff' },
  headerSub: { ...typography.body, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  expensesBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E6F6F0',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7E7DA',
  },
  expensesBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  expensesBannerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  expensesBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },
  expensesBannerSub: {
    fontSize: 11,
    color: '#14765A',
    marginTop: 1,
  },
  listContent: { padding: 16, paddingBottom: 100 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statChip: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  statCount: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600' },
  card: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, ...shadows.sm,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBg: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  storeName: { ...typography.body, fontWeight: '700', color: colors.text },
  cardDate: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  itemCount: { ...typography.caption, color: colors.textLight, marginTop: 2 },
  cardRight: { alignItems: 'flex-end' },
  total: { ...typography.body, fontWeight: '700', color: colors.text, marginBottom: 4 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { ...typography.h3, color: colors.text, marginBottom: 8 },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 32, marginBottom: 24 },
  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12 },
  scanBtnText: { ...typography.button, color: '#fff' },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', ...shadows.lg,
  },
});
