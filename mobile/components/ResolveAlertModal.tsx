import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors, BorderRadius } from "@/constants/theme";
import { MoneyAlert } from "@/stores/moneyAlertsStore";

interface ResolveAlertModalProps {
  visible: boolean;
  alert: MoneyAlert | null;
  isLoading?: boolean;
  onResolve: (reason: string, note?: string) => Promise<void>;
  onClose: () => void;
}

const reasons = [
  { id: "included_in_contract", label: "Included in contract" },
  { id: "warranty", label: "Warranty work" },
  { id: "personal", label: "Personal expense" },
  { id: "customer_refused", label: "Customer refused" },
  { id: "other", label: "Other reason" },
];

export function ResolveAlertModal({
  visible,
  alert,
  isLoading = false,
  onResolve,
  onClose,
}: ResolveAlertModalProps) {
  const { theme, isDark } = useTheme();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [note, setNote] = useState("");

  if (!alert) return null;

  const handleResolve = async () => {
    if (!selectedReason) return;

    try {
      await onResolve(selectedReason, note || undefined);
      setSelectedReason(null);
      setNote("");
      onClose();
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h3">Resolve Alert</ThemedText>
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

          {/* Reason Selection */}
          <ThemedText type="h4" style={{ marginTop: Spacing.lg, marginBottom: Spacing.md }}>
            Why are you marking this as resolved?
          </ThemedText>

          <View style={styles.reasonsList}>
            {reasons.map((reason) => (
              <Pressable
                key={reason.id}
                style={({ pressed }) => [
                  styles.reasonButton,
                  {
                    backgroundColor:
                      selectedReason === reason.id
                        ? BrandColors.constructionGold
                        : isDark
                        ? theme.backgroundDefault
                        : theme.backgroundSecondary,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                onPress={() => setSelectedReason(reason.id)}
              >
                <View
                  style={[
                    styles.radioButton,
                    {
                      borderColor:
                        selectedReason === reason.id
                          ? "white"
                          : BrandColors.constructionGold,
                      backgroundColor:
                        selectedReason === reason.id
                          ? "white"
                          : "transparent",
                    },
                  ]}
                />
                <ThemedText
                  type="body"
                  style={{
                    marginLeft: Spacing.md,
                    color:
                      selectedReason === reason.id
                        ? "white"
                        : theme.text,
                    fontWeight: "600",
                  }}
                >
                  {reason.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* Optional Note */}
          {selectedReason === "other" && (
            <View style={styles.noteSection}>
              <ThemedText type="body" style={{ marginBottom: Spacing.md, fontWeight: "600" }}>
                Please explain (optional)
              </ThemedText>
              <TextInput
                style={[
                  styles.noteInput,
                  {
                    backgroundColor: isDark
                      ? theme.backgroundDefault
                      : theme.backgroundSecondary,
                    color: theme.text,
                    borderColor: theme.textSecondary,
                  },
                ]}
                placeholder="Add details..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
                value={note}
                onChangeText={setNote}
              />
            </View>
          )}

          {/* Info text */}
          <ThemedText
            type="small"
            style={{
              color: theme.textSecondary,
              marginTop: Spacing.lg,
              marginBottom: Spacing.lg,
            }}
          >
            💡 This alert will be removed from your list once resolved.
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
              styles.resolveButton,
              {
                backgroundColor: BrandColors.constructionGold,
                opacity:
                  !selectedReason || isLoading
                    ? 0.5
                    : pressed
                    ? 0.8
                    : 1,
              },
            ]}
            onPress={handleResolve}
            disabled={!selectedReason || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <ThemedText type="body" style={{ color: "white", fontWeight: "600" }}>
                Resolve Alert
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
  reasonsList: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  reasonButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  noteSection: {
    marginBottom: Spacing.lg,
  },
  noteInput: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    fontFamily: "Menlo",
    fontSize: 14,
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
  resolveButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
});
