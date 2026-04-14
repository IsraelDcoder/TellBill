import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors, BorderRadius } from "@/constants/theme";
import { MoneyAlert } from "@/stores/moneyAlertsStore";

interface FixAlertModalProps {
  visible: boolean;
  alert: MoneyAlert | null;
  isLoading?: boolean;
  onFix: (action: any) => Promise<void>;
  onClose: () => void;
}

export function FixAlertModal({
  visible,
  alert,
  isLoading = false,
  onFix,
  onClose,
}: FixAlertModalProps) {
  const { theme, isDark } = useTheme();
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  if (!alert) return null;

  const getActions = () => {
    switch (alert.type) {
      case "RECEIPT_UNBILLED":
        return [
          { id: "attach", label: "Attach to Existing Invoice", icon: "link-2" },
          { id: "create", label: "Create New Invoice", icon: "plus-circle" },
        ];
      case "SCOPE_APPROVED_NO_INVOICE":
        return [
          { id: "attach", label: "Attach to Existing Invoice", icon: "link-2" },
          { id: "create", label: "Generate Invoice from Scope", icon: "plus-circle" },
        ];
      case "VOICE_LOG_NO_INVOICE":
        return [
          { id: "attach", label: "Attach to Existing Invoice", icon: "link-2" },
          { id: "create", label: "Create Invoice from Transcript", icon: "plus-circle" },
        ];
      case "INVOICE_NOT_SENT":
        return [{ id: "send", label: "Send Invoice Now", icon: "send" }];
      default:
        return [];
    }
  };

  const handleFix = async () => {
    if (!selectedAction) return;

    try {
      const action: any = {};
      if (selectedAction === "attach") {
        action.targetInvoiceId = ""; // TODO: Let user select invoice
      } else if (selectedAction === "create") {
        action.createNew = true;
      } else if (selectedAction === "send") {
        action.send = true;
      }

      await onFix(action);
      setSelectedAction(null);
      onClose();
    } catch (error) {
      console.error("Error fixing alert:", error);
    }
  };

  const actions = getActions();

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h3">Fix Alert</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Alert Summary */}
          <View
            style={[
              styles.alertSummary,
              {
                backgroundColor: isDark
                  ? theme.backgroundDefault
                  : theme.backgroundSecondary,
              },
            ]}
          >
            <Feather name="alert-circle" size={32} color={BrandColors.constructionGold} />
            <View style={{ flex: 1, marginLeft: Spacing.md }}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {alert.type.replace(/_/g, " ")}
              </ThemedText>
              {alert.estimatedAmount && (
                <ThemedText type="small" style={{ color: BrandColors.constructionGold, marginTop: Spacing.xs }}>
                  ${alert.estimatedAmount}
                </ThemedText>
              )}
            </View>
          </View>

          {/* Actions */}
          <ThemedText type="h4" style={{ marginTop: Spacing.lg, marginBottom: Spacing.md }}>
            How do you want to fix this?
          </ThemedText>

          <View style={styles.actionsList}>
            {actions.map((action) => (
              <Pressable
                key={action.id}
                style={({ pressed }) => [
                  styles.actionButton,
                  {
                    backgroundColor:
                      selectedAction === action.id
                        ? BrandColors.constructionGold
                        : isDark
                        ? theme.backgroundDefault
                        : theme.backgroundSecondary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={() => setSelectedAction(action.id)}
              >
                <Feather
                  name={action.icon as any}
                  size={20}
                  color={
                    selectedAction === action.id
                      ? "white"
                      : BrandColors.constructionGold
                  }
                />
                <ThemedText
                  type="body"
                  style={{
                    marginLeft: Spacing.md,
                    color:
                      selectedAction === action.id
                        ? "white"
                        : theme.text,
                    fontWeight: "600",
                  }}
                >
                  {action.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* Info text */}
          <ThemedText
            type="small"
            style={{
              color: theme.textSecondary,
              marginTop: Spacing.lg,
              marginBottom: Spacing.lg,
            }}
          >
            💡 This action will mark the alert as fixed once completed.
          </ThemedText>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.cancelButton,
              {
                backgroundColor: isDark
                  ? theme.backgroundDefault
                  : theme.backgroundSecondary,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            onPress={onClose}
            disabled={isLoading}
          >
            <ThemedText type="body" style={{ fontWeight: "600" }}>
              Cancel
            </ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.fixButton,
              {
                backgroundColor: BrandColors.constructionGold,
                opacity:
                  !selectedAction || isLoading
                    ? 0.5
                    : pressed
                    ? 0.8
                    : 1,
              },
            ]}
            onPress={handleFix}
            disabled={!selectedAction || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <ThemedText type="body" style={{ color: "white", fontWeight: "600" }}>
                Fix Alert
              </ThemedText>
            )}
          </Pressable>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  alertSummary: {
    flexDirection: "row",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  actionsList: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  footer: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  fixButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
});
