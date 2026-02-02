import { create } from "zustand";

export interface MoneyAlert {
  id: string;
  userId: string;
  type: "RECEIPT_UNBILLED" | "SCOPE_APPROVED_NO_INVOICE" | "VOICE_LOG_NO_INVOICE" | "INVOICE_NOT_SENT";
  status: "open" | "resolved" | "fixed";
  sourceType: "RECEIPT" | "SCOPE" | "TRANSCRIPT" | "INVOICE";
  sourceId: string;
  clientName?: string;
  clientEmail?: string;
  estimatedAmount?: string;
  currency: string;
  confidence?: number;
  reasonResolved?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MoneyAlertsSummary {
  count: number;
  totalAmount: string;
}

interface MoneyAlertsStore {
  alerts: MoneyAlert[];
  summary: MoneyAlertsSummary | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setAlerts: (alerts: MoneyAlert[]) => void;
  setSummary: (summary: MoneyAlertsSummary) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addAlert: (alert: MoneyAlert) => void;
  updateAlert: (id: string, updates: Partial<MoneyAlert>) => void;
  removeAlert: (id: string) => void;
  reset: () => void;
}

export const useMoneyAlertsStore = create<MoneyAlertsStore>((set) => ({
  alerts: [],
  summary: null,
  isLoading: false,
  error: null,

  setAlerts: (alerts) => set({ alerts }),
  setSummary: (summary) => set({ summary }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  addAlert: (alert) => set((state) => ({ alerts: [alert, ...state.alerts] })),

  updateAlert: (id, updates) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
    })),

  removeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),

  reset: () => set({ alerts: [], summary: null, isLoading: false, error: null }),
}));
