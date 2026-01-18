import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "worker";
  invoicesCreated: number;
  revenue: number;
}

interface TeamStore {
  members: TeamMember[];
  addMember: (member: Omit<TeamMember, "id">) => TeamMember;
  updateMember: (id: string, updates: Partial<TeamMember>) => void;
  removeMember: (id: string) => void;
  getMember: (id: string) => TeamMember | undefined;
}

export const useTeamStore = create<TeamStore>()(
  persist(
    (set, get) => ({
      members: [
        {
          id: "admin-1",
          name: "John Doe",
          email: "john@acmecontractors.com",
          role: "admin",
          invoicesCreated: 47,
          revenue: 32000,
        },
      ],

      addMember: (memberData) => {
        const member: TeamMember = {
          ...memberData,
          id: uuidv4(),
        };
        set((state) => ({
          members: [...state.members, member],
        }));
        return member;
      },

      updateMember: (id, updates) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }));
      },

      removeMember: (id) => {
        set((state) => ({
          members: state.members.filter((m) => m.id !== id),
        }));
      },

      getMember: (id) => {
        return get().members.find((m) => m.id === id);
      },
    }),
    {
      name: "tellbill-team",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
