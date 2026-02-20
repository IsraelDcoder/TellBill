import React from "react";
import {
  StyleSheet,
  View,
  ImageBackground,
  Dimensions,
  FlatList,
  Pressable,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { getApiUrl } from "@/lib/backendUrl";

import { ThemedText } from "@/components/ThemedText";
import { Section, SectionTitle } from "@/components/layout";
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
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  
  // ✅ Use proper Zustand selectors to subscribe to invoices
  // This ensures the component re-renders ONLY when invoices change
  const invoices = useInvoiceStore((state) => state.invoices);
  const getStats = useInvoiceStore((state) => state.getStats);
  const hydrateInvoices = useInvoiceStore((state) => state.hydrateInvoices);
  
  // ✅ Calculate stats from current invoices
  // This recalculates every render, so it's always fresh
  const stats = getStats();

  useFocusEffect(
    React.useCallback(() => {
      const refetchInvoices = async () => {
        try {
          const token = await AsyncStorage.getItem("authToken");
          if (!token) return;

          const response = await fetch(getApiUrl("/api/data/all"), {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data?.invoices) {
              const parsedInvoices = data.data.invoices.map((inv: any) => ({
                ...inv,
                items: typeof inv.items === 'string' ? JSON.parse(inv.items || '[]') : (inv.items || []),
              }));
              hydrateInvoices(parsedInvoices);
            }
          }
        } catch (err) {
          console.warn("[Home] Refetch error:", err);
        }
      };

      refetchInvoices();
    }, [hydrateInvoices])
  );

  const recentInvoices = invoices
    .sort((a, b) => {
      // ✅ FIXED: Sort by updatedAt (descending) so paid status changes appear
      // Previously: sorted by createdAt only, missing updates
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;  // Most recent first
    })
    .slice(0, 5);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.heroContainer}>
        <ImageBackground
          source={require("../assets/images/dashboard_hero_construction_site.png")}
          style={styles.heroImageBackground}
          imageStyle={styles.heroImageStyle}
          resizeMode="cover"
        >
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
        </ImageBackground>
      </View>

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

      <Section>
        <View style={styles.sectionHeader}>
          <SectionTitle title="Recent Activity" />
          <Pressable
            onPress={() =>
              navigation.navigate("Main", { screen: "InvoicesTab" } as any)
            }
          >
            <ThemedText
              type="link"
              style={[styles.seeAllLink, { color: BrandColors.constructionGold }]}
            >
              See All
            </ThemedText>
          </Pressable>
        </View>
      </Section>
    </View>
  );

  const renderListItem = ({ item }: { item: typeof invoices[0] }) => (
    <ActivityItem
      clientName={item.clientName}
      invoiceNumber={item.invoiceNumber}
      amount={item.total}  // ✅ In cents from centralized money utility
      status={item.status as ActivityStatus}
      date={new Date(item.updatedAt || item.createdAt).toLocaleDateString()}  // ✅ Show update date so paid status changes appear
      onPress={() =>
        navigation.navigate("InvoiceDetail", { invoiceId: item.id })
      }
    />
  );

  const renderEmptyRecent = () => (
    <GlassCard style={styles.emptyCard}>
      <ThemedText
        type="body"
        style={[styles.emptyText, { color: theme.textSecondary }]}
      >
        No recent activity. Start by recording your first job!
      </ThemedText>
    </GlassCard>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={recentInvoices}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={renderListItem}
        ListEmptyComponent={renderEmptyRecent}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        scrollEnabled={true}
        nestedScrollEnabled={false}
      />

      <Pressable
        style={[
          styles.fab,
          { bottom: tabBarHeight + Spacing.lg },
        ]}
        onPress={() => navigation.navigate("VoiceRecording")}
      >
        <Feather name="plus" size={24} color={BrandColors.slateGrey} />
      </Pressable>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  headerContainer: {
    paddingBottom: Spacing.lg,
  },
  heroContainer: {
    width: '120%',
    height: 260,
    marginHorizontal: '-10%',
    marginBottom: Spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  heroImageBackground: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  heroImageStyle: {
    resizeMode: 'cover',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  heroContent: {
    padding: Spacing.lg,
    paddingLeft: Spacing['3xl'],
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  heroSubtitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  kpiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCard: {
    marginVertical: Spacing.lg,
    padding: Spacing.lg,
  },
  emptyText: {
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BrandColors.constructionGold,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
