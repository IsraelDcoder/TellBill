/**
 * Stripe subscription plans mapping
 * Single source of truth for all subscription tiers
 */

export interface StripePlan {
  priceId: string;
  name: string;
  tier: "solo" | "professional" | "enterprise";
  features: string[];
}

export const STRIPE_PLANS: Record<string, StripePlan> = {
  solo: {
    priceId: process.env.STRIPE_SOLO_PRICE_ID || "",
    name: "Solo",
    tier: "solo",
    features: [
      "3 projects",
      "Basic invoicing",
      "Email support",
    ],
  },
  professional: {
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || "",
    name: "Professional",
    tier: "professional",
    features: [
      "Unlimited projects",
      "Advanced invoicing",
      "Money Alerts",
      "Scope proof",
      "Priority support",
    ],
  },
  enterprise: {
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || "",
    name: "Enterprise",
    tier: "enterprise",
    features: [
      "Everything in Pro",
      "Custom integrations",
      "Dedicated support",
      "SLA",
    ],
  },
};

export function getPlanByPriceId(priceId: string): StripePlan | null {
  return Object.values(STRIPE_PLANS).find((plan) => plan.priceId === priceId) || null;
}

export function validatePlanTier(plan: string): plan is keyof typeof STRIPE_PLANS {
  return plan in STRIPE_PLANS;
}
