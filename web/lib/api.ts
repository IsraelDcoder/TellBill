/**
 * Client Portal API Client
 * Handles all API calls to the backend for the client portal
 */

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:3000";

export interface ProjectData {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "on_hold";
}

export interface Activity {
  eventId: string;
  eventType: "LABOR" | "MATERIAL" | "PROGRESS" | "ALERT" | "RECEIPT";
  data: string; // JSON string
  createdAt: number;
  transcript?: string;
}

export interface Receipt {
  id: string;
  vendor: string;
  purchaseDate: string;
  photoUrl: string;
  totalAmount: number;
  extractedItems: string; // JSON string
  createdAt: number;
}

export interface InvoiceSummary {
  laborBilled: number;
  materialBilled: number;
  balanceDue: number;
  paidAmount: number;
  outstandingAmount: number;
  currency: string;
  lastUpdated: number;
}

export interface ClientPortalData {
  success: boolean;
  project: ProjectData;
  activities: Activity[];
  accessCount: number;
}

class ClientPortalAPI {
  private token: string | null = null;

  /**
   * Set the token from URL or localStorage
   */
  setToken(token: string) {
    this.token = token;
    localStorage.setItem("portal_token", token);
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    if (this.token) return this.token;
    this.token = localStorage.getItem("portal_token");
    return this.token;
  }

  /**
   * GET /api/client-view/:token
   * Fetch project and activities
   */
  async fetchProjectData(token: string): Promise<ClientPortalData> {
    this.setToken(token);
    const response = await fetch(`${API_BASE}/api/client-view/${token}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch project data");
    }

    return response.json();
  }

  /**
   * GET /api/client-view/:token/summary
   * Fetch invoice summary
   */
  async fetchInvoiceSummary(token?: string): Promise<InvoiceSummary> {
    const tkn = token || this.getToken();
    if (!tkn) throw new Error("No token provided");

    const response = await fetch(`${API_BASE}/api/client-view/${tkn}/summary`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch invoice summary");
    }

    return response.json().then(data => data.data);
  }

  /**
   * POST /api/client-view/:token/approve/:eventId
   * Approve or reject a change order
   */
  async approveActivity(
    eventId: string,
    status: "APPROVED" | "REJECTED",
    notes?: string,
    token?: string
  ): Promise<{ success: boolean; approvedAt: number }> {
    const tkn = token || this.getToken();
    if (!tkn) throw new Error("No token provided");

    const response = await fetch(
      `${API_BASE}/api/client-view/${tkn}/approve/${eventId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalStatus: status,
          approvalNotes: notes,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to approve activity");
    }

    return response.json();
  }

  /**
   * GET /api/client-view/:token/receipts
   * Fetch receipts for project display
   */
  async fetchReceipts(token?: string): Promise<Receipt[]> {
    const tkn = token || this.getToken();
    if (!tkn) throw new Error("No token provided");

    const response = await fetch(`${API_BASE}/api/client-view/${tkn}/receipts`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch receipts");
    }

    return response.json().then(data => data.receipts || []);
  }

  /**
   * Validate token is still active
   */
  async validateToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/api/client-view/${token}`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const clientPortalAPI = new ClientPortalAPI();
