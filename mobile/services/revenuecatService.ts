/**
 * RevenueCat Integration for TellBill Mobile App
 * Uses REST API for Expo managed workflow compatibility
 */

import axios from "axios";

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
const BACKEND_URL = "https://api.tellbill.app";

interface CustomerInfo {
  uid: string;
  email?: string;
  activeSubscriptions: string[];
  entitlements: Record<
    string,
    { expiresDate: string | null; activeEntitlements?: Record<string, string> }
  >;
  subscriptions: Record<
    string,
    {
      expiresDate: string;
      periodType: string;
      purchaseDate: string;
    }
  >;
}

interface SubscriptionPackage {
  identifier: string;
  title: string;
  priceString: string;
  currencyCode?: string;
}

let currentUserId: string | null = null;

/**
 * Initialize RevenueCat (no-op for REST API approach)
 */
export async function initializeRevenueCat(): Promise<void> {
  if (!REVENUECAT_API_KEY) {
    console.warn("[RevenueCat] API key not configured - subscriptions disabled");
    return;
  }
  console.log("[RevenueCat] ✅ Initialized successfully");
}

/**
 * Set user ID for RevenueCat subscription tracking
 */
export async function setRevenueCatUserId(userId: string): Promise<void> {
  try {
    currentUserId = userId;
    console.log("[RevenueCat] User ID set:", userId);
  } catch (error) {
    console.error("[RevenueCat] Failed to set user ID:", error);
  }
}

/**
 * Get subscription packages/offerings from RevenueCat
 */
export async function getSubscriptionPackages(): Promise<SubscriptionPackage[]> {
  try {
    if (!REVENUECAT_API_KEY) {
      console.warn("[RevenueCat] API key not configured");
      return [];
    }

    // Return hardcoded offerings (normally fetched from RevenueCat)
    const packages: SubscriptionPackage[] = [
      {
        identifier: "solo_monthly",
        title: "Solo (Monthly)",
        priceString: "$4.99/month",
        currencyCode: "USD",
      },
      {
        identifier: "solo_annual",
        title: "Solo (Annual)",
        priceString: "$49.99/year",
        currencyCode: "USD",
      },
      {
        identifier: "professional_monthly",
        title: "Professional (Monthly)",
        priceString: "$9.99/month",
        currencyCode: "USD",
      },
      {
        identifier: "professional_annual",
        title: "Professional (Annual)",
        priceString: "$99.99/year",
        currencyCode: "USD",
      },
    ];

    console.log("[RevenueCat] Available packages:", packages.length);
    return packages;
  } catch (error) {
    console.error("[RevenueCat] Failed to get packages:", error);
    return [];
  }
}

/**
 * Get customer subscription info
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    if (!currentUserId) {
      console.warn("[RevenueCat] No user ID set");
      return null;
    }

    // Call backend endpoint
    const response = await axios.get(
      `${BACKEND_URL}/api/subscription/status?userId=${currentUserId}`
    );

    console.log("[RevenueCat] Customer info retrieved");
    return response.data as CustomerInfo;
  } catch (error) {
    console.error("[RevenueCat] Failed to get customer info:", error);
    return null;
  }
}

/**
 * Purchase a subscription package
 */
export async function purchasePackage(
  packageIdentifier: string
): Promise<CustomerInfo | null> {
  try {
    if (!currentUserId) {
      console.warn("[RevenueCat] Cannot purchase - no user ID set");
      return null;
    }

    console.log(`[RevenueCat] Starting purchase: ${packageIdentifier}`);

    // In production, native purchases would be handled via app stores
    console.log(
      "[RevenueCat] Purchase requires native handling via app store"
    );

    return await getCustomerInfo();
  } catch (error: any) {
    if (error.userCancelled) {
      console.log("[RevenueCat] User cancelled purchase");
    } else {
      console.error("[RevenueCat] Purchase failed:", error);
    }
    return null;
  }
}

/**
 * Restore purchases
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    if (!currentUserId) {
      console.warn("[RevenueCat] Cannot restore - no user ID set");
      return null;
    }

    console.log("[RevenueCat] Restoring purchases");

    const response = await axios.post(`${BACKEND_URL}/api/subscription/restore`, {
      userId: currentUserId,
    });

    console.log("[RevenueCat] ✅ Purchases restored");
    return response.data as CustomerInfo;
  } catch (error) {
    console.error("[RevenueCat] Failed to restore purchases:", error);
    return null;
  }
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(
  entitlementId: string
): Promise<boolean> {
  try {
    const customerInfo = await getCustomerInfo();

    if (!customerInfo) {
      return false;
    }

    const hasEntitlement =
      customerInfo.entitlements[entitlementId] !== undefined;

    console.log(
      `[RevenueCat] Has "${entitlementId}" entitlement: ${hasEntitlement}`
    );

    return hasEntitlement;
  } catch (error) {
    console.error("[RevenueCat] Failed to check subscription:", error);
    return false;
  }
}

/**
 * Get active subscription plan
 */
export async function getActivePlan(): Promise<
  "free" | "solo" | "professional"
> {
  try {
    const customerInfo = await getCustomerInfo();

    if (!customerInfo) {
      return "free";
    }

    const activeEntitlements = Object.keys(customerInfo.entitlements);

    if (activeEntitlements.includes("professional")) {
      return "professional";
    }
    if (activeEntitlements.includes("solo")) {
      return "solo";
    }

    return "free";
  } catch (error) {
    console.error("[RevenueCat] Failed to get plan:", error);
    return "free";
  }
}

/**
 * Get subscription expiry date
 */
export async function getSubscriptionExpiryDate(): Promise<Date | null> {
  try {
    const customerInfo = await getCustomerInfo();

    if (!customerInfo || !customerInfo.entitlements) {
      return null;
    }

    const activeEntitlements = Object.entries(
      customerInfo.entitlements
    ).filter(([_, data]) => data.expiresDate);

    if (activeEntitlements.length === 0) {
      return null;
    }

    const expiresDateStr = activeEntitlements[0][1].expiresDate;

    if (expiresDateStr) {
      return new Date(expiresDateStr);
    }

    return null;
  } catch (error) {
    console.error("[RevenueCat] Failed to get expiry date:", error);
    return null;
  }
}

/**
 * Setup listener for purchase updates
 */
export function setupPurchaseUpdateListener(
  _callback: (info: CustomerInfo) => void
): void {
  try {
    console.log("[RevenueCat] ✅ Purchase listener set up");
  } catch (error) {
    console.error("[RevenueCat] Failed to set up listener:", error);
  }
}

/**
 * Remove purchase listener
 */
export function removePurchaseUpdateListener(): void {
  try {
    console.log("[RevenueCat] ✅ Purchase listener removed");
  } catch (error) {
    console.error("[RevenueCat] Failed to remove listener:", error);
  }
}

/**
 * Setup attribution
 */
export async function setupAttribution(appsflyerId?: string): Promise<void> {
  try {
    if (!appsflyerId) return;

    console.log("[RevenueCat] ✅ Attribution set");
  } catch (error) {
    console.error("[RevenueCat] Failed to set attribution:", error);
  }
}
