import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";

interface ExtractedItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface ReceiptReviewDrawerProps {
  isVisible: boolean;
  photoUrl: string;
  vendor: string;
  date: string;
  items: ExtractedItem[];
  grandTotal: number;
  isDuplicate: boolean;
  isDuplicateLoading: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export function ReceiptReviewDrawer({
  isVisible,
  photoUrl,
  vendor,
  date,
  items,
  grandTotal,
  isDuplicate,
  isDuplicateLoading,
  onConfirm,
  onEdit,
  onCancel,
  isProcessing = false,
}: ReceiptReviewDrawerProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [showDetails, setShowDetails] = useState(false);

  if (!isVisible) return null;

  const handleConfirm = async () => {
    if (isDuplicate) {
      Alert.alert(
        "Duplicate Receipt?",
        "This receipt looks like one already added. Continue anyway?",
        [
          { text: "Cancel", onPress: () => {} },
          {
            text: "Continue",
            onPress: () => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              onConfirm();
            },
          },
        ]
      );
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onConfirm();
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={onCancel} />

      <ThemedView
        style={[
          styles.drawer,
          {
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="h2">Receipt Found</ThemedText>
          <Pressable onPress={onCancel} style={styles.closeButton}>
            <Feather name="x" size={24} color={isDark ? "white" : "black"} />
          </Pressable>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Photo Preview */}
          {photoUrl && (
            <Image
              source={{ uri: photoUrl }}
              style={styles.photoPreview}
              resizeMode="cover"
            />
          )}

          {/* Duplicate Warning */}
          {isDuplicate && (
            <View style={styles.warningBox}>
              <Feather name="alert-circle" size={20} color="#f59e0b" />
              <ThemedText style={styles.warningText}>
                This receipt may already be added. Review carefully.
              </ThemedText>
            </View>
          )}

          {/* Vendor & Date */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <ThemedText type="small" style={styles.label}>
                Vendor
              </ThemedText>
              <ThemedText style={styles.value}>{vendor}</ThemedText>
            </View>
            <View
              style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: "rgba(0,0,0,0.1)" }]}
            >
              <ThemedText type="small" style={styles.label}>
                Date
              </ThemedText>
              <ThemedText style={styles.value}>{date}</ThemedText>
            </View>
          </View>

          {/* Items Summary */}
          {items && items.length > 0 && (
            <>
              <Pressable
                style={styles.itemsHeader}
                onPress={() => setShowDetails(!showDetails)}
              >
                <ThemedText type="h4">
                  {items.length} {items.length === 1 ? "Item" : "Items"}
                </ThemedText>
                <Feather
                  name={showDetails ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={isDark ? "white" : "black"}
                />
              </Pressable>

              {showDetails && (
                <View style={styles.itemsList}>
                  {items.map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                      <View style={styles.itemInfo}>
                        <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                        <ThemedText type="small" style={styles.itemQuantity}>
                          {item.quantity} × ${item.unit_price.toFixed(2)}
                        </ThemedText>
                      </View>
                      <ThemedText style={styles.itemTotal}>
                        ${item.total.toFixed(2)}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {/* Total Amount */}
          <View style={styles.totalBox}>
            <View style={styles.totalRow}>
              <ThemedText type="h4">Total Amount</ThemedText>
              <ThemedText
                type="h2"
                style={{
                  color: BrandColors.constructionGold,
                }}
              >
                ${grandTotal.toFixed(2)}
              </ThemedText>
            </View>
          </View>

          {/* Loading indicator for duplicate check */}
          {isDuplicateLoading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={BrandColors.constructionGold} />
              <ThemedText type="small" style={{ marginLeft: Spacing.md }}>
                Checking for duplicates...
              </ThemedText>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.cancelButton]}
            onPress={onCancel}
            disabled={isProcessing}
          >
            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
          </Pressable>

          <Pressable
            style={[styles.button, styles.editButton]}
            onPress={onEdit}
            disabled={isProcessing}
          >
            <Feather name="edit-2" size={18} color={BrandColors.constructionGold} />
            <ThemedText style={styles.editButtonText}>Edit</ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.button,
              styles.confirmButton,
              isProcessing && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={isProcessing || isDuplicateLoading}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Feather name="check" size={18} color="white" />
                <ThemedText style={styles.confirmButtonText}>Add to Project</ThemedText>
              </>
            )}
          </Pressable>
        </View>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 999,
  },
  backdrop: {
    flex: 1,
  },
  drawer: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    maxHeight: "90%",
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  closeButton: {
    padding: Spacing.sm,
    marginRight: -Spacing.sm,
  },
  content: {
    flex: 1,
    marginBottom: Spacing.lg,
  },
  photoPreview: {
    width: "100%",
    height: 150,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    backgroundColor: "#fef3c7",
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  warningText: {
    flex: 1,
    color: "#92400e",
    fontSize: 13,
  },
  infoBox: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    marginBottom: Spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  label: {
    opacity: 0.7,
  },
  value: {
    fontWeight: "600",
  },
  itemsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  itemsList: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  itemQuantity: {
    opacity: 0.7,
  },
  itemTotal: {
    fontWeight: "700",
    fontSize: 14,
    marginLeft: Spacing.md,
  },
  totalBox: {
    backgroundColor: BrandColors.constructionGold + "15",
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  cancelButton: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  cancelButtonText: {
    fontWeight: "600",
  },
  editButton: {
    borderWidth: 2,
    borderColor: BrandColors.constructionGold,
  },
  editButtonText: {
    color: BrandColors.constructionGold,
    fontWeight: "600",
  },
  confirmButton: {
    backgroundColor: BrandColors.constructionGold,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
