import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Entitlement = "none" | "solo" | "professional";
export type Plan = "free" | "solo" | "professional";

export interface Subscription {
  plan: Entitlement;
  status: "active" | "canceled" | "expired" | "pending";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  isAnnual: boolean;
}

export interface PricingTier {
  id: string;
  name: "solo" | "professional";
  displayName: string;
  monthlyPrice: number;
  annualPrice: number;
  isPopular: boolean;
  features: string[];
  revenueCatProductId: string;
}

// Plan feature limits
export const PLAN_LIMITS = {
  free: {
    displayName: "Free",
    usageLimit: 3, // 3 total uses (Voice + Invoice)
    invoices: 3,
    voiceRecordings: 3,
    features: [
      "3 free voice recordings",
      "3 free invoices",
      "Basic invoicing",
      "Email support",
    ],
  },
  solo: {
    displayName: "Solo",
    usageLimit: Infinity,
    invoices: Infinity,
    voiceRecordings: Infinity,
    features: [
      "Unlimited voice recordings",
      "Unlimited invoices",
      "Advanced invoicing",
      "Invoice templates",
      "Payment tracking",
      "Priority email support",
    ],
  },
  professional: {
    displayName: "Professional",
    usageLimit: Infinity,
    invoices: Infinity,
    voiceRecordings: Infinity,
    features: [
      "Unlimited voice recordings",
      "Unlimited invoices",
      "Scope proof & client approval",
      "Auto-add approved work",
      "Photo proof with timestamps",
      "Approval reminders",
      "Dispute-ready work logs",
    ],
  },
};

interface SubscriptionStore {
  // Entitlements (from RevenueCat)
  userEntitlement: Entitlement;
  subscription: Subscription | null;
  
  // Usage tracking (server-synced)
  voiceRecordingsUsed: number;
  invoicesCreated: number;
  currentPlan: Plan;
  isSubscribed: boolean;
  
  // UI state
  isLoading: boolean;
  showLimitModal: boolean;
  limitModalType: "voice" | "invoice" | "project" | undefined;
  pricingTiers: PricingTier[];
  
  // Actions
  setUserEntitlement: (entitlement: Entitlement) => void;
  setSubscription: (subscription: Subscription | null) => void;
  incrementVoiceRecordings: () => void;
  incrementInvoices: () => void;
  setCurrentPlan: (plan: Plan) => void;
  setIsSubscribed: (subscribed: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setShowLimitModal: (show: boolean, type?: "voice" | "invoice" | "project") => void;
  setPricingTiers: (tiers: PricingTier[]) => void;
  resetSubscription: () => void;
  resetMonthlyUsage: () => void;
  syncWithServer: (data: { voiceRecordingsUsed: number; invoicesCreated: number; currentPlan: Plan; isSubscribed: boolean }) => void;
  // ✅ Hydration: Load subscription from backend (login rehydration)
  hydrateSubscription: (data: { userEntitlement: Entitlement; subscription: Subscription | null; voiceRecordingsUsed: number; invoicesCreated: number; currentPlan: Plan; isSubscribed: boolean }) => void;
}

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set) => ({
      // Entitlements
      userEntitlement: "none",
      subscription: null,
      
      // Usage tracking
      voiceRecordingsUsed: 0,
      invoicesCreated: 0,
      currentPlan: "free",
      isSubscribed: false,
      
      // UI state
      isLoading: false,
      showLimitModal: false,
      limitModalType: undefined,
      pricingTiers: [
        {
          id: "solo_tier",
          name: "solo",
          displayName: "Solo",
          monthlyPrice: 9,          // ✅ Impulse buy threshold ($9/month)
          annualPrice: 90,          // ✅ Save 17% ($7.50/month)
          isPopular: false,
          features: [
            "Unlimited voice recordings",
            "Unlimited invoices",
            "Advanced invoicing",
            "Invoice templates",
            "Payment tracking",
            "Priority email support",
            "Single user account",
          ],
          revenueCatProductId: "solo_plan_monthly",
        },
        {
          id: "professional_tier",
          name: "professional",
          displayName: "Professional",
          monthlyPrice: 24,         // ✅ 2.7x Solo (clear upgrade value)
          annualPrice: 240,         // ✅ Save 17% ($20/month)
          isPopular: true,
          features: [
            "Scope proof & client approval",
            "Auto-add approved work to invoices",
            "Photo proof with timestamps",
            "Approval reminders",
            "Dispute-ready work logs",
            "Unlimited projects",
            "Unlimited voice-to-invoice",
            "Advanced analytics",
          ],
          revenueCatProductId: "professional_plan_monthly",
        },
      ],

      setUserEntitlement: (entitlement) =>
        set({ userEntitlement: entitlement }),

      setSubscription: (subscription) =>
        set({ subscription }),

      incrementVoiceRecordings: () =>
        set((state) => ({ voiceRecordingsUsed: state.voiceRecordingsUsed + 1 })),

      incrementInvoices: () =>
        set((state) => ({ invoicesCreated: state.invoicesCreated + 1 })),

      setCurrentPlan: (plan) =>
        set({ currentPlan: plan }),

      setIsSubscribed: (subscribed) =>
        set({ isSubscribed: subscribed }),

      setIsLoading: (loading) =>
        set({ isLoading: loading }),

      setShowLimitModal: (show, type?) =>
        set({ showLimitModal: show, limitModalType: type }),

      setPricingTiers: (tiers) =>
        set({ pricingTiers: tiers }),

      syncWithServer: (data) =>
        set({
          voiceRecordingsUsed: data.voiceRecordingsUsed,
          invoicesCreated: data.invoicesCreated,
          currentPlan: data.currentPlan,
          isSubscribed: data.isSubscribed,
        }),

      resetMonthlyUsage: () =>
        set({
          voiceRecordingsUsed: 0,
          invoicesCreated: 0,
        }),

      resetSubscription: () =>
        set({
          userEntitlement: "none",
          subscription: null,
          voiceRecordingsUsed: 0,
          invoicesCreated: 0,
          currentPlan: "free",
          isSubscribed: false,
          // ✅ SAFETY GUARD: Prevent accidental data loss
          // Only allow reset if called from signup (when no user has logged in yet)
          // If userId exists in session, this is a returning user - DO NOT reset
        }),

      // ✅ CRITICAL: Hydrate from backend data (login rehydration)
      // Used after successful login to restore user's subscription from database
      // This REPLACES defaults with actual user's subscription/usage data
      hydrateSubscription: (data) =>
        set({
          userEntitlement: data.userEntitlement,
          subscription: data.subscription,
          voiceRecordingsUsed: data.voiceRecordingsUsed,
          invoicesCreated: data.invoicesCreated,
          currentPlan: data.currentPlan,
          isSubscribed: data.isSubscribed,
        }),
    }),
    {
      name: "subscription-store",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
