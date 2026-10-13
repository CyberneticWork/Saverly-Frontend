import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, shadows, spacing } from '../../theme';
import { productsAPI } from '../../services/api';

const DEFAULT_CATEGORIES = [
  'Dairy & Eggs',
  'Pantry & Dry Goods',
  'Fruits & Vegetables',
  'Meat & Seafood',
  'Bakery & Bread',
  'Beverages',
  'Snacks & Confectionery',
  'General',
];

const DEFAULT_STORES = [
  'Keells Super',
  'Cargills Food City',
  'Arpico Supercentre',
  'Softlogic Glomark',
  'SPAR',
  'Laugfs Super',
  'Local Grocery',
];

const UNITS = ['unit', 'kg', 'g', 'L', 'ml', 'pack'];

export default function AddCommunityItemModal({ visible, onClose, onItemAdded }) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Dairy & Eggs');
  const [store, setStore] = useState('Keells Super');
  const [customStore, setCustomStore] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('unit');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setBrand('');
    setCategory('Dairy & Eggs');
    setStore('Keells Super');
    setCustomStore('');
    setPrice('');
    setUnit('unit');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim() || name.trim().length < 2) {
      Alert.alert('Required Field', 'Please enter a product name (at least 2 characters).');
      return;
    }

    const numPrice = parseFloat(price);
    if (!numPrice || numPrice <= 0) {
      Alert.alert('Required Field', 'Please enter a valid price in LKR.');
      return;
    }

    const finalStore = store === 'Local Grocery' && customStore.trim()
      ? customStore.trim()
      : store;

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        brand: brand.trim() || undefined,
        categoryName: category,
        supermarketName: finalStore,
        price: numPrice,
        unit,
      };

      const res = await productsAPI.communityAdd(payload);
      Alert.alert('Success!', 'Thank you! Item price added to community data.');
      if (onItemAdded) {
        onItemAdded(res.data.data);
      }
      handleClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit item.';
      Alert.alert('Submission Error', msg);
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
              <View style={styles.iconBadge}>
                <Ionicons name="add-circle" size={24} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Add Community Item</Text>
                <Text style={styles.subtitle}>Help others find current supermarket prices</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={22} color={colors.textLight} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
            {/* Product Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Kotmale Fresh Milk 1L"
                placeholderTextColor={colors.textLight}
                value={name}
                onChangeText={setName}
              />
            </View>

            {/* Brand */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Brand (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Kotmale, Anchor, Munchee"
                placeholderTextColor={colors.textLight}
                value={brand}
                onChangeText={setBrand}
              />
            </View>

            {/* Price & Unit Row */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1.2 }]}>
                <Text style={styles.label}>Price (LKR) *</Text>
                <View style={styles.priceRow}>
                  <Text style={styles.currencyPrefix}>LKR</Text>
                  <TextInput
                    style={styles.priceInput}
                    keyboardType="numeric"
                    placeholder="520.00"
                    placeholderTextColor={colors.textLight}
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 0.8 }]}>
                <Text style={styles.label}>Unit</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unitRow}>
                  {UNITS.map(u => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.unitChip, unit === u && styles.unitChipActive]}
                      onPress={() => setUnit(u)}
                    >
                      <Text style={[styles.unitText, unit === u && styles.unitTextActive]}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Supermarket / Store */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Supermarket / Store *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {DEFAULT_STORES.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, store === s && styles.chipActive]}
                    onPress={() => setStore(s)}
                  >
                    <Text style={[styles.chipText, store === s && styles.chipTextActive]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {store === 'Local Grocery' && (
                <TextInput
                  style={[styles.textInput, { marginTop: 8 }]}
                  placeholder="Enter store name..."
                  placeholderTextColor={colors.textLight}
                  value={customStore}
                  onChangeText={setCustomStore}
                />
              )}
            </View>

            {/* Category */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {DEFAULT_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, category === cat && styles.chipActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
                    <Ionicons name="cloud-upload-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.saveText}>Submit Item</Text>
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
    maxWidth: 440,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 22,
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
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.primaryFaded,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h4,
    fontSize: 16,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  currencyPrefix: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 6,
  },
  priceInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  unitRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 4,
  },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F6F5',
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  unitChipActive: {
    backgroundColor: colors.primaryFaded,
    borderColor: colors.primary,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  unitTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#F3F6F5',
    borderWidth: 1,
    borderColor: '#E2E8E5',
  },
  chipActive: {
    backgroundColor: colors.primaryFaded,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingBottom: 4,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  saveText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#fff',
  },
});
