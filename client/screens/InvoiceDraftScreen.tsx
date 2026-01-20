import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
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
import { UpgradeRequiredModal } from "@/components/UpgradeRequiredModal";
import { useTheme } from "@/hooks/useTheme";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useInvoiceStore } from "@/stores/invoiceStore";
import { PLAN_LIMITS } from "@/constants/planLimits";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "InvoiceDraft">;

// ✅ RULE 2: SAFE HELPERS (MANDATORY)
const safeText = (value?: string | null): string => value ?? '';
const safeArray = <T,>(value?: T[] | null): T[] => value ?? [];
const safeNumber = (value?: number | null): number => value ?? 0;

export default function InvoiceDraftScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { addInvoice } = useInvoiceStore();
  const { currentPlan, invoicesCreated, incrementInvoices } = useSubscriptionStore();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Check if user has reached invoice creation limit
  const invoiceLimit = PLAN_LIMITS[currentPlan].voiceRecordings;
  const hasReachedLimit = invoicesCreated >= invoiceLimit;

  const invoiceData = route.params?.invoiceData ?? {
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    jobAddress: "",
    items: [],
    laborHours: 0,
    laborRate: 0,
    laborTotal: 0,
    materialsTotal: 0,
    subtotal: 0,
    taxRate: 0.08,
    taxAmount: 0,
    total: 0,
    notes: "",
    safetyNotes: "",
    paymentTerms: "Net 30",
    status: "draft" as const,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const handleApprove = () => {
    // Check if user has reached invoice limit
    if (hasReachedLimit) {
      setShowUpgradeModal(true);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const invoice = addInvoice(invoiceData);
    incrementInvoices();
    navigation.navigate("InvoicePreview", { invoiceId: invoice.id });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: insets.bottom + Spacing["3xl"],
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <GlassCard style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              INVOICE DRAFT
            </ThemedText>
            <ThemedText type="h2">{safeText(invoiceData.clientName) || "Unnamed Client"}</ThemedText>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: `${BrandColors.constructionGold}20` },
            ]}
          >
            <ThemedText
              type="small"
              style={{ color: BrandColors.constructionGold, fontWeight: "600" }}
            >
              Draft
            </ThemedText>
          </View>
        </View>
        <View style={styles.addressRow}>
          <Feather name="map-pin" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {safeText(invoiceData.jobAddress) || 'Address not provided'}
          </ThemedText>
        </View>
      </GlassCard>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Materials
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
          {safeArray(invoiceData.items).map((item: any, index: number) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                index < safeArray(invoiceData.items).length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <View style={styles.itemInfo}>
                <ThemedText type="body">{safeText(item.description)}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {safeNumber(item.quantity)} x {formatCurrency(safeNumber(item.unitPrice))}
                </ThemedText>
              </View>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {formatCurrency(safeNumber(item.total))}
              </ThemedText>
            </View>
          ))}
          <View style={styles.subtotalRow}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Materials Subtotal
            </ThemedText>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {formatCurrency(safeNumber(invoiceData.materialsTotal))}
            </ThemedText>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Labor
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
          <View style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <ThemedText type="body">Skilled Labor</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {safeNumber(invoiceData.laborHours)} hours x{" "}
                {formatCurrency(safeNumber(invoiceData.laborRate))}/hr
              </ThemedText>
            </View>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {formatCurrency(safeNumber(invoiceData.laborTotal))}
            </ThemedText>
          </View>
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
            <ThemedText type="body">Subtotal</ThemedText>
            <ThemedText type="body">
              {formatCurrency(safeNumber(invoiceData.subtotal))}
            </ThemedText>
          </View>
          <View style={styles.totalRow}>
            <ThemedText type="body">
              Tax ({(safeNumber(invoiceData.taxRate) * 100).toFixed(0)}%)
            </ThemedText>
            <ThemedText type="body">
              {formatCurrency(safeNumber(invoiceData.taxAmount))}
            </ThemedText>
          </View>
          <View
            style={[
              styles.totalRow,
              styles.grandTotalRow,
              { borderTopColor: theme.border },
            ]}
          >
            <ThemedText type="h3">Total</ThemedText>
            <ThemedText
              type="h2"
              style={{ color: BrandColors.constructionGold }}
            >
              {formatCurrency(safeNumber(invoiceData.total))}
            </ThemedText>
          </View>
        </View>
      </View>

      {safeText(invoiceData.safetyNotes) ? (
        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Safety Notes
          </ThemedText>
          <View
            style={[
              styles.notesContainer,
              {
                backgroundColor: isDark
                  ? theme.backgroundDefault
                  : theme.backgroundSecondary,
              },
            ]}
          >
            <ThemedText type="body">{safeText(invoiceData.safetyNotes)}</ThemedText>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Payment Terms
        </ThemedText>
        <View
          style={[
            styles.notesContainer,
            {
              backgroundColor: isDark
                ? theme.backgroundDefault
                : theme.backgroundSecondary,
            },
          ]}
        >
          <ThemedText type="body">{safeText(invoiceData.paymentTerms)}</ThemedText>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <Button
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.editButton}
        >
          Edit Details
        </Button>
        <Button onPress={handleApprove} style={styles.approveButton}>
          Approve Invoice
        </Button>
      </View>

      <UpgradeRequiredModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        type="invoice"
      />
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    marginBottom: Spacing.xl,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
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
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
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
  notesContainer: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  editButton: {
    flex: 1,
  },
  approveButton: {
    flex: 1,
  },
});
