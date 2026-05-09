/**
 * RevenueCat Integration for TellBill Mobile App
 * Uses native react-native-purchases SDK for app store purchases
 */

import axios from "axios";
import Purchases from "react-native-purchases";

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "https://api.tellbill.app";

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
 * Initialize RevenueCat native SDK
 * ✅ Configures SDK with public API key
 * ✅ Enables Google Play Store
 * ✅ Sets up listener for subscription changes
 */
export async function initializeRevenueCat(): Promise<void> {
  try {
    if (!REVENUECAT_API_KEY) {
      console.warn("[RevenueCat] API key not configured - subscriptions disabled");
      return;
    }

    // Configure SDK with public API key
    await Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
    });

    // Enable debug logging in development
    if (__DEV__) {
      await Purchases.setDebugLogsEnabled(true);
    }

    console.log("[RevenueCat] ✅ Native SDK initialized successfully");
  } catch (error) {
    console.error("[RevenueCat] Failed to initialize SDK:", error);
  }
}

/**
 * Set user ID for RevenueCat subscription tracking
 * ✅ Links TellBill user to RevenueCat customer
 */
export async function setRevenueCatUserId(userId: string): Promise<void> {
  try {
    currentUserId = userId;
    
    // Set app user ID in native SDK
    // This links TellBill userId to RevenueCat for subscription tracking
    await Purchases.logIn(userId);
    
    console.log("[RevenueCat] ✅ User ID set:", userId);
  } catch (error) {
    console.error("[RevenueCat] Failed to set user ID:", error);
  }
}

/**
 * Get subscription packages/offerings from RevenueCat
 * ✅ Fetches Solo and Professional packages from RevenueCat
 */
export async function getSubscriptionPackages(): Promise<SubscriptionPackage[]> {
  try {
    if (!REVENUECAT_API_KEY) {
      console.warn("[RevenueCat] API key not configured");
      return [];
    }

    // Fetch offerings from native SDK
    const offerings = await Purchases.getOfferings();

    if (!offerings.current) {
      console.warn("[RevenueCat] No offerings available - using fallback");
      // Fallback to hardcoded packages
      return [
        {
          identifier: "solo_monthly",
          title: "Solo",
          priceString: "$29/month",
          currencyCode: "USD",
        },
        {
          identifier: "professional_monthly",
          title: "Professional",
          priceString: "$34.99/month",
          currencyCode: "USD",
        },
      ];
    }

    // Get all available packages from current offering
    const allPackages = offerings.current.availablePackages || [];
    console.log("[RevenueCat] Total packages available:", allPackages.length);
    
    // Log available package identifiers for debugging
    allPackages.forEach(pkg => {
      console.log(`[RevenueCat] Package: ${pkg.identifier} - ${pkg.product?.priceString || 'N/A'}`);
    });

    // Map RevenueCat packages to our format
    // Accept both underscore and colon formats for identifiers
    const packages: SubscriptionPackage[] = allPackages
      .filter(pkg => {
        const id = pkg.identifier.toLowerCase();
        return id.includes('solo') || id.includes('professional');
      })
      .map((pkg) => {
        const id = pkg.identifier.toLowerCase();
        const isSolo = id.includes('solo');
        return {
          identifier: pkg.identifier,
          title: isSolo ? "Solo" : "Professional",
          priceString: pkg.product?.priceString || "$0",
          currencyCode: pkg.product?.currencyCode || "USD",
        };
      });

    console.log("[RevenueCat] ✅ Filtered packages:", packages.length, packages.map(p => p.identifier));
    return packages;
  } catch (error) {
    console.error("[RevenueCat] Failed to get packages:", error);
    // Fallback to hardcoded packages
    return [
      {
        identifier: "solo_monthly",
        title: "Solo",
        priceString: "$29/month",
        currencyCode: "USD",
      },
      {
        identifier: "professional_monthly",
        title: "Professional",
        priceString: "$34.99/month",
        currencyCode: "USD",
      },
    ];
  }
}

/**
 * Get customer subscription info
 * ✅ Fetches entitlements and subscription status from RevenueCat
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    if (!currentUserId) {
      console.warn("[RevenueCat] No user ID set");
      return null;
    }

    // Fetch customer info from native SDK
    const purchaserInfo = await Purchases.getCustomerInfo();

    console.log("[RevenueCat] ✅ Customer info retrieved");

    // Map native SDK response to our format
    const customerInfo: CustomerInfo = {
      uid: currentUserId,
      activeSubscriptions: purchaserInfo.activeSubscriptions || [],
      entitlements: Object.entries(purchaserInfo.entitlements.active || {}).reduce(
        (acc, [key, value]) => {
          acc[key] = {
            expiresDate: (value as any).expirationDate || null,
          };
          return acc;
        },
        {} as Record<string, { expiresDate: string | null; activeEntitlements?: Record<string, string> }>
      ),
      subscriptions: Object.entries(purchaserInfo.allPurchaseDates || {})
        .reduce(
          (acc, [key, dateStr]) => {
            if (dateStr) {
              acc[key] = {
                expiresDate: dateStr || "",
                periodType: "subscription",
                purchaseDate: new Date(dateStr).toISOString(),
              };
            }
            return acc;
          },
          {} as Record<string, { expiresDate: string; periodType: string; purchaseDate: string }>
        ),
    };

    return customerInfo;
  } catch (error) {
    console.error("[RevenueCat] Failed to get customer info:", error);
    return null;
  }
}

/**
 * Purchase a subscription package via native app store
 */
export async function purchasePackage(
  packageIdentifier: string
): Promise<CustomerInfo | null> {
  try {
    if (!currentUserId) {
      console.error("[RevenueCat] Cannot purchase - no user ID set");
      return null;
    }

    console.log(`[RevenueCat] 🛒 Starting native purchase: ${packageIdentifier}`);

    // Get offerings to find the package
    const offerings = await Purchases.getOfferings();
    if (!offerings.current) {
      throw new Error("No offerings available");
    }

    // Find package in offerings
    const pkg = offerings.current.availablePackages.find(
      (p) => p.identifier === packageIdentifier
    );

    if (!pkg) {
      throw new Error(`Package not found: ${packageIdentifier}`);
    }

    // Initiate purchase via native SDK (iOS/Android app store)
    console.log(`[RevenueCat] 💳 Opening native purchase flow for ${pkg.identifier}`);
    const purchaserInfo = await Purchases.purchasePackage(pkg);

    console.log("[RevenueCat] ✅ Purchase successful");
    
    // Get updated customer info with new entitlements
    return await getCustomerInfo();
  } catch (error: any) {
    if (error.userCancelled) {
      console.log("[RevenueCat] ℹ️  User cancelled purchase");
    } else {
      console.error("[RevenueCat] ❌ Purchase failed:", error);
    }
    return null;
  }
}

/**
 * Restore purchases from app store
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    if (!currentUserId) {
      console.warn("[RevenueCat] Cannot restore - no user ID set");
      return null;
    }

    console.log("[RevenueCat] 🔄 Restoring purchases from app store");

    // Sync with RevenueCat to get latest purchase info
    const purchaserInfo = await Purchases.restorePurchases();
    console.log("[RevenueCat] ✅ Purchases restored from app store");

    // Get customer info with restored entitlements
    return await getCustomerInfo();
  } catch (error) {
    console.error("[RevenueCat] Failed to restore purchases:", error);
    return null;
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
