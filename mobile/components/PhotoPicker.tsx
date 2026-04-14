import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { BrandColors, Spacing } from "@/constants/theme";

/**
 * ✅ PHOTO PICKER COMPONENT
 * 
 * Allows contractors to select photos as proof of work
 * Supports camera, gallery, and multiple selections
 * Integration with cloud storage for URLs
 */

interface PhotoPickerProps {
  onPhotosSelected: (photos: string[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

export const PhotoPicker: React.FC<PhotoPickerProps> = ({
  onPhotosSelected,
  maxPhotos = 5,
  disabled = false,
}) => {
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const requestPermissions = async () => {
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!cameraPermission.granted || !libraryPermission.granted) {
      Alert.alert(
        "Permission Required",
        "Camera and photo library permissions are needed to add photos."
      );
      return false;
    }

    return true;
  };

  const pickFromCamera = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const pickFromLibrary = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        for (const asset of result.assets) {
          if (selectedPhotos.length < maxPhotos) {
            await uploadPhoto(asset.uri);
          } else {
            Alert.alert("Limit Reached", `Maximum ${maxPhotos} photos allowed`);
            break;
          }
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick photos");
    }
  };

  const uploadPhoto = async (uri: string) => {
    setUploading(true);
    try {
      // In production, upload to cloud storage (S3, etc)
      // For now, use local URI as placeholder
      // In real implementation:
      // const formData = new FormData();
      // formData.append("file", {
      //   uri,
      //   type: "image/jpeg",
      //   name: "scope-proof.jpg",
      // });
      // const response = await fetch(`${BACKEND_URL}/api/upload`, {
      //   method: "POST",
      //   body: formData,
      // });
      // const data = await response.json();
      // const cloudUrl = data.url;

      const updatedPhotos = [...selectedPhotos, uri];
      setSelectedPhotos(updatedPhotos);
      onPhotosSelected(updatedPhotos);

      Alert.alert("Success", `Photo added (${updatedPhotos.length}/${maxPhotos})`);
    } catch (error) {
      Alert.alert("Error", "Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    const updatedPhotos = selectedPhotos.filter((_, i) => i !== index);
    setSelectedPhotos(updatedPhotos);
    onPhotosSelected(updatedPhotos);
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <ThemedText style={styles.title}>📸 Proof of Work</ThemedText>
      <ThemedText style={styles.subtitle}>
        Add photos to prove the work was completed. {selectedPhotos.length}/{maxPhotos}
      </ThemedText>

      {/* Photo grid */}
      {selectedPhotos.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photoGrid}
        >
          {selectedPhotos.map((photo, index) => (
            <View key={index} style={styles.photoContainer}>
              <Image source={{ uri: photo }} style={styles.photoThumbnail} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePhoto(index)}
              >
                <Feather name="x" size={16} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Action buttons */}
      {selectedPhotos.length < maxPhotos && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cameraButton]}
            onPress={pickFromCamera}
            disabled={disabled || uploading}
          >
            <Feather name="camera" size={20} color="white" />
            <Text style={styles.buttonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.libraryButton]}
            onPress={pickFromLibrary}
            disabled={disabled || uploading}
          >
            <Feather name="image" size={20} color="white" />
            <Text style={styles.buttonText}>Choose Photos</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Upload status */}
      {uploading && (
        <View style={styles.uploadingContainer}>
          <Text style={styles.uploadingText}>Uploading...</Text>
        </View>
      )}

      {/* Info message */}
      {selectedPhotos.length > 0 && (
        <View style={styles.infoBox}>
          <Feather name="info" size={16} color={BrandColors.constructionGold} />
          <ThemedText style={styles.infoText}>
            Photos help clients verify the work and reduce disputes.
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.md,
    marginVertical: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: Spacing.md,
  },
  photoGrid: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  photoContainer: {
    position: "relative",
    marginRight: Spacing.sm,
  },
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#EF4444",
    borderRadius: 12,
    padding: 4,
    zIndex: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    gap: Spacing.xs,
  },
  cameraButton: {
    backgroundColor: "#667eea",
  },
  libraryButton: {
    backgroundColor: "#764ba2",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
  },
  uploadingContainer: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  uploadingText: {
    fontSize: 12,
    opacity: 0.7,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    padding: Spacing.sm,
    borderRadius: 6,
    gap: Spacing.xs,
  },
  infoText: {
    fontSize: 12,
    flex: 1,
    opacity: 0.8,
  },
});
