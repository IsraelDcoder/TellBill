import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";

/**
 * AuthRootGuard - Root level authentication guard
 * 
 * Responsibilities:
 * 1. Wait for auth state to initialize (check for existing session)
 * 2. Show loading indicator while checking auth state
 * 3. Only render app content once auth state is determined
 * 4. Prevents rendering before we know if user is authenticated
 */
export function AuthRootGuard({
  children,
  onAuthStateReady,
}: {
  children: React.ReactNode;
  onAuthStateReady?: (isAuthenticated: boolean) => void;
}) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const { theme } = useTheme();
  const [isReady, setIsReady] = useState(false);

  // Wait for auth initialization to complete
  useEffect(() => {
    if (!isLoading) {
      setIsReady(true);
      onAuthStateReady?.(isAuthenticated);
    }
  }, [isLoading, isAuthenticated, onAuthStateReady]);

  // Show loading while auth state is being checked
  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.backgroundRoot,
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // ✅ Only render children once auth state is ready
  // Navigation will handle directing to login or main app based on isAuthenticated
  return <>{children}</>;
}
