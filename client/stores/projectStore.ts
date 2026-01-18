import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";

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
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],

      addProject: (projectData) => {
        const project: Project = {
          ...projectData,
          id: uuidv4(),
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
        set((state) => ({
          projects: state.projects.filter((proj) => proj.id !== id),
        }));
      },

      getProject: (id) => {
        return get().projects.find((proj) => proj.id === id);
      },
    }),
    {
      name: "tellbill-projects",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
