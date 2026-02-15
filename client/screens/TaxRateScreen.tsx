import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Alert,
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

export default function TaxRateScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { taxRate, setTaxRate } = usePreferencesStore();
  const [rate, setRate] = useState(taxRate.toString());
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSaveTaxRate = async () => {
    const parsedRate = parseFloat(rate);
    
    if (isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      Alert.alert("Invalid Tax Rate", "Please enter a value between 0 and 100");
      return;
    }

    setIsLoading(true);
    try {
      // Save to store
      setTaxRate(parsedRate);
      
      // TODO: Send update to backend
      console.log("Tax rate changed to:", parsedRate);
      
      setShowSuccess(true);
      
      // Auto-hide success and navigate back
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      Alert.alert("Error", "Failed to update tax rate");
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = (isDark: boolean) => ({
    backgroundColor: isDark ? theme.backgroundSecondary : theme.backgroundDefault,
    color: theme.text,
    borderColor: theme.border,
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot, marginTop: headerHeight + 18 }]}
      contentContainerStyle={{
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Default Tax Rate
        </ThemedText>
        <ThemedText type="small" style={[styles.description, { color: theme.textSecondary }]}>
          Set the default tax rate that will be applied to new invoices
        </ThemedText>

        <GlassCard style={{ marginTop: Spacing.lg }}>
          <View style={styles.formGroup}>
            <ThemedText type="small" style={styles.label}>
              Tax Rate (%) *
            </ThemedText>
            <View style={[styles.inputWrapper, inputStyle(isDark)]}>
              <TextInput
                style={styles.input}
                placeholder="8"
                placeholderTextColor={theme.textSecondary}
                value={rate}
                onChangeText={setRate}
                keyboardType="decimal-pad"
              />
              <ThemedText type="h4" style={{ color: theme.textSecondary }}>
                %
              </ThemedText>
            </View>
            <ThemedText type="small" style={[styles.helperText, { color: theme.textSecondary }]}>
              Enter a value between 0 and 100
            </ThemedText>
          </View>

          <View style={styles.previewBox}>
            <ThemedText type="small" style={[styles.label, { marginBottom: Spacing.md }]}>
              Preview
            </ThemedText>
            <View style={styles.previewRow}>
              <ThemedText type="body">Subtotal:</ThemedText>
              <ThemedText type="body">$100.00</ThemedText>
            </View>
            <View style={styles.previewRow}>
              <ThemedText type="body">
                Tax ({parseFloat(rate || "0").toFixed(2)}%):
              </ThemedText>
              <ThemedText type="body">
                ${((100 * parseFloat(rate || "0")) / 100).toFixed(2)}
              </ThemedText>
            </View>
            <View
              style={[styles.previewDivider, { backgroundColor: theme.border }]}
            />
            <View style={styles.previewRow}>
              <ThemedText type="h4" style={{ fontWeight: "700" }}>
                Total:
              </ThemedText>
              <ThemedText type="h4" style={{ fontWeight: "700", color: BrandColors.constructionGold }}>
                ${(100 + (100 * parseFloat(rate || "0")) / 100).toFixed(2)}
              </ThemedText>
            </View>
          </View>

          {showSuccess && (
            <View style={[styles.successMessage, { backgroundColor: `${BrandColors.constructionGold}20` }]}>
              <Feather name="check-circle" size={18} color={BrandColors.constructionGold} />
              <ThemedText type="small" style={{ color: BrandColors.constructionGold, marginLeft: Spacing.sm }}>
                Tax rate saved successfully!
              </ThemedText>
            </View>
          )}

          <Button
            onPress={handleSaveTaxRate}
            disabled={isLoading || showSuccess}
            style={{ marginTop: showSuccess ? Spacing.md : Spacing.lg }}
          >
            {isLoading ? "Saving..." : showSuccess ? "Saved!" : "Save Tax Rate"}
          </Button>
        </GlassCard>
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
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "600",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
  },
  previewBox: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: `${BrandColors.constructionGold}10`,
    marginVertical: Spacing.lg,
  },
  previewRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  previewDivider: {
    height: 1,
    marginVertical: Spacing.md,
  },
  successMessage: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
});
