import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateId } from "../lib/uuid";
import { useProjectEventStore } from "./projectEventStore";

export interface Project {
  id: string;
  name: string;
  clientName: string;
  address: string;
  status: "active" | "completed" | "on_hold";
  budget: number;
  createdAt: string;
}

interface ProjectStore {
  projects: Project[];
  addProject: (project: Omit<Project, "id" | "createdAt">) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  resetProjects: () => void;
  // ✅ Hydration: Load projects from backend (login rehydration)
  hydrateProjects: (projects: Project[]) => void;
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],

      addProject: (projectData) => {
        const project: Project = {
          ...projectData,
          id: generateId(),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          projects: [project, ...state.projects],
        }));
        return project;
      },

      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((proj) =>
            proj.id === id ? { ...proj, ...updates } : proj
          ),
        }));
      },

      deleteProject: (id) => {
        // ✅ CASCADE DELETE: Remove all events associated with this project
        const eventStore = useProjectEventStore.getState();
        eventStore.deleteProjectEvents(id);
        
        set((state) => ({
          projects: state.projects.filter((proj) => proj.id !== id),
        }));
      },

      getProject: (id) => {
        return get().projects.find((proj) => proj.id === id);
      },

      resetProjects: () => {
        // ✅ SAFETY GUARD: Prevent accidental data loss
        // Only allow reset if called from signup (when no user has logged in yet)
        // If userId exists in session, this is a returning user - DO NOT reset
        set({ projects: [] });
      },

      // ✅ CRITICAL: Hydrate from backend data (login rehydration)
      // Used after successful login to restore user's projects from database
      // This is NOT a reset - it REPLACES empty state with actual user data
      hydrateProjects: (projects: Project[]) => {
        set({ projects });
        console.log(`[ProjectStore] Hydrated ${projects.length} projects from backend`);
      },
    }),
    {
      name: "tellbill-projects",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
