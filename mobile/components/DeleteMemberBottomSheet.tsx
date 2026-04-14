import React from "react";
import {
  StyleSheet,
  View,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface DeleteMemberBottomSheetProps {
  visible: boolean;
  memberName: string;
  onDelete: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function DeleteMemberBottomSheet({
  visible,
  memberName,
  onDelete,
  onCancel,
  isLoading = false,
}: DeleteMemberBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable
        style={styles.overlay}
        onPress={onCancel}
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
        
        <View style={styles.content}>
          <ThemedText type="h2" style={styles.title}>
            Delete Team Member?
          </ThemedText>
          
          <View style={styles.warningBox}>
            <ThemedText type="body" style={styles.warningText}>
              This will remove <ThemedText type="body" style={{ fontWeight: "700" }}>{memberName}</ThemedText> from the organization. Their previous logs and invoices will be archived but they will lose app access.
            </ThemedText>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              onPress={onDelete}
              disabled={isLoading}
              style={[styles.deleteButton, { backgroundColor: "#D32F2F" }]}
            >
              <ThemedText type="body" style={styles.deleteButtonText}>
                {isLoading ? "Removing..." : "Delete Member"}
              </ThemedText>
            </Button>
            
            <Button
              variant="outline"
              onPress={onCancel}
              disabled={isLoading}
              style={styles.cancelButton}
            >
              <ThemedText type="body">
                Cancel
              </ThemedText>
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  bottomSheet: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
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
    gap: Spacing.lg,
  },
  title: {
    textAlign: "center",
  },
  warningBox: {
    backgroundColor: "rgba(211, 47, 47, 0.1)",
    borderLeftWidth: 4,
    borderLeftColor: "#D32F2F",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  warningText: {
    color: "#D32F2F",
    lineHeight: 22,
  },
  buttonContainer: {
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  deleteButton: {
    paddingVertical: Spacing.lg,
  },
  deleteButtonText: {
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
  },
  cancelButton: {
    paddingVertical: Spacing.lg,
  },
});
