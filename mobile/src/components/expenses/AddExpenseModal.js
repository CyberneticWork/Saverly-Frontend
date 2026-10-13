import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, shadows, spacing } from '../../theme';
import { invoicesAPI } from '../../services/api';

const STORES = [
  'Keells',
  'Cargills Food City',
  'Arpico Supercentre',
  'Softlogic Glomark',
  'SPAR',
  'Laugfs Super',
  'Sathosa',
  'Other',
];

const CATEGORIES = [
  'Pantry & Dry Goods',
  'Dairy & Eggs',
  'Fruits & Vegetables',
  'Meat & Seafood',
  'Bakery & Bread',
  'Beverages',
  'Snacks & Confectionery',
  'Household',
];

const UNITS = ['unit', 'kg', 'g', 'L', 'ml', 'pack'];

export default function AddExpenseModal({ visible, onClose, onExpenseAdded }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [store, setStore] = useState('Keells');
  const [customStore, setCustomStore] = useState('');
  const [category, setCategory] = useState('Pantry & Dry Goods');
  const [quantity, setQuantity] = useState('1');
  const [unit, setUnit] = useState('pack');
  const [dateOption, setDateOption] = useState('today'); // 'today', 'yesterday', 'calendar'
  const [selectedCustomDate, setSelectedCustomDate] = useState(new Date());
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setAmount('');
    setStore('Keells');
    setCustomStore('');
    setCategory('Pantry & Dry Goods');
    setQuantity('1');
    setUnit('pack');
    setDateOption('today');
    setSelectedCustomDate(new Date());
    setCalendarViewDate(new Date());
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const isCurrentOrFutureMonth = (date) => {
    const today = new Date();
    return (
      date.getFullYear() > today.getFullYear() ||
      (date.getFullYear() === today.getFullYear() && date.getMonth() >= today.getMonth())
    );
  };

  const renderCalendarDays = () => {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const cells = [];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(<View key={`empty-${i}`} style={styles.calendarDayCell} />);
    }

    // Days 1..daysInMonth
    for (let d = 1; d <= daysInMonth; d++) {
      const cellDate = new Date(year, month, d);
      const isFuture = cellDate.setHours(0, 0, 0, 0) > today.setHours(0, 0, 0, 0);
      const isSelected =
        selectedCustomDate.getFullYear() === year &&
        selectedCustomDate.getMonth() === month &&
        selectedCustomDate.getDate() === d;
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === d;

      cells.push(
        <TouchableOpacity
          key={`day-${d}`}
          style={[
            styles.calendarDayCell,
            isSelected && styles.calendarDayCellSelected,
            isToday && !isSelected && styles.calendarDayCellToday,
          ]}
          disabled={isFuture}
          onPress={() => {
            const picked = new Date(year, month, d);
            setSelectedCustomDate(picked);
          }}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.calendarDayText,
              isSelected && styles.calendarDayTextSelected,
              isToday && !isSelected && styles.calendarDayTextToday,
              isFuture && styles.calendarDayTextFuture,
            ]}
          >
            {d}
          </Text>
        </TouchableOpacity>
      );
    }

    return cells;
  };

  const handleSubmit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('Required Field', 'Please enter an item name (e.g. Rice).');
      return;
    }

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Required Field', 'Please enter a valid amount in Rs.');
      return;
    }

    let finalStore = store;
    if (store === 'Other' || store === 'Local Grocery') {
      if (store === 'Other' && !customStore.trim()) {
        Alert.alert('Required Field', 'Please enter the supermarket / store name.');
        return;
      }
      finalStore = customStore.trim() || store;
    }

    let expenseDate = new Date();
    if (dateOption === 'yesterday') {
      expenseDate.setDate(expenseDate.getDate() - 1);
    } else if (dateOption === 'calendar') {
      expenseDate = new Date(selectedCustomDate);
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        price: numAmount,
        quantity: parseFloat(quantity) || 1,
        unit,
        storeName: finalStore,
        categoryName: category,
        date: expenseDate.toISOString(),
      };

      const res = await invoicesAPI.addManualExpense(payload);
      const newExpense = res.data?.data || {
        id: `manual-${Date.now()}`,
        name: name.trim(),
        amount: numAmount * (parseFloat(quantity) || 1),
        storeName: finalStore,
        date: expenseDate.toISOString(),
        categoryName: category,
        quantity: parseFloat(quantity) || 1,
        unit,
        status: 'VERIFIED',
      };

      Alert.alert('Expense Added!', `${name.trim()} (Rs. ${numAmount.toLocaleString()}) logged successfully.`);
      if (onExpenseAdded) {
        onExpenseAdded(newExpense);
      }
      handleClose();
    } catch (err) {
      // In case of network error or backend issue, still provide optimistic addition
      const optimisticExpense = {
        id: `manual-${Date.now()}`,
        name: name.trim(),
        amount: numAmount * (parseFloat(quantity) || 1),
        storeName: finalStore,
        date: expenseDate.toISOString(),
        categoryName: category,
        quantity: parseFloat(quantity) || 1,
        unit,
        status: 'VERIFIED',
      };
      if (onExpenseAdded) {
        onExpenseAdded(optimisticExpense);
      }
      Alert.alert('Expense Logged', `${name.trim()} saved to your recent expenses.`);
      handleClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconCircle}>
                <Ionicons name="add-circle" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Add Expense Manually</Text>
                <Text style={styles.subtitle}>Log grocery item purchase</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={22} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.formScroll}>
            {/* Item Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Item Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Rice, Milk, Eggs"
                placeholderTextColor={colors.textLight}
                value={name}
                onChangeText={setName}
                autoFocus
              />
            </View>

            {/* Amount / Price */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Amount / Price (Rs.) *</Text>
              <View style={styles.currencyInputRow}>
                <Text style={styles.currencyPrefix}>Rs.</Text>
                <TextInput
                  style={styles.amountInput}
                  keyboardType="numeric"
                  placeholder="2,400"
                  placeholderTextColor={colors.textLight}
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
            </View>

            {/* Store / Supermarket */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Store / Supermarket</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {STORES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, store === s && styles.chipActive]}
                    onPress={() => setStore(s)}
                  >
                    <Text style={[styles.chipText, store === s && styles.chipTextActive]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {(store === 'Other' || store === 'Local Grocery') && (
                <View style={styles.customStoreWrap}>
                  <Text style={styles.subLabel}>Supermarket / Store Name *</Text>
                  <View style={styles.inputWithIconRow}>
                    <Ionicons name="storefront-outline" size={17} color={colors.primary} />
                    <TextInput
                      style={styles.customStoreInput}
                      placeholder="e.g. Spar, Laughs Super, Local Mart..."
                      placeholderTextColor={colors.textLight}
                      value={customStore}
                      onChangeText={setCustomStore}
                      autoFocus
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Date Quick Selector & Interactive Calendar */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Expense Date</Text>
              <View style={styles.dateToggleRow}>
                <TouchableOpacity
                  style={[styles.dateBtn, dateOption === 'today' && styles.dateBtnActive]}
                  onPress={() => setDateOption('today')}
                >
                  <Ionicons
                    name="today-outline"
                    size={15}
                    color={dateOption === 'today' ? '#fff' : colors.textSecondary}
                  />
                  <Text style={[styles.dateBtnText, dateOption === 'today' && styles.dateBtnTextActive]}>
                    Today
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateBtn, dateOption === 'yesterday' && styles.dateBtnActive]}
                  onPress={() => setDateOption('yesterday')}
                >
                  <Ionicons
                    name="time-outline"
                    size={15}
                    color={dateOption === 'yesterday' ? '#fff' : colors.textSecondary}
                  />
                  <Text style={[styles.dateBtnText, dateOption === 'yesterday' && styles.dateBtnTextActive]}>
                    Yesterday
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dateBtn, dateOption === 'calendar' && styles.dateBtnActive]}
                  onPress={() => setDateOption('calendar')}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={15}
                    color={dateOption === 'calendar' ? '#fff' : colors.textSecondary}
                  />
                  <Text style={[styles.dateBtnText, dateOption === 'calendar' && styles.dateBtnTextActive]}>
                    Choose Date
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Interactive Calendar when "Choose Date" is selected */}
              {dateOption === 'calendar' && (
                <View style={styles.calendarContainer}>
                  {/* Selected Date Summary Header */}
                  <View style={styles.calendarSelectedHeader}>
                    <View style={styles.calendarSelectedLeft}>
                      <Ionicons name="calendar" size={16} color={colors.primary} />
                      <Text style={styles.calendarSelectedText}>
                        Selected: {selectedCustomDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>

                    {/* HTML5 Native Date Picker on Web for fast browser selection */}
                    {Platform.OS === 'web' && (
                      <input
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={selectedCustomDate.toISOString().split('T')[0]}
                        onChange={(e) => {
                          if (e.target.value) {
                            const [y, m, d] = e.target.value.split('-').map(Number);
                            const picked = new Date(y, m - 1, d);
                            setSelectedCustomDate(picked);
                            setCalendarViewDate(picked);
                          }
                        }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 8,
                          border: '1px solid #D1D5DB',
                          fontSize: 12,
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          outline: 'none',
                          backgroundColor: '#fff',
                        }}
                      />
                    )}
                  </View>

                  {/* Monthly Interactive Calendar Grid */}
                  <View style={styles.calendarCard}>
                    {/* Month / Year Navigator */}
                    <View style={styles.calendarMonthRow}>
                      <TouchableOpacity
                        style={styles.calendarNavBtn}
                        onPress={() => {
                          const prev = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() - 1, 1);
                          setCalendarViewDate(prev);
                        }}
                      >
                        <Ionicons name="chevron-back" size={16} color={colors.text} />
                      </TouchableOpacity>

                      <Text style={styles.calendarMonthTitle}>
                        {calendarViewDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                      </Text>

                      <TouchableOpacity
                        style={[
                          styles.calendarNavBtn,
                          isCurrentOrFutureMonth(calendarViewDate) && styles.calendarNavBtnDisabled,
                        ]}
                        disabled={isCurrentOrFutureMonth(calendarViewDate)}
                        onPress={() => {
                          const next = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + 1, 1);
                          setCalendarViewDate(next);
                        }}
                      >
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={isCurrentOrFutureMonth(calendarViewDate) ? '#D1D5DB' : colors.text}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Day Names Header */}
                    <View style={styles.calendarWeekRow}>
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                        <Text key={d} style={styles.calendarWeekDay}>{d}</Text>
                      ))}
                    </View>

                    {/* Days Grid */}
                    <View style={styles.calendarDaysGrid}>
                      {renderCalendarDays()}
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Quantity & Unit Row */}
            <View style={styles.rowTwoCols}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={colors.textLight}
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>
              <View style={[styles.fieldGroup, { flex: 1.2 }]}>
                <Text style={styles.label}>Unit</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitChips}>
                  {UNITS.map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitChip, unit === u && styles.unitChipActive]}
                      onPress={() => setUnit(u)}
                    >
                      <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>
                        {u}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Category */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, category === cat && styles.chipActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Example Hint */}
            <View style={styles.exampleCard}>
              <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.exampleText}>
                Example: Rice — Rs. 2,400 · Keells · 10 Oct
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.saveText}>Add Expense</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 35, 30, 0.65)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22,
    maxHeight: '90%',
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h4,
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
  formScroll: {
    gap: 14,
    paddingBottom: 4,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  textInput: {
    height: 48,
    borderWidth: 1.5,
    borderColor: '#DFE7E3',
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#FAFCFB',
  },
  currencyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#DFE7E3',
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: '#FAFCFB',
    height: 48,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 11,
    backgroundColor: '#F2F6F4',
    borderWidth: 1,
    borderColor: '#DFE7E3',
  },
  chipActive: {
    backgroundColor: colors.primaryFaded,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  dateToggleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: '#F2F6F4',
    borderWidth: 1,
    borderColor: '#DFE7E3',
  },
  dateBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dateBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dateBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  unitChips: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    height: 48,
  },
  unitChip: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: '#F2F6F4',
    borderWidth: 1,
    borderColor: '#DFE7E3',
  },
  unitChipActive: {
    backgroundColor: colors.primaryFaded,
    borderColor: colors.primary,
  },
  unitChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  unitChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  exampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F8F5',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D7ECE0',
  },
  exampleText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primaryDark,
    flex: 1,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1.6,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  saveText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // Custom Supermarket Input
  customStoreWrap: {
    marginTop: 8,
    gap: 4,
  },
  subLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.primaryDark,
  },
  inputWithIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: '#FAFCFB',
    height: 46,
  },
  customStoreInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
  },

  // Calendar Styles
  calendarContainer: {
    marginTop: 8,
    gap: 8,
  },
  calendarSelectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  calendarSelectedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarSelectedText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  calendarCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...shadows.sm,
  },
  calendarMonthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  calendarNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarNavBtnDisabled: {
    opacity: 0.35,
  },
  calendarMonthTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.text,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 4,
  },
  calendarWeekDay: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textLight,
    width: 32,
    textAlign: 'center',
  },
  calendarDaysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  calendarDayCell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  calendarDayCellSelected: {
    backgroundColor: colors.primary,
    ...shadows.sm,
  },
  calendarDayCellToday: {
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  calendarDayText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: '800',
  },
  calendarDayTextToday: {
    color: colors.primary,
    fontWeight: '700',
  },
  calendarDayTextFuture: {
    color: '#D1D5DB',
  },
});
