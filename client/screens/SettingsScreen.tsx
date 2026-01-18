import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";

interface SettingItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  hasToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
}

function SettingItem({
  icon,
  label,
  value,
  hasToggle,
  toggleValue,
  onToggle,
  onPress,
}: SettingItemProps) {
  const { theme, isDark } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={hasToggle}
      style={({ pressed }) => [
        styles.settingItem,
        {
          backgroundColor: pressed && !hasToggle
            ? isDark
              ? theme.backgroundSecondary
              : theme.backgroundDefault
            : "transparent",
        },
      ]}
    >
      <View style={styles.settingLeft}>
        <Feather name={icon} size={18} color={BrandColors.constructionGold} />
        <ThemedText type="body">{label}</ThemedText>
      </View>
      {hasToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{
            false: theme.border,
            true: BrandColors.constructionGold,
          }}
          thumbColor="#fff"
        />
      ) : (
        <View style={styles.settingRight}>
          {value ? (
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {value}
            </ThemedText>
          ) : null}
          <Feather name="chevron-right" size={18} color={theme.textSecondary} />
        </View>
      )}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();

  const [notifications, setNotifications] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [autoReminders, setAutoReminders] = useState(true);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          ACCOUNT
        </ThemedText>
        <View
          style={[
            styles.settingsGroup,
            {
              backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          <SettingItem icon="user" label="Edit Profile" onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingItem icon="briefcase" label="Company Info" onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingItem icon="lock" label="Change Password" onPress={() => {}} />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          NOTIFICATIONS
        </ThemedText>
        <View
          style={[
            styles.settingsGroup,
            {
              backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          <SettingItem
            icon="bell"
            label="Push Notifications"
            hasToggle
            toggleValue={notifications}
            onToggle={setNotifications}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingItem
            icon="clock"
            label="Auto Reminders"
            hasToggle
            toggleValue={autoReminders}
            onToggle={setAutoReminders}
          />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          PREFERENCES
        </ThemedText>
        <View
          style={[
            styles.settingsGroup,
            {
              backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          <SettingItem
            icon="smartphone"
            label="Haptic Feedback"
            hasToggle
            toggleValue={haptics}
            onToggle={setHaptics}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingItem icon="dollar-sign" label="Currency" value="USD" onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingItem icon="percent" label="Default Tax Rate" value="8%" onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingItem icon="file-text" label="Invoice Template" value="Professional" onPress={() => {}} />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          SUPPORT
        </ThemedText>
        <View
          style={[
            styles.settingsGroup,
            {
              backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          <SettingItem icon="help-circle" label="Help Center" onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingItem icon="message-circle" label="Contact Support" onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingItem icon="star" label="Rate TellBill" onPress={() => {}} />
        </View>
      </View>

      <View style={styles.section}>
        <ThemedText type="small" style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          LEGAL
        </ThemedText>
        <View
          style={[
            styles.settingsGroup,
            {
              backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          <SettingItem icon="file" label="Terms of Service" onPress={() => {}} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingItem icon="shield" label="Privacy Policy" onPress={() => {}} />
        </View>
      </View>

      <ThemedText
        type="caption"
        style={[styles.version, { color: theme.textSecondary }]}
      >
        TellBill v1.0.0
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionLabel: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    fontWeight: "600",
    letterSpacing: 1,
  },
  settingsGroup: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  divider: {
    height: 1,
    marginLeft: Spacing.lg + 18 + Spacing.md,
  },
  version: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
});
