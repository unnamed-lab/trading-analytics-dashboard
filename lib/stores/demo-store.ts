import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DemoStore {
  isDemoMode: boolean;
  setDemoMode: (enabled: boolean) => void;
  toggleDemoMode: () => void;
}

export const useDemoStore = create<DemoStore>()(
  persist(
    (set) => ({
      isDemoMode: false,
      setDemoMode: (enabled) => set({ isDemoMode: enabled }),
      toggleDemoMode: () => set((s) => ({ isDemoMode: !s.isDemoMode })),
    }),
    { name: "deriverse-demo-mode" }
  )
);
