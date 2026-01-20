import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import WelcomeScreen from "@/screens/WelcomeScreen";

/**
 * ProtectedRoute - Screen-level authentication guard
 * 
 * Usage:
 * <ProtectedRoute>
 *   <ProtectedScreen />
 * </ProtectedRoute>
 * 
 * Responsibilities:
 * 1. Check if user is authenticated
 * 2. If not authenticated → Redirect to Welcome (login/signup)
 * 3. If loading → Show loading indicator
 * 4. If authenticated → Render protected screen
 * 
 * Prevents:
 * - Unauthenticated access to protected screens
 * - Accessing protected screens without a valid session
 * - Bypassing login flow
 */
export function ProtectedRoute({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { theme } = useTheme();

  // Show loading while auth state is being checked
  if (isLoading) {
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

  // ✅ Block access if not authenticated
  // User must have valid session/user object
  if (!isAuthenticated || !user) {
    return fallback || <WelcomeScreen />;
  }

  // ✅ Only render protected content if authenticated with valid user
  return <>{children}</>;
}
