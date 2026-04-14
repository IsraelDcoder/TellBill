import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Switch,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import {
  ScreenContainer,
  Section,
  SectionTitle,
  ScreenGroup,
} from "@/components/layout";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  hasToggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
}

function Divider() {
  const { theme } = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.border }]} />;
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
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [notifications, setNotifications] = useState(true);
  const [haptics, setHaptics] = useState(true);
  const [autoReminders, setAutoReminders] = useState(true);

  return (
    <ScreenContainer testID="settings-screen">
      {/* ACCOUNT Section */}
      <Section spacing="compact">
        <SectionTitle title="Account" />
        <ScreenGroup bordered>
          <SettingItem icon="user" label="Edit Profile" onPress={() => navigation.navigate("EditProfile")} />
          <Divider />
          <SettingItem icon="briefcase" label="Company Info" onPress={() => navigation.navigate("CompanyInfo")} />
          <Divider />
          <SettingItem icon="lock" label="Change Password" onPress={() => navigation.navigate("ChangePassword")} />
        </ScreenGroup>
      </Section>

      {/* NOTIFICATIONS Section */}
      <Section>
        <SectionTitle title="Notifications" />
        <ScreenGroup bordered>
          <SettingItem
            icon="bell"
            label="Push Notifications"
            hasToggle
            toggleValue={notifications}
            onToggle={setNotifications}
          />
          <Divider />
          <SettingItem
            icon="clock"
            label="Auto Reminders"
            hasToggle
            toggleValue={autoReminders}
            onToggle={setAutoReminders}
          />
        </ScreenGroup>
      </Section>

      {/* PREFERENCES Section */}
      <Section>
        <SectionTitle title="Preferences" />
        <ScreenGroup bordered>
          <SettingItem
            icon="smartphone"
            label="Haptic Feedback"
            hasToggle
            toggleValue={haptics}
            onToggle={setHaptics}
          />
          <Divider />
          <SettingItem icon="dollar-sign" label="Currency" value="USD" onPress={() => navigation.navigate("Currency")} />
          <Divider />
          <SettingItem icon="percent" label="Default Tax Rate" value="8%" onPress={() => navigation.navigate("TaxRate")} />
          <Divider />
          <SettingItem icon="file-text" label="Invoice Template" value="Professional" onPress={() => navigation.navigate("InvoiceTemplate")} />
        </ScreenGroup>
      </Section>

      {/* SUPPORT Section */}
      <Section>
        <SectionTitle title="Support" />
        <ScreenGroup bordered>
          <SettingItem icon="help-circle" label="Help Center" onPress={() => navigation.navigate("HelpSupport")} />
          <Divider />
          <SettingItem icon="message-circle" label="Contact Support" onPress={() => navigation.navigate("HelpSupport")} />
          <Divider />
          <SettingItem icon="star" label="Rate TellBill" onPress={() => {}} />
        </ScreenGroup>
      </Section>

      {/* LEGAL Section */}
      <Section>
        <SectionTitle title="Legal" />
        <ScreenGroup bordered>
          <SettingItem icon="file" label="Terms of Service" onPress={() => navigation.navigate("TermsOfService")} />
          <Divider />
          <SettingItem icon="shield" label="Privacy Policy" onPress={() => navigation.navigate("PrivacyPolicy")} />
        </ScreenGroup>
      </Section>

      {/* Version Footer */}
      <View style={styles.footer}>
        <ThemedText type="caption" style={[styles.version, { color: theme.textSecondary }]}>
          TellBill v1.0.0
        </ThemedText>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    marginLeft: 18 + Spacing.md + Spacing.lg, // icon + gap + padding
  },
  footer: {
    marginTop: Spacing["2xl"],
    paddingTop: Spacing.xl,
    alignItems: "center",
  },
  version: {
    textAlign: "center",
  },
});
