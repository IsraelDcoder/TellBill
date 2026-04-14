import React from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors, Shadows } from "@/constants/theme";

interface QuickActionButtonProps {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  isPrimary?: boolean;
  size?: "normal" | "large";
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function QuickActionButton({
  title,
  icon,
  onPress,
  isPrimary = false,
  size = "normal",
}: QuickActionButtonProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const buttonSize = size === "large" ? 80 : 64;
  const iconSize = size === "large" ? 28 : 22;

  return (
    <View style={styles.container}>
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.button,
          {
            width: buttonSize,
            height: buttonSize,
            borderRadius: buttonSize / 2,
            backgroundColor: isPrimary
              ? BrandColors.constructionGold
              : isDark
                ? theme.backgroundSecondary
                : theme.backgroundDefault,
          },
          isPrimary ? Shadows.fab : Shadows.md,
          animatedStyle,
        ]}
      >
        <Feather
          name={icon}
          size={iconSize}
          color={isPrimary ? BrandColors.slateGrey : theme.text}
        />
      </AnimatedPressable>
      <ThemedText
        type="caption"
        style={[styles.label, { color: theme.textSecondary }]}
      >
        {title}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  button: {
    justifyContent: "center",
    alignItems: "center",
  },
  label: {
    textAlign: "center",
    maxWidth: 80,
  },
});
