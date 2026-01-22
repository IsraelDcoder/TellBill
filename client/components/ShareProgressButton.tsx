import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

interface ShareProgressButtonProps {
  onPress: () => void;
  size?: number;
  color?: string;
}

export function ShareProgressButton({
  onPress,
  size = 24,
  color = "white",
}: ShareProgressButtonProps) {
  const handlePress = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Light);
    onPress();
  };

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <Feather name="share-2" size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 8,
    marginRight: 12,
  },
});
