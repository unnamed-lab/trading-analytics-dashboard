// lib/stores/trade-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // UI state only - no trade data
  isRefreshing: boolean;
  setIsRefreshing: (isRefreshing: boolean) => void;
  
  // Filter state
  symbolFilter: string | null;
  setSymbolFilter: (symbol: string | null) => void;
  
  // Demo mode
  isDemoMode: boolean;
  setIsDemoMode: (isDemoMode: boolean) => void;
  
  // Error state
  error: string | null;
  setError: (error: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      isRefreshing: false,
      setIsRefreshing: (isRefreshing) => set({ isRefreshing }),
      
      symbolFilter: null,
      setSymbolFilter: (symbolFilter) => set({ symbolFilter }),
      
      isDemoMode: false,
      setIsDemoMode: (isDemoMode) => set({ isDemoMode }),
      
      error: null,
      setError: (error) => set({ error }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ 
        isDemoMode: state.isDemoMode,
        symbolFilter: state.symbolFilter 
      }),
    }
  )
);