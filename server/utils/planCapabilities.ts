/**
 * 🚨 PLAN CAPABILITIES - SINGLE SOURCE OF TRUTH
 * 
 * This file defines what features are available in each plan.
 * All backend gating decisions reference this file.
 * Frontend reads capabilities and prevents UX access (backend enforces).
 */

export type Plan = "free" | "solo" | "professional";

export type Capability =
  | "voice_recording"
  | "invoice_creation"
  | "project_management"
  | "receipt_scanning"
  | "scope_proof"
  | "client_approvals"
  | "photo_proof"
  | "approval_reminders"
  | "analytics"
  | "api_access"
  | "custom_branding"
  | "dedicated_support";

export interface PlanCapabilities {
  // Limits (numeric or Infinity)
  voiceRecordingsMonthly: number;
  invoicesMonthly: number;
  projectsPerMonth: number;

  // Features (boolean)
  projectManagement: boolean;
  receiptScanning: boolean;
  scopeProof: boolean;
  clientApprovals: boolean;
  photoProof: boolean;
  approvalReminders: boolean;
  advancedAnalytics: boolean;
  apiAccess: boolean;
  customBranding: boolean;
  dedicatedSupport: boolean;
}

/**
 * MASTER CAPABILITY MAP
 * 
 * This is THE definitive source. Every gating decision references this.
 * If a feature isn't listed here → it's not available on that plan.
 */
export const PLAN_CAPABILITIES: Record<Plan, PlanCapabilities> = {
  free: {
    // Hard limits for free tier
    voiceRecordingsMonthly: 3,
    invoicesMonthly: 3,
    projectsPerMonth: 0,

    // Features
    projectManagement: false,
    receiptScanning: false,
    scopeProof: false,
    clientApprovals: false,
    photoProof: false,
    approvalReminders: false,
    advancedAnalytics: false,
    apiAccess: false,
    customBranding: false,
    dedicatedSupport: false,
  },

  solo: {
    // Unlimited for paid tiers
    voiceRecordingsMonthly: Infinity,
    invoicesMonthly: Infinity,
    projectsPerMonth: Infinity,

    // Solo features
    projectManagement: true,
    receiptScanning: true,
    scopeProof: false, // ❌ Locked to Professional+
    clientApprovals: false, // ❌ Locked to Professional+
    photoProof: false,
    approvalReminders: false,
    advancedAnalytics: false,
    apiAccess: false,
    customBranding: false,
    dedicatedSupport: false,
  },

  professional: {
    voiceRecordingsMonthly: Infinity,
    invoicesMonthly: Infinity,
    projectsPerMonth: Infinity,

    // Professional = Solo + Scope Proof features
    projectManagement: true,
    receiptScanning: true,
    scopeProof: true, // ✅ ANCHOR FEATURE
    clientApprovals: true, // ✅ ANCHOR FEATURE
    photoProof: true,
    approvalReminders: true,
    advancedAnalytics: false,
    apiAccess: false,
    customBranding: false,
    dedicatedSupport: false,
  },
};

/**
 * Check if a plan has a capability
 */
export function hasCapability(plan: Plan, capability: Capability): boolean {
  const capabilities = PLAN_CAPABILITIES[plan];

  switch (capability) {
    case "project_management":
      return capabilities.projectManagement;
    case "receipt_scanning":
      return capabilities.receiptScanning;
    case "scope_proof":
      return capabilities.scopeProof;
    case "client_approvals":
      return capabilities.clientApprovals;
    case "photo_proof":
      return capabilities.photoProof;
    case "approval_reminders":
      return capabilities.approvalReminders;
    case "analytics":
      return capabilities.advancedAnalytics;
    case "api_access":
      return capabilities.apiAccess;
    case "custom_branding":
      return capabilities.customBranding;
    case "dedicated_support":
      return capabilities.dedicatedSupport;
    case "voice_recording":
    case "invoice_creation":
      return true; // All plans have these
    default:
      return false;
  }
}

/**
 * Get the minimum required plan for a capability
 */
export function getMinimumPlanFor(capability: Capability): Plan {
  const plans: Plan[] = ["free", "solo", "professional"];

  for (const plan of plans) {
    if (hasCapability(plan, capability)) {
      return plan;
    }
  }

  // Fallback: most features require professional
  return "professional";
}

/**
 * Check usage limit (for free tier)
 */
export function checkUsageLimit(
  plan: Plan,
  metric: "voiceRecordings" | "invoices" | "projects",
  currentUsage: number
): { allowed: boolean; remaining: number } {
  const capabilities = PLAN_CAPABILITIES[plan];

  let limit: number;
  switch (metric) {
    case "voiceRecordings":
      limit = capabilities.voiceRecordingsMonthly;
      break;
    case "invoices":
      limit = capabilities.invoicesMonthly;
      break;
    case "projects":
      limit = capabilities.projectsPerMonth;
      break;
  }

  return {
    allowed: currentUsage < limit,
    remaining: Math.max(0, limit - currentUsage),
  };
}
