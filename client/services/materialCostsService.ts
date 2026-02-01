/**
 * Material Costs Service
 * Handles material cost operations and Money Alert integration
 */

import { getApiUrl } from "@/lib/backendUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface ExtractedMaterialCost {
  vendor: string;
  date: string;
  total: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: string;
    total: string;
  }>;
}

interface MaterialCostReceipt {
  id: string;
  vendor: string;
  amount: string;
  date: string;
  clientName?: string;
  clientEmail?: string;
  imageUrl?: string;
  billable?: boolean;
  linkedInvoiceId?: string | null;
}

interface MoneyAlert {
  type: "unbilled_materials";
  severity: "warning" | "critical";
  title: string;
  description: string;
  amount: string;
  count: number;
  actionCta: string;
  receipts: MaterialCostReceipt[];
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
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...additionalHeaders,
  };
};

export class MaterialCostsService {
  /**
   * Capture material cost from camera
   * Saves receipt image and extracts data using AI
   */
  static async captureMaterialCost(
    imageBase64: string,
    clientName?: string,
    clientEmail?: string
  ): Promise<{
    success: boolean;
    receiptId?: string;
    extractedData?: ExtractedMaterialCost;
    error?: string;
  }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl("/api/material-costs/capture"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          imageBase64,
          clientName,
          clientEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || "Failed to capture material cost",
        };
      }

      return {
        success: true,
        receiptId: data.receiptId,
        extractedData: data.extractedData,
      };
    } catch (error) {
      console.error("[Material Costs] Capture error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to capture material cost",
      };
    }
  }

  /**
   * Save material cost as billable or non-billable
   */
  static async saveMaterialCostDecision(
    receiptId: string,
    billable: boolean,
    clientName?: string,
    clientEmail?: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl(`/api/material-costs/${receiptId}/decision`), {
        method: "POST",
        headers,
        body: JSON.stringify({
          billable,
          clientName,
          clientEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || "Failed to save decision",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("[Material Costs] Decision error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to save decision",
      };
    }
  }

  /**
   * Link material cost to invoice
   */
  static async linkToInvoice(
    receiptId: string,
    invoiceId: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl(`/api/material-costs/${receiptId}/link`), {
        method: "POST",
        headers,
        body: JSON.stringify({ invoiceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || "Failed to link to invoice",
        };
      }

      return { success: true };
    } catch (error) {
      console.error("[Material Costs] Link error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to link to invoice",
      };
    }
  }

  /**
   * Get money alert for unbilled materials
   */
  static async getMoneyAlert(): Promise<{
    success: boolean;
    alert?: MoneyAlert;
    error?: string;
  }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl("/api/alerts/money"), {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || "Failed to fetch money alert",
        };
      }

      const alert = data.data?.alerts?.[0];
      return {
        success: true,
        alert,
      };
    } catch (error) {
      console.error("[Material Costs] Money alert error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch money alert",
      };
    }
  }

  /**
   * Get detailed unbilled materials list
   */
  static async getUnbilledMaterials(): Promise<{
    success: boolean;
    total?: string;
    count?: number;
    receipts?: MaterialCostReceipt[];
    error?: string;
  }> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(getApiUrl("/api/alerts/money/unbilled-materials"), {
        method: "GET",
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || "Failed to fetch unbilled materials",
        };
      }

      return {
        success: true,
        total: data.data?.total,
        count: data.data?.count,
        receipts: data.data?.receipts || [],
      };
    } catch (error) {
      console.error("[Material Costs] Unbilled materials error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch unbilled materials",
      };
    }
  }
}
