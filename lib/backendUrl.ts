
/**
 * ============================================================================
 * BACKEND URL CONFIGURATION
 * ============================================================================
 *
 * This module provides a unified backend URL configuration for all API calls.
 * It prioritizes env variables to support:
 *  - Development (localhost:3000)
 *  - Development on mobile Expo Go (machine IP:3000)
 *  - Production (HTTPS hosted backend)
 *  - Standalone APK / Production builds (environment-based)
 *
 * Environment Variables:
 *  - EXPO_PUBLIC_BACKEND_URL: Full production backend URL (e.g., https://your-backend.onrender.com)
 *  - EXPO_PUBLIC_BACKEND_IP: Development IP address (e.g., 192.168.1.100) - for Expo Go on mobile
 *
 * Usage:
 *  import { getBackendUrl, getApiUrl } from '@/lib/backendUrl';
 *  const baseUrl = getBackendUrl(); // Returns: http://localhost:3000, https://host.com, etc.
 *  const url = getApiUrl('/api/invoices'); // Returns: {baseUrl}/api/invoices
 * ============================================================================
 */

const DEV_PORT = 3000;
const DEFAULT_DEV_URL = `http://localhost:${DEV_PORT}`;

/**
 * Get the backend base URL (e.g., http://localhost:3000 or https://your-backend.onrender.com)
 * Priority:
 *  1. EXPO_PUBLIC_BACKEND_URL (production backend for standalone APK)
 *  2. EXPO_PUBLIC_BACKEND_IP (development IP for Expo Go on mobile)
 *  3. Localhost (fallback for web/development)
 */
export function getBackendUrl(): string {
  // Production: Use full hosted backend URL
  if (process.env.EXPO_PUBLIC_BACKEND_URL) {
    const url = process.env.EXPO_PUBLIC_BACKEND_URL;
    console.log("[Backend] Using production URL:", url);
    return url;
  }

  // Development on Expo Go mobile: Use custom IP
  if (process.env.EXPO_PUBLIC_BACKEND_IP) {
    const url = `http://${process.env.EXPO_PUBLIC_BACKEND_IP}:${DEV_PORT}`;
    console.log("[Backend] Using development IP:", url);
    return url;
  }

  // Fallback: Localhost for web or local development
  console.log("[Backend] Using default localhost:", DEFAULT_DEV_URL);
  return DEFAULT_DEV_URL;
}

/**
 * Construct a full API endpoint URL
 * @param endpoint - API endpoint (e.g., '/api/invoices' or 'api/invoices')
 * @returns Full API URL (e.g., http://localhost:3000/api/invoices)
 */
export function getApiUrl(endpoint: string): string {
  const base = getBackendUrl();
  // Ensure endpoint starts with '/'
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}
