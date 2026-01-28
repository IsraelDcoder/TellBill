/**
 * Backend URL Configuration
 * 
 * For physical Android phone: Uses your machine's IP on the network
 * For Android emulator: Uses 10.0.2.2 (special alias for host)
 * For production: Uses environment variable
 */

const DEV_PORT = 3000;

/**
 * Get the backend URL for the development server
 * Physical phones: Use your machine's actual IP address (on same network)
 * Emulators: Use 10.0.2.2 (special IP alias)
 * Production: Use EXPO_PUBLIC_BACKEND_URL
 */
export function getBackendUrl(): string {
  // Production URL from environment (highest priority)
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    console.log("[Backend] Using production URL from environment");
    return process.env.EXPO_PUBLIC_BACKEND_URL;
  }

  // Custom IP from environment (for flexibility)
  if (process.env.EXPO_PUBLIC_BACKEND_IP) {
    const url = `http://${process.env.EXPO_PUBLIC_BACKEND_IP}:${DEV_PORT}`;
    console.log("[Backend] Using custom IP from environment:", url);
    return url;
  }

  // Default: Use localhost for development web app
  // For native emulators/phones, set EXPO_PUBLIC_BACKEND_IP environment variable
  const DEFAULT_IP = "10.64.118.139"; // Your machine IP for phone testing
  const url = `http://${DEFAULT_IP}:${DEV_PORT}`;
  console.log("[Backend] Using development URL:", url);
  return url;
}

/**
 * Build full API endpoint URL
 */
export function getApiUrl(endpoint: string): string {
  const base = getBackendUrl();
  return `${base}${endpoint}`;
}
