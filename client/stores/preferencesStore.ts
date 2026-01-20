import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface PreferencesState {
  currency: string;
  taxRate: number;
  invoiceTemplate: string;
  
  // Actions
  setCurrency: (currency: string) => void;
  setTaxRate: (rate: number) => void;
  setInvoiceTemplate: (template: string) => void;
  resetPreferences: () => void;
}

const initialState = {
  currency: "USD",
  taxRate: 0,
  invoiceTemplate: "Professional",
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...initialState,
      
      setCurrency: (currency: string) => set({ currency }),
      setTaxRate: (taxRate: number) => set({ taxRate }),
      setInvoiceTemplate: (invoiceTemplate: string) => set({ invoiceTemplate }),
      resetPreferences: () => set(initialState),
    }),
    {
      name: "preferences-store",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
