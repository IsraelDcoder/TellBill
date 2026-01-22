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
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { LockedFeatureOverlay } from "@/components/LockedFeatureOverlay";
import { useTheme } from "@/hooks/useTheme";
import { useFeatureLock } from "@/hooks/useFeatureLock";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";

interface CreateProjectModalProps {
  visible: boolean;
  onClose: () => void;
  onCreate: (projectData: {
    name: string;
    clientName: string;
    address: string;
    status: "active" | "completed" | "on_hold";
    budget: number;
  }) => void;
  isLoading?: boolean;
}

const statuses = [
  { label: "Active", value: "active" as const },
  { label: "Completed", value: "completed" as const },
  { label: "On Hold", value: "on_hold" as const },
];

export function CreateProjectModal({
  visible,
  onClose,
  onCreate,
  isLoading = false,
}: CreateProjectModalProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { isLocked } = useFeatureLock("projects");
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<"active" | "completed" | "on_hold">("active");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [budget, setBudget] = useState("");
  const [errors, setErrors] = useState<{
    projectName?: string;
    clientName?: string;
    address?: string;
    budget?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!projectName.trim()) {
      newErrors.projectName = "Project name is required";
    }

    if (!clientName.trim()) {
      newErrors.clientName = "Client name is required";
    }

    if (!address.trim()) {
      newErrors.address = "Address is required";
    }

    if (!budget.trim()) {
      newErrors.budget = "Budget is required";
    } else if (isNaN(parseFloat(budget)) || parseFloat(budget) <= 0) {
      newErrors.budget = "Please enter a valid budget amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = () => {
    if (validateForm()) {
      onCreate({
        name: projectName.trim(),
        clientName: clientName.trim(),
        address: address.trim(),
        status,
        budget: parseFloat(budget),
      });
      setProjectName("");
      setClientName("");
      setAddress("");
      setStatus("active");
      setBudget("");
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
            contentContainerStyle={styles.scrollContent}
          >
            <ThemedText type="h2" style={styles.title}>
              Create New Project
            </ThemedText>

            <View style={styles.formGroup}>
              <ThemedText type="body" style={styles.label}>
                Project Name
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundRoot
                      : theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: errors.projectName ? "#EF4444" : theme.border,
                  },
                ]}
                placeholder="Enter project name"
                placeholderTextColor={theme.textSecondary}
                value={projectName}
                onChangeText={setProjectName}
                editable={!isLoading}
              />
              {errors.projectName && (
                <ThemedText type="small" style={styles.errorText}>
                  {errors.projectName}
                </ThemedText>
              )}
            </View>

            <View style={styles.formGroup}>
              <ThemedText type="body" style={styles.label}>
                Client Name
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundRoot
                      : theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: errors.clientName ? "#EF4444" : theme.border,
                  },
                ]}
                placeholder="Enter client name"
                placeholderTextColor={theme.textSecondary}
                value={clientName}
                onChangeText={setClientName}
                editable={!isLoading}
              />
              {errors.clientName && (
                <ThemedText type="small" style={styles.errorText}>
                  {errors.clientName}
                </ThemedText>
              )}
            </View>

            <View style={styles.formGroup}>
              <ThemedText type="body" style={styles.label}>
                Address
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundRoot
                      : theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: errors.address ? "#EF4444" : theme.border,
                  },
                ]}
                placeholder="Enter project address"
                placeholderTextColor={theme.textSecondary}
                value={address}
                onChangeText={setAddress}
                editable={!isLoading}
              />
              {errors.address && (
                <ThemedText type="small" style={styles.errorText}>
                  {errors.address}
                </ThemedText>
              )}
            </View>

            <View style={styles.formGroup}>
              <ThemedText type="body" style={styles.label}>
                Status
              </ThemedText>
              <Pressable
                onPress={() => setShowStatusDropdown(!showStatusDropdown)}
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundRoot
                      : theme.backgroundSecondary,
                    borderColor: theme.border,
                    justifyContent: "center",
                  },
                ]}
              >
                <View style={styles.statusSelect}>
                  <ThemedText type="body">
                    {statuses.find((s) => s.value === status)?.label}
                  </ThemedText>
                  <Feather
                    name={showStatusDropdown ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={theme.textSecondary}
                  />
                </View>
              </Pressable>
              {showStatusDropdown && (
                <View
                  style={[
                    styles.dropdown,
                    { backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundSecondary },
                  ]}
                >
                  {statuses.map((s) => (
                    <Pressable
                      key={s.value}
                      onPress={() => {
                        setStatus(s.value);
                        setShowStatusDropdown(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        {
                          backgroundColor:
                            status === s.value
                              ? `${BrandColors.constructionGold}20`
                              : "transparent",
                        },
                      ]}
                    >
                      <ThemedText type="body">{s.label}</ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.formGroup}>
              <ThemedText type="body" style={styles.label}>
                Budget
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundRoot
                      : theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: errors.budget ? "#EF4444" : theme.border,
                  },
                ]}
                placeholder="Enter budget amount"
                placeholderTextColor={theme.textSecondary}
                value={budget}
                onChangeText={setBudget}
                keyboardType="decimal-pad"
                editable={!isLoading}
              />
              {errors.budget && (
                <ThemedText type="small" style={styles.errorText}>
                  {errors.budget}
                </ThemedText>
              )}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Button
              variant="secondary"
              onPress={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onPress={handleCreate}
              loading={isLoading}
            >
              Save
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  bottomSheet: {
    flex: 1,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    backgroundColor: "rgba(128, 128, 128, 0.3)",
    borderRadius: 2,
    marginBottom: Spacing.md,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    marginBottom: Spacing.lg,
  },
  title: {
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
  },
  errorText: {
    color: "#EF4444",
    marginTop: Spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statusSelect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdown: {
    marginTop: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(128, 128, 128, 0.2)",
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.1)",
  },
});
