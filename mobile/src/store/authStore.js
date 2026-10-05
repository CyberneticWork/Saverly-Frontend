import { create } from 'zustand';
import storage from '../services/storage';
import { authAPI } from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: async () => {
    try {
      const token = await storage.getItemAsync('accessToken');
      if (token) {
        const { data } = await authAPI.getMe();
        set({ user: data.data, isAuthenticated: true });
      }
    } catch {
      await storage.deleteItemAsync('accessToken');
      await storage.deleteItemAsync('refreshToken');
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    const { user, accessToken, refreshToken } = data.data;
    await storage.setItemAsync('accessToken', accessToken);
    await storage.setItemAsync('refreshToken', refreshToken);
    set({ user, isAuthenticated: true });
    return user;
  },

  register: async (userData) => {
    const { data } = await authAPI.register(userData);
    const { user, accessToken, refreshToken } = data.data;
    await storage.setItemAsync('accessToken', accessToken);
    await storage.setItemAsync('refreshToken', refreshToken);
    set({ user, isAuthenticated: true });
    return user;
  },

  logout: async () => {
    try { await authAPI.logout(); } catch {}
    await storage.deleteItemAsync('accessToken');
    await storage.deleteItemAsync('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  updateUser: (updates) => set(state => ({
    user: { ...state.user, ...updates },
  })),
}));
