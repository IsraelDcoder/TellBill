/**
 * Client Sharing Service
 * Handles generation and management of client share tokens
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

interface GenerateShareTokenRequest {
  projectId: string;
  projectName: string;
  visibility?: "ALL" | "LABOR_MATERIAL_ONLY" | "SUMMARY_ONLY";
}

interface GenerateShareTokenResponse {
  success: boolean;
  data?: {
    shareToken: string;
    projectId: string;
    portalUrl: string;
    expiresAt?: string;
  };
  error?: string;
}

interface ValidateTokenResponse {
  success: boolean;
  data?: {
    projectId: string;
    projectName: string;
    isValid: boolean;
    expiresAt?: string;
  };
  error?: string;
}

export class ClientSharingService {
  /**
   * Generate a new client share token for a project
   */
  static async generateShareToken(
    request: GenerateShareTokenRequest
  ): Promise<GenerateShareTokenResponse> {
    try {
      const response = await fetch(`${API_URL}/api/client-view`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectId: request.projectId,
          projectName: request.projectName,
          visibility: request.visibility || "ALL",
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          error: error?.message || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      const portalUrl = `${this.getPortalBaseUrl()}/view/${data.shareToken}`;

      return {
        success: true,
        data: {
          shareToken: data.shareToken,
          projectId: data.projectId,
          portalUrl,
          expiresAt: data.expiresAt,
        },
      };
    } catch (error) {
      console.error("[ClientSharingService] Error generating token:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Validate an existing share token
   */
  static async validateToken(token: string): Promise<ValidateTokenResponse> {
    try {
      const response = await fetch(`${API_URL}/api/client-view/${token}/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          error: error?.message || `HTTP ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          projectId: data.projectId,
          projectName: data.projectName,
          isValid: true,
          expiresAt: data.expiresAt,
        },
      };
    } catch (error) {
      console.error("[ClientSharingService] Error validating token:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get the portal base URL (configurable by environment)
   */
  static getPortalBaseUrl(): string {
    // Try to detect if we're in development or production
    const isDevelopment = !API_URL.includes("api.tellbill");
    if (isDevelopment) {
      return "http://localhost:3000";
    }
    // Production: replace /api with portal domain
    return API_URL.replace("/api", "").replace("api.", "") || "https://portal.tellbill.app";
  }

  /**
   * Get the sharing URL for a token
   */
  static getShareUrl(token: string): string {
    return `${this.getPortalBaseUrl()}/view/${token}`;
  }
}
