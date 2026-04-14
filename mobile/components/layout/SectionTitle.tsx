import React from "react";
import { View, ViewStyle } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Consistent section title with proper spacing.
 *
 * Includes:
 * - Uppercase label styling
 * - Optional subtitle
 * - Correct bottom margin for content
 *
 * Example:
 * ```
 * <SectionTitle title="Invoices" subtitle="Recent & Sent" />
 * ```
 */
export function SectionTitle({
  title,
  subtitle,
  style,
  testID,
}: SectionTitleProps) {
  const { theme } = useTheme();

  return (
    <View style={[{ marginBottom: Spacing.lg }, style]} testID={testID}>
      <ThemedText
        type="small"
        style={{
          color: theme.textSecondary,
          fontWeight: "600",
          letterSpacing: 0.5,
          marginBottom: subtitle ? Spacing.xs : 0,
        }}
      >
        {title.toUpperCase()}
      </ThemedText>
      {subtitle && (
        <ThemedText
          type="body"
          style={{
            color: theme.textSecondary,
          }}
        >
          {subtitle}
        </ThemedText>
      )}
    </View>
  );
}
