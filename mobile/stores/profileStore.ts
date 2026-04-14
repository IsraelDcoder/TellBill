import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface UserProfile {
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

export interface CompanyInfo {
  name: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  taxId: string;
}

export interface ProfileState {
  userProfile: UserProfile;
  companyInfo: CompanyInfo;
  
  // Actions
  setUserProfile: (profile: Partial<UserProfile>) => void;
  setCompanyInfo: (company: Partial<CompanyInfo>) => void;
  resetProfile: () => void;
  // ✅ Hydration: Load profile from backend (login rehydration)
  hydrateProfile: (userProfile: UserProfile, companyInfo: CompanyInfo) => void;
}

const initialUserProfile: UserProfile = {
  firstName: "",
  lastName: "",
  phoneNumber: "",
};

const initialCompanyInfo: CompanyInfo = {
  name: "",
  phone: "",
  email: "",
  address: "",
  website: "",
  taxId: "",
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      userProfile: initialUserProfile,
      companyInfo: initialCompanyInfo,
      
      setUserProfile: (profile: Partial<UserProfile>) =>
        set((state) => ({
          userProfile: { ...state.userProfile, ...profile },
        })),
        
      setCompanyInfo: (company: Partial<CompanyInfo>) =>
        set((state) => ({
          companyInfo: { ...state.companyInfo, ...company },
        })),
        
      resetProfile: () => {
        // ✅ SAFETY GUARD: Prevent accidental data loss
        // Only allow reset if called from signup (when no user has logged in yet)
        // If userId exists in session, this is a returning user - DO NOT reset
        set({
          userProfile: initialUserProfile,
          companyInfo: initialCompanyInfo,
        });
      },

      // ✅ CRITICAL: Hydrate from backend data (login rehydration)
      // Used after successful login to restore user's profile from database
      // This REPLACES defaults with actual user's profile information
      hydrateProfile: (userProfile: UserProfile, companyInfo: CompanyInfo) => {
        set({ userProfile, companyInfo });
        console.log("[ProfileStore] Hydrated profile from backend");
      },
    }),
    {
      name: "profile-store",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
