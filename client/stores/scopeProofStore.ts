import { create } from "zustand";
import { getApiUrl } from "@/lib/backendUrl";

export interface ScopeProof {
  id: string;
  userId: string;
  projectId?: string;
  invoiceId?: string;
  description: string;
  estimatedCost: number | string;
  photos: string[];
  status: "pending" | "approved" | "expired";
  approvalToken: string;
  tokenExpiresAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface ScopeProofStore {
  // State
  scopeProofs: ScopeProof[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchScopeProofs: (filters?: { status?: string; projectId?: string }) => Promise<void>;
  createScopeProof: (proof: Partial<ScopeProof>) => Promise<ScopeProof>;
  requestApproval: (id: string, clientEmail: string) => Promise<{ approvalUrl: string }>;
  resendApproval: (id: string, clientEmail: string) => Promise<void>;
  cancelApproval: (id: string) => Promise<void>;
  getScopeProof: (id: string) => ScopeProof | undefined;
  getStatusCounts: () => {
    pending: number;
    approved: number;
    expired: number;
  };
  reset: () => void;
}

export const useScopeProofStore = create<ScopeProofStore>((set, get) => ({
  scopeProofs: [],
  loading: false,
  error: null,

  fetchScopeProofs: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const queryParams = new URLSearchParams();
      if (filters.status) queryParams.append("status", filters.status);
      if (filters.projectId) queryParams.append("projectId", filters.projectId);

      const response = await fetch(
        getApiUrl(`/api/scope-proof${queryParams.toString() ? `?${queryParams}` : ""}`)
      );
      const data = await response.json();

      if (data.success) {
        set({ scopeProofs: data.data });
      } else {
        set({ error: data.error || "Failed to fetch scope proofs" });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch scope proofs" });
    } finally {
      set({ loading: false });
    }
  },

  createScopeProof: async (proof) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(getApiUrl("/api/scope-proof"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proof),
      });
      const data = await response.json();

      if (data.success) {
        const newProof = data.data;
        set((state) => ({
          scopeProofs: [newProof, ...state.scopeProofs],
        }));
        return newProof;
      } else {
        throw new Error(data.error || "Failed to create scope proof");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to create scope proof";
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  requestApproval: async (id, clientEmail) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(getApiUrl(`/api/scope-proof/${id}/request`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientEmail }),
      });
      const data = await response.json();

      if (data.success) {
        // Update proof status to pending
        set((state) => ({
          scopeProofs: state.scopeProofs.map((p) =>
            p.id === id ? { ...p, status: "pending" } : p
          ),
        }));
        return { approvalUrl: data.approvalUrl };
      } else {
        throw new Error(data.error || "Failed to request approval");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to request approval";
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  resendApproval: async (id, clientEmail) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(getApiUrl(`/api/scope-proof/${id}/resend`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientEmail }),
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to resend approval");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to resend approval";
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  cancelApproval: async (id) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(getApiUrl(`/api/scope-proof/${id}`), {
        method: "DELETE",
      });
      const data = await response.json();

      if (data.success) {
        set((state) => ({
          scopeProofs: state.scopeProofs.filter((p) => p.id !== id),
        }));
      } else {
        throw new Error(data.error || "Failed to cancel approval");
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to cancel approval";
      set({ error: errorMsg });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  getScopeProof: (id) => {
    const { scopeProofs } = get();
    return scopeProofs.find((p) => p.id === id);
  },

  getStatusCounts: () => {
    const { scopeProofs } = get();
    return {
      pending: scopeProofs.filter((p) => p.status === "pending").length,
      approved: scopeProofs.filter((p) => p.status === "approved").length,
      expired: scopeProofs.filter((p) => p.status === "expired").length,
    };
  },

  reset: () => {
    set({
      scopeProofs: [],
      loading: false,
      error: null,
    });
  },
}));
