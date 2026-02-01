import { create } from "zustand";
import { getApiUrl } from "@/lib/backendUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ScopeProof {
  id: string;
  userId: string;
  projectId?: string;
  invoiceId?: string;
  description: string;
  estimatedCost: number | string;
  photos: string[];
  status: "pending" | "approved" | "feedback" | "expired";
  approvalToken: string;
  tokenExpiresAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  feedback?: string;
  feedbackFrom?: string;
  feedbackAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Helper function to get JWT token
const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem("authToken");
  } catch (error) {
    console.error("Failed to get auth token:", error);
    return null;
  }
};

// Helper function to build fetch headers with auth
const getAuthHeaders = async (additionalHeaders = {}) => {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...additionalHeaders,
  };
};

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

      const headers = await getAuthHeaders();
      const response = await fetch(
        getApiUrl(`/api/scope-proof${queryParams.toString() ? `?${queryParams}` : ""}`),
        { headers }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch scope proofs");
      }

      // Backend returns array directly, parse photos if they're stringified
      const proofs = Array.isArray(data) ? data : data.data || [];
      const parsedProofs = proofs.map((proof: any) => ({
        ...proof,
        photos: typeof proof.photos === "string" ? JSON.parse(proof.photos) : proof.photos,
      }));
      set({ scopeProofs: parsedProofs });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : "Failed to fetch scope proofs" });
    } finally {
      set({ loading: false });
    }
  },

  createScopeProof: async (proof) => {
    set({ loading: true, error: null });
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl("/api/scope-proof"), {
        method: "POST",
        headers,
        body: JSON.stringify(proof),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create scope proof");
      }

      const newProof = data.data || data;
      const parsedProof = {
        ...newProof,
        photos: typeof newProof.photos === "string" ? JSON.parse(newProof.photos) : newProof.photos,
      };
      set((state) => ({
        scopeProofs: [parsedProof, ...state.scopeProofs],
      }));
      return parsedProof;
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
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl(`/api/scope-proof/${id}/request`), {
        method: "POST",
        headers,
        body: JSON.stringify({ clientEmail }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to request approval");
      }

      // Update proof status
      set((state) => ({
        scopeProofs: state.scopeProofs.map((p) =>
          p.id === id ? { ...p, status: "pending" as const } : p
        ),
      }));
      return { approvalUrl: data.approvalUrl || "" };
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
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl(`/api/scope-proof/${id}/resend`), {
        method: "POST",
        headers,
        body: JSON.stringify({ clientEmail }),
      });
      const data = await response.json();

      if (!response.ok) {
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
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl(`/api/scope-proof/${id}`), {
        method: "DELETE",
        headers,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel approval");
      }

      set((state) => ({
        scopeProofs: state.scopeProofs.filter((p) => p.id !== id),
      }));
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
