import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  ViewStyle,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BrandColors, BorderRadius } from "@/constants/theme";

interface ExtractedData {
  vendor: string;
  date: string;
  total: string;
  items: any[];
}

interface BillingDecisionModalProps {
  receiptData: ExtractedData;
  isLoading: boolean;
  onBillable: (clientData: { name?: string; email?: string }) => Promise<void>;
  onNonBillable: (reason: string) => Promise<void>;
  onCancel: () => void;
}

export function BillingDecisionModal({
  receiptData,
  isLoading,
  onBillable,
  onNonBillable,
  onCancel,
}: BillingDecisionModalProps) {
  const { theme, isDark } = useTheme();
  const [decision, setDecision] = useState<"billable" | "non-billable" | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [nonBillableReason, setNonBillableReason] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBillableSubmit = async () => {
    if (!clientName && !clientEmail) {
      alert("Please enter client name or email");
      return;
    }

    setIsSubmitting(true);
    try {
      await onBillable({
        name: clientName,
        email: clientEmail,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNonBillableSubmit = async () => {
    if (!nonBillableReason) {
      alert("Please select a reason");
      return;
    }

    setIsSubmitting(true);
    try {
      await onNonBillable(nonBillableReason);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: Spacing.lg,
            paddingVertical: Spacing.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="h2" style={{ textAlign: "center", marginBottom: Spacing.sm }}>
              Billing Decision
            </ThemedText>
            <ThemedText
              type="body"
              style={{
                textAlign: "center",
                color: theme.textSecondary,
              }}
            >
              Every receipt needs a decision. Choose one:
            </ThemedText>
          </View>

          {/* Receipt Summary */}
          <GlassCard
            style={StyleSheet.flatten([
              styles.card,
              {
                backgroundColor: isDark
                  ? theme.backgroundDefault
                  : theme.backgroundSecondary,
              },
            ]) as ViewStyle}
          >
            <View style={styles.summaryRow}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                {receiptData.vendor}
              </ThemedText>
              <ThemedText
                type="h3"
                style={{
                  color: BrandColors.constructionGold,
                }}
              >
                ${receiptData.total}
              </ThemedText>
            </View>
          </GlassCard>

          {/* Option A: Bill to Client */}
          <Pressable
            onPress={() => setDecision(decision === "billable" ? null : "billable")}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: isDark
                  ? theme.backgroundDefault
                  : theme.backgroundSecondary,
                borderColor:
                  decision === "billable"
                    ? BrandColors.constructionGold
                    : theme.textSecondary,
                borderWidth: decision === "billable" ? 2 : 0.5,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={styles.optionHeader}>
              <View
                style={[
                  styles.optionIcon,
                  {
                    backgroundColor:
                      decision === "billable"
                        ? `${BrandColors.constructionGold}20`
                        : `${theme.textSecondary}10`,
                  },
                ]}
              >
                <Feather
                  name="check-circle"
                  size={24}
                  color={
                    decision === "billable"
                      ? BrandColors.constructionGold
                      : theme.textSecondary
                  }
                />
              </View>
              <ThemedText type="h4">Bill to Client</ThemedText>
            </View>
            <ThemedText
              type="small"
              style={{
                color: theme.textSecondary,
                marginTop: Spacing.xs,
              }}
            >
              Add this cost to a client invoice
            </ThemedText>
          </Pressable>

          {/* Billable Details Form */}
          {decision === "billable" && (
            <GlassCard
              style={StyleSheet.flatten([
                styles.card,
                {
                  backgroundColor: isDark
                    ? theme.backgroundDefault
                    : theme.backgroundSecondary,
                },
              ]) as ViewStyle}
            >
              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
                Who is this billed to?
              </ThemedText>

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Client Name (Optional)
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: theme.textSecondary,
                      color: theme.text,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.03)",
                    },
                  ]}
                  placeholder="e.g., ABC Construction"
                  placeholderTextColor={theme.textSecondary}
                  value={clientName}
                  onChangeText={setClientName}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Client Email (Optional)
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      borderColor: theme.textSecondary,
                      color: theme.text,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(0,0,0,0.03)",
                    },
                  ]}
                  placeholder="e.g., contact@abcconstruction.com"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="email-address"
                  value={clientEmail}
                  onChangeText={setClientEmail}
                  editable={!isSubmitting}
                />
              </View>

              <Button
                size="large"
                onPress={handleBillableSubmit}
                disabled={isSubmitting || (!clientName && !clientEmail)}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Feather name="arrow-right" size={18} color="white" />
                    <ThemedText
                      type="body"
                      style={{ color: "white", marginLeft: Spacing.sm }}
                    >
                      Save & Continue
                    </ThemedText>
                  </>
                )}
              </Button>
            </GlassCard>
          )}

          {/* Option B: Mark as Non-Billable */}
          <Pressable
            onPress={() => setDecision(decision === "non-billable" ? null : "non-billable")}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.optionCard,
              {
                backgroundColor: isDark
                  ? theme.backgroundDefault
                  : theme.backgroundSecondary,
                borderColor:
                  decision === "non-billable"
                    ? BrandColors.constructionGold
                    : theme.textSecondary,
                borderWidth: decision === "non-billable" ? 2 : 0.5,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={styles.optionHeader}>
              <View
                style={[
                  styles.optionIcon,
                  {
                    backgroundColor:
                      decision === "non-billable"
                        ? `${BrandColors.constructionGold}20`
                        : `${theme.textSecondary}10`,
                  },
                ]}
              >
                <Feather
                  name="x-circle"
                  size={24}
                  color={
                    decision === "non-billable"
                      ? BrandColors.constructionGold
                      : theme.textSecondary
                  }
                />
              </View>
              <ThemedText type="h4">Mark as Non-Billable</ThemedText>
            </View>
            <ThemedText
              type="small"
              style={{
                color: theme.textSecondary,
                marginTop: Spacing.xs,
              }}
            >
              This cost is on you (internal expense)
            </ThemedText>
          </Pressable>

          {/* Non-Billable Reason Selection */}
          {decision === "non-billable" && (
            <GlassCard
              style={StyleSheet.flatten([
                styles.card,
                {
                  backgroundColor: isDark
                    ? theme.backgroundDefault
                    : theme.backgroundSecondary,
                },
              ]) as ViewStyle}
            >
              <ThemedText type="h4" style={{ marginBottom: Spacing.md }}>
                Why not billable?
              </ThemedText>

              {["personal", "overhead", "warranty", "other"].map((reason) => (
                <Pressable
                  key={reason}
                  onPress={() => setNonBillableReason(reason)}
                  disabled={isSubmitting}
                  style={({ pressed }) => [
                    styles.reasonOption,
                    {
                      backgroundColor:
                        nonBillableReason === reason
                          ? `${BrandColors.constructionGold}20`
                          : "transparent",
                      borderColor:
                        nonBillableReason === reason
                          ? BrandColors.constructionGold
                          : theme.textSecondary,
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.reasonRadio,
                      {
                        borderColor:
                          nonBillableReason === reason
                            ? BrandColors.constructionGold
                            : theme.textSecondary,
                        backgroundColor:
                          nonBillableReason === reason
                            ? BrandColors.constructionGold
                            : "transparent",
                      },
                    ]}
                  >
                    {nonBillableReason === reason && (
                      <Feather name="check" size={12} color="white" />
                    )}
                  </View>
                  <ThemedText type="body" style={{ marginLeft: Spacing.md }}>
                    {reason.charAt(0).toUpperCase() + reason.slice(1)}
                  </ThemedText>
                </Pressable>
              ))}

              <Button
                size="large"
                onPress={handleNonBillableSubmit}
                disabled={isSubmitting || !nonBillableReason}
                style={{ marginTop: Spacing.lg }}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Feather name="arrow-right" size={18} color="white" />
                    <ThemedText
                      type="body"
                      style={{ color: "white", marginLeft: Spacing.sm }}
                    >
                      Save & Continue
                    </ThemedText>
                  </>
                )}
              </Button>
            </GlassCard>
          )}

          {/* Cancel Button */}
          {!decision && (
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.cancelButton,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Cancel
              </ThemedText>
            </Pressable>
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
  header: {
    marginBottom: Spacing.xl,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  input: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    fontSize: 16,
  },
  reasonOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  reasonRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
});
