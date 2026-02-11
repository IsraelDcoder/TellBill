import axios from "axios";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:3000";

export interface CheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}

export interface SubscriptionStatus {
  plan: "free" | "solo" | "professional" | "enterprise";
  status: "active" | "past_due" | "canceled" | "incomplete";
  currentPeriodEnd: number | null;
}

export const stripeService = {
  /**
   * Initiate Stripe checkout for subscription
   * Redirects to Stripe Checkout hosted page
   */
  initiateCheckout: async (plan: "solo" | "professional" | "enterprise") => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await axios.post<CheckoutResponse>(
        `${API_URL}/api/payments/stripe/checkout`,
        { plan },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      if (!response.data.checkoutUrl) {
        throw new Error("No checkout URL returned");
      }

      // Open Stripe Checkout in default browser
      await Linking.openURL(response.data.checkoutUrl);

      return response.data;
    } catch (error) {
      console.error("[Stripe] Checkout initiation failed:", error);
      throw error;
    }
  },

  /**
   * Open Stripe Customer Portal for billing management
   */
  openBillingPortal: async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await axios.post<{ portalUrl: string }>(
        `${API_URL}/api/payments/stripe/portal`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      if (!response.data.portalUrl) {
        throw new Error("No portal URL returned");
      }

      // Open portal in default browser
      await Linking.openURL(response.data.portalUrl);

      return response.data;
    } catch (error) {
      console.error("[Stripe] Portal opening failed:", error);
      throw error;
    }
  },

  /**
   * Get current subscription status
   */
  getSubscriptionStatus: async (): Promise<SubscriptionStatus> => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await axios.post<SubscriptionStatus>(
        `${API_URL}/api/payments/stripe/subscription-status`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      return response.data;
    } catch (error) {
      console.error("[Stripe] Failed to fetch subscription status:", error);
      // Return free plan as fallback
      return {
        plan: "free",
        status: "inactive" as any,
        currentPeriodEnd: null,
      };
    }
  },
};

export default stripeService;
