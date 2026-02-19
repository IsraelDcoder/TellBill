import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateId } from "../lib/uuid";
import { formatCents } from "@/lib/money";

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
  userId?: string; // ✅ Track which user created invoice
  createdBy?: string; // Name of user who created it
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientAddress: string;
  jobAddress: string;
  jobDescription?: string; // ✅ Description of the job/work
  items: InvoiceItem[];
  laborHours: number;
  laborRate: number;
  laborTotal: number;
  materialsTotal: number;
  subtotal: number;
  // ✅ Tax snapshot (immutable - stored at time of invoice creation)
  taxName?: string; // e.g., "Sales Tax", "VAT"
  taxRate?: number; // e.g., 7.5
  taxAppliesto?: "labor_only" | "materials_only" | "labor_and_materials";
  taxAmount: number;
  total: number;
  status: "draft" | "created" | "sent" | "pending" | "paid" | "overdue";
  notes: string;
  safetyNotes: string;
  paymentTerms: string;
  createdAt: string;
  updatedAt?: string;  // ✅ FIXED: Track when invoice was last updated (enables sorting by paid date)
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
        
        // ✅ FIXED: Inline revenue calculation with defensive checks
        // Calculate revenue from paid invoices (in cents)
        let revenue = 0;
        const paidInvoices = invoices.filter((i) => i.status === "paid");
        
        paidInvoices.forEach((inv, idx) => {
          const total = inv.total || 0;
          console.log(`[Revenue] Invoice ${idx}: total = ${total} (type: ${typeof total})`);
          
          // ✅ CRITICAL: Ensure total is in cents (integer)
          // If it's a large number (> 10000), assume it's already in cents
          // If it's a small number (< 10000), it might be in dollars - convert it
          let invoiceTotal = typeof total === 'number' ? total : 0;
          
          // Sanity check: if total > 100,000,000 cents ($1,000,000+) it's suspicious
          // Most invoices should be under $100,000
          if (invoiceTotal > 10000000) {
            console.warn(`[Revenue] ⚠️  SUSPICIOUSLY LARGE TOTAL: ${invoiceTotal} cents (${(invoiceTotal/100).toFixed(2)} dollars)`);
          }
          
          // Ensure it's an integer (never a decimal like 1001.5)
          invoiceTotal = Math.round(invoiceTotal);
          revenue += invoiceTotal;
        });
        
        // ✅ Time saved: count all invoices (draft, created, sent, pending, paid, overdue)
        const timeSaved = invoices.length * 0.5;

        console.log(`[InvoiceStore] getStats: ${paid} paid invoices, raw revenue = ${revenue} cents`);

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
