import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, shadows } from '../../theme';

/**
 * FloatingQuickActionMenu
 * Allows fast 1-tap triggering of the 4 essential actions from anywhere on the screen:
 * 1. Add Item
 * 2. Set Budget
 * 3. Scan Receipt
 * 4. Navigate to the Dashboard
 */
export default function FloatingQuickActionMenu({
  onAddItem,
  onSetBudget,
  onScanReceipt,
  onOpenLists,
  onOpenCompanyPrices,
  onNavigateDashboard = () => {},
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAction = (cb) => {
    setIsOpen(false);
    if (cb) cb();
  };

  return (
    <>
      {/* Floating Action Button Trigger */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.88}
        accessibilityLabel="Quick Actions Menu"
      >
        <LinearGradient
          colors={[colors.primaryDark, colors.primary]}
          style={styles.fabGradient}
        >
          <Ionicons name="flash" size={22} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Speed Dial / Quick Sheet Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeaderTitleRow}>
                <Ionicons name="flash" size={18} color={colors.primary} />
                <Text style={styles.sheetTitle}>Quick Actions</Text>
              </View>
              <Text style={styles.sheetSubtitle}>
                Select an action to launch directly without extra steps
              </Text>
            </View>

            <View style={styles.itemsList}>
              {/* 1. Add Item */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleAction(onAddItem)}
                activeOpacity={0.78}
              >
                <View style={[styles.menuIconBg, { backgroundColor: '#EAF7F2' }]}>
                  <Ionicons name="add-circle" size={22} color="#1C9A76" />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuItemTitle}>Add Expenses</Text>
                  <Text style={styles.menuItemDesc}>Manually log grocery expense</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
              </TouchableOpacity>

              {/* 2. Set Budget */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleAction(onSetBudget)}
                activeOpacity={0.78}
              >
                <View style={[styles.menuIconBg, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="wallet" size={22} color="#D97706" />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuItemTitle}>Set Budget</Text>
                  <Text style={styles.menuItemDesc}>Configure weekly / monthly target</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
              </TouchableOpacity>

              {/* 3. Scan Receipt */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleAction(onScanReceipt)}
                activeOpacity={0.78}
              >
                <View style={[styles.menuIconBg, { backgroundColor: '#EFF6FF' }]}>
                  <Ionicons name="scan" size={22} color="#2563EB" />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuItemTitle}>Scan Receipt</Text>
                  <Text style={styles.menuItemDesc}>Auto-extract with smart OCR</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
              </TouchableOpacity>

              {/* 4. Shopping Lists */}
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => handleAction(onOpenLists)}
                activeOpacity={0.78}
              >
                <View style={[styles.menuIconBg, { backgroundColor: '#F5F3FF' }]}>
                  <Ionicons name="list" size={22} color="#7C3AED" />
                </View>
                <View style={styles.menuTextWrap}>
                  <Text style={styles.menuItemTitle}>Shopping Lists</Text>
                  <Text style={styles.menuItemDesc}>View & manage grocery lists</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
              </TouchableOpacity>

              {/* 5. Community Price Data */}
              {Boolean(onOpenCompanyPrices) ? (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => handleAction(onOpenCompanyPrices)}
                  activeOpacity={0.78}
                >
                  <View style={[styles.menuIconBg, { backgroundColor: '#F0FDF4' }]}>
                    <Ionicons name="business" size={22} color="#166E53" />
                  </View>
                  <View style={styles.menuTextWrap}>
                    <Text style={styles.menuItemTitle}>Community Price Data</Text>
                    <Text style={styles.menuItemDesc}>Community & store catalog prices</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setIsOpen(false)}
            >
              <Text style={styles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    borderRadius: 27,
    ...shadows.lg,
    zIndex: 99,
  },
  fabGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
    paddingBottom: 34,
    ...shadows.lg,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 12,
  },
  sheetHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sheetTitle: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  sheetSubtitle: {
    fontSize: 12,
    color: colors.textLight,
    marginTop: 3,
    textAlign: 'center',
  },
  itemsList: {
    gap: 10,
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAF9',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2EF',
  },
  menuIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTextWrap: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  menuItemDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
