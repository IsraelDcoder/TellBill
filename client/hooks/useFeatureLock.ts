import { useSubscriptionStore } from "@/stores/subscriptionStore";

export type Plan = "free" | "solo" | "team" | "enterprise";
export type Feature = "projects" | "team_members" | "inventory_management" | "advanced_features";

// Define which plans have access to which features
const FEATURE_ACCESS: Record<Feature, Plan[]> = {
  projects: ["solo", "team", "enterprise"], // Free users: limited to viewing only
  team_members: ["team", "enterprise"], // Only team and enterprise
  inventory_management: ["solo", "team", "enterprise"], // Free users cannot access
  advanced_features: ["enterprise"], // Only enterprise
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
  const planHierarchy: Plan[] = ["free", "solo", "team", "enterprise"];
  const requiredIndex = planHierarchy.findIndex((p) =>
    allowedPlans.includes(p)
  );
  const requiredPlan = (planHierarchy[requiredIndex] || "solo") as Plan;

  let reason = "";
  if (feature === "projects") {
    reason = "Projects feature is available in Solo plan and above";
  } else if (feature === "team_members") {
    reason = "Team management is available in Team plan and above";
  } else if (feature === "inventory_management") {
    reason = "Inventory management is available in Solo plan and above";
  } else if (feature === "advanced_features") {
    reason = "Advanced features are available in Enterprise plan";
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
