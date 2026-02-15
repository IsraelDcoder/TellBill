import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useInvoiceStore } from "@/stores/invoiceStore";
import { formatCurrency } from "@/utils/formatCurrency";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "InvoicePreview">;

// ✅ RULE 2: SAFE HELPERS (MANDATORY)
const safeText = (value?: string | null): string => value ?? '';
const safeArray = <T,>(value?: T[] | null): T[] => value ?? [];
const safeNumber = (value?: number | null): number => value ?? 0;

export default function InvoicePreviewScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { getInvoice } = useInvoiceStore();
  const [isDownloading, setIsDownloading] = React.useState(false);

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
      </View>
    );
  }



  // ✅ CALCULATION FUNCTION: Ensure all totals are calculated (fallback for incomplete data)
  const ensureCalculatedTotals = (inv: any) => {
    // If totals are already calculated correctly, return as is
    if (safeNumber(inv.subtotal) > 0 || safeNumber(inv.total) > 0) {
      return inv;
    }

    // Otherwise, recalculate (for invoices created before fix)
    console.log("[InvoicePreview] ⚠️ Detected uncalculated invoice data, calculating now...");
    
    const itemsTotal = safeArray(inv.items).reduce(
      (sum: number, item: any) => sum + safeNumber(item.total),
      0
    );
    
    const laborTotalCents = safeNumber(inv.laborHours) * safeNumber(inv.laborRate);
    const materialsTotalCents = safeNumber(inv.materialsTotal);
    
    const subtotalCents = itemsTotal + laborTotalCents + materialsTotalCents;
    const taxRate = safeNumber(inv.taxRate) || 0.08;
    const taxAmountCents = Math.round(subtotalCents * taxRate);
    const totalCents = subtotalCents + taxAmountCents;

    console.log("[InvoicePreview] ✅ Recalculated totals:", {
      subtotal: subtotalCents / 100,
      taxAmount: taxAmountCents / 100,
      total: totalCents / 100,
    });

    return {
      ...inv,
      subtotal: subtotalCents,
      taxAmount: taxAmountCents,
      total: totalCents,
    };
  };

  // ✅ Ensure invoice has calculated totals
  const calculatedInvoice = ensureCalculatedTotals(invoice);

  const handleDownloadPDF = async () => {
    try {
      setIsDownloading(true);

      // Generate HTML content for the invoice
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: white; }
              .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
              .company { }
              .company h1 { margin: 0; font-size: 28px; color: #2D2E2E; }
              .company p { margin: 0; font-size: 12px; color: #6B7280; }
              .invoice-title { text-align: right; }
              .invoice-title h2 { margin: 0; font-size: 24px; color: #FFB400; }
              .invoice-title p { margin: 0; font-size: 12px; color: #6B7280; }
              .addresses { display: flex; justify-content: space-between; margin-bottom: 30px; }
              .address-block { }
              .address-block h3 { margin: 0; font-size: 10px; color: #6B7280; font-weight: bold; }
              .address-block p { margin: 5px 0; font-size: 12px; color: #2D2E2E; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
              th { background: #f3f4f6; padding: 10px; text-align: left; font-size: 12px; font-weight: bold; border-bottom: 1px solid #e5e7eb; }
              td { padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; }
              .total-section { text-align: right; margin-top: 20px; }
              .total-row { display: flex; justify-content: flex-end; margin-bottom: 10px; }
              .total-label { width: 150px; font-weight: bold; }
              .total-value { width: 100px; text-align: right; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="company">
                <h1>TellBill</h1>
                <p>Voice-First Invoicing</p>
              </div>
              <div class="invoice-title">
                <h2>INVOICE</h2>
                <p>${invoice.invoiceNumber}</p>
              </div>
            </div>

            <div class="addresses">
              <div class="address-block">
                <h3>BILL TO</h3>
                <p>${invoice.clientName}</p>
                <p>${invoice.clientAddress}</p>
              </div>
              <div class="address-block">
                <h3>DATE</h3>
                <p>${new Date(invoice.createdAt).toLocaleDateString()}</p>
                <p>Terms: ${invoice.paymentTerms}</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="flex: 2;">Description</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items
                  .map(
                    (item) => `
                  <tr>
                    <td style="flex: 2;">${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.unitPrice)}</td>
                    <td style="text-align: right;">${formatCurrency(item.total)}</td>
                  </tr>
                `
                  )
                  .join("")}
                ${
                  invoice.laborHours > 0
                    ? `
                  <tr>
                    <td style="flex: 2;">Labor</td>
                    <td>${invoice.laborHours}h</td>
                    <td>${formatCurrency(invoice.laborRate)}/hr</td>
                    <td style="text-align: right;">${formatCurrency(invoice.laborTotal)}</td>
                  </tr>
                `
                    : ""
                }
              </tbody>
            </table>

            <div class="total-section">
              <div class="total-row">
                <div class="total-label">Subtotal:</div>
                <div class="total-value">${formatCurrency(invoice.subtotal)}</div>
              </div>
              ${
                invoice.taxAmount > 0
                  ? `
                <div class="total-row">
                  <div class="total-label">${invoice.taxName || "Tax"} (${(invoice.taxRate || 0).toFixed(1)}%):</div>
                  <div class="total-value">${formatCurrency(invoice.taxAmount)}</div>
                </div>
              `
                  : ""
              }
              <div class="total-row" style="border-top: 2px solid #2D2E2E; padding-top: 10px; margin-top: 10px; font-size: 14px; font-weight: bold;">
                <div class="total-label">Total:</div>
                <div class="total-value">${formatCurrency(invoice.total)}</div>
              </div>
            </div>

            ${
              safeText(invoice.safetyNotes)
                ? `
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <h3 style="margin-top: 0; font-size: 12px;">SAFETY NOTES</h3>
                <p style="font-size: 12px; color: #6B7280;">${safeText(invoice.safetyNotes)}</p>
              </div>
            `
                : ""
            }
          </body>
        </html>
      `;

      // Create a filename with invoice number
      const fileName = `Invoice_${invoice.invoiceNumber}_${Date.now()}.html`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      // Write the HTML file
      await FileSystem.writeAsStringAsync(fileUri, htmlContent);

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "text/html",
          dialogTitle: `Download Invoice ${invoice.invoiceNumber}`,
        });
      } else {
        Alert.alert("Success", `Invoice saved to ${fileName}`);
      }
    } catch (error) {
      console.error("Error downloading PDF:", error);
      Alert.alert("Error", "Failed to download invoice. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={{ marginTop: headerHeight + 18, flex: 1 }}
        contentContainerStyle={{
          paddingBottom: Spacing["3xl"],
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.pdfPreview,
            {
              backgroundColor: "#fff",
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.pdfHeader}>
            <View>
              <ThemedText type="h2" style={{ color: BrandColors.slateGrey }}>
                TellBill
              </ThemedText>
              <ThemedText type="small" style={{ color: "#6B7280" }}>
                Voice-First Invoicing
              </ThemedText>
            </View>
            <View style={styles.invoiceInfo}>
              <ThemedText
                type="h3"
                style={{ color: BrandColors.constructionGold }}
              >
                INVOICE
              </ThemedText>
              <ThemedText type="small" style={{ color: "#6B7280" }}>
                {calculatedInvoice.invoiceNumber}
              </ThemedText>
            </View>
          </View>

          <View style={styles.pdfDivider} />

          <View style={styles.pdfAddresses}>
            <View style={styles.addressBlock}>
              <ThemedText
                type="small"
                style={{ color: "#6B7280", marginBottom: 4 }}
              >
                BILL TO
              </ThemedText>
              <ThemedText type="body" style={{ color: BrandColors.slateGrey }}>
                {invoice.clientName}
              </ThemedText>
              <ThemedText type="small" style={{ color: "#6B7280" }}>
                {invoice.clientAddress}
              </ThemedText>
            </View>
            <View style={[styles.addressBlock, { alignItems: "flex-end" }]}>
              <ThemedText
                type="small"
                style={{ color: "#6B7280", marginBottom: 4 }}
              >
                DATE
              </ThemedText>
              <ThemedText type="body" style={{ color: BrandColors.slateGrey }}>
                {new Date(invoice.createdAt).toLocaleDateString()}
              </ThemedText>
              <ThemedText type="small" style={{ color: "#6B7280" }}>
                Terms: {invoice.paymentTerms}
              </ThemedText>
            </View>
          </View>

          <View style={styles.pdfTable}>
            <View style={[styles.tableHeader, { backgroundColor: "#F3F4F6" }]}>
              <ThemedText
                type="small"
                style={[styles.tableHeaderText, { flex: 2 }]}
              >
                Description
              </ThemedText>
              <ThemedText type="small" style={styles.tableHeaderText}>
                Qty
              </ThemedText>
              <ThemedText type="small" style={styles.tableHeaderText}>
                Rate
              </ThemedText>
              <ThemedText
                type="small"
                style={[styles.tableHeaderText, { textAlign: "right" }]}
              >
                Amount
              </ThemedText>
            </View>
            {invoice.items.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <ThemedText
                  type="small"
                  style={[styles.tableCell, { flex: 2, color: "#374151" }]}
                >
                  {item.description}
                </ThemedText>
                <ThemedText type="small" style={[styles.tableCell, { color: "#374151" }]}>
                  {item.quantity}
                </ThemedText>
                <ThemedText type="small" style={[styles.tableCell, { color: "#374151" }]}>
                  {formatCurrency(item.unitPrice)}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={[styles.tableCell, { textAlign: "right", color: "#374151" }]}
                >
                  {formatCurrency(item.total)}
                </ThemedText>
              </View>
            ))}
            {invoice.laborHours > 0 ? (
              <View style={styles.tableRow}>
                <ThemedText
                  type="small"
                  style={[styles.tableCell, { flex: 2, color: "#374151" }]}
                >
                  Labor
                </ThemedText>
                <ThemedText type="small" style={[styles.tableCell, { color: "#374151" }]}>
                  {invoice.laborHours}h
                </ThemedText>
                <ThemedText type="small" style={[styles.tableCell, { color: "#374151" }]}>
                  {formatCurrency(invoice.laborRate)}/hr
                </ThemedText>
                <ThemedText
                  type="small"
                  style={[styles.tableCell, { textAlign: "right", color: "#374151" }]}
                >
                  {formatCurrency(invoice.laborTotal)}
                </ThemedText>
              </View>
            ) : null}
          </View>

          <View style={styles.pdfTotals}>
            <View style={styles.totalLine}>
              <ThemedText type="small" style={{ color: "#6B7280" }}>
                Subtotal
              </ThemedText>
              <ThemedText type="small" style={{ color: "#374151" }}>
                {formatCurrency(safeNumber(calculatedInvoice.subtotal))}
              </ThemedText>
            </View>
            <View style={styles.totalLine}>
              <ThemedText type="small" style={{ color: "#6B7280" }}>
                Tax ({(safeNumber(calculatedInvoice.taxRate) * 100).toFixed(0)}%)
              </ThemedText>
              <ThemedText type="small" style={{ color: "#374151" }}>
                {formatCurrency(safeNumber(calculatedInvoice.taxAmount))}
              </ThemedText>
            </View>
            <View
              style={[
                styles.totalLine,
                styles.grandTotal,
                { borderTopColor: "#E5E7EB" },
              ]}
            >
              <ThemedText type="h4" style={{ color: BrandColors.slateGrey }}>
                Total Due
              </ThemedText>
              <ThemedText
                type="h3"
                style={{ color: BrandColors.constructionGold }}
              >
                {formatCurrency(safeNumber(calculatedInvoice.total))}
              </ThemedText>
            </View>
          </View>

          {safeText(invoice.safetyNotes) ? (
            <View style={styles.pdfNotes}>
              <ThemedText
                type="small"
                style={{ color: "#6B7280", marginBottom: 4 }}
              >
                SAFETY NOTES
              </ThemedText>
              <ThemedText type="small" style={{ color: "#374151" }}>
                {safeText(invoice.safetyNotes)}
              </ThemedText>
            </View>
          ) : null}
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
        <Button
          variant="outline"
          onPress={handleDownloadPDF}
          disabled={isDownloading}
          style={styles.footerButton}
        >
          <View style={styles.buttonContent}>
            {isDownloading ? (
              <ActivityIndicator size="small" color={BrandColors.constructionGold} />
            ) : (
              <Feather name="download" size={18} color={BrandColors.constructionGold} />
            )}
            <ThemedText style={{ color: BrandColors.constructionGold, fontWeight: "600", marginLeft: isDownloading ? 8 : 0 }}>
              {isDownloading ? "Downloading..." : "Download PDF"}
            </ThemedText>
          </View>
        </Button>
        <Button
          onPress={() => navigation.navigate("SendInvoice", { invoiceId: invoice.id })}
          style={styles.footerButton}
        >
          <View style={styles.buttonContent}>
            <Feather name="send" size={18} color={BrandColors.slateGrey} />
            <ThemedText style={{ color: BrandColors.slateGrey, fontWeight: "600" }}>
              Send Invoice
            </ThemedText>
          </View>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pdfPreview: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  pdfHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  invoiceInfo: {
    alignItems: "flex-end",
  },
  pdfDivider: {
    height: 2,
    backgroundColor: BrandColors.constructionGold,
    marginBottom: Spacing.lg,
  },
  pdfAddresses: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xl,
  },
  addressBlock: {
    flex: 1,
  },
  pdfTable: {
    marginBottom: Spacing.xl,
  },
  tableHeader: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  tableHeaderText: {
    flex: 1,
    fontWeight: "600",
    color: "#374151",
  },
  tableRow: {
    flexDirection: "row",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableCell: {
    flex: 1,
  },
  pdfTotals: {
    alignItems: "flex-end",
    marginBottom: Spacing.xl,
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
    marginBottom: Spacing.xs,
  },
  grandTotal: {
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  pdfNotes: {
    backgroundColor: "#F9FAFB",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
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
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
});
