import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { Feather } from "@expo/vector-icons";

interface LogoutConfirmationProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export function LogoutConfirmation({
  isVisible,
  onDismiss,
}: LogoutConfirmationProps) {
  const { theme } = useTheme();
  const { signOut } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogout = async () => {
    try {
      setIsProcessing(true);
      await signOut();
      onDismiss();
      // Navigation to Welcome screen is handled by auth guard
    } catch (error) {
      Alert.alert("Error", "Failed to log out. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <ThemedView style={[styles.dialog, { backgroundColor: theme.backgroundDefault }]}>
          {/* Warning Icon */}
          <View style={styles.iconContainer}>
            <View
              style={[
                styles.iconBackground,
                { backgroundColor: BrandColors.error + "20" },
              ]}
            >
              <Feather
                name="alert-circle"
                size={32}
                color={BrandColors.error}
              />
            </View>
          </View>

          {/* Title */}
          <ThemedText type="h2" style={styles.title}>
            Log Out?
          </ThemedText>

          {/* Description */}
          <ThemedText
            style={[styles.description, { color: theme.tabIconDefault }]}
          >
            Are you sure you want to log out? You'll need to sign in again to access your account.
          </ThemedText>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.secondaryButton, { borderColor: theme.border }]}
              onPress={onDismiss}
              disabled={isProcessing}
            >
              <ThemedText style={[styles.secondaryButtonText, { color: BrandColors.constructionGold }]}>
                Cancel
              </ThemedText>
            </Pressable>

            <Pressable
              style={[
                styles.primaryButton,
                { backgroundColor: BrandColors.error },
                isProcessing && { opacity: 0.6 },
              ]}
              onPress={handleLogout}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color="white" />
              ) : (
                <ThemedText style={styles.primaryButtonText}>
                  Log Out
                </ThemedText>
              )}
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  dialog: {
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  iconContainer: {
    marginBottom: Spacing.lg,
  },
  iconBackground: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    width: "100%",
    gap: Spacing.md,
  },
  secondaryButton: {
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
