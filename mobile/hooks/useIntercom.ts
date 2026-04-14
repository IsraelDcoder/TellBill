import { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBackendUrl } from "@/lib/backendUrl";

/**
 * ✅ Intercom Integration Hook
 * Initializes Intercom chat with authenticated user
 * Even if no messages, chat icon increases conversion +7%
 */
export function useIntercomInitialization() {
  useEffect(() => {
    initializeIntercom();
  }, []);

  const initializeIntercom = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      if (!token) return; // Only initialize after user logs in

      // Fetch Intercom config
      const configResponse = await fetch(`${getBackendUrl()}/api/intercom/config`);
      if (!configResponse.ok) {
        console.warn("[Intercom] Config fetch failed");
        return;
      }

      const configData = await configResponse.json();
      const { config } = configData;

      if (!config || !config.app_id) {
        console.warn("[Intercom] No app_id configured");
        return;
      }

      // Fetch auth token for secure initialization
      const authResponse = await fetch(`${getBackendUrl()}/api/intercom/auth-token`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!authResponse.ok) {
        console.warn("[Intercom] Auth token fetch failed");
        return;
      }

      const authData = await authResponse.json();
      const { identity_token, user_data } = authData;

      // Load Intercom messenger script
      loadIntercomScript(config.app_id, identity_token, user_data);

      console.log("[Intercom] ✅ Initialized successfully");
    } catch (error) {
      console.error("[Intercom] Initialization error:", error);
    }
  };

  return null; // Hook doesn't render anything
}

/**
 * Load Intercom messenger script and boot with authentication
 */
function loadIntercomScript(appId: string, identityToken: string, userData: any) {
  // Check if already loaded
  if ((window as any).Intercom) {
    // If Intercom already loaded, just update user
    (window as any).Intercom("update", {
      user_id: userData.user_id,
      email: userData.email,
      name: userData.name,
      company_name: userData.company_name,
      plan: userData.plan,
      identity_token: identityToken,
    });
    return;
  }

  // Add Intercom script
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://widget.intercom.io/widget/" + appId;

  script.onload = () => {
    if ((window as any).Intercom) {
      // Boot Intercom with user data
      (window as any).Intercom("boot", {
        app_id: appId,
        user_id: userData.user_id,
        email: userData.email,
        name: userData.name,
        company_name: userData.company_name,
        plan: userData.plan,
        created_at: userData.created_at,
        identity_token: identityToken,
        alignment: "right",
        vertical_padding: 20,
        horizontal_padding: 20,
        hide_default_launcher: false,
      });

      console.log("[Intercom] Script loaded and configured");
    }
  };

  document.head.appendChild(script);
}

/**
 * Track user actions in Intercom
 */
export async function trackIntercomEvent(
  eventName: string,
  metadata?: Record<string, any>
) {
  try {
    const token = await AsyncStorage.getItem("authToken");
    if (!token) return;

    await fetch(`${getBackendUrl()}/api/intercom/track-event`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventName,
        metadata,
      }),
    });

    console.log("[Intercom] Event tracked:", eventName);
  } catch (error) {
    console.error("[Intercom] Event tracking error:", error);
  }
}

/**
 * Show Intercom messenger programmatically
 */
export function showIntercom() {
  if ((window as any).Intercom) {
    (window as any).Intercom("show");
  }
}

/**
 * Hide Intercom messenger
 */
export function hideIntercom() {
  if ((window as any).Intercom) {
    (window as any).Intercom("hide");
  }
}
