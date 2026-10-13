import { Platform } from 'react-native';
import Constants from 'expo-constants';
import axios from 'axios';
import storage from './storage';

export const getApiBaseUrl = () => {
  // 1. Web browser: Use relative /api so Metro development server reverse-proxies to live backend without CORS errors
  if (Platform.OS === 'web') {
    return '/api';
  }

  // 2. Native Expo Go: Explicitly configured environment variable takes top priority
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (envUrl && envUrl !== 'auto' && envUrl !== 'local') {
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/+$/, '')}/api`;
  }

  // 3. Native Expo Go: dynamically extract Metro host IP for local development if no live URL configured
  try {
    const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest2?.extra?.expoClient?.hostUri;
    if (hostUri) {
      const metroIp = hostUri.split(':')[0];
      if (metroIp && metroIp !== 'localhost' && metroIp !== '127.0.0.1') {
        return `http://${metroIp}:5000/api`;
      }
    }
  } catch {
    // fallback if Constants not accessible
  }

  // 4. Fallback to app.json extra or live API
  return Constants?.expoConfig?.extra?.apiUrl || 'https://apisaverly.cyberneticde.site/api';
};

const API_URL = getApiBaseUrl();
console.log('[Saverly Mobile] Connected to API URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach access token ──────────────
api.interceptors.request.use(async (config) => {
  try {
    const token = await storage.getItemAsync('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {}
  if (config.data && (typeof FormData !== 'undefined' && config.data instanceof FormData)) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// ── Response interceptor: auto-refresh on 401 ────────────
let isRefreshing = false;
let queue = [];

api.interceptors.response.use(
  res => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then(token => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await storage.getItemAsync('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const newToken = data.data.accessToken;

        await storage.setItemAsync('accessToken', newToken);
        queue.forEach(p => p.resolve(newToken));
        queue = [];

        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        queue.forEach(p => p.reject(error));
        queue = [];
        await storage.deleteItemAsync('accessToken');
        await storage.deleteItemAsync('refreshToken');
        // Emit logout event
        throw error;
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

// ── Products ──────────────────────────────────────────────
export const productsAPI = {
  list: (params) => api.get('/products', { params }),
  search: (q, params) => api.get('/products/search', { params: { q, ...params } }),
  getById: (id) => api.get(`/products/${id}`),
  getPrices: (id) => api.get(`/products/${id}/prices`),
  getHistory: (id, params) => api.get(`/products/${id}/history`, { params }),
  getPriceHistory: (id, params) => api.get(`/products/${id}/history`, { params }),
  getCheapest: (id) => api.get(`/products/${id}/cheapest`),
  toggleFavourite: (id) => api.post(`/products/${id}/favourite`),
  getFavourites: () => api.get('/products/me/favourites'),
  communityAdd: (data) => api.post('/products/community-add', data),
  getCommunityData: (params) => api.get('/products/community-data', { params }),
  getCompanyPrices: (params) => api.get('/products/company-prices', { params }),
};

// ── Budget ────────────────────────────────────────────────
export const budgetAPI = {
  getCurrent: (params) => api.get('/budget/current', { params }),
  setBudget: (data) => api.post('/budget', data),
  getHistory: () => api.get('/budget/history'),
};

// ── Categories ────────────────────────────────────────────
export const categoriesAPI = {
  list: () => api.get('/categories'),
};

// ── Supermarkets ──────────────────────────────────────────
export const supermarketsAPI = {
  list: () => api.get('/supermarkets'),
  getById: (id) => api.get(`/supermarkets/${id}`),
  getNearby: (params) => api.get('/supermarkets/nearby', { params }),
  getPrices: (id, params) => api.get(`/supermarkets/${id}/prices`, { params }),
};

// ── Prices ────────────────────────────────────────────────
export const pricesAPI = {
  compare: (arg) => {
    if (typeof arg === 'string') {
      return api.get('/prices/compare', { params: { productId: arg } });
    }
    if (Array.isArray(arg)) {
      return api.get('/prices/compare', { params: { productIds: arg.join(',') } });
    }
    if (typeof arg === 'object' && arg !== null) {
      const params = {};
      if (arg.productId) params.productId = arg.productId;
      if (arg.productIds) params.productIds = Array.isArray(arg.productIds) ? arg.productIds.join(',') : arg.productIds;
      if (arg.productName) params.productName = arg.productName;
      if (arg.q) params.q = arg.q;
      return api.get('/prices/compare', { params });
    }
    return api.get('/prices/compare');
  },
};

// ── Shopping Lists ────────────────────────────────────────
export const shoppingListsAPI = {
  list: () => api.get('/shopping-lists'),
  create: (data) => api.post('/shopping-lists', data),
  getById: (id) => api.get(`/shopping-lists/${id}`),
  update: (id, data) => api.put(`/shopping-lists/${id}`, data),
  remove: (id) => api.delete(`/shopping-lists/${id}`),
  addItem: (id, data) => api.post(`/shopping-lists/${id}/items`, data),
  updateItem: (id, itemId, data) => api.put(`/shopping-lists/${id}/items/${itemId}`, data),
  removeItem: (id, itemId) => api.delete(`/shopping-lists/${id}/items/${itemId}`),
  toggleCheck: (id, itemId) => api.patch(`/shopping-lists/${id}/items/${itemId}/check`),
  optimize: (id) => api.get(`/shopping-lists/${id}/optimize`),
};

// ── Invoices (Scanned Receipts & OCR Bills) ───────────────
export const invoicesAPI = {
  // Server-side image upload & OCR
  scan: (formData) => api.post('/invoices/scan', formData, {
    timeout: 120000,
  }),
  // Send OCR text extracted on-device (legacy path, kept for fallback)
  scanText: (data) => api.post('/invoices/scan-text', data, { timeout: 60000 }),
  // New: send pre-parsed structured JSON from on-device Gemini — server just saves, no AI needed
  scanStructured: (data) => api.post('/invoices/scan-structured', data, { timeout: 30000 }),
  list: (params) => api.get('/invoices', { params: { type: 'scanned', ...params } }),
  getRecentExpenses: (params) => api.get('/invoices/recent-expenses', { params }),
  addManualExpense: (data) => api.post('/invoices/manual-expense', data),
  getById: (id) => api.get(`/invoices/${id}`),
  confirm: (id, data) => api.put(`/invoices/${id}/confirm`, data),
  remove: (id) => api.delete(`/invoices/${id}`),
  transcribeVoice: (formData) => api.post('/invoices/voice-search', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 15000,
  }),
  scanShoppingList: (formData) => api.post('/invoices/scan-list', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  }),
};

// ── Expenses (Manual Grocery Spending) ─────────────────────
export const expensesAPI = {
  list: (params) => api.get('/invoices/expenses', { params }),
  add: (data) => api.post('/invoices/manual-expense', data),
  remove: (id) => api.delete(`/invoices/expenses/${id}`),
};

// ── Users ─────────────────────────────────────────────────
export const usersAPI = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (formData) => api.put('/users/me', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  changePassword: (data) => api.put('/users/me/password', data),
  updatePushToken: (pushToken) => api.put('/users/me/push-token', { pushToken }),
  getNotifications: (params) => api.get('/users/me/notifications', { params }),
  markNotificationRead: (id) => api.patch(`/users/me/notifications/${id}/read`),
  markAllRead: () => api.post('/users/me/notifications/read-all'),
  markAllNotificationsRead: () => api.post('/users/me/notifications/read-all'),
  getAlerts: () => api.get('/users/me/alerts'),
  createAlert: (data) => api.post('/users/me/alerts', data),
  deleteAlert: (id) => api.delete(`/users/me/alerts/${id}`),
};

export default api;
