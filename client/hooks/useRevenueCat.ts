import { useEffect } from "react";
import { Alert } from "react-native";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import Purchases, { CustomerInfo } from "react-native-purchases";
import { useAuth } from "@/context/AuthContext";

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

        // Configure RevenueCat with our API key
        // Note: API key is configured via app.json for Expo
        const isConfigured = await Purchases.isConfigured();
        
        if (!isConfigured) {
          // For Expo, RevenueCat is configured via app.json plugins
          // This initialization should happen automatically
          console.log("[RevenueCat] SDK configured via app.json");
        }

        if (userId) {
          // Link RevenueCat user to our TellBill user ID
          try {
            await Purchases.logIn(userId);
            console.log(`[RevenueCat] Logged in user: ${userId}`);
          } catch (loginError) {
            console.error("[RevenueCat] Login error:", loginError);
          }

          // Get customer info to check entitlements
          try {
            const customerInfo = await Purchases.getCustomerInfo();
            handleCustomerInfo(customerInfo, setUserEntitlement, setSubscription);
          } catch (customerError) {
            console.error("[RevenueCat] Failed to get customer info:", customerError);
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
    // Set up listener for customer info updates
    Purchases.addCustomerInfoUpdateListener((customerInfo: CustomerInfo) => {
      console.log("[RevenueCat] Customer info updated");
      handleCustomerInfo(customerInfo, setUserEntitlement, setSubscription);
    });

    // Note: RevenueCat SDK doesn't require explicit unsubscribe for listeners
    return () => {
      // Cleanup if needed
    };
  }, [setUserEntitlement, setSubscription]);
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
