import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
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
import { transcriptionService } from "@/services/transcriptionService";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "TranscriptReview">;

// ✅ RULE 2: SAFE HELPERS (MANDATORY)
const safeText = (value?: string | null): string => value ?? '';
const safeArray = <T,>(value?: T[] | null): T[] => value ?? [];
const safeNumber = (value?: number | null): number => value ?? 0;

interface ExtractedInvoiceData {
  client_name: string | null;
  client_address: string | null;
  job_description: string | null;
  labor: {
    hours: number | null;
    rate_per_hour: number | null;
    total: number | null;
  };
  materials: Array<{
    name: string;
    quantity: number | null;
    unit_price: number | null;
    total: number | null;
  }>;
  subtotal: number | null;
  notes: string | null;
}

interface FormField {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  value: string;
  placeholder: string;
  multiline?: boolean;
  confidence?: number;
  key: "clientName" | "clientEmail" | "clientPhone" | "jobAddress" | "jobDescription" | "materials" | "laborHours" | "laborRate" | "notes";
}

export default function TranscriptReviewScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const [isLoading, setIsLoading] = useState(true);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    jobAddress: "",
    jobDescription: "",
    materials: "",
    laborHours: "",
    laborRate: "",
    notes: "",
  });
  const [extractedData, setExtractedData] = useState<ExtractedInvoiceData | null>(null);
  const [materialsEdited, setMaterialsEdited] = useState(false);
  const [computedTotals, setComputedTotals] = useState({
    laborTotal: 0,
    materialsTotal: 0,
    subtotal: 0,
  });
  const [isInitialized, setIsInitialized] = useState(false);

  // Extract invoice on mount
  useEffect(() => {
    // Prevent re-running after initialization
    if (isInitialized) {
      return;
    }

    const extractInvoice = async () => {
      try {
        setIsLoading(true);
        setExtractionError(null);

        const { transcript } = route.params;

        if (!transcript || transcript.trim().length === 0) {
          throw new Error("No transcript provided");
        }

        console.log("[TranscriptReview] Extracting invoice from transcript...");
        
        // Call backend extraction API
        const result = await transcriptionService.extractInvoiceData(transcript);

        console.log("[TranscriptReview] Extraction successful:", result);
        setExtractedData(result);

        // ✅ CRITICAL: Populate form with real extracted data
        // Never use mock data
        const materialsString = (() => {
          const materials = safeArray(result.materials);
          if (materials.length === 0) {
            return "";
          }
          try {
            return materials
              .map((m: any) => {
                const parts: string[] = [];
                if (safeNumber(m.quantity)) parts.push(`${m.quantity}`);
                if (safeText(m.name)) parts.push(m.name);
                if (safeNumber(m.unit_price)) parts.push(`$${m.unit_price}`);
                return parts.length > 0 ? parts.join(" ") : "";
              })
              .filter((s: string) => safeText(s).length > 0)
              .join("\n");
          } catch (e) {
            console.warn("[TranscriptReview] Error formatting materials:", e);
            return "";
          }
        })();

        // ✅ COMPUTE SUBTOTAL LOCALLY - MANDATORY FOR FINANCIAL PRODUCT
        const laborHours = safeNumber(result.labor?.hours) || 0;
        const laborRate = safeNumber(result.labor?.rate_per_hour) || 0;
        const laborTotal = (laborHours || 0) * (laborRate || 0);

        // ✅ FIXED: Properly sum material totals, handle missing values  
        const materialsTotal =
          safeArray(result.materials).reduce((sum: number, item: any) => {
            return sum + (safeNumber(item.total) || 0);
          }, 0);

        const computedSubtotal = laborTotal + materialsTotal;

        setComputedTotals({
          laborTotal,
          materialsTotal,
          subtotal: computedSubtotal,
        });

        setFormData({
          clientName: safeText(result.client_name),
          clientEmail: "", // Not in extraction schema
          clientPhone: "", // Not in extraction schema
          jobAddress: safeText(result.client_address),
          jobDescription: safeText(result.job_description),
          materials: materialsString,
          laborHours: safeNumber(result.labor?.hours).toString(),
          laborRate: safeNumber(result.labor?.rate_per_hour).toString(),
          notes: safeText(result.notes),
        });

        setIsLoading(false);
        setIsInitialized(true);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Extraction failed";
        
        // Only log and show alert if user provided a transcript but extraction failed
        // If no transcript was provided, that's normal - user is creating invoice manually
        if (errorMsg !== "No transcript provided") {
          console.error("[TranscriptReview] Extraction error:", error);
          setExtractionError(errorMsg);
          Alert.alert(
            "Extraction Failed",
            `${errorMsg}\n\nYou can manually enter the invoice details below.`,
            [{ text: "OK" }]
          );
        }
        
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    extractInvoice();
  }, []);

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color={BrandColors.constructionGold} />
        <ThemedText type="small" style={{ marginTop: Spacing.lg, color: theme.textSecondary }}>
          Extracting invoice data from transcript...
        </ThemedText>
      </View>
    );
  }

  const fields: FormField[] = [
    {
      label: "Client Name",
      icon: "user",
      value: formData.clientName,
      placeholder: "Enter client name",
      key: "clientName",
    },
    {
      label: "Client Address",
      icon: "map-pin",
      value: formData.jobAddress,
      placeholder: "Enter job site address",
      key: "jobAddress",
    },
    {
      label: "Job Description",
      icon: "briefcase",
      value: formData.jobDescription,
      placeholder: "Describe the work",
      multiline: true,
      key: "jobDescription",
    },
    {
      label: "Materials",
      icon: "package",
      value: formData.materials,
      placeholder: "List materials with quantities and prices",
      multiline: true,
      key: "materials",
    },
    {
      label: "Labor Hours",
      icon: "clock",
      value: formData.laborHours,
      placeholder: "Enter labor hours",
      key: "laborHours",
    },
    {
      label: "Hourly Rate ($)",
      icon: "dollar-sign",
      value: formData.laborRate,
      placeholder: "Enter hourly rate",
      key: "laborRate",
    },
    {
      label: "Notes",
      icon: "feather",
      value: formData.notes,
      placeholder: "Additional notes",
      multiline: true,
      key: "notes",
    },
  ];

  const updateField = (key: keyof typeof formData, value: string) => {
    if (key === "materials") {
      setMaterialsEdited(true);
    }
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerateInvoice = () => {
    try {
      // ✅ PRODUCTION SAFETY: Validate required fields exist
      if (!formData.clientName || formData.clientName.trim().length === 0) {
        Alert.alert("Required Field", "Please enter a client name.");
        return;
      }

      // Parse materials
      const parseItems = (materials: string) => {
        const lines = materials.split("\n").filter((l) => l.trim());
        return lines.map((line, idx) => {
          // Try to parse "quantity name $price" format
          const match = line.match(/(\d+)\s+(.+?)\s+\$?([\d.]+)?/i);
          if (match) {
            const qty = Math.max(1, parseInt(match[1]) || 1);
            const name = match[2].trim();
            const price = match[3] ? parseFloat(match[3]) : 0;
            // ✅ FIXED: Proper rounding to cents
            const unitPriceCents = Math.round(price * 100);
            const totalCents = qty * unitPriceCents;
            return {
              id: `item-${idx}`,
              description: name,
              quantity: qty,
              unitPrice: unitPriceCents,
              total: totalCents,
            };
          }
          return {
            id: `item-${idx}`,
            description: line,
            quantity: 1,
            unitPrice: 0,
            total: 0,
          };
        });
      };

      // ✅ USE EXTRACTED MATERIALS IF NOT EDITED (preserve AI precision)
      let items: any[];
      if (!materialsEdited && safeArray(extractedData?.materials).length > 0) {
        items = safeArray(extractedData?.materials).map((m: any, idx: number) => {
          // ✅ FIXED: Ensure proper cents conversion with rounding
          const qty = safeNumber(m.quantity) || 1;
          const unitPrice = Math.round((safeNumber(m.unit_price) || 0) * 100);
          const total = Math.round((safeNumber(m.total) || 0) * 100);
          return {
            id: `item-${idx}`,
            description: safeText(m.name) || "Item",
            quantity: qty,
            unitPrice,
            // Fallback calculation if total is missing
            total: total > 0 ? total : qty * unitPrice,
          };
        });
      } else {
        items = parseItems(formData.materials);
      }

      // ✅ PRODUCTION SUBTOTAL: Use computed totals (AI not trusted for money)
      const laborTotal = Math.round(computedTotals.laborTotal * 100); // Convert to cents
      const materialsTotal = Math.round(computedTotals.materialsTotal * 100); // Convert to cents
      const subtotal = laborTotal + materialsTotal; // Both now in cents
      const taxRate = 0.08;
      const taxAmount = Math.round(subtotal * taxRate); // Calculate tax in cents
      const total = subtotal + taxAmount; // Total in cents

      navigation.navigate("InvoiceDraft", {
        invoiceData: {
          clientName: safeText(formData.clientName) || "Unnamed Client",
          clientEmail: safeText(formData.clientEmail),
          clientPhone: safeText(formData.clientPhone),
          clientAddress: safeText(formData.jobAddress),
          jobAddress: safeText(formData.jobAddress),
          jobDescription: safeText(formData.jobDescription),
          items,
          laborHours: safeNumber(parseFloat(formData.laborHours)),
          laborRate: safeNumber(parseFloat(formData.laborRate)),
          laborTotal,
          materialsTotal,
          subtotal,
          taxRate,
          taxAmount,
          total,
          notes: safeText(formData.notes),
          status: "draft",
        },
      });
    } catch (error) {
      Alert.alert("Error", "Failed to generate invoice. Please check your data.");
      console.error("Invoice generation error:", error);
    }
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
        {extractionError ? (
          <View style={{ borderColor: "#EF4444", borderWidth: 1, borderRadius: 8, padding: Spacing.md, marginBottom: Spacing.md }}>
            <GlassCard style={styles.errorCard}>
              <View style={styles.errorHeader}>
                <Feather name="alert-circle" size={18} color="#EF4444" />
                <ThemedText type="h4" style={{ color: "#EF4444" }}>
                  Extraction Failed
                </ThemedText>
              </View>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {extractionError}
              </ThemedText>
              <View style={{ marginTop: Spacing.sm }}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                You can manually enter the details below.
              </ThemedText>
            </View>
            </GlassCard>
          </View>
        ) : (
          <GlassCard style={styles.aiInfoCard}>
            <View style={styles.aiInfoHeader}>
              <Feather name="cpu" size={18} color={BrandColors.constructionGold} />
              <ThemedText type="h4">AI-Extracted Data</ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Review and edit the information extracted from your recording.
            </ThemedText>
          </GlassCard>
        )}

        {/* ✅ PRODUCTION SUMMARY WITH COMPUTED TOTALS */}
        {!extractionError && extractedData && (
          <View style={{ marginBottom: Spacing.xl }}>
            <GlassCard style={styles.summaryCard}>
              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
                Invoice Summary
              </ThemedText>
              <View style={styles.summaryRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Labor: ${(computedTotals.laborTotal).toFixed(2)}
                </ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Materials: ${(computedTotals.materialsTotal).toFixed(2)}
                </ThemedText>
              </View>
              <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: Spacing.sm }]}>
                <ThemedText type="h4" style={{ fontWeight: "600" }}>
                  Subtotal: ${(computedTotals.subtotal).toFixed(2)}
                </ThemedText>
              </View>
            </GlassCard>
          </View>
        )}

        {fields.map((field) => {
          return (
            <View key={field.label} style={styles.fieldContainer}>
              <View style={styles.fieldHeader}>
                <View style={styles.fieldLabel}>
                  <Feather
                    name={field.icon}
                    size={16}
                    color={BrandColors.constructionGold}
                  />
                  <ThemedText type="small" style={{ fontWeight: "600" }}>
                    {field.label}
                  </ThemedText>
                </View>
              </View>
              <TextInput
                style={[
                  styles.input,
                  field.multiline && styles.multilineInput,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundDefault
                      : theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={field.value}
                onChangeText={(value) => updateField(field.key, value)}
                placeholder={field.placeholder}
                placeholderTextColor={theme.textSecondary}
                multiline={field.multiline}
                textAlignVertical={field.multiline ? "top" : "center"}
                editable={true}
                selectTextOnFocus={true}
              />
            </View>
          );
        })}

        <Button onPress={handleGenerateInvoice} style={styles.generateButton}>
          Generate Invoice
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  aiInfoCard: {
    marginBottom: Spacing.xl,
  },
  errorCard: {
    marginBottom: Spacing.xl,
    borderWidth: 1,
    backgroundColor: "#EF444410",
  },
  summaryCard: {
    padding: Spacing.md,
    borderWidth: 1,
  },
  aiInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  errorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
  },
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  fieldLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  input: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
  },
  multilineInput: {
    minHeight: 100,
    paddingTop: Spacing.md,
  },
  generateButton: {
    marginTop: Spacing.lg,
  },
});
