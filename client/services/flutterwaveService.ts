import * as Linking from "expo-linking";
import { getApiUrl } from "@/lib/backendUrl";

interface FlutterwavePaymentParams {
  userId: string;
  amount: number;
  planId: "solo" | "team" | "enterprise";
  planName: string;
  email: string;
  phoneNumber: string;
  userFullName: string;
}

interface FlutterwaveResponse {
  status: "successful" | "cancelled" | "failed";
  transaction_id?: string;
  flw_ref?: string;
  amount?: number;
}

const FLUTTERWAVE_PUBLIC_KEY = process.env.EXPO_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || "";
const PLAN_PRICES: Record<string, number> = {
  solo: 4999, // $49.99 in cents
  team: 9999, // $99.99 in cents
  enterprise: 29999, // $299.99 in cents
};

export const flutterwaveService = {
  /**
   * Initiates a payment with Flutterwave
   */
  initiatePayment: async (params: FlutterwavePaymentParams) => {
    try {
      const {
        userId,
        amount,
        planId,
        planName,
        email,
        phoneNumber,
        userFullName,
      } = params;

      // Call backend to initiate payment
      const response = await fetch(getApiUrl("/api/payments/initiate"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          planId,
          amount,
          email,
          phoneNumber,
          userFullName,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        return {
          success: false,
          error: data.error || "Failed to initiate payment",
        };
      }

      const { reference } = data;

      // Create payment URL for Flutterwave
      const paymentPayload: any = {
        public_key: FLUTTERWAVE_PUBLIC_KEY,
        tx_ref: reference,
        amount: Math.round(amount * 100), // Convert to cents
        currency: "USD",
        customer: {
          email,
          phonenumber: phoneNumber,
          name: userFullName,
        },
        customizations: {
          title: `TellBill ${planName} Plan`,
          description: `Upgrade to ${planName} plan - Unlimited invoicing and voice transcription`,
          logo: "https://tellbill.app/logo.png",
        },
        redirect_url: Linking.createURL(`payment?ref=${reference}&plan=${planId}&userId=${userId}`),
        meta: {
          planId,
          planName,
          reference,
          userId,
        },
      };

      // Create query string
      const queryString = new URLSearchParams(paymentPayload).toString();
      const paymentURL = `https://checkout.flutterwave.com/v3/hosted/?${queryString}`;

      // Open Flutterwave in browser/webview
      await Linking.openURL(paymentURL);

      return { success: true, reference };
    } catch (error) {
      console.error("[Flutterwave] Payment initiation error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Payment initiation failed",
      };
    }
  },

  /**
   * Verifies payment with backend
   */
  verifyPayment: async (
    transactionId: string,
    reference: string,
    planId: "solo" | "team" | "enterprise",
    userId: string
  ): Promise<boolean> => {
    try {
      // Call backend to verify payment
      const response = await fetch(getApiUrl("/api/payments/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId,
          reference,
          planId,
          userId,
        }),
      });

      const data = await response.json();
      return data.success === true;
    } catch (error) {
      console.error("[Flutterwave] Verification error:", error);
      return false;
    }
  },

  /**
   * Gets plan price in dollars
   */
  getPlanPrice: (planId: string): number => {
    return (PLAN_PRICES[planId] || 0) / 100; // Convert cents to dollars
  },

  /**
   * Gets plan price in cents for Flutterwave
   */
  getPlanPriceInCents: (planId: string): number => {
    return PLAN_PRICES[planId] || 0;
  },
};
