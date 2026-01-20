import React, { useState } from "react";
import { StyleSheet, View, Pressable, ScrollView, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { LogoutConfirmation } from "@/components/LogoutConfirmation";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useInvoiceStore } from "@/stores/invoiceStore";
import { useProfileStore } from "@/stores/profileStore";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  showBadge?: boolean;
  badgeText?: string;
}

function MenuItem({ icon, label, onPress, showBadge, badgeText }: MenuItemProps) {
  const { theme, isDark } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: pressed
            ? isDark
              ? theme.backgroundSecondary
              : theme.backgroundDefault
            : "transparent",
        },
      ]}
    >
      <View style={styles.menuItemLeft}>
        <View
          style={[
            styles.menuIconContainer,
            { backgroundColor: `${BrandColors.constructionGold}15` },
          ]}
        >
          <Feather name={icon} size={18} color={BrandColors.constructionGold} />
        </View>
        <ThemedText type="body">{label}</ThemedText>
      </View>
      <View style={styles.menuItemRight}>
        {showBadge ? (
          <View
            style={[
              styles.badge,
              { backgroundColor: BrandColors.constructionGold },
            ]}
          >
            <ThemedText
              type="caption"
              style={{ color: BrandColors.slateGrey, fontWeight: "600" }}
            >
              {badgeText}
            </ThemedText>
          </View>
        ) : null}
        <Feather name="chevron-right" size={18} color={theme.textSecondary} />
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { getStats } = useInvoiceStore();
  const { userProfile, companyInfo } = useProfileStore();
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarInitials, setAvatarInitials] = useState("U");

  useFocusEffect(
    React.useCallback(() => {
      // Update display name from profileStore
      const firstName = userProfile.firstName || user?.name?.split(" ")[0] || "";
      const lastName = userProfile.lastName || user?.name?.split(" ").slice(1).join(" ") || "";
      const fullName = [firstName, lastName].filter(Boolean).join(" ");
      
      setDisplayName(fullName || user?.name || "User");
      
      // Generate avatar initials
      const initials = firstName 
        ? firstName[0].toUpperCase()
        : (user?.name?.[0] || "U").toUpperCase();
      setAvatarInitials(initials);
      
      return () => {}; // cleanup function
    }, [userProfile, user])
  );

  const stats = getStats();
  const invoicesCreated = stats.sent + stats.paid + stats.pending + stats.overdue;
  const revenueGenerated = stats.revenue;
  const timeSavedHours = Math.round(stats.timeSaved * 10) / 10;
  
  // Format revenue as K (e.g., 32000 -> $32K, 5400 -> $5.4K)
  const formattedRevenue = revenueGenerated >= 1000
    ? `$${(revenueGenerated / 1000).toFixed(revenueGenerated % 1000 === 0 ? 0 : 1)}K`
    : `$${revenueGenerated}`;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: tabBarHeight + Spacing.xl,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={styles.profileHeader}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: `${BrandColors.constructionGold}20` },
          ]}
        >
          <ThemedText type="display" style={{ color: BrandColors.constructionGold }}>
            {avatarInitials}
          </ThemedText>
        </View>
        <ThemedText type="h2" style={styles.name}>
          {displayName}
        </ThemedText>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>
          {user?.email || "email@example.com"}
        </ThemedText>
        <View style={styles.companyBadge}>
          <Feather name="briefcase" size={14} color={BrandColors.constructionGold} />
          <ThemedText type="small" style={{ color: BrandColors.constructionGold }}>
            {companyInfo.name}
          </ThemedText>
        </View>
      </View>

      <GlassCard style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: BrandColors.constructionGold }}>
              {invoicesCreated}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Invoices Created
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: BrandColors.constructionGold }}>
              {formattedRevenue}
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Revenue Generated
            </ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <ThemedText type="h2" style={{ color: BrandColors.constructionGold }}>
              {timeSavedHours}h
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Time Saved
            </ThemedText>
          </View>
        </View>
      </GlassCard>

      <View style={styles.menuSection}>
        <ThemedText type="small" style={[styles.menuLabel, { color: theme.textSecondary }]}>
          ACCOUNT
        </ThemedText>
        <View
          style={[
            styles.menuContainer,
            {
              backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          <MenuItem
            icon="credit-card"
            label="Billing & Subscription"
            onPress={() => navigation.navigate("Billing")}
            showBadge
            badgeText="Solo"
          />
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <MenuItem
            icon="settings"
            label="Settings"
            onPress={() => navigation.navigate("Settings")}
          />
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <MenuItem
            icon="help-circle"
            label="Help & Support"
            onPress={() => navigation.navigate("HelpSupport")}
          />
        </View>
      </View>

      <View style={styles.menuSection}>
        <ThemedText type="small" style={[styles.menuLabel, { color: theme.textSecondary }]}>
          COMING SOON
        </ThemedText>
        <View
          style={[
            styles.menuContainer,
            {
              backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundRoot,
              borderColor: theme.border,
            },
          ]}
        >
          <MenuItem
            icon="link"
            label="QuickBooks Integration"
            onPress={() => navigation.navigate("ComingSoon", { feature: "QuickBooks Integration" })}
          />
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <MenuItem
            icon="map-pin"
            label="GPS Verification Audit"
            onPress={() => navigation.navigate("ComingSoon", { feature: "GPS Verification Audit" })}
          />
          <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
          <MenuItem
            icon="star"
            label="White-Label Enterprise"
            onPress={() => navigation.navigate("ComingSoon", { feature: "White-Label Enterprise" })}
          />
        </View>
      </View>

      <Pressable
        style={styles.logoutButton}
        onPress={() => setShowLogoutConfirmation(true)}
      >
        <Feather name="log-out" size={18} color={theme.error} />
        <ThemedText type="body" style={{ color: theme.error }}>
          Log Out
        </ThemedText>
      </Pressable>

      <LogoutConfirmation
        isVisible={showLogoutConfirmation}
        onDismiss={() => setShowLogoutConfirmation(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  name: {
    marginBottom: Spacing.xs,
  },
  companyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: `${BrandColors.constructionGold}15`,
  },
  statsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  menuSection: {
    marginBottom: Spacing["2xl"],
  },
  menuLabel: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    fontWeight: "600",
    letterSpacing: 1,
  },
  menuContainer: {
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  menuDivider: {
    height: 1,
    marginLeft: Spacing.lg + 32 + Spacing.md,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
  },
});
