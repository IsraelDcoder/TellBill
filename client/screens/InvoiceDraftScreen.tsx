import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { useActivityStore } from "@/stores/activityStore";
import { useAuth } from "@/context/AuthContext";
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
  const { addInvoice, updateInvoice } = useInvoiceStore();
  const { currentPlan, invoicesCreated, incrementInvoices } = useSubscriptionStore();
  const { addActivity } = useActivityStore();
  const { user } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const invoiceData = route.params?.invoiceData ?? {
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    clientAddress: "",
    jobAddress: "",
    jobDescription: "",
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

  // Check if user has reached invoice creation limit
  const invoiceLimitFromPlan = PLAN_LIMITS[currentPlan].invoices;
  const hasInvoiceLimit = invoicesCreated >= invoiceLimitFromPlan && currentPlan === "free";

  const formatCurrency = (amount: number) => {
    // Convert from cents to dollars
    const dollars = amount / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(dollars);
  };

  // ✅ CALCULATION FUNCTION: Calculate all totals for manual invoice creation
  const calculateInvoiceTotals = (data: any) => {
    // ✅ Calculate subtotal in cents
    // Sum: items total + labor total + materials total
    const itemsTotal = safeArray(data.items).reduce(
      (sum: number, item: any) => sum + safeNumber(item.total),
      0
    );
    
    const laborTotalCents = safeNumber(data.laborHours) * safeNumber(data.laborRate);
    const materialsTotalCents = safeNumber(data.materialsTotal);
    
    const subtotalCents = itemsTotal + laborTotalCents + materialsTotalCents;

    // ✅ Calculate tax in cents (tax rate is a decimal, e.g., 0.08 for 8%)
    const taxRate = safeNumber(data.taxRate) || 0.08; // Default 8% if not set
    const taxAmountCents = Math.round(subtotalCents * taxRate);

    // ✅ Calculate total in cents
    const totalCents = subtotalCents + taxAmountCents;

    console.log("[InvoiceDraft] ✅ Calculations complete:", {
      itemsTotal: itemsTotal / 100,
      laborTotal: laborTotalCents / 100,
      materialsTotal: materialsTotalCents / 100,
      subtotal: subtotalCents / 100,
      taxRate,
      taxAmount: taxAmountCents / 100,
      total: totalCents / 100,
    });

    return {
      ...data,
      subtotal: subtotalCents,
      taxAmount: taxAmountCents,
      total: totalCents,
    };
  };

  const handleApprove = () => {
    // ✅ DEBUG: Log invoice limit check
    console.log("[InvoiceDraft] Invoice limit check:");
    console.log("[InvoiceDraft] - invoicesCreated:", invoicesCreated);
    console.log("[InvoiceDraft] - invoiceLimitFromPlan:", invoiceLimitFromPlan);
    console.log("[InvoiceDraft] - currentPlan:", currentPlan);
    console.log("[InvoiceDraft] - hasInvoiceLimit:", hasInvoiceLimit);
    
    // Check if user has reached invoice limit
    if (hasInvoiceLimit) {
      console.log("[InvoiceDraft] ❌ Invoice limit reached, showing upgrade modal");
      setShowUpgradeModal(true);
      return;
    }

    console.log("[InvoiceDraft] ✅ Invoice limit check passed, proceeding with invoice creation");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // ✅ CALCULATE ALL TOTALS before creating invoice
    const calculatedInvoiceData = calculateInvoiceTotals(invoiceData);
    
    // ✅ Add userId and createdBy to invoice data
    const invoiceWithUser = {
      ...calculatedInvoiceData,
      userId: user?.id,
      createdBy: user?.name || user?.email || "Unknown",
    };
    
    const invoice = addInvoice(invoiceWithUser);
    
    // Update invoice status to "created" to mark it as successfully created/approved
    updateInvoice(invoice.id, { status: "created" });
    
    // ✅ Log activity: User created invoice
    addActivity({
      userId: user?.id || "unknown",
      userName: user?.name || user?.email || "Unknown User",
      action: "created_invoice",
      resourceType: "invoice",
      resourceId: invoice.id,
      resourceName: invoice.invoiceNumber,
      details: {
        clientName: invoice.clientName,
        total: invoice.total,
      },
    });
    
    // ✅ SAVE TO BACKEND to persist data across logout
    (async () => {
      try {
        const token = await AsyncStorage.getItem("authToken");
        if (!token) {
          console.error("[InvoiceDraft] No auth token found");
          return;
        }

        const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:3000";
        const response = await fetch(`${backendUrl}/api/invoices`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            clientName: invoice.clientName,
            clientEmail: invoice.clientEmail,
            clientPhone: invoice.clientPhone,
            clientAddress: invoice.clientAddress,
            jobAddress: invoice.jobAddress,
            jobDescription: invoice.jobDescription,
            items: invoice.items,
            laborHours: invoice.laborHours,
            laborRate: invoice.laborRate,
            materialsTotal: invoice.materialsTotal,
            // ✅ IMPORTANT: Do NOT send taxRate from client
            // Server will calculate tax based on user's tax profile
            notes: invoice.notes,
            safetyNotes: invoice.safetyNotes,
            paymentTerms: invoice.paymentTerms,
            dueDate: invoice.dueDate,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error("[InvoiceDraft] Save failed:", error);
          return;
        }

        const data = await response.json();
        console.log("[InvoiceDraft] Invoice saved to backend:", data);
      } catch (error) {
        console.error("[InvoiceDraft] Error saving to backend:", error);
        // Don't block navigation if backend save fails
      }
    })();
    
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
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
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
