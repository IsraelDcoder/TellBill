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
import { useAuth } from "@/context/AuthContext";
import { useProfileStore } from "@/stores/profileStore";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/backendUrl";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CompanyInfoScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { companyInfo, setCompanyInfo } = useProfileStore();

  const [companyName, setCompanyName] = useState(companyInfo.name);
  const [companyPhone, setCompanyPhone] = useState(companyInfo.phone);
  const [companyEmail, setCompanyEmail] = useState(companyInfo.email);
  const [companyAddress, setCompanyAddress] = useState(companyInfo.address);
  const [companyWebsite, setCompanyWebsite] = useState(companyInfo.website);
  const [companyTaxId, setCompanyTaxId] = useState(companyInfo.taxId);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSaveCompanyInfo = async () => {
    if (!companyName.trim()) {
      Alert.alert("Required Field", "Please enter company name");
      return;
    }

    if (!user?.id) {
      Alert.alert("Error", "User not authenticated");
      return;
    }

    setIsLoading(true);
    try {
      // Save to database via API
      const response = await fetch(getApiUrl("/api/auth/company-info"), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          companyName: companyName.trim(),
          companyPhone: companyPhone.trim(),
          companyEmail: companyEmail.trim(),
          companyAddress: companyAddress.trim(),
          companyWebsite: companyWebsite.trim(),
          companyTaxId: companyTaxId.trim(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update company info");
      }

      // Update local store after successful API call
      setCompanyInfo({
        name: companyName.trim(),
        phone: companyPhone.trim(),
        email: companyEmail.trim(),
        address: companyAddress.trim(),
        website: companyWebsite.trim(),
        taxId: companyTaxId.trim(),
      });

      setShowSuccess(true);

      // Auto-hide success and navigate back
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      console.error("Company info update error:", error);
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to update company information"
      );
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
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Company Details
        </ThemedText>
        <ThemedText type="small" style={[styles.description, { color: theme.textSecondary }]}>
          Manage your company's information that appears on invoices and documents
        </ThemedText>

        <GlassCard style={{ marginTop: Spacing.lg }}>
          <View style={styles.formGroup}>
            <ThemedText type="small" style={styles.label}>
              Company Name *
            </ThemedText>
            <TextInput
              style={[styles.input, inputStyle(isDark)]}
              placeholder="Company Name"
              placeholderTextColor={theme.textSecondary}
              value={companyName}
              onChangeText={setCompanyName}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText type="small" style={styles.label}>
              Phone Number
            </ThemedText>
            <TextInput
              style={[styles.input, inputStyle(isDark)]}
              placeholder="Phone Number"
              placeholderTextColor={theme.textSecondary}
              value={companyPhone}
              onChangeText={setCompanyPhone}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText type="small" style={styles.label}>
              Email Address
            </ThemedText>
            <TextInput
              style={[styles.input, inputStyle(isDark)]}
              placeholder="Email Address"
              placeholderTextColor={theme.textSecondary}
              value={companyEmail}
              onChangeText={setCompanyEmail}
              keyboardType="email-address"
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText type="small" style={styles.label}>
              Street Address
            </ThemedText>
            <TextInput
              style={[styles.input, inputStyle(isDark)]}
              placeholder="Street Address"
              placeholderTextColor={theme.textSecondary}
              value={companyAddress}
              onChangeText={setCompanyAddress}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText type="small" style={styles.label}>
              Website
            </ThemedText>
            <TextInput
              style={[styles.input, inputStyle(isDark)]}
              placeholder="Website"
              placeholderTextColor={theme.textSecondary}
              value={companyWebsite}
              onChangeText={setCompanyWebsite}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText type="small" style={styles.label}>
              Tax ID / Business Number
            </ThemedText>
            <TextInput
              style={[styles.input, inputStyle(isDark)]}
              placeholder="Tax ID"
              placeholderTextColor={theme.textSecondary}
              value={companyTaxId}
              onChangeText={setCompanyTaxId}
            />
          </View>

          {showSuccess && (
            <View style={[styles.successMessage, { backgroundColor: `${BrandColors.constructionGold}20` }]}>
              <Feather name="check-circle" size={18} color={BrandColors.constructionGold} />
              <ThemedText type="small" style={{ color: BrandColors.constructionGold, marginLeft: Spacing.sm }}>
                Changes saved successfully!
              </ThemedText>
            </View>
          )}

          <Button
            onPress={handleSaveCompanyInfo}
            disabled={isLoading || showSuccess}
            style={{ marginTop: showSuccess ? Spacing.md : Spacing.lg }}
          >
            {isLoading ? "Saving..." : showSuccess ? "Saved!" : "Save Company Info"}
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
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
  },
  successMessage: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
});
