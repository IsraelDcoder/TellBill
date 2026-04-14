import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "https://uwlxzwvggvqqsbgukjsz.supabase.co";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseAnonKey) {
  console.warn("[Supabase] ⚠️  EXPO_PUBLIC_SUPABASE_ANON_KEY not set in environment");
}

// Initialize Supabase client for auth
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

console.log("[Supabase] Client initialized with URL:", supabaseUrl);
