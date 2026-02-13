import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useInvoiceStore } from "@/stores/invoiceStore";
import { formatCurrency } from "@/utils/formatCurrency";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "InvoiceDetail">;

// ✅ RULE 2: SAFE HELPERS (MANDATORY)
const safeText = (value?: string | null): string => value ?? '';
const safeArray = <T,>(value?: T[] | null): T[] => value ?? [];
const safeNumber = (value?: number | null): number => value ?? 0;

const statusConfig = {
  draft: { color: "#6B7280", icon: "edit-3" as const, label: "Draft" },
  created: { color: "#8B5CF6", icon: "file-text" as const, label: "Created" },
  sent: { color: "#3B82F6", icon: "send" as const, label: "Sent" },
  pending: { color: "#F59E0B", icon: "clock" as const, label: "Pending" },
  paid: { color: "#22C55E", icon: "check-circle" as const, label: "Paid" },
  overdue: { color: "#EF4444", icon: "alert-circle" as const, label: "Overdue" },
};

export default function InvoiceDetailScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { getInvoice, updateInvoice } = useInvoiceStore();

  const invoice = getInvoice(route.params.invoiceId);

  if (!invoice) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: headerHeight + Spacing.xl,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ThemedText type="h3">Invoice not found</ThemedText>
        <Button onPress={() => navigation.goBack()} style={{ marginTop: Spacing.lg }}>
          Go Back
        </Button>
      </View>
    );
  }

  const status = statusConfig[invoice.status];

  if (!status) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: headerHeight + Spacing.xl,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ThemedText type="h3">Invalid invoice status</ThemedText>
        <Button onPress={() => navigation.goBack()} style={{ marginTop: Spacing.lg }}>
          Go Back
        </Button>
      </View>
    );
  }


  const handleMarkPaid = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateInvoice(invoice.id, {
      status: "paid",
      paidAt: new Date().toISOString(),
    });
  };

  const handleResend = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("SendInvoice", { invoiceId: invoice.id });
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("InvoiceEdit", { invoiceId: invoice.id });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: Spacing["3xl"],
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: `${status.color}15` },
          ]}
        >
          <Feather name={status.icon} size={20} color={status.color} />
          <ThemedText
            type="body"
            style={{ color: status.color, fontWeight: "600" }}
          >
            {status.label}
          </ThemedText>
        </View>

        <GlassCard style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <View>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {invoice.invoiceNumber}
              </ThemedText>
              <ThemedText type="h2">{invoice.clientName}</ThemedText>
            </View>
            <ThemedText
              type="h3"
              style={{ color: BrandColors.constructionGold }}
            >
              {formatCurrency(invoice.total)}
            </ThemedText>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Feather name="calendar" size={16} color={theme.textSecondary} />
              <View>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Created
                </ThemedText>
                <ThemedText type="body">
                  {new Date(invoice.createdAt).toLocaleDateString()}
                </ThemedText>
              </View>
            </View>
            {invoice.sentAt ? (
              <View style={styles.infoItem}>
                <Feather name="send" size={16} color={theme.textSecondary} />
                <View>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    Sent
                  </ThemedText>
                  <ThemedText type="body">
                    {new Date(invoice.sentAt).toLocaleDateString()}
                  </ThemedText>
                </View>
              </View>
            ) : null}
            {invoice.paidAt ? (
              <View style={styles.infoItem}>
                <Feather name="check-circle" size={16} color="#22C55E" />
                <View>
                  <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                    Paid
                  </ThemedText>
                  <ThemedText type="body">
                    {new Date(invoice.paidAt).toLocaleDateString()}
                  </ThemedText>
                </View>
              </View>
            ) : null}
            <View style={styles.infoItem}>
              <Feather name="map-pin" size={16} color={theme.textSecondary} />
              <View style={{ flex: 1 }}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Job Site
                </ThemedText>
                <ThemedText type="body" numberOfLines={2}>
                  {invoice.jobAddress}
                </ThemedText>
              </View>
            </View>
          </View>
        </GlassCard>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Line Items
          </ThemedText>
          <View
            style={[
              styles.itemsContainer,
              {
                backgroundColor: isDark
                  ? theme.backgroundDefault
                  : theme.backgroundSecondary,
              },
            ]}
          >
            {safeArray(invoice.items).map((item, index) => (
              <View
                key={item.id}
                style={[
                  styles.itemRow,
                  index < safeArray(invoice.items).length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: theme.border,
                  },
                ]}
              >
                <View style={styles.itemInfo}>
                  <ThemedText type="body">{item.description}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {item.quantity} x {formatCurrency(item.unitPrice)}
                  </ThemedText>
                </View>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {formatCurrency(item.total)}
                </ThemedText>
              </View>
            ))}
            {invoice.laborHours > 0 ? (
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <ThemedText type="body">Labor</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {invoice.laborHours}h x {formatCurrency(invoice.laborRate)}/hr
                  </ThemedText>
                </View>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {formatCurrency(invoice.laborTotal)}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.section}>
          <View
            style={[
              styles.totalsContainer,
              {
                backgroundColor: isDark
                  ? theme.backgroundDefault
                  : theme.backgroundSecondary,
              },
            ]}
          >
            <View style={styles.totalRow}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Subtotal
              </ThemedText>
              <ThemedText type="body">
                {formatCurrency(invoice.subtotal)}
              </ThemedText>
            </View>
            <View style={styles.totalRow}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Tax ({((invoice.taxRate ?? 0) * 100).toFixed(0)}%)
              </ThemedText>
              <ThemedText type="body">
                {formatCurrency(invoice.taxAmount)}
              </ThemedText>
            </View>
            <View
              style={[
                styles.totalRow,
                styles.grandTotalRow,
                { borderTopColor: theme.border },
              ]}
            >
              <ThemedText type="h4">Total</ThemedText>
              <ThemedText
                type="h3"
                style={{ color: BrandColors.constructionGold }}
              >
                {formatCurrency(invoice.total)}
              </ThemedText>
            </View>
          </View>
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingBottom: insets.bottom + Spacing.lg,
            borderTopColor: theme.border,
          },
        ]}
      >
        {invoice.status === "paid" ? (
          <Button variant="secondary" disabled style={styles.footerButton}>
            Payment Received
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              onPress={handleEdit}
              style={styles.footerButton}
            >
              Edit
            </Button>
            <Button
              variant="outline"
              onPress={handleResend}
              style={styles.footerButton}
            >
              {invoice.status === "draft" ? "Send Invoice" : "Resend"}
            </Button>
            <Button onPress={handleMarkPaid} style={styles.footerButton}>
              Mark as Paid
            </Button>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  mainCard: {
    marginBottom: Spacing.xl,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  divider: {
    height: 1,
    marginBottom: Spacing.lg,
  },
  infoGrid: {
    gap: Spacing.md,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  itemsContainer: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
  },
  itemInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  totalsContainer: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: 0,
  },
  footer: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
  },
});
