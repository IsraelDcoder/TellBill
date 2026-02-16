import React from "react";
import { View, ViewStyle } from "react-native";

import { Spacing } from "@/constants/theme";

interface SectionProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /**
   * Space BEFORE this section (top margin).
   * @default "default" (Spacing.xl)
   */
  spacing?: "compact" | "default" | "relaxed" | "none" | number;
  /**
   * Whether to add visual separation (gap between items inside).
   * @default false
   */
  separated?: boolean;
  testID?: string;
}

/**
 * Consistent section wrapper for vertical rhythm.
 *
 * Handles:
 * - Predictable top margin based on rhythm
 * - Consistent gap between elements
 * - Visual grouping
 *
 * Example:
 * ```
 * <Section>
 *   <SectionTitle>Invoices</SectionTitle>
 *   <InvoiceCard />
 *   <InvoiceCard />
 * </Section>
 * ```
 */
export function Section({
  children,
  style,
  spacing = "default",
  separated = false,
  testID,
}: SectionProps) {
  const getSpacing = () => {
    if (typeof spacing === "number") return spacing;
    const spacingMap = {
      none: 0,
      compact: Spacing.lg,
      default: Spacing.xl,
      relaxed: Spacing["2xl"],
    };
    return spacingMap[spacing];
  };

  const marginTop = getSpacing();

  const containerStyle: ViewStyle = {
    marginTop,
  };

  if (separated) {
    Object.assign(containerStyle, {
      gap: Spacing.md,
    });
  }

  return (
    <View style={[containerStyle, style]} testID={testID}>
      {children}
    </View>
  );
}
