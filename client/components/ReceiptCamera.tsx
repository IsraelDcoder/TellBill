import React, { useRef, useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Alert,
  ActivityIndicator,
  Animated,
  Image,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ReceiptReviewDrawer } from "@/components/ReceiptReviewDrawer";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { receiptProcessingService } from "@/services/receiptProcessingService";

interface ExtractedItem {
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface ReceiptCameraProps {
  isVisible: boolean;
  projectId: string;
  onCapture?: (photoBase64: string) => void;
  onReceiptAdded?: () => void;
  onClose: () => void;
  isProcessing?: boolean;
}

export function ReceiptCamera({
  isVisible,
  projectId,
  onCapture,
  onReceiptAdded,
  onClose,
  isProcessing = false,
}: ReceiptCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [isCaptureMode, setIsCaptureMode] = useState(true);
  const cameraRef = useRef<CameraView>(null);
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Receipt review drawer state
  const [showReview, setShowReview] = useState(false);
  const [extractedData, setExtractedData] = useState<{
    vendor: string;
    date: string;
    items: ExtractedItem[];
    grandTotal: number;
    photoUri: string;
    photoBase64: string;
  } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [isDuplicateLoading, setIsDuplicateLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isVisible) return null;

  // Request camera permission
  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert("Permission Required", "Camera access is needed to scan receipts.");
    }
  };

  // Capture photo and extract data
  const handleCapture = async () => {
    if (!cameraRef.current || !isCaptureMode) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Light);

      // Pulse animation
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      setIsCaptureMode(false);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (photo?.base64) {
        // If callback provided, use it (backward compatibility)
        if (onCapture) {
          onCapture(photo.base64);
          setIsCaptureMode(true);
          return;
        }

        // Otherwise, extract receipt data
        setIsExtracting(true);
        try {
          const extracted = await receiptProcessingService.extractReceiptData(
            photo.base64
          );

          // Check for duplicates
          setIsDuplicateLoading(true);
          const duplicate = await receiptProcessingService.checkForDuplicates(
            extracted.vendor,
            extracted.grandTotal,
            extracted.date
          );
          setIsDuplicate(duplicate);

          setExtractedData({
            vendor: extracted.vendor,
            date: extracted.date,
            items: extracted.items,
            grandTotal: extracted.grandTotal,
            photoUri: photo.uri,
            photoBase64: photo.base64,
          });

          setShowReview(true);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (extractError) {
          console.error("[ReceiptCamera] Extraction error:", extractError);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(
            "Extraction Failed",
            "Could not extract receipt data. Try a clearer photo."
          );
        } finally {
          setIsExtracting(false);
          setIsDuplicateLoading(false);
        }

        setIsCaptureMode(true);
      }
    } catch (error) {
      console.error("[ReceiptCamera] Capture error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to capture photo");
      setIsCaptureMode(true);
    }
  };

  // Handle review confirmation
  const handleConfirmReceipt = async () => {
    if (!extractedData) return;

    try {
      setIsSaving(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Light);

      // First, upload the receipt
      const uploadResponse = await receiptProcessingService.uploadReceipt(
        extractedData.photoBase64,
        extractedData.vendor,
        extractedData.date
      );

      if (!uploadResponse.success || !uploadResponse.receiptId) {
        throw new Error(uploadResponse.error || "Failed to upload receipt");
      }

      // Then create an activity from the receipt
      const activityResponse = await receiptProcessingService.createActivityFromReceipt(
        projectId,
        uploadResponse.receiptId,
        {
          vendor: extractedData.vendor,
          date: extractedData.date,
          items: extractedData.items,
          grand_total: extractedData.grandTotal,
        },
        true // visibleToClient
      );

      if (!activityResponse.success) {
        throw new Error(activityResponse.error || "Failed to create activity");
      }

      Alert.alert("Success", "Receipt added to project");
      setShowReview(false);
      setExtractedData(null);
      onReceiptAdded?.();
    } catch (error) {
      console.error("[ReceiptCamera] Save error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to save receipt. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle review close
  const handleCloseReview = () => {
    setShowReview(false);
    setExtractedData(null);
    setIsDuplicate(false);
  };

  // Handle edit receipt (future: implement edit UI)
  const handleEditReceipt = () => {
    Alert.alert("Edit", "Edit functionality coming soon");
  };


  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.centerContent}>
          <Feather name="camera-off" size={48} color={theme.text} />
          <ThemedText type="subtitle" style={{ marginTop: Spacing.lg }}>
            Camera Permission Required
          </ThemedText>
          <Pressable
            style={styles.permissionButton}
            onPress={handleRequestPermission}
          >
            <ThemedText style={styles.buttonText}>Grant Permission</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.centerContent}>
          <ThemedText type="subtitle">Camera access is required</ThemedText>
          <Pressable
            style={styles.permissionButton}
            onPress={handleRequestPermission}
          >
            <ThemedText style={styles.buttonText}>Request Access</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        {/* Camera View */}
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          mode="picture"
        >
          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.headerText}>
              Scan Receipt
            </ThemedText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Feather name="x" size={28} color="white" />
            </Pressable>
          </View>

          {/* Document Guide Frame */}
          <View style={styles.guidesContainer}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            
            <ThemedText style={styles.guideText}>
              Position receipt within frame
            </ThemedText>
          </View>

          {/* Bottom Controls */}
          <View style={styles.controlsContainer}>
            {isExtracting ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={BrandColors.constructionGold} />
                <ThemedText style={styles.loadingText}>Extracting receipt data...</ThemedText>
              </View>
            ) : (
              <>
                <Animated.View
                  style={[
                    styles.captureButtonContainer,
                    { transform: [{ scale: scaleAnim }] },
                  ]}
                >
                  <Pressable
                    style={styles.captureButton}
                    onPress={handleCapture}
                    disabled={!isCaptureMode}
                  >
                    <Feather name="camera" size={32} color="white" />
                  </Pressable>
                </Animated.View>

                <ThemedText style={styles.instructionText}>
                  Tap to capture receipt
                </ThemedText>
              </>
            )}
          </View>
        </CameraView>
      </View>

      {/* Receipt Review Drawer */}
      {extractedData && (
        <ReceiptReviewDrawer
          isVisible={showReview}
          photoUrl={extractedData.photoUri}
          vendor={extractedData.vendor}
          date={extractedData.date}
          items={extractedData.items}
          grandTotal={extractedData.grandTotal}
          isDuplicate={isDuplicate}
          isDuplicateLoading={isDuplicateLoading}
          onConfirm={handleConfirmReceipt}
          onEdit={handleEditReceipt}
          onCancel={handleCloseReview}
          isProcessing={isSaving}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  camera: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  permissionButton: {
    marginTop: Spacing.lg,
    backgroundColor: BrandColors.constructionGold,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    textAlign: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  headerText: {
    color: "white",
    fontWeight: "600",
  },
  closeButton: {
    padding: Spacing.sm,
  },
  guidesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  corner: {
    position: "absolute",
    borderColor: BrandColors.constructionGold,
    width: 40,
    height: 40,
  },
  topLeft: {
    borderLeftWidth: 4,
    borderTopWidth: 4,
    top: 60,
    left: 30,
  },
  topRight: {
    borderRightWidth: 4,
    borderTopWidth: 4,
    top: 60,
    right: 30,
  },
  bottomLeft: {
    borderLeftWidth: 4,
    borderBottomWidth: 4,
    bottom: 100,
    left: 30,
  },
  bottomRight: {
    borderRightWidth: 4,
    borderBottomWidth: 4,
    bottom: 100,
    right: 30,
  },
  guideText: {
    color: "white",
    fontSize: 14,
    opacity: 0.8,
  },
  controlsContainer: {
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  captureButtonContainer: {
    marginBottom: Spacing.md,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: BrandColors.constructionGold,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  instructionText: {
    color: "white",
    fontSize: 12,
    opacity: 0.8,
    textAlign: "center",
  },
  loadingContainer: {
    alignItems: "center",
    gap: Spacing.md,
  },
  loadingText: {
    color: "white",
    fontSize: 14,
  },
});
