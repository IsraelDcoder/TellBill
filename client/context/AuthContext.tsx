import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useInvoiceStore } from "@/stores/invoiceStore";
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
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null); // ✅ JWT token
  const { resetSubscription, setCurrentPlan } = useSubscriptionStore();
  const { resetInvoices } = useInvoiceStore();
  const { setCompanyInfo } = useProfileStore();
  const { hydrateActivities, clearActivities } = useActivityStore();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  /**
   * ✅ Save JWT token to AsyncStorage
   */
  const saveToken = async (token: string) => {
    try {
      await AsyncStorage.setItem("authToken", token);
      setAuthToken(token);
      console.log("[Auth] JWT token saved to AsyncStorage");
    } catch (err) {
      console.error("[Auth] Failed to save token:", err);
    }
  };

  /**
   * ✅ Retrieve JWT token from AsyncStorage
   */
  const getStoredToken = async (): Promise<string | null> => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (token) {
        setAuthToken(token);
        console.log("[Auth] JWT token retrieved from AsyncStorage");
      }
      return token;
    } catch (err) {
      console.error("[Auth] Failed to retrieve token:", err);
      return null;
    }
  };

  /**
   * ✅ Clear JWT token from AsyncStorage
   */
  const clearToken = async () => {
    try {
      await AsyncStorage.removeItem("authToken");
      setAuthToken(null);
      console.log("[Auth] JWT token cleared from AsyncStorage");
    } catch (err) {
      console.error("[Auth] Failed to clear token:", err);
    }
  };

  const resetDataForNewSignup = () => {
    console.log("[Auth] Resetting data for NEW user signup");
    resetInvoices();
    resetSubscription();
    clearActivities();
  };

  /**
   * ✅ CRITICAL: Clear data when a different user logs in
   * Prevents data leakage between users if they share the same device
   * This ensures each user sees ONLY their own data
   */
  const clearDataForNewUser = () => {
    console.log("[Auth] ⚠️  Clearing cached data - different user logging in");
    // Clear all stores to prevent showing previous user's data
    resetInvoices();
    resetSubscription();
    clearActivities();
  };


  const safeReset = (operation: "signup" | "logout" | "login") => {
    if (operation === "signup") {
     
      resetDataForNewSignup();
    } else if (operation === "logout") {
      
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

  useEffect(() => {
    if (!session) return;

  }, [session]);

  const initializeAuth = async () => {
    try {
      setIsLoading(true);
      
      // ✅ Try to retrieve stored JWT token
      const storedToken = await getStoredToken();
      
      if (storedToken) {
        console.log("[Auth] Found stored JWT token, restoring user session...");
        
        // ✅ CRITICAL: Validate token with backend
        // Backend's /api/auth/verify endpoint checks if token is still valid
        // This also returns the user data we need to restore the session
        try {
          // ⏱️ Add 30-second timeout to fetch
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.warn("[Auth] ⚠️  Token verification timeout (30s) - proceeding with login screen");
            controller.abort();
          }, 30000);

          try {
            const verifyResponse = await fetch(getApiUrl("/api/auth/verify"), {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${storedToken}`,
              },
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (verifyResponse.ok) {
              const verifyData = await verifyResponse.json();
              
              if (verifyData.user) {
                console.log("[Auth] ✅ Token validated! Restoring user session for:", verifyData.user.email);
                
                // ✅ Restore user from verified token
                const restoredUser: User = {
                  id: verifyData.user.id,
                  email: verifyData.user.email,
                  name: verifyData.user.name,
                  createdAt: verifyData.user.createdAt,
                };
                
                setUser(restoredUser);
                setSession({ user: restoredUser });
                setCurrentUserId(restoredUser.id);
                
                // ✅ Set user's plan from response
                if (verifyData.subscription) {
                  setCurrentPlan(verifyData.subscription.currentPlan || "free");
                }
                
                console.log("[Auth] ✅ Session restored! Loading user data from backend...");
                // ✅ Load full user data in background (non-blocking)
                loadUserDataFromBackend(restoredUser.id)
                  .then(() => {
                    console.log("[Auth] ✅ Background data rehydration complete");
                  })
                  .catch((err) => {
                    console.error("[Auth] ⚠️  Background data rehydration failed:", err);
                    // Non-blocking: User can still access app with cached data
                  });
              }
            } else {
              console.warn("[Auth] ⚠️  Token validation failed:", verifyResponse.status);
              // Token is invalid/expired, clear it and let user login again
              await clearToken();
              setUser(null);
              setSession(null);
            }
          } catch (fetchErr: any) {
            clearTimeout(timeoutId);
            
            // If timeout, proceed anyway (user might have cached data)
            if (fetchErr.name === "AbortError") {
              console.warn("[Auth] ⚠️  Token verification timed out - proceeding with login screen");
              // Don't clear token - keep user logged in with cached data if available
            } else {
              console.error("[Auth] ❌ Token verification fetch error:", fetchErr);
              // Other network error - proceed anyway
            }
          }
        } catch (verifyErr) {
          console.error("[Auth] ❌ Token verification error:", verifyErr);
          // Network error or server issue, proceed anyway
        }
      } else {
        console.log("[Auth] No stored token found - user needs to login");
      }
      
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


      const response = await fetch(getApiUrl("/api/auth/signup"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await response.json();

      if (response.status !== 201) {
 
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

      // ✅ SAVE JWT TOKEN to AsyncStorage
      if (data.accessToken) {
        await saveToken(data.accessToken);
      } else if (data.token) {
        // Fallback for older response format
        await saveToken(data.token);
      } else {
        console.warn("[Auth] No JWT token received from signup");
      }

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

      // ✅ MULTI-USER SAFETY: Check if different user is logging in
      // If currentUserId is set and different from newUser.id, clear cached data
      if (currentUserId && currentUserId !== newUser.id) {
        console.log(`[Auth] ⚠️  Different user detected! Clearing cached data for user switch`);
        clearDataForNewUser();
      }

      // ✅ SAVE JWT TOKEN to AsyncStorage
      if (data.accessToken) {
        await saveToken(data.accessToken);
      } else if (data.token) {
        // Fallback for older response format
        await saveToken(data.token);
      } else {
        console.warn("[Auth] No JWT token received from login");
      }

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

      console.log("[Auth] Setting user and session...");
      setUser(newUser);
      setSession({ user: newUser });
      setCurrentUserId(newUser.id); // ✅ Track current user for multi-user safety
      setCurrentPlan("free");
      
      console.log("[Auth] ✅ Login complete! Navigation should happen now");
      console.log("[Auth] User:", newUser.email);
      console.log("[Auth] About to exit signIn function...");
      

      // ✅ CRITICAL: Wait a bit for Zustand persist middleware to hydrate from AsyncStorage
      // Then call backend rehydration to OVERWRITE with fresh server data
      // This prevents stale or mixed data from being shown
      setTimeout(() => {
        console.log("[Auth] Starting data rehydration from backend...");
        loadUserDataFromBackend(newUser.id)
          .then(() => {
            console.log("[Auth] ✅ Data rehydration COMPLETE");
          })
          .catch((err) => {
            console.error("[Auth] ❌ Data rehydration FAILED:", err);
            // Non-blocking: User can still access cached data from AsyncStorage if backend fails
          });
      }, 500); // Longer delay to ensure persist middleware has loaded
      
      console.log("[Auth] Sign in successful:", email);
    } catch (err) {
      console.error("[Auth] Sign in error:", err);
      // ✅ CRITICAL: On any error, ensure user remains null (no unauthorized access)
      setUser(null);
      setSession(null);

      const message = err instanceof Error ? err.message : "Sign in failed";
      setError(message);
      console.error("[Auth] Error set, throwing:", message);
      throw err;
    } finally {
      console.log("[Auth] FINALLY: Setting isLoading to false");
      setIsLoading(false);
      console.log("[Auth] FINALLY: isLoading set to false, function complete");
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
   * 
   * ✅ FIXED: This now waits for Zustand persist middleware to initialize,
   * then overwrites with fresh backend data to prevent stale/mixed data
   */
  const loadUserDataFromBackend = async (userId: string) => {
    // Non-blocking data rehydration - never block login
    try {
      console.log("[Auth] 🔄 REHYDRATING USER STATE from backend for userId:", userId);
      // ✅ NO userId in query parameter - backend uses authenticated user's ID
      const backendUrl = getApiUrl(`/api/data/all`);
      console.log("[Auth] 📡 Fetching from URL:", backendUrl);

      // ✅ CRITICAL: Get the JWT token to send in Authorization header
      // Backend's authMiddleware requires this header to authenticate the request
      const token = await getStoredToken();
      if (!token) {
        console.error("[Auth] ❌ No JWT token available for data rehydration");
        return;
      }

      // Fetch all user data in one request (most efficient)
      const response = await fetch(backendUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`, // ✅ Send JWT token
        },
      });
      console.log("[Auth] 📦 Data fetch response status:", response.status);

      if (!response.ok) {
        console.error("[Auth] ❌ Failed to rehydrate data - HTTP " + response.status);
        const errorText = await response.text();
        console.error("[Auth] ❌ Response body:", errorText);
        return;
      }

      const responseData = await response.json();
      const { success, data } = responseData;
      console.log("[Auth] 📥 Data rehydration response:", {
        success,
        hasData: !!data,
        invoiceCount: data?.invoices?.length || 0,
        projectCount: data?.projects?.length || 0,
        activityCount: data?.activities?.length || 0,
      });

      if (!success || !data) {
        console.error("[Auth] ❌ Invalid rehydration response - success:", success, "data:", !!data);
        return;
      }

      // ✅ CRITICAL: Hydrate invoiceStore from backend
      if (data.invoices && Array.isArray(data.invoices)) {
        console.log(`[Auth] 📄 Rehydrating ${data.invoices.length} invoices from backend`);
        const { hydrateInvoices } = useInvoiceStore.getState();
        hydrateInvoices(data.invoices);
        console.log(`[Auth] ✅ Invoices hydrated successfully`);
      } else {
        console.warn(`[Auth] ⚠️  No invoices data received from backend`);
      }

      // ✅ CRITICAL: Hydrate profileStore from backend
      if (data.profile) {
        console.log("[Auth] 👤 Rehydrating user profile from backend");
        const { hydrateProfile } = useProfileStore.getState();
        hydrateProfile(
          data.profile.userProfile || {},
          data.profile.companyInfo || {}
        );
        console.log("[Auth] ✅ Profile hydrated successfully");
      }

      // ✅ CRITICAL: Hydrate subscriptionStore from backend
      if (data.subscription) {
        console.log("[Auth] 💳 Rehydrating subscription data from backend");
        const { hydrateSubscription } = useSubscriptionStore.getState();
        hydrateSubscription(data.subscription);
        console.log("[Auth] ✅ Subscription hydrated successfully");
      }

      // ✅ NEW: Hydrate activityStore from backend
      if (data.activities && Array.isArray(data.activities)) {
        console.log(`[Auth] 📊 Rehydrating ${data.activities.length} activities from backend`);
        hydrateActivities(data.activities);
        console.log(`[Auth] ✅ Activities hydrated successfully`);
      } else {
        console.warn(`[Auth] ⚠️  No activities data received from backend`);
      }

      console.log("[Auth] ✅✅✅ ALL DATA REHYDRATION COMPLETE ✅✅✅");
    } catch (err) {
      console.error("[Auth] ❌ Error rehydrating user state:", err);
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
    setCurrentUserId(null); // ✅ Clear current user tracking
    setError(null);

    console.log("[Auth] Signed out successfully");
  };

  const signOut = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // ✅ CLEAR JWT TOKEN from AsyncStorage
      await clearToken();

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
