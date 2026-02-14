import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  Pressable,
  ViewStyle,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { LockedFeatureOverlay } from "@/components/LockedFeatureOverlay";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { MaterialCostCamera } from "@/components/MaterialCostCamera";
import { ExtractionReviewSheet } from "@/components/ExtractionReviewSheet";
import { BillingDecisionModal } from "@/components/BillingDecisionModal";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ExtractedData {
  vendor: string;
  date: string;
  total: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: string;
    total: string;
  }>;
}

export default function MaterialCostCaptureScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { currentPlan } = useSubscriptionStore();

  // Feature lock - paid plans only
  const isLocked = currentPlan === "free";

  // UI state
  const [step, setStep] = useState<"home" | "camera" | "review" | "billing" | "success">("home");
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [billingDecision, setBillingDecision] = useState<"billable" | "non-billable" | null>(null);
  const [successMessage, setSuccessMessage] = useState("");

  // Lock feature for free users
  if (isLocked) {
    return <LockedFeatureOverlay feature="material_cost_capture" />;
  }

  const handleStartCapture = () => {
    setStep("camera");
  };

  const handleImageCaptured = async (imageBase64: string) => {
    setSelectedImage(imageBase64);
    setIsLoading(true);
    setStep("review");

    try {
      // Call backend to extract receipt data
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_IP}/api/material-costs/scan`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getAuthToken()}`,
          },
          body: JSON.stringify({ imageBase64 }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to extract receipt");
      }

      const result = await response.json();
      if (result.success) {
        setExtractedData(result.data);
        setReceiptId(result.data.receiptId);
        setStep("review");
      } else {
        throw new Error(result.error || "Extraction failed");
      }
    } catch (error) {
      console.error("[Material Cost] Extraction error:", error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to extract receipt");
      setStep("camera");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewConfirm = () => {
    setStep("billing");
  };

  const handleBillingDecision = async (
    decision: "billable" | "non-billable",
    clientData?: { name?: string; email?: string; reason?: string }
  ): Promise<void> => {
    setBillingDecision(decision);
    setIsLoading(true);

    try {
      if (!receiptId) {
        throw new Error("Receipt ID missing");
      }

      const endpoint =
        decision === "billable"
          ? `/api/material-costs/${receiptId}/mark-billable`
          : `/api/material-costs/${receiptId}/mark-non-billable`;

      const body =
        decision === "billable"
          ? {
              clientName: clientData?.name,
              clientEmail: clientData?.email,
            }
          : {
              reason: clientData?.reason || "other",
            };

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_IP}${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${await getAuthToken()}`,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save billing decision");
      }

      const result = await response.json();
      if (result.success) {
        setSuccessMessage(result.message);
        setStep("success");

        // Show success for 2 seconds then reset
        setTimeout(() => {
          resetFlow();
        }, 2000);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("[Material Cost] Billing decision error:", error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to save decision");
    } finally {
      setIsLoading(false);
    }
  };

  const resetFlow = () => {
    setStep("home");
    setExtractedData(null);
    setReceiptId(null);
    setSelectedImage(null);
    setBillingDecision(null);
    setSuccessMessage("");
  };

  const getAuthToken = async () => {
    try {
      const token = await AsyncStorage.getItem("authToken");
      return token || "";
    } catch (error) {
      console.error("Failed to get auth token:", error);
      return "";
    }
  };

  // Render different steps
  if (step === "camera") {
    return (
      <MaterialCostCamera
        isVisible={true}
        onImageCaptured={handleImageCaptured}
        onClose={() => setStep("home")}
        isProcessing={isLoading}
      />
    );
  }

  if (step === "review" && extractedData) {
    return (
      <ExtractionReviewSheet
        data={extractedData}
        imageUrl={selectedImage || ""}
        isLoading={isLoading}
        onConfirm={handleReviewConfirm}
        onEdit={() => setStep("camera")}
        onCancel={() => resetFlow()}
      />
    );
  }

  if (step === "billing") {
    return (
      <BillingDecisionModal
        receiptData={extractedData || { vendor: "", total: "", date: "", items: [] }}
        isLoading={isLoading}
        onBillable={async (clientData: { name?: string; email?: string }) => handleBillingDecision("billable", clientData)}
        onNonBillable={async (reason: string) =>
          handleBillingDecision("non-billable", { reason })
        }
        onCancel={() => setStep("review")}
      />
    );
  }

  if (step === "success") {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.successContainer, { paddingTop: headerHeight + Spacing.xl }]}>
          <View
            style={[
              styles.successIcon,
              {
                backgroundColor: `${BrandColors.constructionGold}20`,
              },
            ]}
          >
            <Feather name="check-circle" size={64} color={BrandColors.constructionGold} />
          </View>
          <ThemedText type="h2" style={styles.successTitle}>
            {billingDecision === "billable" ? "Material Captured!" : "Noted"}
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            {successMessage}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Home screen
  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: Spacing.xl,
        }}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.content, { paddingHorizontal: Spacing.lg }]}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View
              style={[
                styles.heroIcon,
                {
                  backgroundColor: `${BrandColors.constructionGold}20`,
                },
              ]}
            >
              <Feather name="file-text" size={48} color={BrandColors.constructionGold} />
            </View>
            <ThemedText type="h2" style={styles.heroTitle}>
              Recover Material Costs
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.heroSubtitle, { color: theme.textSecondary }]}
            >
              Never forget to bill your clients for materials again
            </ThemedText>
          </View>

          {/* Why This Matters */}
          <GlassCard
            style={StyleSheet.flatten([
              styles.card,
              {
                backgroundColor: isDark
                  ? theme.backgroundDefault
                  : theme.backgroundSecondary,
              },
            ]) as ViewStyle}
          >
            <View style={styles.cardHeader}>
              <Feather name="alert-circle" size={20} color={BrandColors.constructionGold} />
              <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>
                The Problem
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary, lineHeight: 20 }}>
              You buy materials every day. But how many do you forget to bill your clients for?{"\n"}
              {"\n"}
              This feature finds those forgotten costs and forces the billing decision on the spot.
            </ThemedText>
          </GlassCard>

          {/* How It Works */}
          <GlassCard
            style={StyleSheet.flatten([
              styles.card,
              {
                backgroundColor: isDark
                  ? theme.backgroundDefault
                  : theme.backgroundSecondary,
              },
            ]) as ViewStyle}
          >
            <View style={styles.cardHeader}>
              <Feather name="zap" size={20} color={BrandColors.constructionGold} />
              <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>
                How It Works
              </ThemedText>
            </View>
            <View style={styles.steps}>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <ThemedText type="small" style={{ color: "white", fontWeight: "600" }}>
                    1
                  </ThemedText>
                </View>
                <View style={styles.stepContent}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    Scan Receipt
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Take a photo or document
                  </ThemedText>
                </View>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <ThemedText type="small" style={{ color: "white", fontWeight: "600" }}>
                    2
                  </ThemedText>
                </View>
                <View style={styles.stepContent}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    Review Extraction
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    AI extracts vendor, date, amount
                  </ThemedText>
                </View>
              </View>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <ThemedText type="small" style={{ color: "white", fontWeight: "600" }}>
                    3
                  </ThemedText>
                </View>
                <View style={styles.stepContent}>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    Choose: Bill or Skip
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Decide who pays for this
                  </ThemedText>
                </View>
              </View>
            </View>
          </GlassCard>

          {/* Start Button */}
          <Pressable
            onPress={handleStartCapture}
            style={({ pressed }) => [
              styles.startButton,
              {
                backgroundColor: BrandColors.constructionGold,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Feather name="camera" size={20} color="white" />
            <ThemedText type="body" style={{ color: "white", fontWeight: "600", marginLeft: Spacing.sm }}>
              Start Capturing
            </ThemedText>
          </Pressable>

          {/* Features */}
          <GlassCard
            style={StyleSheet.flatten([
              styles.card,
              {
                backgroundColor: isDark
                  ? theme.backgroundDefault
                  : theme.backgroundSecondary,
              },
            ]) as ViewStyle}
          >
            <View style={styles.cardHeader}>
              <Feather name="check-square" size={20} color={BrandColors.constructionGold} />
              <ThemedText type="h4" style={{ marginLeft: Spacing.sm }}>
                Key Features
              </ThemedText>
            </View>
            <View style={styles.features}>
              <View style={styles.feature}>
                <Feather name="zap" size={16} color={BrandColors.constructionGold} />
                <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                  AI-powered extraction
                </ThemedText>
              </View>
              <View style={styles.feature}>
                <Feather name="bell" size={16} color={BrandColors.constructionGold} />
                <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                  Money alerts for unbilled costs
                </ThemedText>
              </View>
              <View style={styles.feature}>
                <Feather name="link-2" size={16} color={BrandColors.constructionGold} />
                <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                  Attach directly to invoices
                </ThemedText>
              </View>
              <View style={styles.feature}>
                <Feather name="lock" size={16} color={BrandColors.constructionGold} />
                <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                  Paid plans only
                </ThemedText>
              </View>
            </View>
          </GlassCard>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingVertical: Spacing.lg,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  steps: {
    gap: Spacing.md,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BrandColors.constructionGold,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  stepContent: {
    flex: 1,
  },
  startButton: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  features: {
    gap: Spacing.md,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  successTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
});
