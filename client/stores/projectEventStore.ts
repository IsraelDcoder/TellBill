import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ProjectEvent {
  eventId: string;
  projectId: string;
  eventType: "LABOR" | "MATERIAL" | "PROGRESS" | "ALERT" | "RECEIPT";
  timestamp: Date;
  data: {
    description?: string;
    labor?: { hours: number; ratePerHour: number; total: number };
    material?: { name: string; quantity: number; unitPrice: number; total: number };
    progress?: { status: string; location?: string };
    alert?: { alertType: string; severity: string; recommendedAction?: string };
  };
  createdAt: string;
}

interface ProjectEventStore {
  events: ProjectEvent[];

  // Add event to project
  addEvent: (projectId: string, event: Omit<ProjectEvent, "eventId" | "createdAt" | "projectId">) => ProjectEvent;

  // Get all events for a project
  getProjectEvents: (projectId: string) => ProjectEvent[];

  // Add multiple events at once (for batch operations)
  addEvents: (projectId: string, newEvents: Omit<ProjectEvent, "eventId" | "createdAt" | "projectId">[]) => ProjectEvent[];

  // Delete events for a project (when project is deleted)
  deleteProjectEvents: (projectId: string) => void;

  // Clear all events
  clearEvents: () => void;

  // Hydrate from backend
  hydrateEvents: (events: ProjectEvent[]) => void;
}

export const useProjectEventStore = create<ProjectEventStore>()(
  persist(
    (set, get) => ({
      events: [],

      addEvent: (projectId, eventData) => {
        const event: ProjectEvent = {
          ...eventData,
          projectId,
          eventId: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          events: [event, ...state.events],
        }));
        console.log(`[ProjectEventStore] Added event to project ${projectId}`);
        return event;
      },

      getProjectEvents: (projectId: string) => {
        const allEvents = get().events;
        return allEvents
          .filter((e) => e.projectId === projectId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      },

      addEvents: (projectId, newEvents) => {
        const addedEvents: ProjectEvent[] = [];
        newEvents.forEach((eventData) => {
          const event: ProjectEvent = {
            ...eventData,
            projectId,
            eventId: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
          };
          addedEvents.push(event);
        });

        set((state) => ({
          events: [...addedEvents, ...state.events],
        }));
        console.log(`[ProjectEventStore] Added ${addedEvents.length} events to project ${projectId}`);
        return addedEvents;
      },

      deleteProjectEvents: (projectId: string) => {
        set((state) => ({
          events: state.events.filter((e) => e.projectId !== projectId),
        }));
        console.log(`[ProjectEventStore] Deleted all events for project ${projectId}`);
      },

      clearEvents: () => {
        set({ events: [] });
      },

      hydrateEvents: (events: ProjectEvent[]) => {
        set({ events });
        console.log(`[ProjectEventStore] Hydrated ${events.length} events from backend`);
      },
    }),
    {
      name: "tellbill-project-events",
      storage: createJSONStorage(() => AsyncStorage),
      // ✅ CRITICAL: Persist timestamp as ISO string for JSON serialization
      partialize: (state) => ({
        events: state.events.map((e) => ({
          ...e,
          timestamp: typeof e.timestamp === 'string' ? e.timestamp : (e.timestamp as any).toISOString(),
        })),
      }),
    }
  )
);
