import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
  Alert,
  Share,
  Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { ClientSharingService } from "@/services/clientSharingService";

interface ShareProgressModalProps {
  isVisible: boolean;
  projectId: string;
  projectName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ShareProgressModal({
  isVisible,
  projectId,
  projectName,
  onClose,
  onSuccess,
}: ShareProgressModalProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateToken = async () => {
    try {
      setIsLoading(true);
      setError(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Light);

      const result = await ClientSharingService.generateShareToken({
        projectId,
        projectName,
        visibility: "ALL",
      });

      if (!result.success || !result.data) {
        setError(result.error || "Failed to generate share token");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      setShareToken(result.data.shareToken);
      setShareUrl(result.data.portalUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error("[ShareProgressModal] Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await Clipboard.setStringAsync(shareUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Success", "Link copied to clipboard!");
    } catch (err) {
      console.error("[ShareProgressModal] Copy error:", err);
      Alert.alert("Error", "Failed to copy link");
    }
  };

  const handleShare = async () => {
    if (!shareUrl) return;
    try {
      await Share.share({
        message: `View project progress: ${shareUrl}`,
        title: `${projectName} - Progress Update`,
        url: shareUrl,
      });
    } catch (err) {
      console.error("[ShareProgressModal] Share error:", err);
    }
  };

  const handleSendSMS = async () => {
    if (!shareUrl) return;
    // Implement SMS sending (would need to integrate with backend or use Twilio)
    Alert.alert(
      "SMS Share",
      `SMS sharing would send: ${projectName}\n\n${shareUrl}`,
      [
        { text: "Cancel", onPress: () => {} },
        {
          text: "Copy Link",
          onPress: () => handleCopyLink(),
        },
      ]
    );
  };

  if (!isVisible) return null;

  return (
    <View style={styles.modalOverlay}>
      <Pressable style={styles.modalBackdrop} onPress={onClose} />

      <ThemedView
        style={[
          styles.modalContent,
          {
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.modalHeader}>
          <ThemedText type="title" style={styles.modalTitle}>
            Share Progress
          </ThemedText>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={24} color={theme === "dark" ? "white" : "black"} />
          </Pressable>
        </View>

        {/* Content */}
        <View style={styles.modalBody}>
          {!shareToken ? (
            // Initial State - Generate Token
            <>
              <View style={styles.descriptionBox}>
                <Feather name="info" size={20} color={BrandColors.constructionGold} />
                <ThemedText style={{ marginLeft: Spacing.md, flex: 1 }}>
                  Generate a secure link to share project progress with your client. They can view
                  activities and approve changes.
                </ThemedText>
              </View>

              <View style={styles.projectInfo}>
                <ThemedText type="subtitle">Project</ThemedText>
                <ThemedText style={styles.projectName}>{projectName}</ThemedText>
              </View>

              <Pressable
                style={[
                  styles.generateButton,
                  isLoading && styles.generateButtonDisabled,
                ]}
                onPress={handleGenerateToken}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <ActivityIndicator
                      color="white"
                      style={{ marginRight: Spacing.md }}
                    />
                    <ThemedText style={styles.generateButtonText}>Generating...</ThemedText>
                  </>
                ) : (
                  <>
                    <Feather name="share-2" size={20} color="white" />
                    <ThemedText style={styles.generateButtonText}>Generate Link</ThemedText>
                  </>
                )}
              </Pressable>

              {error && (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={16} color="#ef4444" />
                  <ThemedText style={styles.errorText}>{error}</ThemedText>
                </View>
              )}
            </>
          ) : (
            // Token Generated State - Share Options
            <>
              <View style={styles.successBox}>
                <Feather name="check-circle" size={24} color={BrandColors.constructionGold} />
                <ThemedText style={styles.successText}>Link Generated!</ThemedText>
              </View>

              <View style={styles.linkBox}>
                <ThemedText type="caption" style={styles.linkLabel}>
                  Share Link:
                </ThemedText>
                <ThemedText
                  style={styles.linkText}
                  numberOfLines={2}
                  ellipsizeMode="middle"
                >
                  {shareUrl}
                </ThemedText>
              </View>

              {/* Share Options */}
              <ThemedText type="caption" style={styles.optionsLabel}>
                Share via:
              </ThemedText>

              <View style={styles.shareOptionsGrid}>
                <Pressable
                  style={styles.shareOption}
                  onPress={handleCopyLink}
                >
                  <View
                    style={[
                      styles.shareOptionIcon,
                      { backgroundColor: "#3b82f6" + "20" },
                    ]}
                  >
                    <Feather name="copy" size={20} color="#3b82f6" />
                  </View>
                  <ThemedText type="caption" style={styles.shareOptionLabel}>
                    Copy
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={styles.shareOption}
                  onPress={handleShare}
                >
                  <View
                    style={[
                      styles.shareOptionIcon,
                      { backgroundColor: "#8b5cf6" + "20" },
                    ]}
                  >
                    <Feather name="share-2" size={20} color="#8b5cf6" />
                  </View>
                  <ThemedText type="caption" style={styles.shareOptionLabel}>
                    Share
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={styles.shareOption}
                  onPress={handleSendSMS}
                >
                  <View
                    style={[
                      styles.shareOptionIcon,
                      { backgroundColor: "#10b981" + "20" },
                    ]}
                  >
                    <Feather name="message-circle" size={20} color="#10b981" />
                  </View>
                  <ThemedText type="caption" style={styles.shareOptionLabel}>
                    SMS
                  </ThemedText>
                </Pressable>
              </View>

              <ThemedText type="caption" style={styles.note}>
                💡 Your client can view this link for 30 days. After that, you'll need to generate
                a new link.
              </ThemedText>

              <Pressable
                style={styles.doneButton}
                onPress={() => {
                  onSuccess?.();
                  onClose();
                }}
              >
                <ThemedText style={styles.doneButtonText}>Done</ThemedText>
              </Pressable>
            </>
          )}
        </View>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontWeight: "600",
  },
  closeButton: {
    padding: Spacing.sm,
    marginRight: -Spacing.sm,
  },
  modalBody: {
    gap: Spacing.lg,
  },
  descriptionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: BrandColors.constructionGold + "15",
  },
  projectInfo: {
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  projectName: {
    marginTop: Spacing.sm,
    fontWeight: "600",
    fontSize: 16,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BrandColors.constructionGold,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    color: "white",
    fontWeight: "600",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: "#fecaca",
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  errorText: {
    color: "#991b1b",
    flex: 1,
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: BrandColors.constructionGold + "20",
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  successText: {
    fontWeight: "600",
    color: BrandColors.constructionGold,
  },
  linkBox: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  linkLabel: {
    opacity: 0.7,
    marginBottom: Spacing.sm,
  },
  linkText: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: "600",
  },
  optionsLabel: {
    opacity: 0.7,
    marginTop: Spacing.md,
  },
  shareOptionsGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: Spacing.md,
  },
  shareOption: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.sm,
  },
  shareOptionIcon: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  shareOptionLabel: {
    fontWeight: "500",
    textAlign: "center",
  },
  note: {
    padding: Spacing.md,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: BorderRadius.md,
    opacity: 0.8,
  },
  doneButton: {
    backgroundColor: BrandColors.constructionGold,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  doneButtonText: {
    color: "white",
    fontWeight: "600",
  },
});
