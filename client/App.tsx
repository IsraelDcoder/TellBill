import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer, LinkingOptions } from "@react-navigation/native";
import * as Linking from "expo-linking";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator, { RootStackParamList } from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/context/AuthContext";
import { AuthRootGuard } from "@/components/AuthRootGuard";
import { useRevenueCatInitialization, useRevenueCatListener, useEntitlementRefresh } from "@/hooks/useRevenueCat";
import { useIntercomInitialization } from "@/hooks/useIntercom";

// ✅ FIXED: Configure deep linking for standalone APK
// This allows the app to handle tellbill://auth deep links from OAuth redirects
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ["tellbill://", "https://tellbill.app"],
  config: {
    screens: {
      // ✅ Handle OAuth callback from Google Sign-In
      // Route: tellbill://auth
      Welcome: {
        screens: {
          Auth: "auth",
        },
      },
      // ✅ Default routes for other screens
      Main: {
        screens: {
          Home: "home",
          Invoices: "invoices",
          Profile: "profile",
        },
      },
    },
  },
};

function AppContent() {
  // Initialize RevenueCat SDK on app start
  useRevenueCatInitialization();

  // Listen for RevenueCat subscription changes
  useRevenueCatListener();

  // Refresh entitlements when user authenticates (app startup + login)
  useEntitlementRefresh();

  // Initialize Intercom on app start
  useIntercomInitialization();

  return (
    <NavigationContainer linking={linking} fallback={null}>
      <RootStackNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <AuthProvider>
                <AuthRootGuard>
                  <AppContent />
                </AuthRootGuard>
              </AuthProvider>
              <StatusBar style="auto" />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
