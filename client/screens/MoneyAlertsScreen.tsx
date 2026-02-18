import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { LockedFeatureOverlay } from "@/components/LockedFeatureOverlay";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors, BorderRadius } from "@/constants/theme";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useMoneyAlertsStore, MoneyAlert } from "@/stores/moneyAlertsStore";
import { MoneyAlertsService } from "@/services/moneyAlertsService";
import { MoneyAlertCard } from "@/components/MoneyAlertCard";
import { FixAlertModal } from "@/components/FixAlertModal";
import { ResolveAlertModal } from "@/components/ResolveAlertModal";

export default function MoneyAlertsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { currentPlan } = useSubscriptionStore();

  // Store and state
  const { alerts, summary, isLoading, error, setAlerts, setSummary, setIsLoading, setError, removeAlert, updateAlert } =
    useMoneyAlertsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [fixModalVisible, setFixModalVisible] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<MoneyAlert | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  // Feature lock - paid plans only
  const isLocked = currentPlan === "free";

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [alertsData, summaryData] = await Promise.all([
        MoneyAlertsService.getAlerts(),
        MoneyAlertsService.getSummary(),
      ]);

      setAlerts(alertsData?.data?.alerts || []);
      setSummary(summaryData?.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch alerts";
      setError(message);
      console.error("[Money Alerts Screen] Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAlerts();
    setRefreshing(false);
  };

  const handleFix = (alert: MoneyAlert) => {
    setSelectedAlert(alert);
    setFixModalVisible(true);
  };

  const handleFixSubmit = async (action: string) => {
    if (!selectedAlert) return;

    setModalLoading(true);
    try {
      await MoneyAlertsService.fixAlert(selectedAlert.id, action);
      removeAlert(selectedAlert.id);
      setFixModalVisible(false);
      setSelectedAlert(null);

      // Show success toast
      Alert.alert("Success", "Alert marked as fixed!");

      // Refresh data
      await fetchAlerts();
    } catch (err) {
      console.error("[Money Alerts] Fix error:", err);
      Alert.alert("Error", "Failed to fix alert. Please try again.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleResolve = (alert: MoneyAlert) => {
    setSelectedAlert(alert);
    setResolveModalVisible(true);
  };

  const handleResolveSubmit = async (reason: string, note?: string) => {
    if (!selectedAlert) return;

    setModalLoading(true);
    try {
      await MoneyAlertsService.resolveAlert(selectedAlert.id, reason, note);
      removeAlert(selectedAlert.id);
      setResolveModalVisible(false);
      setSelectedAlert(null);

      // Show success toast
      Alert.alert("Success", "Alert marked as resolved!");

      // Refresh data
      await fetchAlerts();
    } catch (err) {
      console.error("[Money Alerts] Resolve error:", err);
      Alert.alert("Error", "Failed to resolve alert. Please try again.");
    } finally {
      setModalLoading(false);
    }
  };

  // Locked state for free users
  if (isLocked) {
    return <LockedFeatureOverlay feature="money_alerts" />;
  }

  // Error state
  if (error) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.centerContent, { paddingTop: headerHeight + Spacing.xl }]}>
          <Feather name="alert-circle" size={48} color={theme.textSecondary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
            {error}
          </ThemedText>
          <Pressable
            style={[
              styles.retryButton,
              { backgroundColor: BrandColors.constructionGold },
            ]}
            onPress={fetchAlerts}
          >
            <ThemedText type="body" style={{ color: "white", fontWeight: "600" }}>
              Try Again
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Loading state
  if (isLoading && alerts.length === 0) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={[styles.centerContent, { paddingTop: Spacing.xl }]}>
          <ActivityIndicator size="large" color={BrandColors.constructionGold} />
        </View>
      </ThemedView>
    );
  }

  // Empty state
  if (alerts.length === 0) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <FlatList
          data={[]}
          renderItem={() => null}
          ListHeaderComponent={
            <View style={{ paddingTop: headerHeight, paddingHorizontal: Spacing.lg }}>
              <View style={styles.header}>
                <ThemedText type="h2">Money Alerts</ThemedText>
                <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                  Work you may have forgotten to bill for
                </ThemedText>
              </View>

              <View style={styles.spacer} />

              <View style={styles.emptyState}>
                <Feather name="check-circle" size={64} color={BrandColors.constructionGold} />
                <ThemedText type="h4" style={{ marginTop: Spacing.lg }}>
                  ✅ No unbilled work detected
                </ThemedText>
                <ThemedText
                  type="body"
                  style={{
                    color: theme.textSecondary,
                    textAlign: "center",
                    marginTop: Spacing.sm,
                  }}
                >
                  TellBill is watching your workflow for missed money.
                </ThemedText>
              </View>
            </View>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          scrollEnabled={false}
        />
      </ThemedView>
    );
  }

  // Main list view
  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={alerts}
        renderItem={({ item }) => (
          <MoneyAlertCard
            alert={item}
            onFix={handleFix}
            onResolve={handleResolve}
          />
        )}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: Spacing.lg, paddingTop: headerHeight }}>
            <View style={styles.header}>
              <ThemedText type="h2">Money Alerts</ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Work you may have forgotten to bill for
              </ThemedText>
            </View>

            {/* Summary cards */}
            {summary && (
              <View style={styles.summaryRow}>
                <View
                  style={[
                    styles.summaryCard,
                    {
                      backgroundColor: isDark
                        ? theme.backgroundDefault
                        : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Unresolved Alerts
                  </ThemedText>
                  <ThemedText type="h3" style={{ marginTop: Spacing.xs }}>
                    {summary.count}
                  </ThemedText>
                </View>

                <View
                  style={[
                    styles.summaryCard,
                    {
                      backgroundColor: isDark
                        ? theme.backgroundDefault
                        : theme.backgroundSecondary,
                    },
                  ]}
                >
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Estimated Unbilled
                  </ThemedText>
                  <ThemedText type="h3" style={{ marginTop: Spacing.xs, color: BrandColors.constructionGold }}>
                    ${summary.totalAmount}
                  </ThemedText>
                </View>
              </View>
            )}

            <View style={{ height: Spacing.lg }} />
          </View>
        }
        contentContainerStyle={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />

      {/* Fix Alert Modal */}
      <FixAlertModal
        visible={fixModalVisible}
        alert={selectedAlert}
        isLoading={modalLoading}
        onFix={handleFixSubmit}
        onClose={() => {
          setFixModalVisible(false);
          setSelectedAlert(null);
        }}
      />

      {/* Resolve Alert Modal */}
      <ResolveAlertModal
        visible={resolveModalVisible}
        alert={selectedAlert}
        isLoading={modalLoading}
        onResolve={handleResolveSubmit}
        onClose={() => {
          setResolveModalVisible(false);
          setSelectedAlert(null);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  spacer: {
    height: Spacing["2xl"],
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"],
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
  },
});
