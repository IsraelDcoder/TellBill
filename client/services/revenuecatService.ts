/**
 * RevenueCat Integration for TellBill Mobile App
 * Handles in-app subscriptions for iOS and Android
 */

import Purchases, {
  PurchasesPackage,
  PurchasesEntitlementInfo,
  PurchasesOffering,
  CustomerInfo,
} from "react-native-purchases";
import { Platform } from "react-native";

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY;

interface Product {
  identifier: string;
  title: string;
  price: string;
  priceString: string;
}

/**
 * Initialize RevenueCat SDK
 * Must be called on app startup
 */
export async function initializeRevenueCat(): Promise<void> {
  if (!REVENUECAT_API_KEY) {
    console.warn("[RevenueCat] API key not configured - subscriptions disabled");
    return;
  }

  try {
    // Set API key based on platform
    if (Platform.OS === "ios") {
      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
      });
    } else if (Platform.OS === "android") {
      await Purchases.configure({
        apiKey: REVENUECAT_API_KEY,
      });
    }

    console.log("[RevenueCat] ✅ Initialized successfully");

    // Optionally set user ID for tracking
    // This connects RevenueCat purchases to your backend user
    // Call this after user logs in
  } catch (error) {
    console.error("[RevenueCat] Failed to initialize:", error);
  }
}

/**
 * Set user ID in RevenueCat
 * Call this after user logs in to link purchases to their account
 * @param userId - Your backend user ID
 */
export async function setRevenueCatUserId(userId: string): Promise<void> {
  try {
    if (!REVENUECAT_API_KEY) return;
    
    await Purchases.logIn(userId);
    console.log(`[RevenueCat] ✅ User logged in: ${userId}`);
  } catch (error) {
    console.error("[RevenueCat] Failed to set user ID:", error);
  }
}

/**
 * Get available subscription packages
 * @returns Array of subscription offerings
 */
export async function getSubscriptionPackages(): Promise<PurchasesPackage[]> {
  try {
    if (!REVENUECAT_API_KEY) {
      console.warn("[RevenueCat] API key not configured");
      return [];
    }

    const offerings = await Purchases.getOfferings();
    
    if (!offerings.current) {
      console.warn("[RevenueCat] No offerings found");
      return [];
    }

    const packages = offerings.current.availablePackages;
    console.log(`[RevenueCat] Found ${packages.length} packages`);
    
    return packages;
  } catch (error) {
    console.error("[RevenueCat] Failed to get offerings:", error);
    return [];
  }
}

/**
 * Get customer info and subscription details
 * @returns Customer info including active subscriptions
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  try {
    if (!REVENUECAT_API_KEY) return null;

    const customerInfo = await Purchases.getCustomerInfo();
    
    console.log("[RevenueCat] ✅ Retrieved customer info");
    console.log("[RevenueCat] Active subscriptions:", customerInfo.activeSubscriptions);
    console.log("[RevenueCat] Entitlements:", Object.keys(customerInfo.entitlements.active));
    
    return customerInfo;
  } catch (error) {
    console.error("[RevenueCat] Failed to get customer info:", error);
    return null;
  }
}

/**
 * Purchase a subscription package
 * @param package - The package to purchase
 * @returns Customer info after purchase
 */
export async function purchasePackage(
  pkg: PurchasesPackage
): Promise<CustomerInfo | null> {
  try {
    if (!REVENUECAT_API_KEY) {
      console.warn("[RevenueCat] Cannot purchase - API key not configured");
      return null;
    }

    console.log(`[RevenueCat] Starting purchase: ${pkg.identifier}`);
    
    const result = await Purchases.purchasePackage(pkg);
    const customerInfo = result.customerInfo || result;
    
    console.log("[RevenueCat] ✅ Purchase successful");
    
    return customerInfo as CustomerInfo;
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
 * Restore purchases from App Store / Google Play
 * Call this when user upgrades device or logs in on new device
 * @returns Customer info with restored purchases
 */
export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    if (!REVENUECAT_API_KEY) {
      console.warn("[RevenueCat] Cannot restore - API key not configured");
      return null;
    }

    console.log("[RevenueCat] Restoring purchases...");
    
    const customerInfo = await Purchases.restorePurchases();
    
    console.log("[RevenueCat] ✅ Purchases restored");
    console.log("[RevenueCat] Active subscriptions:", customerInfo.activeSubscriptions);
    
    return customerInfo;
  } catch (error) {
    console.error("[RevenueCat] Failed to restore purchases:", error);
    return null;
  }
}

/**
 * Check if user has active subscription
 * @param entitlementId - Entitlement to check (e.g., "pro")
 * @returns true if user has access to this entitlement
 */
export async function hasActiveSubscription(entitlementId: string): Promise<boolean> {
  try {
    const customerInfo = await getCustomerInfo();
    
    if (!customerInfo) {
      return false;
    }

    const hasEntitlement = customerInfo.entitlements.active[entitlementId] !== undefined;
    
    console.log(`[RevenueCat] Has "${entitlementId}" entitlement: ${hasEntitlement}`);
    
    return hasEntitlement;
  } catch (error) {
    console.error("[RevenueCat] Failed to check subscription:", error);
    return false;
  }
}

/**
 * Get active subscription plan
 * @returns "free" | "solo" | "professional"
 */
export async function getActivePlan(): Promise<"free" | "solo" | "professional"> {
  try {
    const customerInfo = await getCustomerInfo();
    
    if (!customerInfo) {
      return "free";
    }

    const activeEntitlements = Object.keys(customerInfo.entitlements.active);

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
 * @returns Expiry date or null if no active subscription
 */
export async function getSubscriptionExpiryDate(): Promise<Date | null> {
  try {
    const customerInfo = await getCustomerInfo();
    
    if (!customerInfo || !customerInfo.entitlements.active) {
      return null;
    }

    // Get the first active entitlement's expiry date
    const activeEntitlements = Object.values(customerInfo.entitlements.active);
    
    if (activeEntitlements.length === 0) {
      return null;
    }

    const firstEntitlement = activeEntitlements[0];
    
    // RevenueCat returns expirationDate as ISO string
    if (firstEntitlement.expirationDate) {
      return new Date(firstEntitlement.expirationDate);
    }

    return null;
  } catch (error) {
    console.error("[RevenueCat] Failed to get expiry date:", error);
    return null;
  }
}

/**
 * Set up listener for subscription changes
 * Useful for responding to subscription events
 */
export function setupPurchaseUpdateListener(
  onCustomerInfoUpdate: (customerInfo: CustomerInfo) => void
): void {
  try {
    if (!REVENUECAT_API_KEY) return;

    Purchases.addCustomerInfoUpdateListener((customerInfo) => {
      console.log("[RevenueCat] Customer info updated");
      onCustomerInfoUpdate(customerInfo);
    });

    console.log("[RevenueCat] ✅ Purchase listener set up");
  } catch (error) {
    console.error("[RevenueCat] Failed to set up listener:", error);
  }
}

/**
 * Remove purchase listener when cleaning up
 */
export function removePurchaseUpdateListener(): void {
  try {
    // RevenueCat SDK clears all listeners when called
    Purchases.removeCustomerInfoUpdateListener(() => {});
    console.log("[RevenueCat] ✅ Purchase listener removed");
  } catch (error) {
    console.error("[RevenueCat] Failed to remove listener:", error);
  }
}

/**
 * Get AppsFlyer attribution (optional)
 */
export async function setupAttribution(appsflyerId?: string): Promise<void> {
  try {
    if (!appsflyerId) return;
    
    await Purchases.setAdjustID(appsflyerId);
    console.log("[RevenueCat] ✅ Attribution set");
  } catch (error) {
    console.error("[RevenueCat] Failed to set attribution:", error);
  }
}
