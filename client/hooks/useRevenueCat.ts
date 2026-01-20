import { useEffect } from "react";
import { Alert } from "react-native";
import { useSubscriptionStore } from "@/stores/subscriptionStore";

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

        // TODO: Initialize RevenueCat SDK
        // import Purchases from "react-native-purchases";
        
        // Configure RevenueCat
        // await Purchases.configure({
        //   apiKey: "appl_YOUR_REVENUCAT_API_KEY",
        // });

        if (userId) {
          // Set user ID for RevenueCat
          // await Purchases.logIn(userId);

          // Get current entitlements
          // const customerInfo = await Purchases.getCustomerInfo();
          
          // Check if user has any entitlements
          // const entitlements = Object.keys(customerInfo.entitlements.active || {});
          
          // Map entitlements to our tier system
          // if (entitlements.includes("enterprise_plan")) {
          //   setUserEntitlement("enterprise");
          // } else if (entitlements.includes("team_plan")) {
          //   setUserEntitlement("team");
          // } else if (entitlements.includes("solo_plan")) {
          //   setUserEntitlement("solo");
          // } else {
          //   setUserEntitlement("none");
          // }

          // For now, default to "none" (free tier)
          setUserEntitlement("none");
        }

        setIsLoading(false);
      } catch (error) {
        console.error("RevenueCat initialization error:", error);
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
    // TODO: Set up RevenueCat listener
    // import Purchases from "react-native-purchases";
    
    // const updateCustomerInfo = async (customerInfo: CustomerInfo) => {
    //   // Handle subscription updates
    //   const entitlements = Object.keys(customerInfo.entitlements.active || {});
      
    //   if (entitlements.includes("enterprise_plan")) {
    //     setUserEntitlement("enterprise");
    //   } else if (entitlements.includes("team_plan")) {
    //     setUserEntitlement("team");
    //   } else if (entitlements.includes("solo_plan")) {
    //     setUserEntitlement("solo");
    //   } else {
    //     setUserEntitlement("none");
    //   }

    //   // Update subscription details
    //   const product = customerInfo.allExpirationDates.find(
    //     (p) => entitlements.includes(p.productIdentifier)
    //   );
    //   if (product) {
    //     setSubscription({
    //       plan: entitlements[0] as any,
    //       status: "active",
    //       currentPeriodStart: product.latestPurchaseDate || "",
    //       currentPeriodEnd: product.expirationDate || "",
    //       isAnnual: product.productIdentifier.includes("annual"),
    //     });
    //   }
    // };

    // // Listen for customer info updates
    // Purchases.addCustomerInfoUpdateListener(updateCustomerInfo);

    // return () => {
    //   // Clean up listener
    // };
  }, [setUserEntitlement, setSubscription]);
}
