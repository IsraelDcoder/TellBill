import { useSubscriptionStore } from "@/stores/subscriptionStore";

export type Plan = "free" | "solo" | "professional";
export type Feature = "projects" | "inventory_management" | "scope_proof";

// Define which plans have access to which features
const FEATURE_ACCESS: Record<Feature, Plan[]> = {
  projects: ["solo", "professional"],
  inventory_management: ["solo", "professional"],
  scope_proof: ["professional"],
};

interface FeatureLockResult {
  isLocked: boolean;
  requiredPlan: Plan;
  reason: string;
}

export const useFeatureLock = (feature: Feature): FeatureLockResult => {
  const { currentPlan } = useSubscriptionStore();

  const allowedPlans = FEATURE_ACCESS[feature];
  const isLocked = !allowedPlans.includes(currentPlan as Plan);

  // Find the minimum required plan
  const planHierarchy: Plan[] = ["free", "solo", "professional"];
  const requiredIndex = planHierarchy.findIndex((p) =>
    allowedPlans.includes(p)
  );
  const requiredPlan = (planHierarchy[requiredIndex] || "solo") as Plan;

  let reason = "";
  if (feature === "projects") {
    reason = "Projects feature is available in Solo plan and above";
  } else if (feature === "inventory_management") {
    reason = "Inventory management is available in Solo plan and above";
  } else if (feature === "scope_proof") {
    reason = "Scope proof is available in Professional plan and above";
  }

  return {
    isLocked,
    requiredPlan,
    reason,
  };
};

export const useCanAccessFeature = (feature: Feature): boolean => {
  const { currentPlan } = useSubscriptionStore();
  const allowedPlans = FEATURE_ACCESS[feature];
  return allowedPlans.includes(currentPlan as Plan);
};
