
const DEV_PORT = 3000;

export function getBackendUrl(): string {
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

  const DEFAULT_IP = "localhost"; // Falls back to localhost if env var not set
  const url = `http://${DEFAULT_IP}:${DEV_PORT}`;
  console.log("[Backend] Using development URL:", url);
  return url;
}


export function getApiUrl(endpoint: string): string {
  const base = getBackendUrl();
  return `${base}${endpoint}`;
}
