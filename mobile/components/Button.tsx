import React, { ReactNode } from "react";
import { StyleSheet, Pressable, ViewStyle, StyleProp, ActivityIndicator } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing, BrandColors, Shadows } from "@/constants/theme";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";

interface ButtonProps {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  size?: "small" | "medium" | "large";
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  onPress,
  children,
  style,
  disabled = false,
  loading = false,
  variant = "primary",
  size = "medium",
}: ButtonProps) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const handlePress = () => {
    if (!disabled && !loading && onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const getBackgroundColor = () => {
    if (disabled) return isDark ? "#4a4b4b" : "#d1d5db";
    switch (variant) {
      case "primary":
        return BrandColors.constructionGold;
      case "secondary":
        return isDark ? theme.backgroundSecondary : theme.backgroundDefault;
      case "outline":
      case "ghost":
        return "transparent";
      default:
        return BrandColors.constructionGold;
    }
  };

  const getTextColor = () => {
    if (disabled) return isDark ? "#9ca3af" : "#6b7280";
    switch (variant) {
      case "primary":
        return BrandColors.slateGrey;
      case "secondary":
        return theme.text;
      case "outline":
      case "ghost":
        return BrandColors.constructionGold;
      default:
        return BrandColors.slateGrey;
    }
  };

  const getBorderStyle = () => {
    if (variant === "outline") {
      return {
        borderWidth: 2,
        borderColor: disabled
          ? isDark
            ? "#4a4b4b"
            : "#d1d5db"
          : BrandColors.constructionGold,
      };
    }
    return {};
  };

  const getHeight = () => {
    switch (size) {
      case "small":
        return 40;
      case "medium":
        return Spacing.buttonHeight;
      case "large":
        return 64;
      default:
        return Spacing.buttonHeight;
    }
  };

  const getFontSize = () => {
    switch (size) {
      case "small":
        return 14;
      case "medium":
        return 16;
      case "large":
        return 18;
      default:
        return 16;
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          height: getHeight(),
          opacity: disabled || loading ? 0.7 : 1,
        },
        getBorderStyle(),
        variant === "primary" ? Shadows.md : {},
        style,
        animatedStyle,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <ThemedText
          type="body"
          style={[
            styles.buttonText,
            { color: getTextColor(), fontSize: getFontSize() },
          ]}
        >
          {children}
        </ThemedText>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  buttonText: {
    fontWeight: "600",
  },
});
