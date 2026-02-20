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

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

const CURRENCIES: Currency[] = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
  { code: "INR", name: "Indian Rupee", symbol: "₹" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
];

export default function CurrencyScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { currency, setCurrency } = usePreferencesStore();
  
  const [selectedCurrency, setSelectedCurrency] = useState(currency);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSelectCurrency = (code: string) => {
    setSelectedCurrency(code);
  };

  const handleSaveCurrency = async () => {
    setIsLoading(true);
    try {
      // Save to store
      setCurrency(selectedCurrency);
      
      // TODO: Send update to backend
      console.log("Currency changed to:", selectedCurrency);
      
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
        paddingTop: Spacing.md,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Select Currency
        </ThemedText>
        <ThemedText type="small" style={[styles.description, { color: theme.textSecondary }]}>
          Choose the currency that will be used for all invoices and financial calculations
        </ThemedText>

        <View style={styles.currencyGrid}>
          {CURRENCIES.map((currency) => (
            <Pressable
              key={currency.code}
              onPress={() => handleSelectCurrency(currency.code)}
              style={[
                styles.currencyCard,
                {
                  backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundSecondary,
                  borderColor: selectedCurrency === currency.code 
                    ? BrandColors.constructionGold 
                    : theme.border,
                  borderWidth: selectedCurrency === currency.code ? 2 : 1,
                },
              ]}
            >
              <View style={styles.currencyInfo}>
                <ThemedText type="h4" style={styles.currencyCode}>
                  {currency.code}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {currency.name}
                </ThemedText>
              </View>
              <ThemedText type="h3">{currency.symbol}</ThemedText>
              {selectedCurrency === currency.code && (
                <View style={styles.checkmark}>
                  <Feather name="check" size={20} color={BrandColors.constructionGold} />
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {showSuccess && (
          <View style={[styles.successMessage, { backgroundColor: `${BrandColors.constructionGold}20` }]}>
            <Feather name="check-circle" size={18} color={BrandColors.constructionGold} />
            <ThemedText type="small" style={{ color: BrandColors.constructionGold, marginLeft: Spacing.sm }}>
              Currency updated successfully!
            </ThemedText>
          </View>
        )}

        <Button
          onPress={handleSaveCurrency}
          disabled={isLoading || showSuccess || selectedCurrency === currency}
          style={{ marginTop: showSuccess ? Spacing.md : Spacing.lg }}
        >
          {isLoading ? "Saving..." : showSuccess ? "Saved!" : "Save Currency"}
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
  currencyGrid: {
    gap: Spacing.md,
  },
  currencyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    position: "relative",
  },
  currencyInfo: {
    flex: 1,
  },
  currencyCode: {
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  checkmark: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
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
