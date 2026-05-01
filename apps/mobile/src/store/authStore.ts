import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  loadToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  isHydrated: false, // Prevents flickers before checking storage
  login: async (token: string) => {
    await SecureStore.setItemAsync('shikhar_token', token);
    set({ token, isAuthenticated: true });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('shikhar_token');
    set({ token: null, isAuthenticated: false });
  },
  loadToken: async () => {
    try {
      const token = await SecureStore.getItemAsync('shikhar_token');
      if (token) {
        set({ token, isAuthenticated: true });
      }
    } catch (e) {
      console.error('Failed to load auth token', e);
    } finally {
      set({ isHydrated: true });
    }
  },
}));
