import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Pressable, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useOnboardingStore } from "@/stores/onboardingStore";
import { analyticsService } from "@/services/analyticsService";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  tips: string[];
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Welcome to TellBill",
    description: "Your smart invoice management companion for mobile professionals",
    icon: "check-circle",
    color: BrandColors.constructionGold,
    tips: [
      "Create invoices in seconds",
      "Voice-to-invoice with transcription",
      "Track payments in real-time",
    ],
  },
  {
    id: "voice_invoicing",
    title: "Create Invoices with Voice",
    description: "Simply speak to instantly convert your work details into invoices",
    icon: "mic",
    color: "#FF6B6B",
    tips: [
      "Tap microphone and describe your work",
      "App transcribes and extracts details",
      "Customize before sending",
    ],
  },
  {
    id: "payment_tracking",
    title: "Track Payments Instantly",
    description: "Monitor invoice status, payment links, and get paid faster",
    icon: "credit-card",
    color: "#4ECDC4",
    tips: [
      "Mark invoices as sent or paid",
      "Share secure payment links",
      "See revenue at a glance",
    ],
  },
  {
    id: "smart_templates",
    title: "Professional Templates",
    description: "Choose from multiple invoice templates to match your business style",
    icon: "layout",
    color: "#95E1D3",
    tips: [
      "Professional, minimal, or detailed layouts",
      "Customize your company branding",
      "Save preferences for automatic application",
    ],
  },
  {
    id: "notifications",
    title: "Stay Organized",
    description: "Get smart reminders and detailed insights into your business",
    icon: "bell",
    color: "#A8E6CF",
    tips: [
      "Receive payment reminders",
      "View detailed business insights",
      "Access your data anytime, anywhere",
    ],
  },
];

export default function OnboardingScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { currentStep, setCurrentStep, completeStep, skipOnboarding } = useOnboardingStore();
  const [isSkipping, setIsSkipping] = useState(false);

  const step = ONBOARDING_STEPS[currentStep];

  const handleNext = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    completeStep(step.id);

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      await analyticsService.track("onboarding_step_viewed", {
        step: currentStep + 1,
        stepId: ONBOARDING_STEPS[currentStep + 1].id,
      });
    } else {
      // Onboarding complete
      await analyticsService.trackOnboardingComplete(
        ONBOARDING_STEPS.map((s) => s.id)
      );
      navigation.replace("Main");
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSkipping(true);

    skipOnboarding();

    await analyticsService.track("onboarding_complete", {
      skipped: true,
      stepCompleted: currentStep,
      totalSteps: ONBOARDING_STEPS.length,
    });

    navigation.replace("Main");
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        {ONBOARDING_STEPS.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              {
                backgroundColor:
                  index <= currentStep ? step.color : theme.textSecondary + "30",
              },
            ]}
          />
        ))}
      </View>

      {/* Skip button */}
      <Pressable
        onPress={handleSkip}
        style={styles.skipButton}
        disabled={isSkipping}
      >
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Skip
        </ThemedText>
      </Pressable>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Icon */}
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: `${step.color}20`,
              borderColor: step.color,
            },
          ]}
        >
          <Feather name={step.icon as any} size={64} color={step.color} />
        </View>

        {/* Title */}
        <ThemedText type="h1" style={[styles.title, { color: step.color }]}>
          {step.title}
        </ThemedText>

        {/* Description */}
        <ThemedText
          type="body"
          style={[styles.description, { color: theme.textSecondary }]}
        >
          {step.description}
        </ThemedText>

        {/* Tips */}
        <View style={styles.tipsContainer}>
          {step.tips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <View
                style={[
                  styles.tipBullet,
                  { backgroundColor: `${step.color}40` },
                ]}
              >
                <Feather
                  name="check"
                  size={16}
                  color={step.color}
                />
              </View>
              <ThemedText type="body" style={styles.tipText}>
                {tip}
              </ThemedText>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Navigation buttons */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Button
          onPress={handleBack}
          variant="outline"
          style={{ flex: 1, marginRight: Spacing.md }}
          disabled={currentStep === 0}
        >
          Back
        </Button>
        <Button
          onPress={handleNext}
          style={{ flex: 1 }}
        >
          {currentStep === ONBOARDING_STEPS.length - 1 ? "Get Started" : "Next"}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 16,
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skipButton: {
    position: "absolute",
    top: Spacing.lg,
    right: Spacing.lg,
    zIndex: 10,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    justifyContent: "center",
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: Spacing.xl,
    borderWidth: 2,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  description: {
    textAlign: "center",
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  tipsContainer: {
    gap: Spacing.md,
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  tipBullet: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  tipText: {
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    paddingTop: Spacing.lg,
    flexDirection: "row",
  },
});
