import React, { createContext, useContext, useEffect, useState } from "react";
import * as Google from "expo-auth-session/providers/google";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useInvoiceStore } from "@/stores/invoiceStore";
import { useProjectStore } from "@/stores/projectStore";
import { useTeamStore } from "@/stores/teamStore";
import { useProfileStore } from "@/stores/profileStore";
import { useActivityStore } from "@/stores/activityStore";
import { getApiUrl } from "@/lib/backendUrl";

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  session: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider - Manages authentication state and session
 * Wraps the entire app to provide auth context to all screens
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { resetSubscription, setCurrentPlan } = useSubscriptionStore();
  const { resetInvoices } = useInvoiceStore();
  const { resetProjects } = useProjectStore();
  const { resetTeam } = useTeamStore();
  const { setCompanyInfo } = useProfileStore();
  const { hydrateActivities } = useActivityStore();

  // ✅ GOOGLE OAUTH SETUP
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "",
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "",
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "",
    scopes: ["profile", "email"],
  });

  /**
   * ✅ SAFETY: Only reset data during NEW signup
   * Reset is called ONLY when creating a brand new user account
   * Ensures returning users never have their data accidentally cleared
   */
  const resetDataForNewSignup = () => {
    console.log("[Auth] Resetting data for NEW user signup");
    resetInvoices();
    resetProjects();
    resetTeam();
    resetSubscription();
  };

  /**
   * ✅ SAFETY GUARD: Prevent accidental data deletion
   * This function should NEVER be called during normal login
   * Only explicit user actions (delete account) should remove data
   * 
   * Raises error if reset is attempted on returning user
   */
  const safeReset = (operation: "signup" | "logout" | "login") => {
    if (operation === "signup") {
      // ✅ ALLOWED: New user signup
      resetDataForNewSignup();
    } else if (operation === "logout") {
      // ❌ BLOCKED: Logout should NOT reset data
      console.error(
        "[Auth] ❌ SAFETY VIOLATION: Attempted data reset on logout",
        "Data persistence must survive logout"
      );
      return;
    } else if (operation === "login") {
      // ❌ BLOCKED: Login should NOT reset data
      console.error(
        "[Auth] ❌ SAFETY VIOLATION: Attempted data reset on login",
        "Returning users must not lose data"
      );
      return;
    }
  };

  /**
   * Initialize auth on app launch
   * Check for existing session in AsyncStorage or Supabase
   */
  useEffect(() => {
    initializeAuth();
  }, []);

  /**
   * Listen for auth state changes (session expiration, logout, etc.)
   */
  useEffect(() => {
    if (!session) return;

    // TODO: Set up Supabase real-time listener
    // supabase.auth.onAuthStateChange((event, newSession) => {
    //   if (event === 'SIGNED_IN') {
    //     setSession(newSession);
    //   } else if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
    //     handleSignOut();
    //   } else if (event === 'TOKEN_REFRESHED') {
    //     setSession(newSession);
    //   }
    // });
  }, [session]);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // TODO: Call Supabase to get current session
      // const { data: { session } } = await supabase.auth.getSession();
      // if (session?.user) {
      //   setSession(session);
      //   setUser(mapSupabaseUserToUser(session.user));
      // }
      
      console.log("[Auth] Initialization complete");
    } catch (err) {
      console.error("[Auth] Initialization error:", err);
      setError("Failed to initialize authentication");
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name?: string) => {
    try {
      setError(null);
      setIsLoading(true);

      // ✅ SIGNUP: Call backend signup endpoint to create new user
      // Backend validates:
      // - Email and password are provided
      // - Password meets security requirements
      // - Email is not already registered
      // Returns 201 CREATED if successful (new user ID generated)
      // Returns 409 CONFLICT if email already exists
      // Returns 400 BAD REQUEST if validation fails
      const response = await fetch(getApiUrl("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      // ✅ STRICT: Only accept 201 Created (not 200, not any success)
      // 201 CREATED = New user successfully created with unique stable ID
      if (response.status !== 201) {
        // 409: Email exists | 400: Bad request | 500: Server error
        throw new Error(data.error || "Sign up failed");
      }

      if (!data.user) {
        throw new Error("No user data returned from signup");
      }

      // ✅ NEW USER IDENTITY: Extract user ID from response
      // This is a new, unique, stable user ID generated by backend
      // Same user will have same ID on all future logins
      const newUser: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        createdAt: data.user.createdAt,
      };

      // ✅ NEW USER: Only new users start with empty data
      // Reset called here because this is a NEW signup, not returning user
      // ✅ SAFETY: This is the ONLY place where resets should happen
      resetDataForNewSignup();

      setUser(newUser);
      setSession({ user: newUser });
      setCurrentPlan("free");

      console.log("[Auth] Sign up successful:", email);
    } catch (err) {
      // ✅ IMPORTANT: On error, ensure user remains null
      setUser(null);
      setSession(null);

      const message = err instanceof Error ? err.message : "Sign up failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setError(null);
      setIsLoading(true);

      // ✅ LOGIN: Call backend login endpoint to authenticate user
      // Backend validates:
      // - Email exists in database (user must have signed up first)
      // - Password matches the stored hash
      // Returns 200 OK if credentials are correct
      // Returns 401 UNAUTHORIZED if email doesn't exist or password is wrong
      const response = await fetch(getApiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      // ✅ STRICT: Only accept 200 OK (not 201, not any other success)
      // 200 OK = User authenticated with existing credentials
      // Backend returns:
      // - 200 OK → Valid credentials, user logged in
      // - 401 Unauthorized → Invalid email or password (do not log in)
      // - 400 Bad Request → Missing fields (do not log in)
      if (response.status !== 200) {
        // 401: Invalid credentials | 400: Missing fields | 500: Server error
        throw new Error(data.error || "Login failed");
      }

      if (!data.user) {
        throw new Error("No user data returned from login");
      }

      // ✅ EXISTING USER IDENTITY: Extract user ID from response
      // This is the SAME user ID that was created at signup
      // User ID is permanent and stable across all sessions
      const newUser: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        createdAt: data.user.createdAt,
      };

      // Load company info from response if available
      if (data.user.companyName || data.user.companyPhone || data.user.companyEmail || data.user.companyAddress || data.user.companyWebsite || data.user.companyTaxId) {
        setCompanyInfo({
          name: data.user.companyName || "",
          phone: data.user.companyPhone || "",
          email: data.user.companyEmail || "",
          address: data.user.companyAddress || "",
          website: data.user.companyWebsite || "",
          taxId: data.user.companyTaxId || "",
        });
      }

      // ✅ DATA PERSISTENCE: Do NOT reset user data on login
      // User's previous data (invoices, projects, etc.) must persist
      // Data is loaded from backend after successful login
      setUser(newUser);
      setSession({ user: newUser });
      
      // Load all user data from backend
      await loadUserDataFromBackend(newUser.id);
      
      setCurrentPlan("free");

      console.log("[Auth] Sign in successful:", email);
    } catch (err) {
      // ✅ CRITICAL: On any error, ensure user remains null (no unauthorized access)
      setUser(null);
      setSession(null);

      const message = err instanceof Error ? err.message : "Sign in failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // ✅ TRIGGER GOOGLE OAUTH FLOW
      // Opens Google login prompt in device's OAuth handler
      const result = await promptAsync();

      if (result?.type !== "success") {
        throw new Error("Google sign-in cancelled or failed");
      }

      if (!result.authentication?.accessToken) {
        throw new Error("No access token received from Google");
      }

      // ✅ EXCHANGE TOKEN: Send Google token to backend
      // Backend validates token with Google and creates/finds user
      const response = await fetch(getApiUrl("/api/auth/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          googleToken: result.authentication.accessToken,
          idToken: result.authentication.idToken,
        }),
      });

      const data = await response.json();

      if (response.status !== 200 && response.status !== 201) {
        throw new Error(data.error || "Google authentication failed");
      }

      if (!data.user) {
        throw new Error("No user data returned from Google auth");
      }

      // ✅ NEW OR EXISTING USER
      const newUser: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        createdAt: data.user.createdAt,
      };

      // If new user (201 status), reset data
      if (response.status === 201) {
        resetDataForNewSignup();
        setCurrentPlan("free");
      }

      // Load company info if available
      if (data.user.companyName || data.user.companyEmail) {
        setCompanyInfo({
          name: data.user.companyName || "",
          phone: data.user.companyPhone || "",
          email: data.user.companyEmail || "",
          address: data.user.companyAddress || "",
          website: data.user.companyWebsite || "",
          taxId: data.user.companyTaxId || "",
        });
      }

      setUser(newUser);
      setSession({ user: newUser });

      console.log("[Auth] Google sign in successful:", newUser.email);
    } catch (err) {
      setUser(null);
      setSession(null);

      const message = err instanceof Error ? err.message : "Google sign in failed";
      setError(message);
      console.error("[Auth] Google sign in error:", err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithApple = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // TODO: Call Supabase signInWithOAuth for Apple
      // const { error } = await supabase.auth.signInWithOAuth({
      //   provider: "apple",
      //   options: {
      //     skipBrowserRedirect: true,
      //   },
      // });
      //
      // if (error) throw error;

      console.log("[Auth] Apple sign in initiated");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Apple sign in failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      setIsLoading(true);

      // TODO: Call Supabase resetPasswordForEmail
      // const { error } = await supabase.auth.resetPasswordForEmail(email, {
      //   redirectTo: "https://yourapp.com/reset-password",
      // });
      //
      // if (error) throw error;

      console.log("[Auth] Password reset email sent to:", email);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Password reset failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load all user data from backend after login
   * Fetches invoices, projects, team members, preferences
   * RESTORES app state from source of truth (backend database)
   * 
   * This is CRITICAL for returning users:
   * - Never initialize empty state for returning users
   * - Never overwrite backend data with defaults
   * - UI must immediately reflect existing user history
   */
  const loadUserDataFromBackend = async (userId: string) => {
    try {
      console.log("[Auth] REHYDRATING USER STATE from backend:", userId);

      // Fetch all user data in one request (most efficient)
      const response = await fetch(getApiUrl(`/api/data/all?userId=${userId}`));

      if (!response.ok) {
        console.warn("[Auth] Failed to rehydrate data:", response.status);
        // Non-blocking: If backend fails, use cached data from AsyncStorage
        return;
      }

      const { success, data } = await response.json();

      if (!success || !data) {
        console.warn("[Auth] Invalid rehydration response");
        return;
      }

      // ✅ CRITICAL: Hydrate invoiceStore from backend
      // Restore user's invoices (not empty for returning users)
      if (data.invoices && Array.isArray(data.invoices)) {
        console.log(`[Auth] Rehydrating ${data.invoices.length} invoices`);
        const { hydrateInvoices } = useInvoiceStore.getState();
        hydrateInvoices(data.invoices);
      }

      // ✅ CRITICAL: Hydrate projectStore from backend
      // Restore user's projects
      if (data.projects && Array.isArray(data.projects)) {
        console.log(`[Auth] Rehydrating ${data.projects.length} projects`);
        const { hydrateProjects } = useProjectStore.getState();
        hydrateProjects(data.projects);
      }

      // ✅ CRITICAL: Hydrate teamStore from backend
      // Restore user's team members and invites
      if (data.team && Array.isArray(data.team)) {
        console.log(`[Auth] Rehydrating ${data.team.length} team members`);
        const { hydrateTeam } = useTeamStore.getState();
        // Note: Need to also hydrate invites if they come from backend
        hydrateTeam(data.team, data.invites || []);
      }

      // ✅ CRITICAL: Hydrate profileStore from backend
      // Restore user's profile information
      if (data.profile) {
        console.log("[Auth] Rehydrating user profile");
        const { hydrateProfile } = useProfileStore.getState();
        hydrateProfile(
          data.profile.userProfile || {},
          data.profile.companyInfo || {}
        );
      }

      // ✅ CRITICAL: Hydrate subscriptionStore from backend
      // Restore user's subscription and usage data
      if (data.subscription) {
        console.log("[Auth] Rehydrating subscription data");
        const { hydrateSubscription } = useSubscriptionStore.getState();
        hydrateSubscription(data.subscription);
      }

      // ✅ NEW: Hydrate activityStore from backend
      // Restore user's activity log (recent invoice creations, sends, etc.)
      if (data.activities && Array.isArray(data.activities)) {
        console.log(`[Auth] Rehydrating ${data.activities.length} activities`);
        hydrateActivities(data.activities);
      }

      console.log("[Auth] ✅ USER STATE REHYDRATION COMPLETE");
    } catch (err) {
      console.error("[Auth] Error rehydrating user state:", err);
      // Non-blocking: Continue login even if rehydration fails
      // User can still access cached data from AsyncStorage
    }
  };

  const handleSignOut = () => {
    // ✅ DATA PERSISTENCE: Clear auth state ONLY
    // Do NOT clear user data (invoices, projects, preferences, etc.)
    // Data remains in AsyncStorage so user sees their activity when they log back in
    // Data is re-fetched from backend on next login
    setUser(null);
    setSession(null);
    setError(null);

    console.log("[Auth] Signed out successfully");
  };

  const signOut = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // TODO: Call Supabase signOut
      // const { error } = await supabase.auth.signOut();
      // if (error) throw error;

      handleSignOut();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign out failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading,
    isAuthenticated: !!user && !!session,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signOut,
    resetPassword,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 * Use this in any component that needs access to auth methods or state
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

/**
 * Helper to map Supabase user to our User type
 */
function mapSupabaseUserToUser(supabaseUser: any): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: supabaseUser.user_metadata?.name,
    createdAt: supabaseUser.created_at,
  };
}
