import { useEffect } from "react";
import { useSubscriptionStore, Entitlement } from "@/stores/subscriptionStore";

export interface RouteGuardOptions {
  requiredEntitlement: Entitlement | Entitlement[];
  screenName: string;
  message?: string;
}

export function useSubscriptionGuard(
  navigation: any,
  options: RouteGuardOptions
) {
  const { userEntitlement } = useSubscriptionStore();

  useEffect(() => {
    const required = Array.isArray(options.requiredEntitlement)
      ? options.requiredEntitlement
      : [options.requiredEntitlement];

    // Check if user has required entitlement
    if (!required.includes(userEntitlement)) {
      // Navigate to pricing screen with message
      navigation.navigate("Pricing", {
        returnTo: options.screenName,
        message: options.message || `Upgrade your plan to access ${options.screenName}.`,
      });
    }
  }, [userEntitlement, navigation, options]);
}

/**
 * Hook to check if user has access to a feature
 * Usage: const hasAccess = useHasAccess(['professional']);
 */
export function useHasAccess(entitlements: Entitlement | Entitlement[]): boolean {
  const { userEntitlement } = useSubscriptionStore();
  const required = Array.isArray(entitlements) ? entitlements : [entitlements];
  return required.includes(userEntitlement);
}

/**
 * Hook to get the current subscription status
 */
export function useSubscriptionStatus() {
  const { userEntitlement, subscription, isLoading } = useSubscriptionStore();
  
  return {
    entitlement: userEntitlement,
    subscription,
    isLoading,
    isFree: userEntitlement === "none",
    isSolo: userEntitlement === "solo",
    isProfessional: userEntitlement === "professional",

    isPaid: userEntitlement !== "none",
  };
}
