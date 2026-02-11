import React, { useState } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { getApiUrl } from "@/lib/backendUrl";

interface ForgotPasswordScreenProps {
  onBack: () => void;
  onResetRequested: () => void;
}

export default function ForgotPasswordScreen({
  onBack,
  onResetRequested,
}: ForgotPasswordScreenProps) {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});
  const [showSuccess, setShowSuccess] = useState(false);

  // Email validation
  const validateEmail = (emailToValidate: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailToValidate);
  };

  // Handle password reset request
  const handleResetRequest = async () => {
    const newErrors: { email?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Invalid email format";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const response = await fetch(
        `${getApiUrl('')}/api/auth/password-reset/request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: email.trim() }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.error || "Failed to request password reset");
        return;
      }

      // Show success message
      setShowSuccess(true);

      // Auto-navigate after 2 seconds
      setTimeout(() => {
        onResetRequested();
      }, 2000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An error occurred";
      console.error("[ForgotPassword] Reset request failed:", error);
      Alert.alert(
        "Error",
        "Failed to send reset email. Please check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onBack} disabled={isLoading}>
              <Feather name="arrow-left" size={24} color={theme.text} />
            </Pressable>
            <ThemedText type="h2" style={styles.title}>
              Reset Password
            </ThemedText>
            <View style={{ width: 24 }} />
          </View>

          {/* Success State */}
          {showSuccess ? (
            <View style={styles.successContainer}>
              <View
                style={[
                  styles.successIcon,
                  { backgroundColor: BrandColors.constructionGold + "20" },
                ]}
              >
                <Feather
                  name="check-circle"
                  size={48}
                  color={BrandColors.constructionGold}
                />
              </View>

              <ThemedText type="h3" style={styles.successTitle}>
                Check Your Email!
              </ThemedText>

              <ThemedText style={[styles.successMessage, { color: theme.tabIconDefault }]}>
                We've sent a password reset link to {email}
              </ThemedText>

              <ThemedText style={[styles.successSubtext, { color: theme.tabIconDefault }]}>
                The link expires in 15 minutes. Follow the instructions in the email to set a new password.
              </ThemedText>

              <View style={styles.helpBox}>
                <Feather
                  name="info"
                  size={16}
                  color={BrandColors.constructionGold}
                />
                <ThemedText style={[styles.helpText, { color: theme.text }]}>
                  Don't see the email? Check your spam folder.
                </ThemedText>
              </View>

              <Pressable onPress={onBack}>
                <ThemedText
                  style={[
                    styles.backLink,
                    { color: BrandColors.constructionGold },
                  ]}
                >
                  Back to Login
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Instructions */}
              <ThemedText
                style={[styles.instructions, { color: theme.tabIconDefault }]}
              >
                Enter the email address associated with your account, and we'll send you a link to reset your password.
              </ThemedText>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Email Address</ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      borderColor: errors.email
                        ? BrandColors.error
                        : theme.border,
                    },
                  ]}
                >
                  <Feather name="mail" size={18} color={theme.tabIconDefault} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.tabIconDefault}
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (errors.email) {
                        setErrors({});
                      }
                    }}
                    editable={!isLoading}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {errors.email && (
                  <ThemedText style={styles.errorMessage}>
                    {errors.email}
                  </ThemedText>
                )}
              </View>

              {/* Request Button */}
              <Pressable
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor:
                      !email || isLoading
                        ? theme.border
                        : BrandColors.constructionGold,
                  },
                ]}
                onPress={handleResetRequest}
                disabled={!email || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <ThemedText style={styles.primaryButtonText}>
                    Send Reset Link
                  </ThemedText>
                )}
              </Pressable>

              {/* Back to Login */}
              <View style={styles.footerContainer}>
                <ThemedText
                  style={[styles.footerText, { color: theme.tabIconDefault }]}
                >
                  Remember your password?{" "}
                </ThemedText>
                <Pressable onPress={onBack} disabled={isLoading}>
                  <ThemedText
                    style={[
                      styles.footerLink,
                      { color: BrandColors.constructionGold },
                    ]}
                  >
                    Back to Login
                  </ThemedText>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing["5xl"],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing["5xl"],
  },
  title: {
    flex: 1,
    textAlign: "center",
    marginHorizontal: Spacing.lg,
  },
  instructions: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing["5xl"],
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: Spacing["4xl"],
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  errorMessage: {
    color: BrandColors.error,
    fontSize: 12,
    marginTop: Spacing.sm,
  },
  primaryButton: {
    paddingVertical: Spacing["4xl"],
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing["4xl"],
    marginBottom: Spacing["5xl"],
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: Spacing["4xl"],
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "600",
  },
  successContainer: {
    alignItems: "center",
    paddingVertical: Spacing["5xl"],
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing["5xl"],
  },
  successTitle: {
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  successSubtext: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: Spacing["5xl"],
    lineHeight: 20,
  },
  helpBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing["5xl"],
    backgroundColor: BrandColors.constructionGold + "10",
  },
  helpText: {
    flex: 1,
    fontSize: 13,
  },
  backLink: {
    fontSize: 16,
    fontWeight: "600",
    paddingVertical: Spacing.lg,
  },
});
