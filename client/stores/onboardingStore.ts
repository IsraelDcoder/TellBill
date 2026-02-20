import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  currentStep: number;
  completedSteps: string[];
  lastViewedStep: number;
  onboardingStartedAt?: string;
  onboardingCompletedAt?: string;
}

interface OnboardingStore extends OnboardingState {
  startOnboarding: () => void;
  completeStep: (stepName: string) => void;
  skipOnboarding: () => void;
  setCurrentStep: (step: number) => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      currentStep: 0,
      completedSteps: [],
      lastViewedStep: 0,

      startOnboarding: () => {
        set((state) => ({
          ...state,
          hasCompletedOnboarding: false,
          currentStep: 0,
          completedSteps: [],
          onboardingStartedAt: new Date().toISOString(),
        }));
      },

      completeStep: (stepName: string) => {
        set((state) => {
          const completedSteps = [...state.completedSteps];
          if (!completedSteps.includes(stepName)) {
            completedSteps.push(stepName);
          }

          const isComplete = completedSteps.length >= 5; // Must complete all 5 steps

          return {
            ...state,
            completedSteps,
            hasCompletedOnboarding: isComplete,
            onboardingCompletedAt: isComplete ? new Date().toISOString() : state.onboardingCompletedAt,
          };
        });
      },

      skipOnboarding: () => {
        set({
          hasCompletedOnboarding: true,
          onboardingCompletedAt: new Date().toISOString(),
        });
      },

      setCurrentStep: (step: number) => {
        set((state) => ({
          ...state,
          currentStep: step,
          lastViewedStep: Math.max(state.lastViewedStep, step),
        }));
      },

      resetOnboarding: () => {
        set({
          hasCompletedOnboarding: false,
          currentStep: 0,
          completedSteps: [],
          lastViewedStep: 0,
          onboardingStartedAt: undefined,
          onboardingCompletedAt: undefined,
        });
      },
    }),
    {
      name: "onboarding-store",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
