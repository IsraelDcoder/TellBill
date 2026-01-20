import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface InviteTeamMemberModalProps {
  visible: boolean;
  onClose: () => void;
  onSendInvite: (email: string, fullName: string, role: "admin" | "worker" | "foreman" | "contractor") => void;
  isLoading?: boolean;
}

const roles = [
  { label: "Admin", value: "admin" as const },
  { label: "Foreman", value: "foreman" as const },
  { label: "Contractor", value: "contractor" as const },
  { label: "Worker", value: "worker" as const },
];

export function InviteTeamMemberModal({
  visible,
  onClose,
  onSendInvite,
  isLoading = false,
}: InviteTeamMemberModalProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<"admin" | "worker" | "foreman" | "contractor">("worker");
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendInvite = () => {
    if (validateForm()) {
      onSendInvite(email.trim(), fullName.trim(), selectedRole);
      setFullName("");
      setEmail("");
      setSelectedRole("worker");
      setErrors({});
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Pressable
          style={styles.overlay}
          onPress={onClose}
        />
        <View
          style={[
            styles.bottomSheet,
            {
              backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundRoot,
              paddingBottom: insets.bottom + Spacing.lg,
            },
          ]}
        >
          <View style={styles.handle} />
          
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <ThemedText type="h2" style={styles.title}>
              Invite Team Member
            </ThemedText>
            
            <View style={styles.form}>
              {/* Full Name Input */}
              <View style={styles.formGroup}>
                <ThemedText type="body" style={styles.label}>
                  Full Name
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? theme.backgroundRoot : theme.backgroundSecondary,
                      borderColor: errors.fullName ? "#D32F2F" : theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder="John Doe"
                  placeholderTextColor={theme.textSecondary}
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!isLoading}
                />
                {errors.fullName && (
                  <ThemedText type="small" style={styles.errorText}>
                    {errors.fullName}
                  </ThemedText>
                )}
              </View>

              {/* Email Input */}
              <View style={styles.formGroup}>
                <ThemedText type="body" style={styles.label}>
                  Email Address
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? theme.backgroundRoot : theme.backgroundSecondary,
                      borderColor: errors.email ? "#D32F2F" : theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder="john@example.com"
                  placeholderTextColor={theme.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!isLoading}
                />
                {errors.email && (
                  <ThemedText type="small" style={styles.errorText}>
                    {errors.email}
                  </ThemedText>
                )}
              </View>

              {/* Role Dropdown */}
              <View style={styles.formGroup}>
                <ThemedText type="body" style={styles.label}>
                  Role
                </ThemedText>
                <Pressable
                  onPress={() => setShowRoleDropdown(!showRoleDropdown)}
                  disabled={isLoading}
                  style={[
                    styles.dropdown,
                    {
                      backgroundColor: isDark ? theme.backgroundRoot : theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText type="body">
                    {roles.find((r) => r.value === selectedRole)?.label}
                  </ThemedText>
                </Pressable>

                {showRoleDropdown && (
                  <View
                    style={[
                      styles.dropdownMenu,
                      {
                        backgroundColor: isDark ? theme.backgroundRoot : theme.backgroundSecondary,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    {roles.map((role) => (
                      <Pressable
                        key={role.value}
                        onPress={() => {
                          setSelectedRole(role.value);
                          setShowRoleDropdown(false);
                        }}
                        style={[
                          styles.dropdownItem,
                          selectedRole === role.value && styles.dropdownItemSelected,
                        ]}
                      >
                        <ThemedText
                          type="body"
                          style={selectedRole === role.value && styles.dropdownItemTextSelected}
                        >
                          {role.label}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.actionButtons}>
              <Button
                onPress={handleSendInvite}
                disabled={isLoading}
                style={styles.sendButton}
              >
                <ThemedText type="body" style={styles.sendButtonText}>
                  {isLoading ? "Sending..." : "Send Invite"}
                </ThemedText>
              </Button>

              <Button
                variant="outline"
                onPress={onClose}
                disabled={isLoading}
                style={styles.cancelButton}
              >
                <ThemedText type="body">Cancel</ThemedText>
              </Button>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  overlay: {
    flex: 1,
    backgroundColor: "transparent",
  },
  bottomSheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    flex: 1,
    maxHeight: "95%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#ccc",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  content: {
    flex: 1,
    minHeight: 0,
  },
  title: {
    marginBottom: Spacing.lg,
  },
  form: {
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  formGroup: {
    gap: Spacing.sm,
  },
  label: {
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 16,
    minHeight: 48,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    minHeight: 48,
    justifyContent: "center",
  },
  dropdownMenu: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
    overflow: "hidden",
  },
  dropdownItem: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  dropdownItemSelected: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  dropdownItemTextSelected: {
    fontWeight: "600",
  },
  errorText: {
    color: "#D32F2F",
  },
  actionButtons: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  sendButton: {
    paddingVertical: Spacing.lg,
    backgroundColor: "#22C55E",
  },
  sendButtonText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
  cancelButton: {
    paddingVertical: Spacing.lg,
  },
});
