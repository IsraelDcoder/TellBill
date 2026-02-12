import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { getApiUrl } from "@/lib/backendUrl";

type SendMethod = "email" | "sms" | "whatsapp";

interface SendInvoiceModalProps {
  visible: boolean;
  method: SendMethod;
  invoiceId: string;
  clientName: string;
  invoiceNumber: string;
  total: number;
  onClose: () => void;
  onSuccess: () => void;
}

// ✅ Helper function to get auth token
const getAuthToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem("authToken");
    return token;
  } catch (error) {
    console.error("[SendInvoiceModal] Error getting auth token:", error);
    return null;
  }
};

// ✅ Helper function to build fetch headers with auth
const getAuthHeaders = async (additionalHeaders = {}) => {
  const token = await getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...additionalHeaders,
  };
};

export function SendInvoiceModal({
  visible,
  method,
  invoiceId,
  clientName,
  invoiceNumber,
  total,
  onClose,
  onSuccess,
}: SendInvoiceModalProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [contact, setContact] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getPlaceholder = () => {
    switch (method) {
      case "email":
        return "client@example.com";
      case "sms":
        return "+1 (555) 123-4567";
      case "whatsapp":
        return "+1 (555) 123-4567";
      default:
        return "";
    }
  };

  const getLabel = () => {
    switch (method) {
      case "email":
        return "Email Address";
      case "sms":
        return "Phone Number";
      case "whatsapp":
        return "WhatsApp Number";
      default:
        return "";
    }
  };

  const getIcon = () => {
    switch (method) {
      case "email":
        return "mail";
      case "sms":
        return "message-square";
      case "whatsapp":
        return "message-circle";
      default:
        return "send";
    }
  };

  const validateContact = (): boolean => {
    const trimmedContact = contact.trim();

    if (!trimmedContact) {
      Alert.alert("Validation Error", `Please enter a ${getLabel().toLowerCase()}`);
      return false;
    }

    if (method === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedContact)) {
        Alert.alert("Validation Error", "Please enter a valid email address");
        return false;
      }
    } else if (method === "sms" || method === "whatsapp") {
      const phoneRegex = /^\+?[\d\s\-()]+$/;
      if (!phoneRegex.test(trimmedContact) || trimmedContact.replace(/\D/g, "").length < 10) {
        Alert.alert("Validation Error", "Please enter a valid phone number");
        return false;
      }
    }

    return true;
  };

  const handleSend = async () => {
    if (!validateContact()) {
      return;
    }

    // ✅ Validate clientName is not empty
    if (!clientName || clientName.trim() === "") {
      Alert.alert(
        "Missing Client Name",
        "The invoice doesn't have a client name. Please go back and add a client name before sending."
      );
      return;
    }

    // ✅ DEBUG: Log what we're sending
    console.log("[SendInvoiceModal] Sending invoice:", {
      invoiceId: invoiceId,
      method: method,
      contact: contact.trim(),
      clientName: clientName.trim(),
    });

    try {
      setIsLoading(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // ✅ Get authorization headers
      const authHeaders = await getAuthHeaders();

      const response = await fetch(getApiUrl("/api/invoices/send"), {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          invoiceId,
          method,
          contact: contact.trim(),
          clientName: clientName.trim(), // Trim whitespace
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Handle validation errors (array of field-specific errors)
        if (Array.isArray(errorData.errors) && errorData.errors.length > 0) {
          const validationMessages = errorData.errors
            .map((err: any) => `${err.field}: ${err.message}`)
            .join("\n");
          throw new Error(`Validation failed:\n\n${validationMessages}`);
        }
        
        // Handle specific error messages
        if (errorData.message) {
          throw new Error(errorData.message);
        }
        
        // Fallback to generic error with details
        let detailsMsg = "";
        if (errorData.details) {
          const detailsStr = typeof errorData.details === "string" 
            ? errorData.details 
            : JSON.stringify(errorData.details);
          detailsMsg = `\n\nDetails: ${detailsStr.substring(0, 200)}`;
        }
        throw new Error(
          errorData.error || `Failed to send invoice via ${method}${detailsMsg}`
        );
      }

      const data = await response.json();

      if (data.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", `Invoice sent successfully to ${contact.trim()}`);
        setContact("");
        onSuccess();
        onClose();
      } else {
        throw new Error(data.error || `Failed to send invoice via ${method}`);
      }
    } catch (error) {
      console.error("Error sending invoice:", error);
      const errorMessage = error instanceof Error ? error.message : "An error occurred while sending the invoice. Please check your connection and try again.";
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.backgroundRoot,
              paddingTop: insets.top + Spacing.md,
              borderBottomColor: theme.border,
            },
          ]}
        >
          <Button
            variant="ghost"
            onPress={onClose}
            style={styles.closeButton}
          >
            <Feather name="x" size={24} color={theme.text} />
          </Button>
          <ThemedText type="h3" style={styles.headerTitle}>
            Send Invoice
          </ThemedText>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.lg,
            paddingBottom: Spacing["3xl"],
          }}
          showsVerticalScrollIndicator={false}
        >
          <GlassCard style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {clientName}
                </ThemedText>
                <ThemedText type="h4">{invoiceNumber}</ThemedText>
              </View>
              <ThemedText
                type="h3"
                style={{ color: BrandColors.constructionGold }}
              >
                {formatCurrency(total)}
              </ThemedText>
            </View>
          </GlassCard>

          <View style={styles.methodSection}>
            <View
              style={[
                styles.methodBadge,
                {
                  backgroundColor: BrandColors.constructionGold,
                },
              ]}
            >
              <Feather
                name={getIcon() as any}
                size={20}
                color={BrandColors.slateGrey}
              />
              <ThemedText
                type="body"
                style={{ color: BrandColors.slateGrey, fontWeight: "600" }}
              >
                Send via {method.charAt(0).toUpperCase() + method.slice(1)}
              </ThemedText>
            </View>
          </View>

          <View style={styles.formSection}>
            <ThemedText type="h4" style={styles.label}>
              {getLabel()}
            </ThemedText>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: isDark
                    ? theme.backgroundDefault
                    : theme.backgroundSecondary,
                  borderColor: theme.border,
                },
              ]}
            >
              <Feather
                name={getIcon() as any}
                size={18}
                color={theme.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    color: theme.text,
                  },
                ]}
                placeholder={getPlaceholder()}
                placeholderTextColor={theme.textSecondary}
                value={contact}
                onChangeText={setContact}
                editable={!isLoading}
                keyboardType={
                  method === "email"
                    ? "email-address"
                    : "phone-pad"
                }
              />
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
              {method === "email"
                ? "We'll send the invoice as a PDF attachment"
                : "A link to view and pay the invoice will be sent"}
            </ThemedText>
          </View>

          <View style={styles.infoSection}>
            <View
              style={[
                styles.infoBanner,
                {
                  backgroundColor: isDark
                    ? theme.backgroundDefault
                    : theme.backgroundSecondary,
                  borderLeftColor: BrandColors.constructionGold,
                },
              ]}
            >
              <Feather
                name="info"
                size={18}
                color={BrandColors.constructionGold}
              />
              <ThemedText
                type="small"
                style={{
                  color: theme.textSecondary,
                  marginLeft: Spacing.sm,
                  flex: 1,
                }}
              >
                The client will receive the invoice and payment information in real-time
              </ThemedText>
            </View>
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
            onPress={onClose}
            disabled={isLoading}
            style={styles.footerButton}
          >
            <ThemedText style={{ color: theme.text, fontWeight: "600" }}>
              Cancel
            </ThemedText>
          </Button>
          <Button
            onPress={handleSend}
            disabled={isLoading || !contact.trim()}
            style={styles.footerButton}
          >
            <View style={styles.sendButtonContent}>
              {isLoading ? (
                <ActivityIndicator size="small" color={BrandColors.slateGrey} />
              ) : (
                <Feather name="send" size={18} color={BrandColors.slateGrey} />
              )}
              <ThemedText
                style={{
                  color: BrandColors.slateGrey,
                  fontWeight: "600",
                  marginLeft: isLoading ? Spacing.sm : 0,
                }}
              >
                {isLoading ? "Sending..." : "Send"}
              </ThemedText>
            </View>
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
  },
  placeholder: {
    width: 40,
  },
  summaryCard: {
    marginBottom: Spacing.xl,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  methodSection: {
    marginBottom: Spacing.xl,
  },
  methodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  formSection: {
    marginBottom: Spacing.xl,
  },
  label: {
    marginBottom: Spacing.md,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  infoSection: {
    marginBottom: Spacing.xl,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderLeftWidth: 4,
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
  sendButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
});
