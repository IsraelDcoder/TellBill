import React, { useState, useEffect } from "react";
import { View } from "react-native";
import { useAuth } from "@/context/AuthContext";

import SplashScreen from "@/screens/SplashScreen";
import OnboardingCarousel from "@/screens/OnboardingCarousel";
import AuthenticationScreen from "@/screens/AuthenticationScreen";

export default function WelcomeScreen() {
  const [stage, setStage] = useState<"splash" | "onboarding" | "auth">("splash");
  const { isAuthenticated } = useAuth();

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
    // Show onboarding carousel
    setStage("onboarding");
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
        <AuthenticationScreen onSuccess={handleAuthSuccess} />
      )}
    </View>
  );
}
