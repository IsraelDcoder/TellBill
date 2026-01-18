import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";

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
}

export const useInvoiceStore = create<InvoiceStore>()(
  persist(
    (set, get) => ({
      invoices: [],

      addInvoice: (invoiceData) => {
        const invoiceCount = get().invoices.length + 1;
        const invoice: Invoice = {
          ...invoiceData,
          id: uuidv4(),
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
    }),
    {
      name: "tellbill-invoices",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
