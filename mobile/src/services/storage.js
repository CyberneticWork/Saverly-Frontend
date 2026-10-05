import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const storage = {
  async getItemAsync(key) {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
        return await AsyncStorage.getItem(key);
      } catch {
        return null;
      }
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },

  async setItemAsync(key, value) {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
        await AsyncStorage.setItem(key, value);
      } catch (e) {
        console.warn('Storage setItem error on web:', e);
      }
      return;
    }
    return await SecureStore.setItemAsync(key, value);
  },

  async deleteItemAsync(key) {
    if (Platform.OS === 'web') {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
        await AsyncStorage.removeItem(key);
      } catch (e) {
        console.warn('Storage deleteItem error on web:', e);
      }
      return;
    }
    try {
      return await SecureStore.deleteItemAsync(key);
    } catch {
      return null;
    }
  },
};

export default storage;
