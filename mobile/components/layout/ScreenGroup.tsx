import React from "react";
import { View, ViewStyle } from "react-native";

import { Spacing, BorderRadius } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface ScreenGroupProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /**
   * Gap between items.
   * @default Spacing.sm (dividers between items)
   */
  gap?: number;
  /**
   * Show borders/background for grouped container.
   * @default false
   */
  bordered?: boolean;
  testID?: string;
}

/**
 * Visually grouped container for related items.
 *
 * Used for:
 * - Settings grouped in a box
 * - Card lists
 * - Related buttons/actions
 *
 * Example:
 * ```
 * <ScreenGroup bordered>
 *   <SettingItem label="Profile" />
 *   <Divider />
 *   <SettingItem label="Settings" />
 * </ScreenGroup>
 * ```
 */
export function ScreenGroup({
  children,
  style,
  gap = Spacing.sm,
  bordered = false,
  testID,
}: ScreenGroupProps) {
  const { theme, isDark } = useTheme();

  const containerStyle: ViewStyle = {
    gap,
  };

  if (bordered) {
    Object.assign(containerStyle, {
      backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundRoot,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: BorderRadius.md,
      overflow: "hidden",
    });
  }

  return (
    <View style={[containerStyle, style]} testID={testID}>
      {children}
    </View>
  );
}
