import { useSubscriptionStore } from "@/stores/subscriptionStore";

export type ActionType = "voice_recording" | "invoice_generation";

interface IncrementUsageResponse {
  success: boolean;
  voiceRecordingsUsed?: number;
  invoicesCreated?: number;
  plan: string;
  remaining_uses: number | null;
  error?: string;
  message?: string;
}

/**
 * Increments user's usage count on the server when they perform an action
 * This is called after voice recording or invoice generation
 * 
 * @param actionType The type of action performed
 * @param minutesSaved Optional: time saved by using the feature
 * @returns Response with new usage counts and remaining uses
 */
export async function incrementUsage(
  actionType: ActionType,
  minutesSaved?: number
): Promise<IncrementUsageResponse> {
  try {
    // Get the user's session/token (assuming you have auth set up)
    // This would typically come from your auth context
    const token = await getAuthToken(); // See implementation note below

    if (!token) {
      console.warn("No auth token available, falling back to local increment");
      // Fallback: increment locally if no token available
      const store = useSubscriptionStore.getState();
      if (actionType === "voice_recording") {
        store.incrementVoiceRecordings();
      } else {
        store.incrementInvoices();
      }
      
      const totalUsage = store.voiceRecordingsUsed + store.invoicesCreated;
      return {
        success: true,
        voiceRecordingsUsed: store.voiceRecordingsUsed,
        invoicesCreated: store.invoicesCreated,
        plan: store.currentPlan,
        remaining_uses:
          store.currentPlan === "free"
            ? Math.max(0, 3 - totalUsage)
            : null,
      };
    }

    // Call the Supabase Edge Function
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/increment-usage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          actionType,
          minutesSaved: minutesSaved || 0,
        }),
      }
    );

    const data = (await response.json()) as IncrementUsageResponse;

    if (!response.ok) {
      if (response.status === 429) {
        // Usage limit reached - show modal
        return data;
      }
      throw new Error(data.error || "Failed to increment usage");
    }

    // Update local store with server response
    const store = useSubscriptionStore.getState();
    if (data.voiceRecordingsUsed !== undefined) {
      // Sync with server data
      store.syncWithServer({
        voiceRecordingsUsed: data.voiceRecordingsUsed,
        invoicesCreated: data.invoicesCreated || 0,
        currentPlan: data.plan as any,
        isSubscribed: data.plan !== "free",
      });
    }

    return data;
  } catch (error) {
    console.error("Error incrementing usage:", error);
    // Fallback to local increment on error
    const store = useSubscriptionStore.getState();
    if (actionType === "voice_recording") {
      store.incrementVoiceRecordings();
    } else {
      store.incrementInvoices();
    }
    
    const totalUsage = store.voiceRecordingsUsed + store.invoicesCreated;
    return {
      success: true,
      voiceRecordingsUsed: store.voiceRecordingsUsed,
      invoicesCreated: store.invoicesCreated,
      plan: store.currentPlan,
      remaining_uses: null,
    };
  }
}


/**
 * Get auth token - IMPLEMENTATION NOTE
 * 
 * Replace this with your actual auth implementation
 * If using Supabase Auth:
 * 
 *   import { useSupabaseAuth } from '@/context/SupabaseAuthContext'; // or your auth context
 *   
 *   export async function getAuthToken(): Promise<string | null> {
 *     const { session } = useSupabaseAuth();
 *     return session?.access_token || null;
 *   }
 * 
 * Or if using RevenueCat + custom auth:
 * 
 *   import { Purchases } from 'react-native-purchases';
 *   
 *   export async function getAuthToken(): Promise<string | null> {
 *     try {
 *       const customerInfo = await Purchases.getCustomerInfo();
 *       return customerInfo.originalAppUserId || null;
 *     } catch {
 *       return null;
 *     }
 *   }
 */
async function getAuthToken(): Promise<string | null> {
  try {
    // TODO: Implement your auth token retrieval logic here
    // For now, return null to use fallback local increment
    return null;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
}
