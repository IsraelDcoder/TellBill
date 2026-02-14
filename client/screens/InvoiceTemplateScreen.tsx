import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { usePreferencesStore } from "@/stores/preferencesStore";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  features: string[];
}

const TEMPLATES: Template[] = [
  {
    id: "professional",
    name: "Professional",
    description: "Clean and professional design",
    preview: "Modern layout with company logo and detailed itemization",
    features: ["Company logo", "Detailed breakdown", "Professional colors"],
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Simple and straightforward",
    preview: "Minimal design with essential information only",
    features: ["Simple layout", "Easy to read", "Quick to generate"],
  },
  {
    id: "modern",
    name: "Modern",
    description: "Contemporary design with graphics",
    preview: "Modern layout with accent colors and visual elements",
    features: ["Contemporary design", "Accent colors", "Visual elements"],
  },
  {
    id: "formal",
    name: "Formal",
    description: "Traditional business format",
    preview: "Traditional formal invoice layout",
    features: ["Formal structure", "Legal-compliant", "Professional"],
  },
];

export default function InvoiceTemplateScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { invoiceTemplate, setInvoiceTemplate } = usePreferencesStore();
  const [selectedTemplate, setSelectedTemplate] = useState(invoiceTemplate);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSelectTemplate = (id: string) => {
    setSelectedTemplate(id);
  };

  const handleSaveTemplate = async () => {
    setIsLoading(true);
    try {
      // Save to store
      setInvoiceTemplate(selectedTemplate);
      
      // TODO: Send update to backend
      console.log("Template changed to:", selectedTemplate);
      
      setShowSuccess(true);
      
      // Auto-hide success and navigate back
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Invoice Template
        </ThemedText>
        <ThemedText type="small" style={[styles.description, { color: theme.textSecondary }]}>
          Choose the template style for your invoices
        </ThemedText>

        <View style={styles.templateGrid}>
          {TEMPLATES.map((template) => (
            <Pressable
              key={template.id}
              onPress={() => handleSelectTemplate(template.id)}
              style={[
                styles.templateCard,
                {
                  backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundSecondary,
                  borderColor: selectedTemplate === template.id 
                    ? BrandColors.constructionGold 
                    : theme.border,
                  borderWidth: selectedTemplate === template.id ? 2 : 1,
                },
              ]}
            >
              <View style={styles.templateHeader}>
                <View style={{ flex: 1 }}>
                  <ThemedText type="h4" style={styles.templateName}>
                    {template.name}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {template.description}
                  </ThemedText>
                </View>
                {selectedTemplate === template.id && (
                  <View style={styles.checkmark}>
                    <Feather name="check" size={20} color={BrandColors.constructionGold} />
                  </View>
                )}
              </View>

              <View
                style={[
                  styles.previewBox,
                  {
                    backgroundColor: isDark ? theme.backgroundSecondary : theme.backgroundDefault,
                  },
                ]}
              >
                <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
                  Preview
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.text, lineHeight: 18 }}>
                  {template.preview}
                </ThemedText>
              </View>

              <View style={styles.featuresList}>
                {template.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Feather name="check" size={14} color={BrandColors.constructionGold} />
                    <ThemedText type="small" style={{ marginLeft: Spacing.sm }}>
                      {feature}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </Pressable>
          ))}
        </View>

        {showSuccess && (
          <View style={[styles.successMessage, { backgroundColor: `${BrandColors.constructionGold}20` }]}>
            <Feather name="check-circle" size={18} color={BrandColors.constructionGold} />
            <ThemedText type="small" style={{ color: BrandColors.constructionGold, marginLeft: Spacing.sm }}>
              Template updated successfully!
            </ThemedText>
          </View>
        )}

        <Button
          onPress={handleSaveTemplate}
          disabled={isLoading || showSuccess || selectedTemplate === invoiceTemplate}
          style={{ marginTop: showSuccess ? Spacing.md : Spacing.lg }}
        >
          {isLoading ? "Saving..." : showSuccess ? "Saved!" : "Save Template"}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    fontWeight: "700",
  },
  description: {
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  templateGrid: {
    gap: Spacing.md,
  },
  templateCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  templateHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
  },
  templateName: {
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  checkmark: {
    marginLeft: Spacing.md,
  },
  previewBox: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  featuresList: {
    gap: Spacing.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  successMessage: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    marginTop: Spacing.lg,
  },
});
