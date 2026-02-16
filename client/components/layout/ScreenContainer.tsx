import React from "react";
import { ScrollView, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  scrollable?: boolean;
  showsVerticalScrollIndicator?: boolean;
  testID?: string;
  /**
   * Controls horizontal padding.
   * @default "default" (Spacing.lg)
   */
  paddingHorizontal?: "default" | "compact" | "relaxed" | number;
  /**
   * Controls bottom padding for content.
   * @default "default" (Spacing.xl + insets)
   */
  paddingBottom?: "default" | "compact" | "relaxed" | number;
}

/**
 * Enterprise-level screen container with consistent spacing.
 *
 * Handles:
 * - Safe area insets
 * - Horizontal padding consistency
 * - Bottom padding for tab bar + buffer
 * - ScrollView vs View selection
 * - Theme integration
 *
 * Example usage:
 * ```
 * <ScreenContainer>
 *   <Section>
 *     <SectionTitle>My Section</SectionTitle>
 *   </Section>
 * </ScreenContainer>
 * ```
 */
export function ScreenContainer({
  children,
  style,
  contentContainerStyle,
  scrollable = true,
  showsVerticalScrollIndicator = false,
  testID,
  paddingHorizontal = "default",
  paddingBottom = "default",
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  // Resolve horizontal padding
  const getPaddingHorizontal = () => {
    if (typeof paddingHorizontal === "number") return paddingHorizontal;
    const paddingMap = {
      compact: Spacing.md,
      default: Spacing.lg,
      relaxed: Spacing.xl,
    };
    return paddingMap[paddingHorizontal];
  };

  // Resolve bottom padding
  const getPaddingBottom = () => {
    if (typeof paddingBottom === "number") return paddingBottom;
    const paddingMap = {
      compact: Spacing.lg + insets.bottom,
      default: Spacing.xl + insets.bottom,
      relaxed: Spacing["2xl"] + insets.bottom,
    };
    return paddingMap[paddingBottom];
  };

  const horizontalPadding = getPaddingHorizontal();
  const bottomPadding = getPaddingBottom();

  const containerStyle = [
    {
      flex: 1,
      backgroundColor: theme.backgroundRoot,
    },
    style,
  ];

  const scrollContentStyle = {
    paddingHorizontal: horizontalPadding,
    paddingBottom: bottomPadding,
    ...contentContainerStyle,
  };

  if (scrollable) {
    return (
      <ScrollView
        style={containerStyle}
        contentContainerStyle={scrollContentStyle}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        testID={testID}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View style={containerStyle} testID={testID}>
      <View
        style={[
          { flex: 1 },
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: bottomPadding,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}
