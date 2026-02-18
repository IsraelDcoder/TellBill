import React from "react";
import { ScrollView, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
   * @default "default" (Spacing.xl)
   */
  paddingBottom?: "default" | "compact" | "relaxed" | number;
}

/**
 * Enterprise-level screen container with consistent spacing.
 *
 * ✅ IMPROVED: Now handles safe areas correctly
 * - Uses SafeAreaView with edges={['bottom']} ONLY
 * - No top padding (React Navigation header handles that)
 * - Consistent horizontal padding
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

  // Resolve bottom padding (NO safe area - SafeAreaView handles it)
  const getPaddingBottom = () => {
    if (typeof paddingBottom === "number") return paddingBottom;
    const paddingMap = {
      compact: Spacing.lg,
      default: Spacing.xl,
      relaxed: Spacing["2xl"],
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
      <SafeAreaView style={containerStyle} edges={['bottom']} testID={testID}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[scrollContentStyle, { flexGrow: 1 }]}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          bounces={true}
          alwaysBounceVertical={false}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containerStyle} edges={['bottom']} testID={testID}>
      <View
        style={{
          flex: 1,
          paddingHorizontal: horizontalPadding,
          paddingBottom: bottomPadding,
        }}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
