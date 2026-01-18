import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "InvoiceDraft">;

export default function InvoiceDraftScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { addInvoice } = useInvoiceStore();

  const invoiceData = route.params?.invoiceData || {
    clientName: "Sample Client",
    clientEmail: "client@example.com",
    clientPhone: "(555) 000-0000",
    clientAddress: "123 Sample St",
    jobAddress: "123 Sample St",
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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const invoice = addInvoice(invoiceData);
    navigation.navigate("InvoicePreview", { invoiceId: invoice.id });
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing["3xl"],
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              INVOICE DRAFT
            </ThemedText>
            <ThemedText type="h2">{invoiceData.clientName}</ThemedText>
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
            {invoiceData.jobAddress}
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
          {invoiceData.items.map((item: any, index: number) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                index < invoiceData.items.length - 1 && {
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
          <View style={styles.subtotalRow}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              Materials Subtotal
            </ThemedText>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {formatCurrency(invoiceData.materialsTotal)}
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
                {invoiceData.laborHours} hours x{" "}
                {formatCurrency(invoiceData.laborRate)}/hr
              </ThemedText>
            </View>
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              {formatCurrency(invoiceData.laborTotal)}
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
              {formatCurrency(invoiceData.subtotal)}
            </ThemedText>
          </View>
          <View style={styles.totalRow}>
            <ThemedText type="body">
              Tax ({(invoiceData.taxRate * 100).toFixed(0)}%)
            </ThemedText>
            <ThemedText type="body">
              {formatCurrency(invoiceData.taxAmount)}
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
              {formatCurrency(invoiceData.total)}
            </ThemedText>
          </View>
        </View>
      </View>

      {invoiceData.safetyNotes.length > 0 ? (
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
            <ThemedText type="body">{invoiceData.safetyNotes}</ThemedText>
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
          <ThemedText type="body">{invoiceData.paymentTerms}</ThemedText>
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
    </ScrollView>
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
