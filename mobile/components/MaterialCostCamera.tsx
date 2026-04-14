import React, { useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";

interface MaterialCostCameraProps {
  isVisible: boolean;
  onImageCaptured: (imageBase64: string) => void;
  onClose: () => void;
  isProcessing?: boolean;
}

export function MaterialCostCamera({
  isVisible,
  onImageCaptured,
  onClose,
  isProcessing = false,
}: MaterialCostCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { theme, isDark } = useTheme();
  const [isCapturing, setIsCapturing] = useState(false);

  if (!isVisible) return null;

  const handleTakePicture = async () => {
    if (!cameraRef.current) return;

    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.8,
      });

      if (!photo || !photo.base64) {
        throw new Error("Failed to capture image");
      }

      onImageCaptured(photo.base64);
    } catch (error) {
      console.error("[Material Cost Camera] Error:", error);
      Alert.alert("Error", "Failed to capture image");
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRequestPermission = async () => {
    const { granted } = await requestPermission();
    if (!granted) {
      Alert.alert("Camera Permission", "Camera access is required to capture receipts");
    }
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.constructionGold} />
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.permissionContainer}>
          <Feather name="camera" size={48} color={BrandColors.constructionGold} />
          <ThemedText type="h4" style={styles.permissionTitle}>
            Camera Access Needed
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: "center" }}>
            Please grant camera permission to capture receipts
          </ThemedText>
          <Pressable
            onPress={handleRequestPermission}
            style={[styles.button, { backgroundColor: BrandColors.constructionGold }]}
          >
            <ThemedText type="body" style={{ color: "white", fontWeight: "600" }}>
              Grant Permission
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        mode="picture"
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: Spacing.lg }]}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <Feather name="x" size={24} color="white" />
          </Pressable>
          <ThemedText type="h4" style={{ color: "white" }}>
            Capture Receipt
          </ThemedText>
          <View style={{ width: 40 }} />
        </View>

        {/* Document Frame Overlay */}
        <View style={styles.frameContainer}>
          <View style={[styles.frame, styles.frameCorner, styles.frameTopLeft]} />
          <View style={[styles.frame, styles.frameCorner, styles.frameTopRight]} />
          <View style={[styles.frame, styles.frameCorner, styles.frameBottomLeft]} />
          <View style={[styles.frame, styles.frameCorner, styles.frameBottomRight]} />
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <ThemedText type="body" style={{ color: "white", textAlign: "center", fontWeight: "600" }}>
            Position receipt in frame
          </ThemedText>
          <ThemedText type="small" style={{ color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: Spacing.sm }}>
            Make sure vendor and total are clearly visible
          </ThemedText>
        </View>

        {/* Bottom Controls */}
        <View style={styles.controls}>
          {isProcessing || isCapturing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color={BrandColors.constructionGold} />
              <ThemedText
                type="small"
                style={{ color: "white", marginTop: Spacing.md, textAlign: "center" }}
              >
                Analyzing receipt…
              </ThemedText>
            </View>
          ) : (
            <Pressable
              onPress={handleTakePicture}
              disabled={isCapturing}
              style={[
                styles.captureButton,
                {
                  backgroundColor: BrandColors.constructionGold,
                  opacity: isCapturing ? 0.5 : 1,
                },
              ]}
            >
              <Feather name="camera" size={28} color="white" />
            </Pressable>
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  permissionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  button: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  frameContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  frame: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: BrandColors.constructionGold,
    borderWidth: 3,
  },
  frameCorner: {
    borderRadius: 4,
  },
  frameTopLeft: {
    top: 60,
    left: 30,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  frameTopRight: {
    top: 60,
    right: 30,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  frameBottomLeft: {
    bottom: 100,
    left: 30,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  frameBottomRight: {
    bottom: 100,
    right: 30,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  instructions: {
    position: "absolute",
    top: 140,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
  },
  controls: {
    paddingBottom: 60,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  processingContainer: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
});
