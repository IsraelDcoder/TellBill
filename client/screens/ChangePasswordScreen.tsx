import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Alert,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";

interface PasswordRequirement {
  id: string;
  label: string;
  isMet: boolean;
}

export default function ChangePasswordScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Password requirements check
  const passwordRequirements: PasswordRequirement[] = [
    {
      id: "length",
      label: "At least 8 characters",
      isMet: newPassword.length >= 8,
    },
    {
      id: "uppercase",
      label: "One uppercase letter",
      isMet: /[A-Z]/.test(newPassword),
    },
    {
      id: "lowercase",
      label: "One lowercase letter",
      isMet: /[a-z]/.test(newPassword),
    },
    {
      id: "number",
      label: "One number",
      isMet: /[0-9]/.test(newPassword),
    },
    {
      id: "special",
      label: "One special character (!@#$%^&*)",
      isMet: /[!@#$%^&*]/.test(newPassword),
    },
  ];

  const allRequirementsMet = passwordRequirements.every((req) => req.isMet);
  const passwordsMatch = newPassword === confirmPassword && newPassword.length > 0;

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert("Required Field", "Please enter your current password");
      return;
    }

    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert("Required Fields", "Please fill in all password fields");
      return;
    }

    if (!allRequirementsMet) {
      Alert.alert("Password Requirements", "Your password does not meet all requirements");
      return;
    }

    if (!passwordsMatch) {
      Alert.alert("Passwords Don't Match", "New password and confirmation password must match");
      return;
    }

    setIsLoading(true);
    try {
      // TODO: Send password change request to backend/Supabase
      console.log("Changing password");
      Alert.alert("Success", "Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      Alert.alert("Error", "Failed to change password");
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = (isDark: boolean) => ({
    backgroundColor: isDark ? theme.backgroundSecondary : theme.backgroundDefault,
    color: theme.text,
    borderColor: theme.border,
  });

  const PasswordInput = ({
    label,
    value,
    onChangeText,
    showPassword,
    onToggleShow,
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    showPassword: boolean;
    onToggleShow: () => void;
  }) => (
    <View style={styles.formGroup}>
      <ThemedText type="small" style={styles.label}>
        {label} *
      </ThemedText>
      <View style={[styles.inputContainer, inputStyle(isDark)]}>
        <TextInput
          style={styles.passwordInput}
          placeholder={label}
          placeholderTextColor={theme.textSecondary}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
        />
        <Pressable onPress={onToggleShow} style={styles.toggleButton}>
          <Feather
            name={showPassword ? "eye-off" : "eye"}
            size={18}
            color={theme.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xs,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard>
        <View style={styles.warningBox}>
          <Feather
            name="info"
            size={20}
            color={BrandColors.warning}
            style={{ marginRight: Spacing.md }}
          />
          <ThemedText type="small" style={{ color: BrandColors.warning, flex: 1 }}>
            For your security, you'll be signed out after changing your password
          </ThemedText>
        </View>

        <PasswordInput
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          showPassword={showCurrentPassword}
          onToggleShow={() => setShowCurrentPassword(!showCurrentPassword)}
        />

        <PasswordInput
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          showPassword={showNewPassword}
          onToggleShow={() => setShowNewPassword(!showNewPassword)}
        />

        {newPassword.length > 0 && (
          <View style={styles.requirementsBox}>
            <ThemedText
              type="small"
              style={[styles.label, { marginBottom: Spacing.md }]}
            >
              Password Requirements
            </ThemedText>
            {passwordRequirements.map((req) => (
              <View key={req.id} style={styles.requirementRow}>
                <Feather
                  name={req.isMet ? "check-circle" : "circle"}
                  size={16}
                  color={req.isMet ? BrandColors.success : theme.border}
                />
                <ThemedText
                  type="small"
                  style={[
                    styles.requirementText,
                    {
                      color: req.isMet ? BrandColors.success : theme.textSecondary,
                    },
                  ]}
                >
                  {req.label}
                </ThemedText>
              </View>
            ))}
          </View>
        )}

        <PasswordInput
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          showPassword={showConfirmPassword}
          onToggleShow={() => setShowConfirmPassword(!showConfirmPassword)}
        />

        {confirmPassword.length > 0 && !passwordsMatch && (
          <View
            style={[
              styles.errorBox,
              { backgroundColor: `${BrandColors.error}15` },
            ]}
          >
            <Feather name="alert-circle" size={16} color={BrandColors.error} />
            <ThemedText
              type="small"
              style={[styles.errorText, { color: BrandColors.error }]}
            >
              Passwords do not match
            </ThemedText>
          </View>
        )}

        <Button
          onPress={handleChangePassword}
          disabled={isLoading || !passwordsMatch || !allRequirementsMet}
          style={{ marginTop: Spacing.xl }}
        >
          {isLoading ? "Changing..." : "Change Password"}
        </Button>
      </GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: `${BrandColors.warning}10`,
    marginBottom: Spacing.xl,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "600",
  },
  inputContainer: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    fontSize: 14,
  },
  toggleButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  requirementsBox: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.md,
    backgroundColor: `#00000005`,
    marginBottom: Spacing.lg,
  },
  requirementRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  requirementText: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  errorText: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
});
