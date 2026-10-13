import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, shadows, spacing } from '../../theme';

const { width } = Dimensions.get('window');

/**
 * QuickActionsBar - Feature 5: Quick Actions and Navigation
 *
 * Provides immediate 1-tap direct access to the 4 essential actions:
 * 1. Add Item - opens manual expense/item logging directly
 * 2. Set Budget - opens budget target editor directly
 * 3. Scan Receipt - launches OCR camera directly
 * 4. Navigate to the Dashboard - scrolls to top overview or routes directly
 */
export default function QuickActionsBar({
  onAddItem,
  onSetBudget,
  onScanReceipt,
  onOpenLists,
  onNavigateDashboard = () => {},
  isDashboardActive = false,
}) {
  const actions = [
    {
      id: 'add_expense',
      title: 'Add Expenses',
      subtitle: 'Log grocery expense',
      badge: 'Manual',
      icon: 'add-circle',
      iconColor: '#1C9A76',
      bgColor: '#EAF7F2',
      borderColor: '#BFE7D9',
      onPress: onAddItem,
    },
    {
      id: 'set_budget',
      title: 'Set Budget',
      subtitle: 'Weekly / monthly',
      badge: 'Targets',
      icon: 'wallet',
      iconColor: '#D97706',
      bgColor: '#FEF3C7',
      borderColor: '#FDE68A',
      onPress: onSetBudget,
    },
    {
      id: 'scan_receipt',
      title: 'Scan Receipt',
      subtitle: 'Smart OCR bill scan',
      badge: 'Auto OCR',
      icon: 'scan',
      iconColor: '#2563EB',
      bgColor: '#EFF6FF',
      borderColor: '#BFDBFE',
      isHero: true,
      onPress: onScanReceipt,
    },
    {
      id: 'shopping_lists',
      title: 'Lists',
      subtitle: 'Grocery shopping lists',
      badge: 'Smart Lists',
      icon: 'list',
      iconColor: '#7C3AED',
      bgColor: '#F5F3FF',
      borderColor: '#DDD6FE',
      onPress: onOpenLists,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.headerIconWrap}>
            <Ionicons name="flash" size={17} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.sectionTitle}>Quick Actions & Navigation</Text>
            <Text style={styles.sectionSubtitle}>
              Direct 1-tap access with zero unnecessary steps
            </Text>
          </View>
        </View>
      </View>

      {/* 4 Quick Action Cards Grid */}
      <View style={styles.grid}>
        {actions.map((act) => {
          if (act.isHero) {
            return (
              <TouchableOpacity
                key={act.id}
                style={[styles.card, styles.heroCardWrapper]}
                onPress={act.onPress}
                activeOpacity={0.88}
              >
                <LinearGradient
                  colors={['#14765A', '#1C9A76']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroCardGradient}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.heroIconBadge}>
                      <Ionicons name={act.icon} size={22} color="#fff" />
                    </View>
                    <View style={styles.heroBadge}>
                      <Text style={styles.heroBadgeText}>{act.badge}</Text>
                    </View>
                  </View>

                  <Text style={styles.heroCardTitle}>{act.title}</Text>
                  <Text style={styles.heroCardSubtitle} numberOfLines={1}>
                    {act.subtitle}
                  </Text>

                  <View style={styles.directActionRow}>
                    <Text style={styles.directActionText}>Launch now</Text>
                    <Ionicons name="arrow-forward" size={13} color="#fff" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={act.id}
              style={[
                styles.card,
                styles.standardCard,
                { borderColor: act.borderColor },
              ]}
              onPress={act.onPress}
              activeOpacity={0.85}
            >
              <View style={styles.cardTopRow}>
                <View style={[styles.iconBadge, { backgroundColor: act.bgColor }]}>
                  <Ionicons name={act.icon} size={20} color={act.iconColor} />
                </View>
                <View style={[styles.standardBadge, { backgroundColor: act.bgColor }]}>
                  <Text style={[styles.standardBadgeText, { color: act.iconColor }]}>
                    {act.badge}
                  </Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>{act.title}</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                {act.subtitle}
              </Text>

              <View style={styles.standardActionRow}>
                <Text style={[styles.standardActionText, { color: act.iconColor }]}>
                  Direct
                </Text>
                <Ionicons name="chevron-forward" size={13} color={act.iconColor} />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Quick Nav Shortcut Ribbon */}
      <View style={styles.ribbonContainer}>
        <TouchableOpacity
          style={styles.ribbonItem}
          onPress={onAddItem}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.ribbonText}>+ Add Expenses</Text>
        </TouchableOpacity>

        <View style={styles.ribbonDivider} />

        <TouchableOpacity
          style={styles.ribbonItem}
          onPress={onSetBudget}
          activeOpacity={0.8}
        >
          <Ionicons name="wallet-outline" size={15} color="#D97706" />
          <Text style={styles.ribbonText}>Set Budget</Text>
        </TouchableOpacity>

        <View style={styles.ribbonDivider} />

        <TouchableOpacity
          style={styles.ribbonItem}
          onPress={onScanReceipt}
          activeOpacity={0.8}
        >
          <Ionicons name="scan-outline" size={15} color="#2563EB" />
          <Text style={styles.ribbonText}>Scan Receipt</Text>
        </TouchableOpacity>

        <View style={styles.ribbonDivider} />

        <TouchableOpacity
          style={styles.ribbonItem}
          onPress={onOpenLists}
          activeOpacity={0.8}
        >
          <Ionicons name="list-outline" size={15} color="#7C3AED" />
          <Text style={styles.ribbonText}>Lists</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 22,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
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
    marginTop: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: (width - 40 - 12) / 2,
    borderRadius: 18,
    ...shadows.sm,
  },
  heroCardWrapper: {
    overflow: 'hidden',
  },
  heroCardGradient: {
    padding: 14,
    borderRadius: 18,
    minHeight: 128,
    justifyContent: 'space-between',
  },
  heroIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  heroCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    marginTop: 6,
  },
  heroCardSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.88)',
    fontWeight: '500',
    marginTop: 2,
  },
  directActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  directActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },

  standardCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1.2,
    minHeight: 128,
    justifyContent: 'space-between',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  standardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9,
  },
  standardBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.text,
    marginTop: 6,
  },
  cardSubtitle: {
    fontSize: 11,
    color: colors.textLight,
    fontWeight: '500',
    marginTop: 2,
  },
  standardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  standardActionText: {
    fontSize: 11,
    fontWeight: '700',
  },

  ribbonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#E6EFEA',
    ...shadows.sm,
  },
  ribbonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  ribbonDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#E0E7E3',
  },
  ribbonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
