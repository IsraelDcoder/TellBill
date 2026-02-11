import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { useAuth } from "@/context/AuthContext";
import * as Linking from "expo-linking";

import SplashScreen from "@/screens/SplashScreen";
import OnboardingCarousel from "@/screens/OnboardingCarousel";
import AuthenticationScreen from "@/screens/AuthenticationScreen";

export default function WelcomeScreen() {
  const [stage, setStage] = useState<"splash" | "onboarding" | "auth">("splash");
  const [resetToken, setResetToken] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();

  // Handle deep links for password reset
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      
      // Parse reset-password?token=xxxx
      if (url.includes("reset-password")) {
        try {
          const urlObj = new URL(url);
          const token = urlObj.searchParams.get("token");
          
          if (token) {
            setResetToken(token);
          }
        } catch (error) {
          console.error("[WelcomeScreen] Failed to parse deep link:", error);
        }
      }
    };

    // Get initial URL (if app was opened with a link)
    const getInitialURL = async () => {
      const url = await Linking.getInitialURL();
      if (url != null) {
        handleDeepLink({ url });
      }
    };

    getInitialURL();

    // Listen for deep links while app is in foreground
    const subscription = Linking.addEventListener("url", handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, []);

  // Monitor auth state and exit if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      // Auth guard will handle navigation to main app
      return;
    }
  }, [isAuthenticated]);

  // Handle splash animation completion
  const handleSplashComplete = (isAuth: boolean) => {
    if (isAuth) {
      // Auth guard will handle navigation to main app
      return;
    }
    // If we have a reset token, skip onboarding and go straight to auth
    if (resetToken) {
      setStage("auth");
    } else {
      // Show onboarding carousel
      setStage("onboarding");
    }
  };

  // Handle "Get Started" from onboarding
  const handleGetStarted = () => {
    setStage("auth");
  };

  // Handle successful auth
  const handleAuthSuccess = () => {
    // Navigation handled by auth guard
  };

  return (
    <View style={{ flex: 1 }}>
      {stage === "splash" && (
        <SplashScreen onAnimationComplete={handleSplashComplete} />
      )}

      {stage === "onboarding" && (
        <OnboardingCarousel onGetStarted={handleGetStarted} />
      )}

      {stage === "auth" && (
        <AuthenticationScreen onSuccess={handleAuthSuccess} initialResetToken={resetToken} />
      )}
    </View>
  );
}
