import { QueryClient, QueryFunction } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getBackendUrl } from "./backendUrl";

/**
 * Gets the base URL for the Express API server
 * Uses unified backend configuration from @/lib/backendUrl
 * Supports:
 *  - Production: EXPO_PUBLIC_BACKEND_URL (full HTTPS URL)
 *  - Development: EXPO_PUBLIC_BACKEND_IP (machine IP for Expo Go)
 *  - Fallback: localhost:3000
 */
export function getApiUrl(): string {
  const base = getBackendUrl();
  return base.endsWith('/') ? base : base + '/';
}

/**
 * ✅ Get JWT token from AsyncStorage
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem("authToken");
    return token;
  } catch (err) {
    console.error("[API] Failed to get auth token:", err);
    return null;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  // ✅ Get JWT token and include in headers
  const token = await getAuthToken();
  const headers: HeadersInit = data ? { "Content-Type": "application/json" } : {};
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    // ✅ Get JWT token and include in headers
    const token = await getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
