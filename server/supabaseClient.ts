import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://uwlxzwvggvqqsbgukjsz.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "";

if (!supabaseKey) {
  console.warn(
    "[Supabase] ⚠️  SUPABASE_ANON_KEY not set in environment. Google OAuth may not work."
  );
}

// Initialize Supabase client for backend auth verification
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Verify Google OAuth ID token with Supabase
 * Returns the decoded token and user info
 */
export async function verifyGoogleIdToken(idToken: string) {
  try {
    // Verify token with Supabase (this validates the signature and expiration)
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: idToken,
      type: "email",
    });

    if (error) {
      console.error("[Supabase] Error verifying token:", error);
      throw error;
    }

    return data;
  } catch (err) {
    console.error("[Supabase] Token verification failed:", err);
    throw err;
  }
}

/**
 * Decode Google ID token (basic JWT decode without verification)
 * Use for extracting user info - signature should be verified by Supabase
 */
export function decodeGoogleIdToken(
  idToken: string
): { email: string; name: string; picture?: string; sub: string } | null {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }

    const decoded = JSON.parse(Buffer.from(parts[1], "base64").toString());
    return {
      email: decoded.email,
      name: decoded.name || "",
      picture: decoded.picture,
      sub: decoded.sub, // Google user ID
    };
  } catch (err) {
    console.error("[Supabase] Error decoding token:", err);
    return null;
  }
}
