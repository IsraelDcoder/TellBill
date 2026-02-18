import { useEffect, useState } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import Purchases, { CustomerInfo } from "react-native-purchases";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/backendUrl";

/**
 * ⚠️ FIX: Ensure RevenueCat SDK is initialized with retry logic
 * The native plugin initialization is asynchronous, so we need to wait for it
 */
let sdkInitialized = false;
let sdkInitializationPromise: Promise<void> | null = null;

async function ensureRevenueCatInitialized(): Promise<void> {
  if (sdkInitialized) {
    return;
  }

  if (sdkInitializationPromise) {
    return sdkInitializationPromise;
  }

  sdkInitializationPromise = (async () => {
    let retries = 0;
    const maxRetries = 10;
    const delayMs = 500;

    while (retries < maxRetries) {
      try {
        // Try to check if SDK is ready by calling a simple method
        await Purchases.getCustomerInfo();
        console.log(`[RevenueCat] ✅ SDK initialized successfully (attempt ${retries + 1})`);
        sdkInitialized = true;
        return;
      } catch (error) {
        retries++;
        if (retries < maxRetries) {
          console.log(`[RevenueCat] ⏳ SDK not ready, retrying... (attempt ${retries}/${maxRetries})`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          console.error(`[RevenueCat] ❌ Failed to initialize after ${maxRetries} attempts`, error);
          throw error;
        }
      }
    }
  })();

  await sdkInitializationPromise;
}

/**
 * Hook to initialize RevenueCat and fetch subscription status
 * Should be called once in the App root
 */
export function useRevenueCatInitialization(userId?: string) {
  const { setUserEntitlement, setIsLoading, setSubscription } = useSubscriptionStore();

  useEffect(() => {
    const initializeRevenueCat = async () => {
      try {
        setIsLoading(true);

        // Ensure SDK is ready first
        await ensureRevenueCatInitialized();
        console.log("[RevenueCat] ✅ SDK is ready");

        if (userId) {
          // Link RevenueCat user to our TellBill user ID
          try {
            await Purchases.logIn(userId);
            console.log(`[RevenueCat] Logged in user: ${userId}`);
          } catch (loginError) {
            console.warn("[RevenueCat] Login error (non-critical):", loginError);
          }

          // Get customer info to check entitlements
          try {
            const customerInfo = await Purchases.getCustomerInfo();
            handleCustomerInfo(customerInfo, setUserEntitlement, setSubscription);
          } catch (customerError) {
            console.warn("[RevenueCat] Failed to get customer info:", customerError);
            // Default to free tier on error
            setUserEntitlement("none");
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error("[RevenueCat] Initialization error:", error);
        setIsLoading(false);
        // Silently fail and default to free tier
        setUserEntitlement("none");
      }
    };

    initializeRevenueCat();
  }, [userId, setUserEntitlement, setIsLoading, setSubscription]);
}

/**
 * Hook to listen for subscription changes
 * Should be called once in the App root
 */
export function useRevenueCatListener() {
  const { setUserEntitlement, setSubscription } = useSubscriptionStore();

  useEffect(() => {
    // Ensure SDK is ready before setting up listeners
    ensureRevenueCatInitialized()
      .then(() => {
        // Set up listener for customer info updates
        Purchases.addCustomerInfoUpdateListener((customerInfo: CustomerInfo) => {
          console.log("[RevenueCat] Customer info updated");
          handleCustomerInfo(customerInfo, setUserEntitlement, setSubscription);
        });
      })
      .catch((error) => {
        console.warn("[RevenueCat] Failed to set up listener:", error);
      });

    // Note: RevenueCat SDK doesn't require explicit unsubscribe for listeners
    return () => {
      // Cleanup if needed
    };
  }, [setUserEntitlement, setSubscription]);
}

/**
 * Hook to refresh user entitlements on app startup + when user authenticates
 * Syncs RevenueCat customer info with backend to update subscription status
 */
export function useEntitlementRefresh() {
  const { user, isAuthenticated } = useAuth();
  const { setUserEntitlement } = useSubscriptionStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.log("[Entitlement] Skipping refresh - not authenticated");
      return;
    }

    const syncEntitlementsWithBackend = async () => {
      try {
        setIsRefreshing(true);
        console.log("[Entitlement] Refreshing subscription for user:", user.id);

        // Ensure SDK is ready first
        await ensureRevenueCatInitialized();
        console.log("[Entitlement] ✅ SDK ready for entitlement check");

        // Get auth token
        const token = await AsyncStorage.getItem("authToken");
        if (!token) {
          console.warn("[Entitlement] No auth token found");
          return;
        }

        // Get current customer info from RevenueCat
        const customerInfo = await Purchases.getCustomerInfo();
        console.log("[Entitlement] Got RevenueCat customer info", {
          customerId: customerInfo.originalAppUserId,
          entitlements: Object.keys(customerInfo.entitlements.active || {}),
        });

        // Verify purchase with backend
        const response = await fetch(
          getApiUrl("/api/billing/restore-purchases"),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              revenuecatCustomerInfo: customerInfo,
            }),
          }
        );

        if (!response.ok) {
          console.warn("[Entitlement] Backend sync failed:", response.status);
          return;
        }

        const data = await response.json();
        console.log("[Entitlement] ✅ Backend sync success", {
          plan: data.plan,
          status: data.status,
        });

        // Update local state
        if (data.plan) {
          setUserEntitlement(data.plan);
          console.log(`[Entitlement] User entitlement updated: ${data.plan}`);
        }
      } catch (error) {
        console.warn("[Entitlement] Sync error:", error);
        // Silently fail - user can still access free features
      } finally {
        setIsRefreshing(false);
      }
    };

    syncEntitlementsWithBackend();
  }, [isAuthenticated, user?.id, setUserEntitlement]);
}

/**
 * Helper: Process customer info and extract entitlements
 */
function handleCustomerInfo(
  customerInfo: CustomerInfo,
  setUserEntitlement: (entitlement: any) => void,
  setSubscription: (subscription: any) => void
) {
  try {
    // Check active entitlements
    const activeEntitlements = customerInfo.entitlements.active || {};
    const entitlementIds = Object.keys(activeEntitlements);

    console.log("[RevenueCat] Active entitlements:", entitlementIds);

    // Map entitlements to our tier system (highest tier wins)
    let currentEntitlement: "none" | "solo" | "professional" | "enterprise" = "none";

    if (entitlementIds.includes("enterprise")) {
      currentEntitlement = "enterprise";
    } else if (entitlementIds.includes("professional")) {
      currentEntitlement = "professional";
    } else if (entitlementIds.includes("solo")) {
      currentEntitlement = "solo";
    }

    setUserEntitlement(currentEntitlement);
    console.log(`[RevenueCat] User entitlement: ${currentEntitlement}`);

    // Get subscription details if subscribed
    if (currentEntitlement !== "none") {
      // Try to extract subscription info from active entitlements
      const activeEntitlements = customerInfo.entitlements.active;
      
      if (activeEntitlements) {
        const entitlementKey = Object.keys(activeEntitlements)[0];
        if (entitlementKey) {
          const entitlement = activeEntitlements[entitlementKey];
          setSubscription({
            plan: currentEntitlement,
            status: "active",
            currentPeriodStart: new Date().toISOString(),
            currentPeriodEnd: new Date().toISOString(),
            isAnnual: entitlementKey.includes("annual"),
          });
        }
      }
    }
  } catch (error) {
    console.error("[RevenueCat] Failed to process customer info:", error);
  }
}
