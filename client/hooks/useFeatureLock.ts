import { useSubscriptionStore } from "@/stores/subscriptionStore";

export type Plan = "free" | "solo" | "professional" | "enterprise";
export type Feature = "projects" | "team_members" | "inventory_management" | "scope_proof" | "advanced_features";

// Define which plans have access to which features
const FEATURE_ACCESS: Record<Feature, Plan[]> = {
  projects: ["solo", "professional", "enterprise"], // Free users: limited to viewing only
  team_members: ["professional", "enterprise"], // Only professional and enterprise
  inventory_management: ["solo", "professional", "enterprise"], // Free users cannot access
  scope_proof: ["professional", "enterprise"], // Only professional and enterprise (Scope Proof feature)
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
  const planHierarchy: Plan[] = ["free", "solo", "professional", "enterprise"];
  const requiredIndex = planHierarchy.findIndex((p) =>
    allowedPlans.includes(p)
  );
  const requiredPlan = (planHierarchy[requiredIndex] || "solo") as Plan;

  let reason = "";
  if (feature === "projects") {
    reason = "Projects feature is available in Solo plan and above";
  } else if (feature === "team_members") {
    reason = "Team management is available in Professional plan and above";
  } else if (feature === "inventory_management") {
    reason = "Inventory management is available in Solo plan and above";
  } else if (feature === "scope_proof") {
    reason = "Scope Proof is available in Professional plan and above";
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
