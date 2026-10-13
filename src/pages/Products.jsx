import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon, PlusIcon, PencilSquareIcon,
  TrashIcon, XMarkIcon, SparklesIcon, ArrowsRightLeftIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';

export default function Products() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', brand: '', description: '', defaultUnit: 'unit', categoryId: '', barcode: '' });

  // Deduplication & Standardization state
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isStandardizing, setIsStandardizing] = useState(false);
  const [selectedPrimaryIds, setSelectedPrimaryIds] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useQuery(['products', page, debouncedSearch], () =>
    api.get('/products', { params: { page, limit: 20, search: debouncedSearch || undefined } }).then(r => r.data),
    { keepPreviousData: true }
  );
  const { data: categories } = useQuery('categories', () => api.get('/categories').then(r => r.data.data));

  const deleteMut = useMutation((id) => api.delete(`/products/${id}`), {
    onSuccess: () => { qc.invalidateQueries('products'); toast.success('Product deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  const saveMut = useMutation(
    (payload) => editing ? api.put(`/products/${editing.id}`, payload) : api.post('/products', payload),
    {
      onSuccess: () => { qc.invalidateQueries('products'); setShowModal(false); setEditing(null); toast.success('Saved'); },
      onError: (e) => toast.error(e?.response?.data?.message || 'Failed to save'),
    }
  );

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name || '',
      brand: product.brand || '',
      description: product.description || '',
      defaultUnit: product.defaultUnit || 'unit',
      categoryId: product.categoryId || product.category?.id || '',
      barcode: product.barcode || '',
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', brand: '', description: '', defaultUnit: 'unit', categoryId: '', barcode: '' });
    setShowModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!form.categoryId) {
      toast.error('Please select a category');
      return;
    }
    saveMut.mutate(form);
  };

  // Data Quality: Check duplicates
  const handleCheckDuplicates = async () => {
    setIsCheckingDuplicates(true);
    try {
      const res = await api.get('/admin/products/duplicates');
      const groups = res.data.data || [];
      setDuplicateGroups(groups);

      // Pre-select the first product in each group as default primary
      const initialPrimary = {};
      groups.forEach((g, idx) => {
        if (g.products?.[0]?.id) {
          initialPrimary[idx] = g.products[0].id;
        }
      });
      setSelectedPrimaryIds(initialPrimary);

      if (groups.length === 0) {
        toast.success('Catalog clean: No duplicate products detected!');
      } else {
        setShowDuplicatesModal(true);
        toast(`Found ${groups.length} duplicate group(s)`, { icon: '🔍' });
      }
    } catch {
      toast.error('Failed to check for duplicates');
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  // Data Quality: Merge group
  const handleMergeGroup = async (groupIndex) => {
    const group = duplicateGroups[groupIndex];
    if (!group) return;

    const primaryId = selectedPrimaryIds[groupIndex] || group.products[0].id;
    const duplicateIds = group.products.map(p => p.id).filter(id => id !== primaryId);

    try {
      await api.post('/admin/products/merge', {
        primaryProductId: primaryId,
        duplicateProductIds: duplicateIds,
      });
      toast.success('Merged duplicate products successfully');
      // Remove group from modal
      setDuplicateGroups(prev => prev.filter((_, idx) => idx !== groupIndex));
      qc.invalidateQueries('products');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to merge products');
    }
  };

  // Data Quality: Standardize units & names
  const handleStandardize = async () => {
    setIsStandardizing(true);
    try {
      const res = await api.post('/admin/products/standardize');
      toast.success(res.data.message || 'Product catalog standardized');
      qc.invalidateQueries('products');
    } catch {
      toast.error('Failed to standardize catalog');
    } finally {
      setIsStandardizing(false);
    }
  };

  const products = data?.data || [];
  const meta = data?.meta || data?.pagination || {};
  const totalCount = meta.total !== undefined ? meta.total : products.length;
  const totalPages = meta.totalPages || meta.pages || 1;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products Catalog</h1>
          <p className="text-gray-500 text-sm mt-0.5">{totalCount} total community & catalog items</p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/data-cleanup')}
            className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors"
            title="Open Data Cleanup Center for duplicate merging, unit standardizing and unverified matching"
          >
            <SparklesIcon className="w-4 h-4 text-emerald-600" />
            Data Cleanup Center
          </button>

          <button
            onClick={handleCheckDuplicates}
            disabled={isCheckingDuplicates}
            className="flex items-center gap-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            title="Quick scan for duplicate entries"
          >
            <DocumentDuplicateIcon className="w-4 h-4 text-amber-600" />
            {isCheckingDuplicates ? 'Checking...' : 'Check Duplicates'}
          </button>

          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-primary text-white hover:bg-primary-dark px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <PlusIcon className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products by name, brand, or description..."
          className="w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white shadow-sm"
        />
        {search && (
          <button
            onClick={() => { setSearch(''); setDebouncedSearch(''); setPage(1); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
            title="Clear search"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
              <th className="text-left px-6 py-3.5">Product</th>
              <th className="text-left px-6 py-3.5">Category</th>
              <th className="text-left px-6 py-3.5">Unit</th>
              <th className="text-left px-6 py-3.5">Prices</th>
              <th className="text-right px-6 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-400">Loading catalog...</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-400">No products found.</td>
              </tr>
            ) : (
              products.map(product => (
                <tr key={product.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-gray-900">{product.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {product.brand && <span className="text-gray-400 text-xs">{product.brand}</span>}
                      {product.barcode && (
                        <span className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                          {product.barcode}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-medium">
                      {product.category?.name || 'Unassigned'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-600 text-xs font-medium">
                    {product.defaultUnit || 'unit'}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-xs">
                    {product._count?.prices || 0} price point(s)
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(product)}
                        className="p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit product"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Deactivate product "${product.name}"?`)) {
                            deleteMut.mutate(product.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Deactivate"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormField
                label="Product Name *"
                value={form.name}
                onChange={v => setForm(f => ({ ...f, name: v }))}
                required
                placeholder="e.g. Anchor Butter 500g"
              />
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Brand"
                  value={form.brand}
                  onChange={v => setForm(f => ({ ...f, brand: v }))}
                  placeholder="e.g. Anchor"
                />
                <FormField
                  label="Barcode"
                  value={form.barcode}
                  onChange={v => setForm(f => ({ ...f, barcode: v }))}
                  placeholder="e.g. 4792011002341"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    value={form.categoryId}
                    onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                    required
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select category</option>
                    {(categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Default Unit</label>
                  <select
                    value={form.defaultUnit}
                    onChange={e => setForm(f => ({ ...f, defaultUnit: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="unit">unit</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="L">L</option>
                    <option value="ml">ml</option>
                    <option value="pack">pack</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saveMut.isLoading} className="flex-1 bg-primary text-white rounded-xl py-2.5 text-sm font-medium hover:bg-primary-dark disabled:opacity-60">
                  {saveMut.isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Removal & Merging Modal */}
      {showDuplicatesModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-xl border border-gray-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DocumentDuplicateIcon className="w-6 h-6 text-amber-600" />
                <h2 className="text-lg font-bold text-gray-900">Merge Duplicate Products</h2>
              </div>
              <button onClick={() => setShowDuplicatesModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Select which product should be the primary entry. Price records and receipt items from duplicate entries will automatically be re-linked to the chosen primary product.
            </p>

            <div className="overflow-y-auto flex-1 space-y-4 pr-1">
              {duplicateGroups.length === 0 ? (
                <div className="text-center py-8 text-gray-400">All duplicate groups resolved!</div>
              ) : (
                duplicateGroups.map((group, groupIdx) => {
                  const currentPrimaryId = selectedPrimaryIds[groupIdx] || group.products[0]?.id;

                  return (
                    <div key={groupIdx} className="border border-amber-200 bg-amber-50/40 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                          {group.matchType === 'exact_barcode' ? 'Barcode Match' : 'Name Match'} ({group.count} items)
                        </span>
                        <button
                          onClick={() => handleMergeGroup(groupIdx)}
                          className="flex items-center gap-1.5 bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary-dark"
                        >
                          <ArrowsRightLeftIcon className="w-3.5 h-3.5" /> Merge Group
                        </button>
                      </div>

                      <div className="space-y-2 mt-3">
                        {group.products.map(prod => (
                          <label
                            key={prod.id}
                            className={`flex items-start gap-3 p-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                              currentPrimaryId === prod.id
                                ? 'bg-white border-primary shadow-sm'
                                : 'bg-white/60 border-gray-200 hover:bg-white'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`primary-${groupIdx}`}
                              checked={currentPrimaryId === prod.id}
                              onChange={() => setSelectedPrimaryIds(prev => ({ ...prev, [groupIdx]: prod.id }))}
                              className="mt-1 text-primary focus:ring-primary"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-900 truncate">{prod.name}</span>
                                {currentPrimaryId === prod.id && (
                                  <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full uppercase">
                                    Primary (Keep)
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5 flex gap-3">
                                <span>Unit: {prod.defaultUnit}</span>
                                <span>Prices: {prod._count?.prices || 0}</span>
                                {prod.barcode && <span>Barcode: {prod.barcode}</span>}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowDuplicatesModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-semibold text-gray-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, required, placeholder }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}
