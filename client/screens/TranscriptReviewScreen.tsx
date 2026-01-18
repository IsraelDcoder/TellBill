import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  ScrollView,
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "TranscriptReview">;

interface FormField {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  value: string;
  placeholder: string;
  multiline?: boolean;
  confidence?: number;
}

export default function TranscriptReviewScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const [formData, setFormData] = useState({
    clientName: "ABC Construction",
    clientEmail: "contact@abcconstruction.com",
    clientPhone: "(555) 123-4567",
    jobAddress: "1234 Main Street, Building A",
    materials: "50 bags of cement at $12 each\n100 rebar pieces at $8 each\n20 sheets of plywood at $45 each",
    laborHours: "8",
    laborRate: "75",
    safetyNotes: "Hard hats required, scaffolding inspected",
    paymentTerms: "Net 30",
  });

  const fields: FormField[] = [
    {
      label: "Client Name",
      icon: "user",
      value: formData.clientName,
      placeholder: "Enter client name",
      confidence: 95,
    },
    {
      label: "Client Email",
      icon: "mail",
      value: formData.clientEmail,
      placeholder: "Enter client email",
      confidence: 88,
    },
    {
      label: "Client Phone",
      icon: "phone",
      value: formData.clientPhone,
      placeholder: "Enter phone number",
      confidence: 92,
    },
    {
      label: "Job Address",
      icon: "map-pin",
      value: formData.jobAddress,
      placeholder: "Enter job site address",
      confidence: 97,
    },
    {
      label: "Materials List",
      icon: "package",
      value: formData.materials,
      placeholder: "List materials with quantities and prices",
      multiline: true,
      confidence: 82,
    },
    {
      label: "Labor Hours",
      icon: "clock",
      value: formData.laborHours,
      placeholder: "Enter labor hours",
      confidence: 90,
    },
    {
      label: "Hourly Rate ($)",
      icon: "dollar-sign",
      value: formData.laborRate,
      placeholder: "Enter hourly rate",
      confidence: 85,
    },
    {
      label: "Safety Notes",
      icon: "shield",
      value: formData.safetyNotes,
      placeholder: "Enter safety notes",
      multiline: true,
      confidence: 94,
    },
    {
      label: "Payment Terms",
      icon: "credit-card",
      value: formData.paymentTerms,
      placeholder: "Enter payment terms",
      confidence: 96,
    },
  ];

  const updateField = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return theme.textSecondary;
    if (confidence >= 90) return "#22C55E";
    if (confidence >= 80) return "#F59E0B";
    return "#EF4444";
  };

  const handleGenerateInvoice = () => {
    const parseItems = (materials: string) => {
      const lines = materials.split("\n").filter((l) => l.trim());
      return lines.map((line, idx) => {
        const match = line.match(/(\d+)\s+(.+?)\s+at\s+\$(\d+)/i);
        if (match) {
          const qty = parseInt(match[1]);
          const price = parseInt(match[3]);
          return {
            id: `item-${idx}`,
            description: match[2].trim(),
            quantity: qty,
            unitPrice: price,
            total: qty * price,
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

    const items = parseItems(formData.materials);
    const materialsTotal = items.reduce((sum, item) => sum + item.total, 0);
    const laborHours = parseFloat(formData.laborHours) || 0;
    const laborRate = parseFloat(formData.laborRate) || 0;
    const laborTotal = laborHours * laborRate;
    const subtotal = materialsTotal + laborTotal;
    const taxRate = 0.08;
    const taxAmount = subtotal * taxRate;
    const total = subtotal + taxAmount;

    navigation.navigate("InvoiceDraft", {
      invoiceData: {
        clientName: formData.clientName,
        clientEmail: formData.clientEmail,
        clientPhone: formData.clientPhone,
        clientAddress: formData.jobAddress,
        jobAddress: formData.jobAddress,
        items,
        laborHours,
        laborRate,
        laborTotal,
        materialsTotal,
        subtotal,
        taxRate,
        taxAmount,
        total,
        notes: "",
        safetyNotes: formData.safetyNotes,
        paymentTerms: formData.paymentTerms,
        status: "draft",
      },
    });
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
      <GlassCard style={styles.aiInfoCard}>
        <View style={styles.aiInfoHeader}>
          <Feather name="cpu" size={18} color={BrandColors.constructionGold} />
          <ThemedText type="h4">AI-Extracted Data</ThemedText>
        </View>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Review and edit the information extracted from your recording. Fields
          with lower confidence scores may need attention.
        </ThemedText>
      </GlassCard>

      {fields.map((field, index) => {
        const fieldKey = Object.keys(formData)[index] as keyof typeof formData;
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
              {field.confidence ? (
                <View
                  style={[
                    styles.confidenceBadge,
                    { backgroundColor: `${getConfidenceColor(field.confidence)}20` },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={[
                      styles.confidenceText,
                      { color: getConfidenceColor(field.confidence) },
                    ]}
                  >
                    {field.confidence}% confident
                  </ThemedText>
                </View>
              ) : null}
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
                  borderColor:
                    field.confidence && field.confidence < 85
                      ? "#F59E0B"
                      : theme.border,
                },
              ]}
              value={field.value}
              onChangeText={(value) => updateField(fieldKey, value)}
              placeholder={field.placeholder}
              placeholderTextColor={theme.textSecondary}
              multiline={field.multiline}
              textAlignVertical={field.multiline ? "top" : "center"}
            />
          </View>
        );
      })}

      <Button onPress={handleGenerateInvoice} style={styles.generateButton}>
        Generate Invoice
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  aiInfoCard: {
    marginBottom: Spacing.xl,
  },
  aiInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
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
  confidenceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  confidenceText: {
    fontWeight: "600",
    fontSize: 10,
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
