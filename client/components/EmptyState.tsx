import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  Image,
  ImageSourcePropType,
  Pressable,
  Dimensions,
} from "react-native";
import Animated, {
  FadeInUp,
  withTiming,
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import Svg, { Circle, Path, G } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";

const { width } = Dimensions.get("window");

interface EmptyStateProps {
  image?: ImageSourcePropType;
  icon?: "invoice" | "project" | "team" | "voice" | "folder";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  image,
  icon = "folder",
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { theme } = useTheme();
  const scaleAnim = useSharedValue(0.8);
  const opacityAnim = useSharedValue(0);

  useEffect(() => {
    scaleAnim.value = withTiming(1, { duration: 600 });
    opacityAnim.value = withTiming(1, { duration: 400 });
  }, []);

  const iconAnimStyle = useAnimatedStyle(() => {
    return {
      opacity: opacityAnim.value,
      transform: [{ scale: scaleAnim.value }],
    };
  });

  const renderIcon = () => {
    const iconSize = 80;
    const strokeWidth = 2;

    switch (icon) {
      case "invoice":
        return (
          <Svg width={iconSize} height={iconSize} viewBox="0 0 100 100">
            <G>
              <Path
                d="M 20 10 L 80 10 Q 85 10 85 15 L 85 90 Q 85 95 80 95 L 20 95 Q 15 95 15 90 L 15 15 Q 15 10 20 10"
                stroke={BrandColors.constructionGold}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M 30 30 L 70 30"
                stroke={BrandColors.constructionGold}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              <Path
                d="M 30 45 L 70 45"
                stroke={BrandColors.constructionGold}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              <Path
                d="M 30 60 L 55 60"
                stroke={BrandColors.constructionGold}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            </G>
          </Svg>
        );

      case "project":
        return (
          <Svg width={iconSize} height={iconSize} viewBox="0 0 100 100">
            <G>
              <Path
                d="M 15 30 L 40 30 L 45 20 L 85 20 Q 90 20 90 25 L 90 85 Q 90 90 85 90 L 15 90 Q 10 90 10 85 L 10 35 Q 10 30 15 30"
                stroke={BrandColors.constructionGold}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M 35 55 L 45 65 L 65 45"
                stroke={BrandColors.constructionGold}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </G>
          </Svg>
        );

      case "voice":
        return (
          <Svg width={iconSize} height={iconSize} viewBox="0 0 100 100">
            <G>
              <Circle
                cx="50"
                cy="35"
                r="15"
                stroke={BrandColors.constructionGold}
                strokeWidth={strokeWidth}
                fill="none"
              />
              <Path
                d="M 40 50 L 40 70"
                stroke={BrandColors.constructionGold}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              <Path
                d="M 60 50 L 60 70"
                stroke={BrandColors.constructionGold}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              <Path
                d="M 50 70 L 50 85"
                stroke={BrandColors.constructionGold}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            </G>
          </Svg>
        );

      case "folder":
      default:
        return (
          <Svg width={iconSize} height={iconSize} viewBox="0 0 100 100">
            <G>
              <Path
                d="M 15 25 L 40 25 L 50 15 L 85 15 Q 90 15 90 20 L 90 80 Q 90 85 85 85 L 15 85 Q 10 85 10 80 L 10 30 Q 10 25 15 25"
                stroke={BrandColors.constructionGold}
                strokeWidth={strokeWidth}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Path
                d="M 50 45 L 50 65"
                stroke={BrandColors.constructionGold}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
              <Path
                d="M 40 55 L 60 55"
                stroke={BrandColors.constructionGold}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            </G>
          </Svg>
        );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      {/* Icon with animation */}
      <Animated.View style={[styles.iconContainer, iconAnimStyle]}>
        {image ? (
          <Image source={image} style={styles.image} resizeMode="contain" />
        ) : (
          renderIcon()
        )}
      </Animated.View>

      {/* Content */}
      <Animated.View
        entering={FadeInUp.delay(200).duration(600)}
        style={styles.contentContainer}
      >
        <ThemedText type="h2" style={styles.title}>
          {title}
        </ThemedText>

        <ThemedText
          style={[styles.description, { color: theme.tabIconDefault }]}
        >
          {description}
        </ThemedText>
      </Animated.View>

      {/* CTA Button */}
      {actionLabel && onAction && (
        <Animated.View
          entering={FadeInUp.delay(400).duration(600)}
          style={styles.ctaContainer}
        >
          <Pressable
            style={[
              styles.ctaButton,
              { backgroundColor: BrandColors.constructionGold },
            ]}
            onPress={onAction}
          >
            <ThemedText style={styles.ctaText}>{actionLabel}</ThemedText>
            <Feather name="arrow-right" size={18} color="#000" />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  iconContainer: {
    marginBottom: Spacing.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: 120,
    height: 120,
  },
  contentContainer: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    maxWidth: 300,
    marginBottom: Spacing.lg,
  },
  ctaContainer: {
    width: "100%",
  },
  ctaButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  button: {
    minWidth: 160,
    paddingHorizontal: Spacing["2xl"],
  },
});
