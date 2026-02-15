import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useTheme } from "@/hooks/useTheme";
import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Spacing } from "@/constants/theme";
import { getApiUrl } from "@/lib/backendUrl";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface TaxProfile {
  id: string;
  name: string;
  rate: number;
  appliesto: "labor_only" | "materials_only" | "labor_and_materials";
  enabled: boolean;
  isDefault: boolean;
}

const APPLIES_TO_OPTIONS = [
  { label: "Labor only", value: "labor_only" },
  { label: "Materials only", value: "materials_only" },
  { label: "Labor & materials", value: "labor_and_materials" },
];

/**
 * Tax Settings Screen
 * 
 * Allows users to configure invoice-level taxes
 * - Optional: Can be turned on/off
 * - User-configured: No auto-guessing
 * - Immutable: Changes only apply to new invoices
 */
export default function TaxSettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<TaxProfile | null>(null);

  // Form state
  const [taxName, setTaxName] = useState("Sales Tax");
  const [taxRate, setTaxRate] = useState("7.5");
  const [appliesto, setAppliesto] = useState<"labor_only" | "materials_only" | "labor_and_materials">("labor_and_materials");
  const [enabled, setEnabled] = useState(false);

  // Load tax profile on mount
  useEffect(() => {
    loadTaxProfile();
  }, []);

  const loadTaxProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Error", "Not authenticated");
        return;
      }

      const response = await fetch(getApiUrl("/api/tax/profile"), {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load tax profile");
      }

      const data = await response.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
        setTaxName(data.profile.name);
        setTaxRate(String(data.profile.rate));
        setAppliesto(data.profile.appliesto);
        setEnabled(data.profile.enabled);
      }
    } catch (error) {
      console.error("[TaxSettings] Error loading profile:", error);
      // Use defaults if no profile exists
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate inputs
    if (!taxName.trim()) {
      Alert.alert("Error", "Tax name is required");
      return;
    }

    if (taxName.trim().length > 40) {
      Alert.alert("Error", "Tax name must be 40 characters or less");
      return;
    }

    const rate = parseFloat(taxRate);
    if (isNaN(rate) || rate < 0 || rate > 30) {
      Alert.alert("Error", "Tax rate must be between 0 and 30");
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Error", "Not authenticated");
        return;
      }

      const response = await fetch(getApiUrl("/api/tax/profile"), {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: taxName.trim(),
          rate,
          appliesto,
          enabled,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.error || "Failed to save tax profile");
        return;
      }

      if (data.success) {
        setProfile(data.profile);
        Alert.alert("Success", "Tax settings saved successfully");
      }
    } catch (error) {
      console.error("[TaxSettings] Error saving:", error);
      Alert.alert("Error", "Failed to save tax settings");
    } finally {
      setSaving(false);
    }
  };

  const previewSubtotal = 1000; // Example: $1,000
  const previewTaxAmount = enabled ? (previewSubtotal * parseFloat(taxRate)) / 100 : 0;
  const previewTotal = previewSubtotal + previewTaxAmount;

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        style={{ marginTop: headerHeight + 18, flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + Spacing["3xl"],
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ✅ Enable/Disable Toggle */}
        <Card style={styles.section}>
          <View style={styles.toggleSection}>
            <ThemedText type="subtitle" style={{ flex: 1 }}>
              Apply Tax to Invoices
            </ThemedText>
            <Button
              onPress={() => setEnabled(!enabled)}
              variant={enabled ? "primary" : "secondary"}
              size="small"
            >
              {enabled ? "On" : "Off"}
            </Button>
          </View>
          <ThemedText type="caption" style={{ marginTop: Spacing.sm, opacity: 0.7 }}>
            {enabled
              ? "Tax will be applied to new invoices based on your settings"
              : "No tax will be applied to new invoices"}
          </ThemedText>
        </Card>

        {enabled && (
          <>
            {/* ✅ Tax Name Input */}
            <Card style={styles.section}>
              <ThemedText type="subtitle">Tax Name</ThemedText>
              <ThemedText type="caption" style={{ marginTop: Spacing.xs, marginBottom: Spacing.md, opacity: 0.7 }}>
                e.g., "Sales Tax", "VAT", "GST"
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                placeholder="e.g., Sales Tax"
                placeholderTextColor={theme.text + "80"}
                value={taxName}
                onChangeText={setTaxName}
                maxLength={40}
              />
              <ThemedText type="caption" style={{ marginTop: Spacing.xs, opacity: 0.5 }}>
                {taxName.length}/40 characters
              </ThemedText>
            </Card>

            {/* ✅ Tax Rate Input */}
            <Card style={styles.section}>
              <ThemedText type="subtitle">Tax Rate (%)</ThemedText>
              <ThemedText type="caption" style={{ marginTop: Spacing.xs, marginBottom: Spacing.md, opacity: 0.7 }}>
                Percentage from 0 to 30
              </ThemedText>
              <TextInput
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                placeholder="7.5"
                placeholderTextColor={theme.text + "80"}
                value={taxRate}
                onChangeText={setTaxRate}
                keyboardType="decimal-pad"
              />
            </Card>

            {/* ✅ Applies To Selector */}
            <Card style={styles.section}>
              <ThemedText type="subtitle">Applies To</ThemedText>
              <ThemedText type="caption" style={{ marginTop: Spacing.xs, marginBottom: Spacing.md, opacity: 0.7 }}>
                What should be taxed?
              </ThemedText>
              <View style={styles.optionsContainer}>
                {APPLIES_TO_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    onPress={() => setAppliesto(option.value as "labor_only" | "materials_only" | "labor_and_materials")}
                    variant={appliesto === option.value ? "primary" : "secondary"}
                    size="small"
                    style={{ marginBottom: Spacing.md }}
                  >
                    {option.label}
                  </Button>
                ))}
              </View>
            </Card>

            {/* ✅ Live Preview */}
            <Card style={[styles.section, { backgroundColor: theme.primary + "15" }]}>
              <ThemedText type="subtitle" style={{ marginBottom: Spacing.md }}>
                Preview
              </ThemedText>

              <View style={styles.previewRow}>
                <ThemedText type="body">Subtotal:</ThemedText>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  ${previewSubtotal.toFixed(2)}
                </ThemedText>
              </View>

              {enabled && (
                <>
                  <View style={[styles.previewRow, { marginTop: Spacing.sm }]}>
                    <ThemedText type="body">
                      {taxName} ({parseFloat(taxRate).toFixed(1)}%):
                    </ThemedText>
                    <ThemedText type="body" style={{ fontWeight: "600", color: theme.primary }}>
                      ${previewTaxAmount.toFixed(2)}
                    </ThemedText>
                  </View>

                  <View
                    style={[
                      styles.previewRow,
                      { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: theme.border },
                    ]}
                  >
                    <ThemedText type="body" style={{ fontWeight: "700", fontSize: 16 }}>
                      Total:
                    </ThemedText>
                    <ThemedText type="body" style={{ fontWeight: "700", fontSize: 16, color: theme.primary }}>
                      ${previewTotal.toFixed(2)}
                    </ThemedText>
                  </View>
                </>
              )}

              <ThemedText
                type="caption"
                style={{ marginTop: Spacing.md, opacity: 0.7, fontStyle: "italic" }}
              >
                * Preview based on $1,000 subtotal
              </ThemedText>
            </Card>

            {/* ✅ Info Section */}
            <Card style={styles.section}>
              <ThemedText type="subtitle" style={{ marginBottom: Spacing.md }}>
                ℹ️ About Tax
              </ThemedText>
              <ThemedText type="caption" style={{ lineHeight: 20 }}>
                {`• Tax is optional and turned off by default\n`}
                {`• Tax is applied at invoice creation time\n`}
                {`• Old invoices are never affected by tax changes\n`}
                {`• Tax appears on PDFs and sent invoices\n`}
                {`• TellBill does not file taxes or claim compliance`}
              </ThemedText>
            </Card>
          </>
        )}

        {/* ✅ Save Button */}
        <Button
          onPress={handleSave}
          disabled={saving}
          style={{ marginTop: Spacing.lg, marginBottom: Spacing.lg }}
        >
          {saving ? "Saving..." : "Save Tax Settings"}
        </Button>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  toggleSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 48,
    fontSize: 16,
  },
  optionsContainer: {
    gap: Spacing.md,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
