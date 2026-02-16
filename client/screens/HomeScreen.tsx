import React from "react";
import {
  StyleSheet,
  View,
  Image,
  Dimensions,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import {
  ScreenContainer,
  Section,
  SectionTitle,
} from "@/components/layout";
import { KPICard } from "@/components/KPICard";
import { QuickActionButton } from "@/components/QuickActionButton";
import { ActivityItem, ActivityStatus } from "@/components/ActivityItem";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useInvoiceStore } from "@/stores/invoiceStore";
import { formatCurrency } from "@/utils/formatCurrency";

const { width } = Dimensions.get("window");

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function HomeScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { invoices, getStats } = useInvoiceStore();
  const stats = getStats();

  const recentInvoices = invoices.slice(0, 5);

  return (
    <ScreenContainer scrollable paddingBottom="default">
      {/* Hero Section */}
      <View style={styles.heroContainer}>
        <Image
          source={require("../assets/images/dashboard_hero_construction_site.png")}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={[
            "transparent",
            isDark ? "rgba(45, 46, 46, 0.8)" : "rgba(255, 255, 255, 0.8)",
            isDark ? BrandColors.slateGrey : BrandColors.white,
          ]}
          style={styles.heroGradient}
        />
        <View style={styles.heroContent}>
          <ThemedText type="h1" style={styles.heroTitle}>
            Finished the job?
          </ThemedText>
          <ThemedText
            type="h2"
            style={[styles.heroSubtitle, { color: BrandColors.constructionGold }]}
          >
            Just tell Bill.
          </ThemedText>
        </View>
      </View>

      {/* KPI Cards Section */}
      <Section spacing="compact">
        <View style={styles.kpiRow}>
          <KPICard
            title="Invoices Sent"
            value={stats.sent}
            icon="send"
            trend={{ value: 12, isPositive: true }}
          />
          <KPICard
            title="Invoices Paid"
            value={stats.paid}
            icon="check-circle"
            trend={{ value: 8, isPositive: true }}
          />
        </View>
        <View style={styles.kpiRow}>
          <KPICard
            title="Total Revenue"
            value={formatCurrency(stats.revenue)}
            icon="dollar-sign"
            trend={{ value: 15, isPositive: true }}
          />
          <KPICard
            title="Time Saved"
            value={`${stats.timeSaved}h`}
            icon="clock"
          />
        </View>
      </Section>

      {/* Quick Actions Section */}
      <Section>
        <SectionTitle title="Quick Actions" />
        <View style={styles.quickActions}>
          <QuickActionButton
            title="Record Voice"
            icon="mic"
            isPrimary
            size="large"
            onPress={() => navigation.navigate("VoiceRecording")}
          />
          <QuickActionButton
            title="Create Invoice"
            icon="file-plus"
            onPress={() =>
              navigation.navigate("TranscriptReview", { transcript: "" })
            }
          />
          <QuickActionButton
            title="View History"
            icon="list"
            onPress={() =>
              navigation.navigate("Main", { screen: "InvoicesTab" } as any)
            }
          />
          <QuickActionButton
            title="Material Costs"
            icon="box"
            onPress={() => navigation.navigate("MaterialCostCapture" as any)}
          />
        </View>
      </Section>

      {/* Recent Activity Section */}
      <Section>
        <View style={styles.sectionHeader}>
          <SectionTitle title="Recent Activity" />
          <ThemedText
            type="link"
            style={[styles.seeAllLink, { color: BrandColors.constructionGold }]}
            onPress={() =>
              navigation.navigate("Main", { screen: "InvoicesTab" } as any)
            }
          >
            See All
          </ThemedText>
        </View>
        {recentInvoices.length > 0 ? (
          <View style={styles.activityList}>
            {recentInvoices.map((invoice) => (
              <ActivityItem
                key={invoice.id}
                clientName={invoice.clientName}
                invoiceNumber={invoice.invoiceNumber}
                amount={invoice.total}
                status={invoice.status as ActivityStatus}
                date={new Date(invoice.createdAt).toLocaleDateString()}
                onPress={() =>
                  navigation.navigate("InvoiceDetail", { invoiceId: invoice.id })
                }
              />
            ))}
          </View>
        ) : (
          <GlassCard style={styles.emptyCard}>
            <ThemedText
              type="body"
              style={[styles.emptyText, { color: theme.textSecondary }]}
            >
              No recent activity. Start by recording your first job!
            </ThemedText>
          </GlassCard>
        )}
      </Section>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroContainer: {
    height: 220,
    position: "relative",
    marginHorizontal: -Spacing.lg,
    marginTop: -Spacing.lg,
    marginBottom: Spacing.md,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  heroGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 160,
  },
  heroContent: {
    position: "absolute",
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
  },
  heroTitle: {
    marginBottom: 4,
  },
  heroSubtitle: {
    fontWeight: "700",
  },
  kpiRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  seeAllLink: {
    fontWeight: "600",
  },
  activityList: {
    gap: Spacing.sm,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  emptyText: {
    textAlign: "center",
  },
});
