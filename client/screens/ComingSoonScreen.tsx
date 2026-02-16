import React from "react";
import {
  StyleSheet,
  View,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "ComingSoon">;

const featureIcons: Record<string, keyof typeof Feather.glyphMap> = {
  "Inventory Management": "package",
  "QuickBooks Integration": "link",
  "GPS Verification Audit": "map-pin",
  "White-Label Enterprise": "star",
};

const featureDescriptions: Record<string, string> = {
  "Inventory Management":
    "Track materials, supplies, and equipment across all your job sites. Get low-stock alerts and automated reordering.",
  "QuickBooks Integration":
    "Seamlessly sync your invoices, expenses, and payments with QuickBooks for effortless accounting.",
  "GPS Verification Audit":
    "Automatically verify job site locations and create tamper-proof audit trails for compliance and billing verification.",
  "White-Label Enterprise":
    "Customize TellBill with your own branding, colors, and logo. Perfect for large contractors and franchises.",
};

export default function ComingSoonScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const feature = route.params.feature;
  const icon = featureIcons[feature] || "zap";
  const description =
    featureDescriptions[feature] ||
    "This exciting feature is currently in development and will be available soon.";

  const handleContactDeveloper = async () => {
    const email = "theonyekachithompson@gmail.com";
    const subject = encodeURIComponent(`Feature Request: ${feature}`);
    const body = encodeURIComponent(`Hi,\n\nI'm interested in the ${feature} feature for TellBill.\n\nLooking forward to hearing from you!\n\nBest regards`);
    const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoLink);
      if (canOpen) {
        await Linking.openURL(mailtoLink);
      } else {
        // Fallback: just open the email app
        await Linking.openURL(`mailto:${email}`);
      }
    } catch (error) {
      console.error("Error opening email:", error);
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${BrandColors.constructionGold}15` },
          ]}
        >
          <Feather
            name={icon}
            size={48}
            color={BrandColors.constructionGold}
          />
        </View>

        <ThemedText type="h1" style={styles.title}>
          {feature}
        </ThemedText>

        <View
          style={[
            styles.badge,
            { backgroundColor: `${BrandColors.constructionGold}20` },
          ]}
        >
          <Feather name="tool" size={14} color={BrandColors.constructionGold} />
          <ThemedText
            type="small"
            style={{ color: BrandColors.constructionGold, fontWeight: "600" }}
          >
            Building in Progress
          </ThemedText>
        </View>

        <ThemedText
          type="body"
          style={[styles.description, { color: theme.textSecondary }]}
        >
          {description}
        </ThemedText>

        <GlassCard style={styles.notifyCard}>
          <View style={styles.notifyContent}>
            <Feather name="bell" size={24} color={BrandColors.constructionGold} />
            <View style={styles.notifyText}>
              <ThemedText type="h4">Get Early Access</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Be the first to know when this feature launches
              </ThemedText>
            </View>
          </View>
          <Button onPress={handleContactDeveloper} style={styles.notifyButton}>
            Contact Developer
          </Button>
        </GlassCard>
      </View>

      <Button variant="outline" onPress={() => navigation.goBack()}>
        Go Back
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
  },
  description: {
    textAlign: "center",
    maxWidth: 300,
    marginBottom: Spacing["3xl"],
  },
  notifyCard: {
    width: "100%",
  },
  notifyContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  notifyText: {
    flex: 1,
  },
  notifyButton: {
    width: "100%",
  },
});
