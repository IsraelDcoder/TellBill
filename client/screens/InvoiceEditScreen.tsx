import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TextInput as RNTextInput,
  Pressable,
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
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useInvoiceStore } from "@/stores/invoiceStore";
import { useAuth } from "@/context/AuthContext";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "InvoiceEdit">;

// ✅ RULE 2: SAFE HELPERS (MANDATORY)
const safeText = (value?: string | null): string => value ?? '';
const safeArray = <T,>(value?: T[] | null): T[] => value ?? [];
const safeNumber = (value?: number | null): number => value ?? 0;

export default function InvoiceEditScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { getInvoice, updateInvoice } = useInvoiceStore();
  const { user } = useAuth();

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

  // Initialize form state with current invoice data
  const [invoiceData, setInvoiceData] = useState({
    clientName: safeText(invoice.clientName),
    clientEmail: safeText(invoice.clientEmail),
    clientPhone: safeText(invoice.clientPhone),
    clientAddress: safeText(invoice.clientAddress),
    jobAddress: safeText(invoice.jobAddress),
    jobDescription: safeText(invoice.jobDescription),
    notes: safeText(invoice.notes),
    paymentTerms: safeText(invoice.paymentTerms),
  });

  const [isSaving, setIsSaving] = useState(false);

  const formatCurrency = (amount: number) => {
    // Convert from cents to dollars if needed
    const dollars = amount > 100 ? amount / 100 : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(dollars);
  };

  const handleSave = async () => {
    // Validate required fields
    if (!invoiceData.clientName.trim()) {
      Alert.alert("Required Field", "Please enter a client name");
      return;
    }

    try {
      setIsSaving(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Update local store
      updateInvoice(invoice.id, {
        clientName: invoiceData.clientName.trim(),
        clientEmail: invoiceData.clientEmail.trim() || undefined,
        clientPhone: invoiceData.clientPhone.trim() || undefined,
        clientAddress: invoiceData.clientAddress.trim() || undefined,
        jobAddress: invoiceData.jobAddress.trim() || undefined,
        jobDescription: invoiceData.jobDescription.trim() || undefined,
        notes: invoiceData.notes.trim() || undefined,
        paymentTerms: invoiceData.paymentTerms.trim() || undefined,
      });

      // Update backend
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        console.error("[InvoiceEdit] No auth token found");
        Alert.alert("Error", "Authentication failed. Please log in again.");
        return;
      }

      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:3000";
      const response = await fetch(`${backendUrl}/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          clientName: invoiceData.clientName.trim(),
          clientEmail: invoiceData.clientEmail.trim() || undefined,
          clientPhone: invoiceData.clientPhone.trim() || undefined,
          clientAddress: invoiceData.clientAddress.trim() || undefined,
          jobAddress: invoiceData.jobAddress.trim() || undefined,
          jobDescription: invoiceData.jobDescription.trim() || undefined,
          notes: invoiceData.notes.trim() || undefined,
          paymentTerms: invoiceData.paymentTerms.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("[InvoiceEdit] Save failed:", error);
        Alert.alert("Error", error.message || "Failed to save invoice");
        return;
      }

      console.log("[InvoiceEdit] ✅ Invoice updated successfully");
      Alert.alert("Success", "Invoice updated successfully");
      navigation.goBack();
    } catch (error) {
      console.error("[InvoiceEdit] Error saving invoice:", error);
      Alert.alert("Error", "Failed to save invoice. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (invoiceData.clientName !== invoice.clientName ||
        invoiceData.clientEmail !== invoice.clientEmail ||
        invoiceData.clientPhone !== invoice.clientPhone ||
        invoiceData.clientAddress !== invoice.clientAddress ||
        invoiceData.jobAddress !== invoice.jobAddress ||
        invoiceData.jobDescription !== invoice.jobDescription ||
        invoiceData.notes !== invoice.notes ||
        invoiceData.paymentTerms !== invoice.paymentTerms) {
      Alert.alert(
        "Discard Changes",
        "Are you sure you want to discard your changes?",
        [
          { text: "Keep Editing", onPress: () => {} },
          { text: "Discard", onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  const TextInputField = ({ label, placeholder, value, onChangeText }: { label: string; placeholder: string; value: string; onChangeText: (text: string) => void }) => (
    <View style={styles.fieldContainer}>
      <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
        {label}
      </ThemedText>
      <RNTextInput
        style={[
          styles.textInput,
          {
            backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundSecondary,
            color: theme.text,
            borderColor: theme.border,
          },
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );

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
                EDIT INVOICE
              </ThemedText>
              <ThemedText type="h2">{invoice.invoiceNumber}</ThemedText>
            </View>
            <ThemedText
              type="h3"
              style={{ color: BrandColors.constructionGold }}
            >
              {formatCurrency(safeNumber(invoice.total))}
            </ThemedText>
          </View>
        </GlassCard>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Client Information
          </ThemedText>
          <TextInputField
            label="Client Name *"
            placeholder="Enter client name"
            value={invoiceData.clientName}
            onChangeText={(text) =>
              setInvoiceData({ ...invoiceData, clientName: text })
            }
          />
          <TextInputField
            label="Client Email"
            placeholder="client@example.com"
            value={invoiceData.clientEmail}
            onChangeText={(text) =>
              setInvoiceData({ ...invoiceData, clientEmail: text })
            }
          />
          <TextInputField
            label="Client Phone"
            placeholder="+1 (555) 123-4567"
            value={invoiceData.clientPhone}
            onChangeText={(text) =>
              setInvoiceData({ ...invoiceData, clientPhone: text })
            }
          />
          <TextInputField
            label="Client Address"
            placeholder="123 Main St, City, State"
            value={invoiceData.clientAddress}
            onChangeText={(text) =>
              setInvoiceData({ ...invoiceData, clientAddress: text })
            }
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Job Information
          </ThemedText>
          <TextInputField
            label="Job Address"
            placeholder="Job site address"
            value={invoiceData.jobAddress}
            onChangeText={(text) =>
              setInvoiceData({ ...invoiceData, jobAddress: text })
            }
          />
          <TextInputField
            label="Job Description"
            placeholder="What work was done?"
            value={invoiceData.jobDescription}
            onChangeText={(text) =>
              setInvoiceData({ ...invoiceData, jobDescription: text })
            }
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Invoice Details
          </ThemedText>
          <TextInputField
            label="Notes"
            placeholder="Additional notes"
            value={invoiceData.notes}
            onChangeText={(text) =>
              setInvoiceData({ ...invoiceData, notes: text })
            }
          />
          <TextInputField
            label="Payment Terms"
            placeholder="e.g., Net 30"
            value={invoiceData.paymentTerms}
            onChangeText={(text) =>
              setInvoiceData({ ...invoiceData, paymentTerms: text })
            }
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Line Items Summary
          </ThemedText>
          <GlassCard style={{ padding: Spacing.lg }}>
            {safeArray(invoice.items).length > 0 && (
              <View style={styles.itemsSummary}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Materials ({invoice.items.length} {invoice.items.length === 1 ? "item" : "items"})
                </ThemedText>
                <ThemedText type="body" style={{ fontWeight: "600", marginBottom: Spacing.md }}>
                  {formatCurrency(
                    safeArray(invoice.items).reduce(
                      (sum, item) => sum + safeNumber(item.total),
                      0
                    )
                  )}
                </ThemedText>
              </View>
            )}
            {invoice.laborHours > 0 && (
              <View style={styles.itemsSummary}>
                <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                  Labor ({safeNumber(invoice.laborHours)}h)
                </ThemedText>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  {formatCurrency(safeNumber(invoice.laborTotal))}
                </ThemedText>
              </View>
            )}
            <View style={[styles.itemsSummary, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: Spacing.md }]}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Total
              </ThemedText>
              <ThemedText type="h4" style={{ color: BrandColors.constructionGold }}>
                {formatCurrency(safeNumber(invoice.total))}
              </ThemedText>
            </View>
          </GlassCard>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
            To edit line items, please create a new invoice
          </ThemedText>
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
          onPress={handleCancel}
          disabled={isSaving}
          style={styles.footerButton}
        >
          Cancel
        </Button>
        <Button
          onPress={handleSave}
          disabled={isSaving}
          style={styles.footerButton}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </View>
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
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    fontFamily: "Nunito_400Regular",
  },
  itemsSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  footer: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderTopWidth: 1,
  },
  footerButton: {
    flex: 1,
  },
});
