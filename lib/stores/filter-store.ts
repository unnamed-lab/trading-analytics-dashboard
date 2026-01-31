import { create } from "zustand";

export type Timeframe = "24h" | "7d" | "30d" | "90d" | "all";

export interface FilterState {
  symbol: string | null;
  timeframe: Timeframe;
  setSymbol: (symbol: string | null) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  reset: () => void;
}

const defaultState = { symbol: null as string | null, timeframe: "7d" as Timeframe };

export const useFilterStore = create<FilterState>((set) => ({
  ...defaultState,
  setSymbol: (symbol) => set({ symbol }),
  setTimeframe: (timeframe) => set({ timeframe }),
  reset: () => set(defaultState),
}));
