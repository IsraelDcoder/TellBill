import React, { useState, useEffect } from "react";
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
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { getApiUrl } from "@/lib/backendUrl";

interface ResetPasswordScreenProps {
  token: string;
  onSuccess: () => void;
  onBack: () => void;
}

interface PasswordStrengthErrors {
  length?: string;
  uppercase?: string;
  lowercase?: string;
  number?: string;
  special?: string;
}

export default function ResetPasswordScreen({
  token,
  onSuccess,
  onBack,
}: ResetPasswordScreenProps) {
  const { theme } = useTheme();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrengthErrors>({});

  // Verify token on mount
  useEffect(() => {
    verifyToken();
  }, []);

  const verifyToken = async () => {
    try {
      const response = await fetch(
        `${getApiUrl('')}/api/auth/password-reset/verify-token?token=${token}`
      );

      if (response.ok) {
        setTokenValid(true);
      } else {
        Alert.alert(
          "Invalid Token",
          "This password reset link is invalid or has expired. Please request a new one."
        );
        onBack();
      }
    } catch (error) {
      console.error("[ResetPassword] Token verification error:", error);
      Alert.alert("Error", "Failed to verify reset token. Please try again.");
      onBack();
    } finally {
      setIsVerifying(false);
    }
  };

  // Check password strength
  const checkPasswordStrength = (password: string) => {
    const strength: PasswordStrengthErrors = {};

    if (password.length < 8) {
      strength.length = "At least 8 characters";
    }

    if (!/[A-Z]/.test(password)) {
      strength.uppercase = "One uppercase letter";
    }

    if (!/[a-z]/.test(password)) {
      strength.lowercase = "One lowercase letter";
    }

    if (!/[0-9]/.test(password)) {
      strength.number = "One number";
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      strength.special = "One special character";
    }

    setPasswordStrength(strength);
    return Object.keys(strength).length === 0;
  };

  const handleResetPassword = async () => {
    const newErrors: { [key: string]: string } = {};

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (!checkPasswordStrength(newPassword)) {
      newErrors.newPassword = "Password does not meet requirements";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const response = await fetch(
        `${getApiUrl('')}/api/auth/password-reset/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            newPassword,
            confirmPassword,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Error", data.error || "Failed to reset password");
        return;
      }

      // Show success
      setShowSuccess(true);

      // Auto-navigate after 2 seconds
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      console.error("[ResetPassword] Reset password failed:", error);
      Alert.alert(
        "Error",
        "Failed to reset password. Please check your connection and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.constructionGold} />
          <ThemedText style={[styles.loadingText, { marginTop: Spacing.medium }]}>
            Verifying reset link...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!tokenValid) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Feather
            name="alert-circle"
            size={48}
            color={BrandColors.error}
          />
          <ThemedText type="h3" style={styles.errorTitle}>
            Link Expired
          </ThemedText>
          <ThemedText style={[styles.errorMessage, { color: theme.tabIconDefault }]}>
            This password reset link is no longer valid.
          </ThemedText>
          <Pressable
            style={[
              styles.primaryButton,
              { backgroundColor: BrandColors.constructionGold },
            ]}
            onPress={onBack}
          >
            <ThemedText style={styles.primaryButtonText}>
              Request New Link
            </ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

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
            <Pressable onPress={onBack} disabled={isLoading || showSuccess}>
              <Feather name="arrow-left" size={24} color={theme.text} />
            </Pressable>
            <ThemedText type="h2" style={styles.title}>
              Create New Password
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
                Password Reset Successful!
              </ThemedText>

              <ThemedText
                style={[styles.successMessage, { color: theme.tabIconDefault }]}
              >
                Your password has been updated successfully. You can now log in with your new password.
              </ThemedText>

              <Pressable onPress={onSuccess}>
                <ThemedText
                  style={[
                    styles.redirectLink,
                    { color: BrandColors.constructionGold },
                  ]}
                >
                  Redirecting to Login...
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Instructions */}
              <ThemedText
                style={[styles.instructions, { color: theme.tabIconDefault }]}
              >
                Enter a strong new password for your account.
              </ThemedText>

              {/* New Password Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>New Password</ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      borderColor: errors.newPassword
                        ? BrandColors.error
                        : theme.border,
                    },
                  ]}
                >
                  <Feather
                    name="lock"
                    size={18}
                    color={theme.tabIconDefault}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Enter new password"
                    placeholderTextColor={theme.tabIconDefault}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
                      checkPasswordStrength(text);
                      if (errors.newPassword) {
                        setErrors({ ...errors, newPassword: "" });
                      }
                    }}
                    editable={!isLoading}
                    secureTextEntry={!showNewPassword}
                  />
                  <Pressable
                    onPress={() => setShowNewPassword(!showNewPassword)}
                  >
                    <Feather
                      name={showNewPassword ? "eye" : "eye-off"}
                      size={18}
                      color={theme.tabIconDefault}
                    />
                  </Pressable>
                </View>
                {errors.newPassword && (
                  <ThemedText style={styles.errorMessage}>
                    {errors.newPassword}
                  </ThemedText>
                )}

                {/* Password Strength Indicator */}
                {newPassword && Object.keys(passwordStrength).length > 0 && (
                  <View style={styles.strengthContainer}>
                    <ThemedText style={styles.strengthLabel}>
                      Password must include:
                    </ThemedText>
                    {[
                      { key: "length", label: "8+ characters" },
                      { key: "uppercase", label: "Uppercase letter" },
                      { key: "lowercase", label: "Lowercase letter" },
                      { key: "number", label: "Number" },
                      { key: "special", label: "Special character" },
                    ].map((requirement) => (
                      <View
                        key={requirement.key}
                        style={[
                          styles.strengthItem,
                          {
                            borderColor: 
                              passwordStrength[requirement.key as keyof PasswordStrengthErrors]
                                ? BrandColors.error
                                : BrandColors.constructionGold,
                          },
                        ]}
                      >
                        <Feather
                          name={
                            passwordStrength[requirement.key as keyof PasswordStrengthErrors]
                              ? "x"
                              : "check"
                          }
                          size={16}
                          color={
                            passwordStrength[requirement.key as keyof PasswordStrengthErrors]
                              ? BrandColors.error
                              : BrandColors.constructionGold
                          }
                        />
                        <ThemedText
                          style={[
                            styles.strengthItemText,
                            {
                              color: passwordStrength[requirement.key as keyof PasswordStrengthErrors]
                                ? theme.tabIconDefault
                                : BrandColors.constructionGold,
                            },
                          ]}
                        >
                          {requirement.label}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Confirm Password</ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      borderColor: errors.confirmPassword
                        ? BrandColors.error
                        : theme.border,
                    },
                  ]}
                >
                  <Feather
                    name="lock"
                    size={18}
                    color={theme.tabIconDefault}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Confirm new password"
                    placeholderTextColor={theme.tabIconDefault}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (errors.confirmPassword) {
                        setErrors({ ...errors, confirmPassword: "" });
                      }
                    }}
                    editable={!isLoading}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Feather
                      name={showConfirmPassword ? "eye" : "eye-off"}
                      size={18}
                      color={theme.tabIconDefault}
                    />
                  </Pressable>
                </View>
                {errors.confirmPassword && (
                  <ThemedText style={styles.errorMessage}>
                    {errors.confirmPassword}
                  </ThemedText>
                )}
              </View>

              {/* Reset Button */}
              <Pressable
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor:
                      !newPassword || !confirmPassword || isLoading
                        ? theme.border
                        : BrandColors.constructionGold,
                  },
                ]}
                onPress={handleResetPassword}
                disabled={!newPassword || !confirmPassword || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <ThemedText style={styles.primaryButtonText}>
                    Reset Password
                  </ThemedText>
                )}
              </Pressable>

              {/* Back Link */}
              <View style={styles.footerContainer}>
                <ThemedText
                  style={[styles.footerText, { color: theme.tabIconDefault }]}
                >
                  Changed your mind?{" "}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing["4xl"],
  },
  errorTitle: {
    marginTop: Spacing["4xl"],
    marginBottom: Spacing.lg,
  },
  errorMessage: {
    textAlign: "center",
    marginBottom: Spacing["5xl"],
    fontSize: 15,
    lineHeight: 22,
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
  errorInputMessage: {
    color: BrandColors.error,
    fontSize: 12,
    marginTop: Spacing.sm,
  },
  strengthContainer: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: BrandColors.constructionGold + "10",
  },
  strengthLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  strengthItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs,
    borderLeftWidth: 3,
    marginBottom: Spacing.sm,
  },
  strengthItemText: {
    fontSize: 12,
    flex: 1,
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
    marginBottom: Spacing["5xl"],
    lineHeight: 22,
  },
  redirectLink: {
    fontSize: 14,
    fontWeight: "600",
    paddingVertical: Spacing.lg,
  },
});
