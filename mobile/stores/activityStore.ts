import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Activity {
  id: string;
  userId: string;
  userName: string; // Display name of user who performed action
  action: string; // "created_invoice", "sent_invoice", "approved_invoice", etc.
  resourceType: string; // "invoice", "project", etc.
  resourceId: string; // Invoice ID, project ID, etc.
  resourceName?: string; // Invoice number, project name, etc.
  details?: Record<string, any>; // Additional metadata
  timestamp: string; // ISO timestamp
}

interface ActivityStore {
  activities: Activity[];
  
  // Add a new activity log entry
  addActivity: (activity: Omit<Activity, "id" | "timestamp">) => Activity;
  
  // Get activities for a specific resource
  getResourceActivities: (resourceId: string) => Activity[];
  
  // Get recent activities (last N)
  getRecentActivities: (limit?: number) => Activity[];
  
  // Get activities by user
  getUserActivities: (userId: string) => Activity[];
  
  // Clear activities (on logout)
  clearActivities: () => void;
  
  // Hydrate from backend
  hydrateActivities: (activities: Activity[]) => void;
}

export const useActivityStore = create<ActivityStore>()(
  persist(
    (set, get) => ({
      activities: [],

      addActivity: (activityData) => {
        const activity: Activity = {
          ...activityData,
          id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date().toISOString(),
        };
        set((state) => ({
          activities: [activity, ...state.activities],
        }));
        return activity;
      },

      getResourceActivities: (resourceId: string) => {
        return get().activities.filter((a) => a.resourceId === resourceId);
      },

      getRecentActivities: (limit = 50) => {
        return get().activities.slice(0, limit);
      },

      getUserActivities: (userId: string) => {
        return get().activities.filter((a) => a.userId === userId);
      },

      clearActivities: () => {
        set({ activities: [] });
      },

      hydrateActivities: (activities: Activity[]) => {
        set({ activities });
        console.log(`[ActivityStore] Hydrated ${activities.length} activities from backend`);
      },
    }),
    {
      name: "tellbill-activities",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
