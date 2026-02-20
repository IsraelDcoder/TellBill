import React, { useState } from "react";
import { View, StyleSheet, Pressable, Alert, TextInput } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import {
  PAYMENT_METHOD_TYPES,
  validatePaymentInfo,
  type PaymentInfoFormData,
} from "@/utils/paymentInfoUtils";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";

interface PaymentInfoSectionProps {
  initialData?: PaymentInfoFormData;
  onSave: (data: PaymentInfoFormData) => Promise<void>;
  isLoading?: boolean;
}

export function PaymentInfoSection({
  initialData,
  onSave,
  isLoading = false,
}: PaymentInfoSectionProps) {
  const { theme } = useTheme();

  const [formData, setFormData] = useState<PaymentInfoFormData>(
    initialData || {
      paymentMethodType: "custom",
      paymentAccountNumber: undefined,
      paymentBankName: undefined,
      paymentAccountName: undefined,
      paymentLink: undefined,
      paymentInstructions: undefined,
    }
  );

  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleMethodChange = (methodType: string) => {
    setFormData({
      ...formData,
      paymentMethodType: methodType,
    });
    setShowMethodSelector(false);
    setErrors([]); // Clear errors when changing method
  };

  const handleSave = async () => {
    // Validate
    const validation = validatePaymentInfo(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      if (validation.errors.length > 0) {
        Alert.alert("Validation Error", validation.errors[0]);
      }
      return;
    }

    // Save via callback
    try {
      await onSave(formData);
      Alert.alert("Success", "Payment information saved!");
    } catch (error) {
      Alert.alert("Error", "Failed to save payment information");
    }
  };

  const currentMethod = PAYMENT_METHOD_TYPES.find(
    (m) => m.id === formData.paymentMethodType
  );

  return (
    <View style={{ gap: Spacing.lg }}>
      {/* Header */}
      <View>
        <ThemedText type="h3">💰 Payment Information</ThemedText>
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
        >
          How clients will pay you directly (TellBill never handles your money)
        </ThemedText>
      </View>

      {/* Method Type Selector */}
      <View>
        <ThemedText type="body" style={{ marginBottom: Spacing.sm }}>
          Payment Method
        </ThemedText>
        <Pressable
          onPress={() => setShowMethodSelector(!showMethodSelector)}
          style={[
            styles.methodSelector,
            { borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: Spacing.sm }}>
            <Feather
              name={currentMethod?.icon as any}
              size={18}
              color={BrandColors.constructionGold}
            />
            <ThemedText type="body">{currentMethod?.label}</ThemedText>
          </View>
          <Feather
            name={showMethodSelector ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.textSecondary}
          />
        </Pressable>

        {showMethodSelector && (
          <View
            style={[
              styles.dropdown,
              { backgroundColor: theme.backgroundSecondary, borderColor: theme.border },
            ]}
          >
            {PAYMENT_METHOD_TYPES.map((method) => (
              <Pressable
                key={method.id}
                onPress={() => handleMethodChange(method.id)}
                style={[
                  styles.dropdownItem,
                  formData.paymentMethodType === method.id && {
                    backgroundColor: `${BrandColors.constructionGold}20`,
                  },
                ]}
              >
                <Feather name={method.icon as any} size={16} color={BrandColors.constructionGold} />
                <ThemedText type="body">{method.label}</ThemedText>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {/* Conditional Fields Based on Method Type */}

      {/* Bank Transfer Fields */}
      {formData.paymentMethodType === "bank_transfer" && (
        <View style={{ gap: Spacing.md }}>
          <View>
            <ThemedText type="body" style={{ marginBottom: Spacing.sm }}>
              Account Number *
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="e.g., 12345678901234"
              placeholderTextColor={theme.textSecondary}
              value={formData.paymentAccountNumber || ""}
              onChangeText={(text) =>
                setFormData({ ...formData, paymentAccountNumber: text })
              }
            />
          </View>
          <View>
            <ThemedText type="body" style={{ marginBottom: Spacing.sm }}>
              Bank Name *
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="e.g., Chase, Bank of America"
              placeholderTextColor={theme.textSecondary}
              value={formData.paymentBankName || ""}
              onChangeText={(text) => setFormData({ ...formData, paymentBankName: text })}
            />
          </View>
          <View>
            <ThemedText type="body" style={{ marginBottom: Spacing.sm }}>
              Account Holder Name
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="e.g., John Doe"
              placeholderTextColor={theme.textSecondary}
              value={formData.paymentAccountName || ""}
              onChangeText={(text) => setFormData({ ...formData, paymentAccountName: text })}
            />
          </View>
        </View>
      )}

      {/* PayPal / Stripe / Square Link Fields */}
      {["paypal", "stripe", "square"].includes(formData.paymentMethodType) && (
        <View>
          <ThemedText type="body" style={{ marginBottom: Spacing.sm }}>
            Payment Link *
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
            ]}
            placeholder="e.g., https://paypal.me/yourname"
            placeholderTextColor={theme.textSecondary}
            value={formData.paymentLink || ""}
            onChangeText={(text) => setFormData({ ...formData, paymentLink: text })}
          />
        </View>
      )}

      {/* Mobile Money Field */}
      {formData.paymentMethodType === "mobile_money" && (
        <View style={{ gap: Spacing.md }}>
          <View>
            <ThemedText type="body" style={{ marginBottom: Spacing.sm }}>
              Mobile Money Number *
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="e.g., +234 701 234 5678"
              placeholderTextColor={theme.textSecondary}
              value={formData.paymentAccountNumber || ""}
              onChangeText={(text) =>
                setFormData({ ...formData, paymentAccountNumber: text })
              }
            />
          </View>
          <View>
            <ThemedText type="body" style={{ marginBottom: Spacing.sm }}>
              Instructions (Optional)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
              ]}
              placeholder="e.g., Send via MTN Mobile Money"
              placeholderTextColor={theme.textSecondary}
              value={formData.paymentInstructions || ""}
              onChangeText={(text) =>
                setFormData({ ...formData, paymentInstructions: text })
              }
              multiline
              numberOfLines={2}
            />
          </View>
        </View>
      )}

      {/* Custom Instructions Field */}
      {formData.paymentMethodType === "custom" && (
        <View>
          <ThemedText type="body" style={{ marginBottom: Spacing.sm }}>
            Payment Instructions *
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary },
            ]}
            placeholder="Describe how clients should pay you..."
            placeholderTextColor={theme.textSecondary}
            value={formData.paymentInstructions || ""}
            onChangeText={(text) =>
              setFormData({ ...formData, paymentInstructions: text })
            }
            multiline
            numberOfLines={4}
          />
        </View>
      )}

      {/* Error Messages */}
      {errors.length > 0 && (
        <View style={[styles.errorBox, { backgroundColor: `${BrandColors.errorRed}20` }]}>
          {errors.map((error, index) => (
            <View key={index} style={{ flexDirection: "row", gap: Spacing.sm }}>
              <Feather name="alert-circle" size={16} color={BrandColors.errorRed} />
              <ThemedText type="small" style={{ color: BrandColors.errorRed }}>
                {error}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      {/* Save Button */}
      <Button
        onPress={handleSave}
        isLoading={isLoading}
      >
        Save Payment Information
      </Button>

      {/* Info Section */}
      <View
        style={[
          styles.infoBox,
          { backgroundColor: `${BrandColors.constructionGold}10` },
        ]}
      >
        <Feather name="info" size={16} color={BrandColors.constructionGold} />
        <ThemedText type="small" style={{ flex: 1, color: theme.text }}>
          This information will be included in invoice PDFs and sent to clients via WhatsApp.
          Clients will pay you directly—TellBill never handles your money.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  methodSelector: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  dropdown: {
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 14,
  },
  errorBox: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  infoBox: {
    flexDirection: "row",
    gap: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: "flex-start",
  },
});
