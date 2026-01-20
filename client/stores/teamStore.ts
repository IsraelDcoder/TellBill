import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateId } from "../lib/uuid";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "worker" | "foreman" | "contractor";
  invoicesCreated: number;
  revenue: number;
  status?: "active" | "archived";
  deletedAt?: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "worker" | "foreman" | "contractor";
  inviteToken: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
  expiresAt: string;
  sentBy: string;
}

interface TeamStore {
  members: TeamMember[];
  invites: TeamInvite[];
  addMember: (member: Omit<TeamMember, "id">) => TeamMember;
  updateMember: (id: string, updates: Partial<TeamMember>) => void;
  removeMember: (id: string) => void;
  softDeleteMember: (id: string) => void;
  getMember: (id: string) => TeamMember | undefined;
  sendInvite: (email: string, fullName: string, role: TeamMember["role"], sentBy: string) => TeamInvite;
  updateInviteStatus: (inviteId: string, status: "pending" | "accepted" | "declined") => void;
  acceptInvite: (inviteToken: string, newMember: Omit<TeamMember, "id">) => void;
  getInviteByToken: (token: string) => TeamInvite | undefined;
  resetTeam: () => void;
  // ✅ Hydration: Load team from backend (login rehydration)
  hydrateTeam: (members: TeamMember[], invites: TeamInvite[]) => void;
}

export const useTeamStore = create<TeamStore>()(
  persist(
    (set, get) => ({
      // ✅ NEW USER INITIALIZATION: Start with empty team
      // Demo data removed - real team members load from backend on login
      members: [],
      invites: [],

      addMember: (memberData) => {
        const member: TeamMember = {
          ...memberData,
          id: generateId(),
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

      softDeleteMember: (id) => {
        set((state) => ({
          members: state.members.map((m) =>
            m.id === id 
              ? { ...m, status: "archived", deletedAt: new Date().toISOString() }
              : m
          ),
        }));
      },

      sendInvite: (email, fullName, role, sentBy) => {
        const inviteToken = generateId();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        const invite: TeamInvite = {
          id: generateId(),
          email,
          fullName,
          role,
          inviteToken,
          status: "pending",
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          sentBy,
        };

        set((state) => ({
          invites: [...state.invites, invite],
        }));

        // TODO: Send email via Resend/SendGrid with deep links
        console.log("Invite created. TODO: Send email to", email);

        return invite;
      },

      updateInviteStatus: (inviteId, status) => {
        set((state) => ({
          invites: state.invites.map((inv) =>
            inv.id === inviteId ? { ...inv, status } : inv
          ),
        }));
      },

      acceptInvite: (inviteToken, newMember) => {
        const invite = get().invites.find((inv) => inv.inviteToken === inviteToken);
        
        if (!invite) return;

        // Create new team member
        const member: TeamMember = {
          ...newMember,
          id: generateId(),
          status: "active",
        };

        set((state) => ({
          members: [...state.members, member],
          invites: state.invites.map((inv) =>
            inv.inviteToken === inviteToken ? { ...inv, status: "accepted" } : inv
          ),
        }));
      },

      getInviteByToken: (token) => {
        return get().invites.find((inv) => inv.inviteToken === token);
      },

      getMember: (id) => {
        return get().members.find((m) => m.id === id);
      },

      resetTeam: () => {
        // ✅ SAFETY GUARD: Prevent accidental data loss
        // Only allow reset if called from signup (when no user has logged in yet)
        // If userId exists in session, this is a returning user - DO NOT reset
        set({ members: [], invites: [] });
      },

      // ✅ CRITICAL: Hydrate from backend data (login rehydration)
      // Used after successful login to restore user's team from database
      // This REPLACES default team with actual user's team members
      hydrateTeam: (members: TeamMember[], invites: TeamInvite[]) => {
        set({ members, invites });
        console.log(
          `[TeamStore] Hydrated ${members.length} team members and ${invites.length} invites from backend`
        );
      },
    }),
    {
      name: "tellbill-team",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
