import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { LockedFeatureOverlay } from "@/components/LockedFeatureOverlay";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useSubscriptionStore } from "@/stores/subscriptionStore";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ReceiptScannerScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { currentPlan } = useSubscriptionStore();
  const [showCamera, setShowCamera] = useState(false);

  // ✅ LOCK: Receipt scanning only available for paid plans
  const receiptScanningLocked = currentPlan === "free";

  const handleReceiptAdded = () => {
    // Show success and refresh
    Alert.alert("Success!", "Receipt added.", [
      {
        text: "OK",
        onPress: () => {
          setShowCamera(false);
        },
      },
    ]);
  };

  // ✅ HARD PAYWALL: Receipt scanning locked for free users
  if (receiptScanningLocked) {
    return <LockedFeatureOverlay feature="receipt_scanning" />;
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {!showCamera ? (
        <ScrollView
          contentContainerStyle={{
            paddingTop: headerHeight,
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
                <Feather name="camera" size={48} color={BrandColors.constructionGold} />
              </View>
              <ThemedText type="h2" style={styles.heroTitle}>
                Scan Receipts
              </ThemedText>
              <ThemedText
                type="body"
                style={[styles.heroSubtitle, { color: theme.textSecondary }]}
              >
                Capture material receipts and automatically extract details
              </ThemedText>
            </View>

            {/* Quick Start */}
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
                      Take a clear photo of the receipt
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
                      Auto-Extract
                    </ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      AI extracts vendor, items, and total
                    </ThemedText>
                  </View>
                </View>
              </View>
            </GlassCard>



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
              <ThemedText type="h4" style={styles.sectionTitle}>
                AI-Powered Extraction
              </ThemedText>
              <View style={styles.features}>
                <View style={styles.feature}>
                  <Feather name="check-circle" size={20} color={BrandColors.constructionGold} />
                  <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                    Vendor & date detection
                  </ThemedText>
                </View>
                <View style={styles.feature}>
                  <Feather name="check-circle" size={20} color={BrandColors.constructionGold} />
                  <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                    Item & price extraction
                  </ThemedText>
                </View>
                <View style={styles.feature}>
                  <Feather name="check-circle" size={20} color={BrandColors.constructionGold} />
                  <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                    Total calculation
                  </ThemedText>
                </View>
                <View style={styles.feature}>
                  <Feather name="check-circle" size={20} color={BrandColors.constructionGold} />
                  <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                    Duplicate detection
                  </ThemedText>
                </View>
              </View>
            </GlassCard>
          </View>
        </ScrollView>
      ) : null}
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
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  heroSubtitle: {
    textAlign: "center",
    lineHeight: 22,
  },
  card: {
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
  },
  steps: {
    gap: Spacing.lg,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    backgroundColor: BrandColors.constructionGold,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  stepContent: {
    flex: 1,
  },
  features: {
    gap: Spacing.md,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  emptyCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
});
