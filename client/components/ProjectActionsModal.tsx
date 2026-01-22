import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Modal,
  Pressable,
  Alert,
  ScrollView,
  Share,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors, BorderRadius } from "@/constants/theme";

interface ProjectActionsModalProps {
  isVisible: boolean;
  projectId: string;
  projectName: string;
  currentStatus: "active" | "completed" | "on_hold";
  onClose: () => void;
  onStatusChange: (newStatus: "active" | "completed" | "on_hold") => void;
  onDelete: () => void;
  onShare: () => void;
}

const statusOptions: Array<{
  value: "active" | "completed" | "on_hold";
  label: string;
  icon: string;
}> = [
  { value: "active", label: "Active", icon: "play-circle" },
  { value: "completed", label: "Completed", icon: "check-circle" },
  { value: "on_hold", label: "On Hold", icon: "pause-circle" },
];

export function ProjectActionsModal({
  isVisible,
  projectId,
  projectName,
  currentStatus,
  onClose,
  onStatusChange,
  onDelete,
  onShare,
}: ProjectActionsModalProps) {
  const { theme, isDark } = useTheme();
  const [showStatusPicker, setShowStatusPicker] = useState(false);

  const handleStatusChange = (newStatus: "active" | "completed" | "on_hold") => {
    if (newStatus !== currentStatus) {
      onStatusChange(newStatus);
      setShowStatusPicker(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Project",
      `Are you sure you want to delete "${projectName}"? This will also delete all related data including activities, receipts, and invoices.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onDelete();
            onClose();
          },
        },
      ]
    );
  };

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: isDark
                ? theme.backgroundDefault
                : theme.backgroundSecondary,
            },
          ]}
        >
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h3">{projectName}</ThemedText>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* Status Section */}
          <View style={styles.section}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Project Status
            </ThemedText>
            <View
              style={[
                styles.statusCard,
                {
                  backgroundColor: isDark
                    ? theme.backgroundDefault
                    : theme.backgroundSecondary,
                },
              ]}
            >
              <Pressable
                onPress={() => setShowStatusPicker(!showStatusPicker)}
                style={[
                  styles.statusButton,
                  {
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.statusContent}>
                  <Feather
                    name={
                      statusOptions.find((s) => s.value === currentStatus)
                        ?.icon || "circle"
                    }
                    size={20}
                    color={BrandColors.constructionGold}
                  />
                  <View style={{ marginLeft: Spacing.md }}>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      Current Status
                    </ThemedText>
                    <ThemedText type="body" style={{ fontWeight: "600" }}>
                      {currentStatus.replace("_", " ").charAt(0).toUpperCase() +
                        currentStatus.replace("_", " ").slice(1)}
                    </ThemedText>
                  </View>
                </View>
                <Feather
                  name={showStatusPicker ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.textSecondary}
                />
              </Pressable>

              {showStatusPicker && (
                <View style={styles.statusPicker}>
                  {statusOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => handleStatusChange(option.value)}
                      style={[
                        styles.statusOption,
                        {
                          backgroundColor:
                            option.value === currentStatus
                              ? `${BrandColors.constructionGold}20`
                              : "transparent",
                        },
                      ]}
                    >
                      <Feather
                        name={option.icon}
                        size={18}
                        color={BrandColors.constructionGold}
                      />
                      <ThemedText
                        type="body"
                        style={[
                          styles.statusOptionText,
                          {
                            color:
                              option.value === currentStatus
                                ? BrandColors.constructionGold
                                : theme.text,
                            fontWeight: option.value === currentStatus ? "600" : "400",
                          },
                        ]}
                      >
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Actions Section */}
          <View style={styles.section}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Actions
            </ThemedText>

            {/* Share Button */}
            <Pressable
              onPress={onShare}
              style={[
                styles.actionButton,
                {
                  backgroundColor: isDark
                    ? theme.backgroundDefault
                    : theme.backgroundSecondary,
                },
              ]}
            >
              <Feather name="share-2" size={20} color={BrandColors.constructionGold} />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <ThemedText type="body" style={{ fontWeight: "600" }}>
                  Share Project
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Share via web portal
                </ThemedText>
              </View>
              <Feather name="arrow-right" size={18} color={theme.textSecondary} />
            </Pressable>

            {/* Delete Button */}
            <Pressable
              onPress={handleDelete}
              style={[
                styles.actionButton,
                styles.deleteButton,
                {
                  backgroundColor: isDark
                    ? theme.backgroundDefault
                    : theme.backgroundSecondary,
                },
              ]}
            >
              <Feather name="trash-2" size={20} color="#EF4444" />
              <View style={{ flex: 1, marginLeft: Spacing.md }}>
                <ThemedText type="body" style={{ fontWeight: "600", color: "#EF4444" }}>
                  Delete Project
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Remove all related data
                </ThemedText>
              </View>
              <Feather name="arrow-right" size={18} color="#EF4444" />
            </Pressable>
          </View>
        </ScrollView>

        {/* Close Button at Bottom */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: isDark
                ? theme.backgroundDefault
                : theme.backgroundSecondary,
              borderTopColor: theme.border,
            },
          ]}
        >
          <Button
            size="large"
            variant="secondary"
            style={{ flex: 1 }}
            onPress={onClose}
          >
            Close
          </Button>
        </View>
      </ThemedView>
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
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    width: 40,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  statusCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
  },
  statusContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusPicker: {
    borderTopWidth: 1,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  statusOptionText: {
    marginLeft: Spacing.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  deleteButton: {
    // Styling applied inline with color props
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
  },
});
