import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import {
  DocumentDuplicateIcon,
  SparklesIcon,
  LinkIcon,
  ArrowsRightLeftIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  PlusIcon,
  ExclamationTriangleIcon,
  TagIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';

export default function DataCleanup() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'duplicates'; // 'duplicates', 'unverified', 'units'
  const setTab = (tab) => setSearchParams({ tab });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <SparklesIcon className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900">Data Cleanup & Quality Center</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Detect and merge product duplicates, standardize measurement units, and match unverified receipt items.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 gap-2">
        <TabButton
          active={activeTab === 'duplicates'}
          onClick={() => setTab('duplicates')}
          icon={DocumentDuplicateIcon}
          label="Duplicate Detection & Merge"
        />
        <TabButton
          active={activeTab === 'unverified'}
          onClick={() => setTab('unverified')}
          icon={LinkIcon}
          label="Unverified Item Matching"
        />
        <TabButton
          active={activeTab === 'units'}
          onClick={() => setTab('units')}
          icon={SparklesIcon}
          label="Unit Standardization"
        />
      </div>

      {/* Tab Panels */}
      {activeTab === 'duplicates' && <DuplicateDetectionPanel />}
      {activeTab === 'unverified' && <UnverifiedItemsPanel />}
      {activeTab === 'units' && <UnitStandardizationPanel />}
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm border-b-2 transition-all ${
        active
          ? 'border-primary text-primary bg-primary/5 rounded-t-xl'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1: DUPLICATE DETECTION & MERGE
// ─────────────────────────────────────────────────────────────────────────────

function DuplicateDetectionPanel() {
  const qc = useQueryClient();
  const [matchType, setMatchType] = useState('all');
  const [threshold, setThreshold] = useState(0.72);
  const [selectedPrimaries, setSelectedPrimaries] = useState({});

  // Manual Merge state
  const [showManualMerge, setShowManualMerge] = useState(false);
  const [manualSearchA, setManualSearchA] = useState('');
  const [manualSearchB, setManualSearchB] = useState('');
  const [manualProductA, setManualProductA] = useState(null);
  const [manualProductB, setManualProductB] = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery(
    ['duplicateProducts', matchType, threshold],
    () =>
      api
        .get('/admin/products/duplicates', {
          params: { type: matchType, threshold },
        })
        .then((r) => r.data),
    {
      onSuccess: (res) => {
        const initial = {};
        (res.data || []).forEach((group) => {
          initial[group.groupId] = group.suggestedPrimaryId || group.products[0]?.id;
        });
        setSelectedPrimaries(initial);
      },
    }
  );

  const mergeMutation = useMutation(
    ({ primaryProductId, duplicateProductIds, groupId }) =>
      api.post('/admin/products/merge', { primaryProductId, duplicateProductIds }),
    {
      onSuccess: (res, vars) => {
        toast.success(res.data.message || 'Products merged successfully');
        qc.invalidateQueries('duplicateProducts');
        qc.invalidateQueries('products');
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || 'Failed to merge products');
      },
    }
  );

  const handleMergeGroup = (group) => {
    const primaryId = selectedPrimaries[group.groupId] || group.products[0]?.id;
    const duplicateIds = group.products.map((p) => p.id).filter((id) => id !== primaryId);

    if (duplicateIds.length === 0) {
      toast.error('No duplicate products selected to merge');
      return;
    }

    mergeMutation.mutate({
      primaryProductId: primaryId,
      duplicateProductIds: duplicateIds,
      groupId: group.groupId,
    });
  };

  const handleManualMerge = () => {
    if (!manualProductA || !manualProductB) {
      toast.error('Please select both a Master product and a Duplicate product to merge');
      return;
    }
    if (manualProductA.id === manualProductB.id) {
      toast.error('Cannot merge a product with itself');
      return;
    }

    if (
      confirm(
        `Merge "${manualProductB.name}" into Master product "${manualProductA.name}"?\nAll price records and receipts will be migrated, and "${manualProductB.name}" will be retired.`
      )
    ) {
      mergeMutation.mutate({
        primaryProductId: manualProductA.id,
        duplicateProductIds: [manualProductB.id],
      });
      setManualProductA(null);
      setManualProductB(null);
    }
  };

  const groups = data?.data || [];

  return (
    <div className="space-y-6">
      {/* Controls & Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Match Criteria
            </label>
            <select
              value={matchType}
              onChange={(e) => setMatchType(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary font-medium"
            >
              <option value="all">All Criteria (Barcode, Name & Fuzzy)</option>
              <option value="barcode">Exact Barcode Only</option>
              <option value="name">Exact Normalized Name Only</option>
              <option value="similar">Fuzzy Name Similarity Only</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Similarity Sensitivity
            </label>
            <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-xl border border-gray-200">
              <button
                type="button"
                onClick={() => setThreshold(0.85)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  threshold === 0.85 ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Strict (85%)
              </button>
              <button
                type="button"
                onClick={() => setThreshold(0.72)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  threshold === 0.72 ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Normal (72%)
              </button>
              <button
                type="button"
                onClick={() => setThreshold(0.65)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  threshold === 0.65 ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Broad (65%)
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowManualMerge(!showManualMerge)}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold transition-colors"
          >
            <ArrowsRightLeftIcon className="w-4 h-4 text-gray-500" />
            {showManualMerge ? 'Hide Manual Merger' : 'Manual 1-on-1 Merge'}
          </button>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 bg-primary text-white hover:bg-primary-dark px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Scanning Catalog...' : 'Scan Now'}
          </button>
        </div>
      </div>

      {/* Manual 1-on-1 Merge Accordion */}
      {showManualMerge && (
        <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/60 p-6 rounded-2xl border border-amber-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <ArrowsRightLeftIcon className="w-5 h-5 text-amber-600" />
                Manual 1-on-1 Product Merger
              </h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Search any two products in the catalog to merge them. All price points, shopping lists, and receipt items from the duplicate product will be migrated to the master product.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Master Product Picker */}
            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full mb-2">
                Master Product (Keep)
              </span>
              <ProductSearchPicker
                label="Search master product"
                selectedProduct={manualProductA}
                onSelect={setManualProductA}
              />
            </div>

            {/* Duplicate Product Picker */}
            <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm">
              <span className="inline-block text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full mb-2">
                Duplicate Product (Merge & Retire)
              </span>
              <ProductSearchPicker
                label="Search duplicate product"
                selectedProduct={manualProductB}
                onSelect={setManualProductB}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleManualMerge}
              disabled={!manualProductA || !manualProductB || mergeMutation.isLoading}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl disabled:opacity-40 transition-colors shadow-sm"
            >
              <ArrowsRightLeftIcon className="w-4 h-4" />
              {mergeMutation.isLoading ? 'Merging...' : 'Execute Manual Merge'}
            </button>
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">
          Detected Duplicate Groups ({groups.length})
        </p>
        <span className="text-xs text-gray-400">
          {data?.totalProductsScanned || 0} active products analyzed
        </span>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100">
          <ArrowPathIcon className="w-8 h-8 text-primary animate-spin mb-2" />
          <p className="text-sm text-gray-500 font-medium">Scanning catalog for duplicate entries...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-emerald-100 text-center">
          <CheckCircleIcon className="w-12 h-12 text-emerald-500 mb-2" />
          <h3 className="font-bold text-gray-900 text-base">Catalog Clean! No Duplicates Detected</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md">
            All active catalog products have distinct barcodes and names within the selected similarity threshold.
          </p>
        </div>
      ) : (
        /* Duplicate Groups List */
        <div className="space-y-4">
          {groups.map((group) => {
            const currentPrimaryId = selectedPrimaries[group.groupId] || group.products[0]?.id;

            return (
              <div
                key={group.groupId}
                className="bg-white rounded-2xl border border-amber-200/80 p-5 shadow-sm space-y-4"
              >
                {/* Group Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                        group.matchType === 'exact_barcode'
                          ? 'bg-purple-100 text-purple-800'
                          : group.matchType === 'normalized_name'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {group.matchType === 'exact_barcode'
                        ? 'Exact Barcode'
                        : group.matchType === 'normalized_name'
                        ? 'Normalized Name'
                        : `Similar Name (${group.confidence}% match)`}
                    </span>
                    <span className="text-sm font-semibold text-gray-800">
                      {group.count} Conflicting Entries
                    </span>
                  </div>

                  <button
                    onClick={() => handleMergeGroup(group)}
                    disabled={mergeMutation.isLoading}
                    className="flex items-center gap-1.5 bg-primary text-white hover:bg-primary-dark px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-50 self-start sm:self-auto"
                  >
                    <ArrowsRightLeftIcon className="w-3.5 h-3.5" />
                    Merge This Group
                  </button>
                </div>

                {/* Candidate Products Side-by-Side Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {group.products.map((prod) => {
                    const isPrimary = currentPrimaryId === prod.id;

                    return (
                      <div
                        key={prod.id}
                        onClick={() =>
                          setSelectedPrimaries((prev) => ({ ...prev, [group.groupId]: prod.id }))
                        }
                        className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                          isPrimary
                            ? 'border-primary bg-primary/[0.03] shadow-sm ring-2 ring-primary/20'
                            : 'border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-white'
                        }`}
                      >
                        <div>
                          {/* Selection Badge */}
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                isPrimary
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-gray-100 text-gray-500'
                              }`}
                            >
                              {isPrimary ? 'Keep As Master' : 'Merge & Retire'}
                            </span>

                            <input
                              type="radio"
                              name={`primary-${group.groupId}`}
                              checked={isPrimary}
                              onChange={() =>
                                setSelectedPrimaries((prev) => ({
                                  ...prev,
                                  [group.groupId]: prod.id,
                                }))
                              }
                              className="text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                            />
                          </div>

                          {/* Product Details */}
                          <h4 className="font-bold text-gray-900 text-sm leading-snug">
                            {prod.name}
                          </h4>

                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {prod.brand && (
                              <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                                {prod.brand}
                              </span>
                            )}
                            <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                              {prod.category?.name || 'Unassigned'}
                            </span>
                            <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                              Unit: {prod.defaultUnit || 'unit'}
                            </span>
                          </div>

                          {prod.barcode && (
                            <p className="text-[11px] font-mono text-gray-500 mt-2">
                              Barcode: {prod.barcode}
                            </p>
                          )}
                        </div>

                        {/* Associated Data Counts */}
                        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                          <span>{prod._count?.prices || 0} price point(s)</span>
                          <span>{prod._count?.invoiceItems || 0} receipt item(s)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2: UNVERIFIED ITEM MATCHING
// ─────────────────────────────────────────────────────────────────────────────

function UnverifiedItemsPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [createModalGroup, setCreateModalGroup] = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery(
    ['unverifiedItems', search],
    () => api.get('/admin/cleanup/unverified-items', { params: { search: search || undefined } }).then((r) => r.data),
    { keepPreviousData: true }
  );

  const { data: categories } = useQuery('categories', () =>
    api.get('/categories').then((r) => r.data.data)
  );

  const matchMutation = useMutation(
    ({ invoiceItemIds, rawName, productId }) =>
      api.post('/admin/cleanup/unverified-items/match', {
        invoiceItemIds,
        rawName,
        productId,
        updatePrices: true,
      }),
    {
      onSuccess: (res) => {
        toast.success(res.data.message || 'Receipt items linked to product');
        qc.invalidateQueries('unverifiedItems');
        qc.invalidateQueries('products');
        qc.invalidateQueries('invoices');
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || 'Failed to link item');
      },
    }
  );

  const createProductMutation = useMutation(
    (payload) => api.post('/admin/cleanup/unverified-items/create-product', payload),
    {
      onSuccess: (res) => {
        toast.success(res.data.message || 'Product created and linked');
        setCreateModalGroup(null);
        qc.invalidateQueries('unverifiedItems');
        qc.invalidateQueries('products');
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || 'Failed to create product');
      },
    }
  );

  const handleMatchSuggestion = (group, suggestion) => {
    matchMutation.mutate({
      invoiceItemIds: group.invoiceItemIds,
      rawName: group.rawName,
      productId: suggestion.product.id,
    });
  };

  const items = data?.data || [];
  const totalCount = data?.totalUnverifiedItems || 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-blue-600" />
            Unverified Receipt Line Items ({totalCount} items / {items.length} unique names)
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            These items were scanned via OCR from supermarket receipts but are not yet linked to canonical catalog products.
            Match them to existing products to update price history, or promote them to new catalog items.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors shrink-0"
        >
          <ArrowPathIcon className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search unverified receipt names (e.g. Eggs, Mango, Butter)..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white shadow-sm"
        />
      </div>

      {/* Unverified Items List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100">
          <ArrowPathIcon className="w-8 h-8 text-primary animate-spin mb-2" />
          <p className="text-sm text-gray-500 font-medium">Loading unverified receipt items...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-emerald-100 text-center">
          <CheckCircleIcon className="w-12 h-12 text-emerald-500 mb-2" />
          <h3 className="font-bold text-gray-900 text-base">All Receipt Items Verified!</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md">
            There are no unlinked invoice items. Every scanned receipt line has been matched to canonical catalog products.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((group, idx) => (
            <div
              key={group.rawName + idx}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-4"
            >
              {/* Item Info Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-gray-900 text-base">{group.cleanedName}</h4>
                    <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      Raw OCR: "{group.rawName}"
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                      {group.count} receipt occurrence(s)
                    </span>
                    <span>
                      Latest Price: <strong className="text-gray-800">LKR {Number(group.latestPrice || 0).toLocaleString()}</strong>
                    </span>
                    <span>Unit: {group.unit}</span>
                    {group.supermarkets?.length > 0 && (
                      <span className="flex items-center gap-1 text-gray-600">
                        <BuildingStorefrontIcon className="w-3.5 h-3.5" />
                        {group.supermarkets.join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Promote to New Product Action */}
                <button
                  onClick={() => setCreateModalGroup(group)}
                  className="flex items-center gap-1.5 border border-primary text-primary hover:bg-primary/5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Promote to New Product
                </button>
              </div>

              {/* Suggestions Section */}
              <div className="bg-gray-50/70 rounded-xl p-3.5 border border-gray-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 block mb-2">
                  Catalog Match Suggestions
                </span>

                {group.suggestions?.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {group.suggestions.map((sug) => (
                      <div
                        key={sug.product.id}
                        className="bg-white p-3 rounded-xl border border-gray-200 hover:border-primary/50 transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-semibold text-gray-900 text-xs truncate">
                              {sug.product.name}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                sug.score >= 80
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {sug.score}% match
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400">
                            {sug.product.category?.name || 'Category'} · Unit: {sug.product.defaultUnit}
                          </p>
                        </div>

                        <button
                          onClick={() => handleMatchSuggestion(group, sug)}
                          disabled={matchMutation.isLoading}
                          className="mt-2.5 w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 py-1 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                        >
                          <CheckIcon className="w-3.5 h-3.5" />
                          Link to This Product
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-1 text-xs text-gray-400">
                    <span>No strong suggestions found for this item.</span>
                    <button
                      onClick={() => setCreateModalGroup(group)}
                      className="text-primary font-semibold hover:underline"
                    >
                      Create as new product &rarr;
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Promote to New Product Modal */}
      {createModalGroup && (
        <CreateProductModal
          group={createModalGroup}
          categories={categories || []}
          onClose={() => setCreateModalGroup(null)}
          onSubmit={(form) =>
            createProductMutation.mutate({
              ...form,
              rawName: createModalGroup.rawName,
              invoiceItemIds: createModalGroup.invoiceItemIds,
            })
          }
          isLoading={createProductMutation.isLoading}
        />
      )}
    </div>
  );
}

function CreateProductModal({ group, categories, onClose, onSubmit, isLoading }) {
  const [name, setName] = useState(group.cleanedName || group.rawName);
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [defaultUnit, setDefaultUnit] = useState(group.unit || 'unit');
  const [barcode, setBarcode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Product name is required');
    if (!categoryId) return toast.error('Please select a category');
    onSubmit({ name, categoryId, brand, defaultUnit, barcode });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Promote to Catalog Product</h3>
            <p className="text-xs text-gray-500">
              Creates a canonical product and links {group.count} receipt line(s).
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Product Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Default Unit</label>
              <select
                value={defaultUnit}
                onChange={(e) => setDefaultUnit(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Brand</label>
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g. Keells, Anchor"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Barcode (optional)</label>
              <input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. 479..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-sm font-semibold border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2 text-sm font-semibold bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create & Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3: UNIT STANDARDIZATION
// ─────────────────────────────────────────────────────────────────────────────

function UnitStandardizationPanel() {
  const qc = useQueryClient();

  const { data, isLoading, refetch, isFetching } = useQuery(
    'unitStandardizationPreview',
    () => api.get('/admin/cleanup/units/preview').then((r) => r.data)
  );

  const applyMutation = useMutation(
    () => api.post('/admin/cleanup/units/apply'),
    {
      onSuccess: (res) => {
        toast.success(res.data.message || 'Standardization complete');
        qc.invalidateQueries('unitStandardizationPreview');
        qc.invalidateQueries('products');
      },
      onError: () => {
        toast.error('Failed to run standardization');
      },
    }
  );

  const variations = data?.data?.variations || [];
  const totalAffectedProducts = data?.data?.totalAffectedProducts || 0;
  const totalAffectedInvoiceItems = data?.data?.totalAffectedInvoiceItems || 0;

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-gray-900 text-base flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-violet-600" />
            Unit Standardization & Whitespace Sanitizer
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Standardizes product and receipt units into canonical formats: <strong>kg, g, L, ml, unit, pack</strong>.
            Also strips redundant internal whitespaces and trims product names.
          </p>
        </div>

        <button
          onClick={() => applyMutation.mutate()}
          disabled={applyMutation.isLoading || (totalAffectedProducts === 0 && totalAffectedInvoiceItems === 0)}
          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors disabled:opacity-40 shrink-0"
        >
          <SparklesIcon className="w-4 h-4" />
          {applyMutation.isLoading ? 'Standardizing...' : 'Apply Standardization to All'}
        </button>
      </div>

      {/* Canonical Units Guide */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider mb-3">
          Canonical Units Reference
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { unit: 'kg', label: 'Kilograms', aliases: 'kgs, kilo, 1kg' },
            { unit: 'g', label: 'Grams', aliases: 'gm, gms, grams, 500g' },
            { unit: 'L', label: 'Liters', aliases: 'ltr, litre, 1l' },
            { unit: 'ml', label: 'Milliliters', aliases: 'mls, 100ml' },
            { unit: 'unit', label: 'Count / Pieces', aliases: 'pcs, nos, btl, can' },
            { unit: 'pack', label: 'Packs / Packets', aliases: 'pkt, packet, box' },
          ].map((item) => (
            <div key={item.unit} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
              <span className="font-mono font-bold text-primary text-sm">{item.unit}</span>
              <p className="text-xs font-semibold text-gray-700 mt-0.5">{item.label}</p>
              <p className="text-[10px] text-gray-400 mt-1 truncate" title={item.aliases}>
                Maps: {item.aliases}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Scan Results */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-gray-100">
          <ArrowPathIcon className="w-8 h-8 text-primary animate-spin mb-2" />
          <p className="text-sm text-gray-500 font-medium">Scanning catalog for unit variations...</p>
        </div>
      ) : variations.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-emerald-100 text-center">
          <CheckCircleIcon className="w-12 h-12 text-emerald-500 mb-2" />
          <h3 className="font-bold text-gray-900 text-base">Catalog Units Perfectly Standardized</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-md">
            All active products and receipt line items adhere to the canonical unit format standard.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h4 className="font-bold text-gray-900 text-sm">
              Detected Non-Standard Units ({variations.length} variations)
            </h4>
            <span className="text-xs font-semibold text-violet-700 bg-violet-100 px-2.5 py-0.5 rounded-full">
              {totalAffectedProducts} products & {totalAffectedInvoiceItems} invoice items affected
            </span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3">Raw Unit Format</th>
                <th className="text-left px-6 py-3">Canonical Format</th>
                <th className="text-center px-6 py-3">Products Affected</th>
                <th className="text-center px-6 py-3">Receipt Items Affected</th>
                <th className="text-left px-6 py-3">Sample Products</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {variations.map((v, idx) => (
                <tr key={idx} className="hover:bg-gray-50/70">
                  <td className="px-6 py-3.5 font-mono text-xs font-bold text-rose-600 bg-rose-50/20">
                    "{v.from}"
                  </td>
                  <td className="px-6 py-3.5 font-mono text-xs font-bold text-emerald-700">
                    &rarr; "{v.to}"
                  </td>
                  <td className="px-6 py-3.5 text-center font-semibold text-gray-700 text-xs">
                    {v.productCount}
                  </td>
                  <td className="px-6 py-3.5 text-center font-semibold text-gray-700 text-xs">
                    {v.invoiceItemCount}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-gray-500">
                    {v.sampleProducts?.length > 0 ? v.sampleProducts.join(', ') : '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: PRODUCT SEARCH PICKER (FOR MANUAL MERGING)
// ─────────────────────────────────────────────────────────────────────────────

function ProductSearchPicker({ label, selectedProduct, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await api.get('/products', { params: { search: query, limit: 8 } });
        setResults(res.data.data || []);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      {selectedProduct ? (
        <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 bg-gray-50">
          <div>
            <p className="font-bold text-gray-900 text-xs">{selectedProduct.name}</p>
            <p className="text-[10px] text-gray-500">
              {selectedProduct.brand || 'No brand'} · Unit: {selectedProduct.defaultUnit || 'unit'} · Barcode: {selectedProduct.barcode || 'None'}
            </p>
          </div>
          <button
            onClick={() => onSelect(null)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={label}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {isOpen && results.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-48 overflow-y-auto">
              {results.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelect(p);
                    setIsOpen(false);
                    setQuery('');
                  }}
                  className="p-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                >
                  <p className="font-semibold text-gray-900 text-xs">{p.name}</p>
                  <p className="text-[10px] text-gray-400">
                    {p.brand || 'No brand'} · {p.category?.name || 'Category'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
