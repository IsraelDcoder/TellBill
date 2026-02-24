import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/backendUrl";

export interface PreferencesState {
  currency: string;
  language: string;
  theme: string;
  taxRate: number;
  invoiceTemplate: string;
  defaultPaymentTerms: string;
  latePaymentReminders: boolean;
  
  // Actions
  setCurrency: (currency: string) => void;
  setLanguage: (language: string) => void;
  setTheme: (theme: string) => void;
  setTaxRate: (rate: number) => void;
  setInvoiceTemplate: (template: string) => void;
  setDefaultPaymentTerms: (terms: string) => void;
  toggleLatePaymentReminders: () => void;
  resetPreferences: () => void;
  // Backend sync
  loadPreferences: (userId: string, authToken: string) => Promise<void>;
  savePreferencesToBackend: (authToken: string) => Promise<void>;
}

const initialState = {
  currency: "USD",
  language: "en",
  theme: "light",
  taxRate: 8.00,
  invoiceTemplate: "Professional",
  defaultPaymentTerms: "Due upon receipt",
  latePaymentReminders: true,
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      setCurrency: (currency: string) => set({ currency }),
      setLanguage: (language: string) => set({ language }),
      setTheme: (theme: string) => set({ theme }),
      setTaxRate: (taxRate: number) => set({ taxRate }),
      setInvoiceTemplate: (invoiceTemplate: string) => set({ invoiceTemplate }),
      setDefaultPaymentTerms: (defaultPaymentTerms: string) => set({ defaultPaymentTerms }),
      toggleLatePaymentReminders: () => {
        const currentState = get();
        set({ latePaymentReminders: !currentState.latePaymentReminders });
      },
      resetPreferences: () => set(initialState),
      
      /**
       * Load preferences from backend for authenticated user
       */
      loadPreferences: async (userId: string, authToken: string) => {
        try {
          console.log("[Preferences] Loading preferences for user:", userId);

          const response = await fetch(getApiUrl("/api/data/preferences") + `?userId=${userId}`, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            console.warn("[Preferences] Failed to load preferences, using defaults");
            return;
          }

          const data = await response.json();
          if (data.success && data.data && data.data.length > 0) {
            const userPrefs = data.data[0];
            set({
              currency: userPrefs.currency || initialState.currency,
              language: userPrefs.language || initialState.language,
              theme: userPrefs.theme || initialState.theme,
              invoiceTemplate: userPrefs.invoiceTemplate || initialState.invoiceTemplate,
              defaultPaymentTerms: userPrefs.defaultPaymentTerms || initialState.defaultPaymentTerms,
              latePaymentReminders: userPrefs.latePaymentReminders !== undefined ? userPrefs.latePaymentReminders : initialState.latePaymentReminders,
            });
            console.log("[Preferences] ✅ Preferences loaded successfully");
          }
        } catch (error) {
          console.error("[Preferences] Error loading preferences:", error);
        }
      },

      /**
       * Save all preferences to backend
       */
      savePreferencesToBackend: async (authToken: string) => {
        try {
          const state = get();
          console.log("[Preferences] Saving preferences to backend");

          const response = await fetch(getApiUrl("/api/preferences"), {
            method: "PUT",
            headers: {
              "Authorization": `Bearer ${authToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              currency: state.currency,
              language: state.language,
              theme: state.theme,
              invoiceTemplate: state.invoiceTemplate,
              defaultPaymentTerms: state.defaultPaymentTerms,
              latePaymentReminders: state.latePaymentReminders,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to save preferences: ${response.status}`);
          }

          console.log("[Preferences] ✅ Preferences saved successfully");
        } catch (error) {
          console.error("[Preferences] Error saving preferences:", error);
        }
      },
    }),
    {
      name: "preferences-store",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
