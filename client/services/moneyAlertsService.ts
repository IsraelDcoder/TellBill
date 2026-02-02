import AsyncStorage from "@react-native-async-storage/async-storage";

const getApiUrl = () => {
  return process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_IP || "http://localhost:3000";
};

export class MoneyAlertsService {
  /**
   * Fetch all open alerts for user
   */
  static async getAlerts() {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${getApiUrl()}/api/money-alerts`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch alerts");
      }

      return await response.json();
    } catch (error) {
      console.error("[Money Alerts Service] Error fetching alerts:", error);
      throw error;
    }
  }

  /**
   * Get alert summary (count + total amount)
   */
  static async getSummary() {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${getApiUrl()}/api/money-alerts/summary`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch summary");
      }

      return await response.json();
    } catch (error) {
      console.error("[Money Alerts Service] Error fetching summary:", error);
      throw error;
    }
  }

  /**
   * Get single alert details
   */
  static async getAlert(alertId: string) {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${getApiUrl()}/api/money-alerts/${alertId}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch alert");
      }

      return await response.json();
    } catch (error) {
      console.error("[Money Alerts Service] Error fetching alert:", error);
      throw error;
    }
  }

  /**
   * Fix alert (attach to invoice, create invoice, send invoice)
   */
  static async fixAlert(alertId: string, action: any) {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${getApiUrl()}/api/money-alerts/${alertId}/fix`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(action),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fix alert");
      }

      return await response.json();
    } catch (error) {
      console.error("[Money Alerts Service] Error fixing alert:", error);
      throw error;
    }
  }

  /**
   * Resolve alert (mark as dismissed with reason)
   */
  static async resolveAlert(alertId: string, reason: string, note?: string) {
    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${getApiUrl()}/api/money-alerts/${alertId}/resolve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason, note }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to resolve alert");
      }

      return await response.json();
    } catch (error) {
      console.error("[Money Alerts Service] Error resolving alert:", error);
      throw error;
    }
  }
}
