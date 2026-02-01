import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: string;
    total: string;
  }>;
}

interface ExtractionReviewSheetProps {
  data: ExtractedData;
  imageUrl: string;
  isLoading: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
}

export function ExtractionReviewSheet({
  data,
  imageUrl,
  isLoading,
  onConfirm,
  onEdit,
  onCancel,
}: ExtractionReviewSheetProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();

  return (
    <ThemedView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: Spacing.xl + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Spacing.lg, paddingBottom: Spacing.md }]}>
          <Pressable onPress={onCancel}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h4">Review Receipt</ThemedText>
          <View style={{ width: 24 }} />
        </View>

        <View style={[styles.content, { paddingHorizontal: Spacing.lg }]}>
          {/* Receipt Image */}
          {imageUrl && (
            <GlassCard
              style={StyleSheet.flatten([
                styles.imageCard,
                {
                  backgroundColor: isDark
                    ? theme.backgroundDefault
                    : theme.backgroundSecondary,
                },
              ]) as ViewStyle}
            >
              <Image
                source={{ uri: imageUrl }}
                style={styles.receiptImage}
                resizeMode="cover"
              />
            </GlassCard>
          )}

          {/* Extracted Data */}
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
            <View style={styles.fieldGroup}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Vendor
              </ThemedText>
              <ThemedText type="h3" style={{ marginTop: Spacing.xs }}>
                {data.vendor}
              </ThemedText>
            </View>

            <View style={[styles.row, { marginTop: Spacing.md }]}>
              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Total Amount
                </ThemedText>
                <ThemedText
                  type="h3"
                  style={{
                    marginTop: Spacing.xs,
                    color: BrandColors.constructionGold,
                  }}
                >
                  ${data.total}
                </ThemedText>
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Date
                </ThemedText>
                <ThemedText type="h4" style={{ marginTop: Spacing.xs }}>
                  {data.date}
                </ThemedText>
              </View>
            </View>
          </GlassCard>

          {/* Items List */}
          {data.items && data.items.length > 0 && (
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
                Items
              </ThemedText>
              {data.items.map((item, index) => (
                <View
                  key={index}
                  style={[
                    styles.itemRow,
                    index !== data.items.length - 1 && {
                      borderBottomColor: theme.textSecondary,
                      borderBottomWidth: 0.5,
                      paddingBottom: Spacing.md,
                      marginBottom: Spacing.md,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <ThemedText type="body">{item.name}</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                      {item.quantity} x ${item.unitPrice}
                    </ThemedText>
                  </View>
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    ${item.total}
                  </ThemedText>
                </View>
              ))}
            </GlassCard>
          )}

          {/* Instructions */}
          <GlassCard
            style={StyleSheet.flatten([
              styles.card,
              {
                backgroundColor: `${BrandColors.constructionGold}10`,
              },
            ]) as ViewStyle}
          >
            <View style={styles.instructionRow}>
              <Feather name="info" size={16} color={BrandColors.constructionGold} />
              <ThemedText type="small" style={{ flex: 1, marginLeft: Spacing.sm }}>
                Review the extracted data. Edit if needed, then confirm to proceed to billing decision.
              </ThemedText>
            </View>
          </GlassCard>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={onEdit}
              disabled={isLoading}
              style={({ pressed }) => [
                styles.secondaryButton,
                {
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Feather name="edit-2" size={18} color={theme.text} />
              <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                Recapture
              </ThemedText>
            </Pressable>

            <Button
              size="large"
              onPress={onConfirm}
              disabled={isLoading}
              style={{ flex: 1 }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Feather name="check" size={18} color="white" />
                  <ThemedText type="body" style={{ color: "white", marginLeft: Spacing.sm }}>
                    Confirm
                  </ThemedText>
                </>
              )}
            </Button>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
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
    borderBottomWidth: 0.5,
  },
  content: {
    paddingVertical: Spacing.lg,
  },
  imageCard: {
    padding: 0,
    marginBottom: Spacing.lg,
    overflow: "hidden",
  },
  receiptImage: {
    width: "100%",
    height: 250,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  fieldGroup: {
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  secondaryButton: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ccc",
  },
});
