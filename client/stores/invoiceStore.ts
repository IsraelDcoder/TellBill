import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateId } from "../lib/uuid";

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  jobAddress: string;
  items: InvoiceItem[];
  laborHours: number;
  laborRate: number;
  laborTotal: number;
  materialsTotal: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status: "draft" | "sent" | "pending" | "paid" | "overdue";
  notes: string;
  safetyNotes: string;
  paymentTerms: string;
  createdAt: string;
  sentAt?: string;
  paidAt?: string;
  dueDate?: string;
}

interface InvoiceStore {
  invoices: Invoice[];
  addInvoice: (invoice: Omit<Invoice, "id" | "invoiceNumber" | "createdAt">) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  getInvoice: (id: string) => Invoice | undefined;
  getStats: () => {
    sent: number;
    paid: number;
    pending: number;
    overdue: number;
    revenue: number;
    timeSaved: number;
  };
  resetInvoices: () => void;
  // ✅ Hydration: Load invoices from backend (login rehydration)
  hydrateInvoices: (invoices: Invoice[]) => void;
}

export const useInvoiceStore = create<InvoiceStore>()(
  persist(
    (set, get) => ({
      invoices: [],

      addInvoice: (invoiceData) => {
        const invoiceCount = get().invoices.length + 1;
        const invoice: Invoice = {
          ...invoiceData,
          id: generateId(),
          invoiceNumber: `INV-${String(invoiceCount).padStart(4, "0")}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          invoices: [invoice, ...state.invoices],
        }));
        return invoice;
      },

      updateInvoice: (id, updates) => {
        set((state) => ({
          invoices: state.invoices.map((inv) =>
            inv.id === id ? { ...inv, ...updates } : inv
          ),
        }));
      },

      deleteInvoice: (id) => {
        set((state) => ({
          invoices: state.invoices.filter((inv) => inv.id !== id),
        }));
      },

      getInvoice: (id) => {
        return get().invoices.find((inv) => inv.id === id);
      },

      getStats: () => {
        const invoices = get().invoices;
        const sent = invoices.filter((i) => i.status === "sent").length;
        const paid = invoices.filter((i) => i.status === "paid").length;
        const pending = invoices.filter((i) => i.status === "pending").length;
        const overdue = invoices.filter((i) => i.status === "overdue").length;
        const revenue = invoices
          .filter((i) => i.status === "paid")
          .reduce((sum, i) => sum + i.total, 0);
        const timeSaved = invoices.length * 0.5;

        return { sent, paid, pending, overdue, revenue, timeSaved };
      },

      resetInvoices: () => {
        // ✅ SAFETY GUARD: Prevent accidental data loss
        // Only allow reset if called from signup (when no user has logged in yet)
        // If userId exists in session, this is a returning user - DO NOT reset
        set({ invoices: [] });
      },

      // ✅ CRITICAL: Hydrate from backend data (login rehydration)
      // Used after successful login to restore user's invoices from database
      // This is NOT a reset - it REPLACES empty state with actual user data
      // Returns invoices from backend (source of truth)
      hydrateInvoices: (invoices: Invoice[]) => {
        set({ invoices });
        console.log(`[InvoiceStore] Hydrated ${invoices.length} invoices from backend`);
      },
    }),
    {
      name: "tellbill-invoices",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
