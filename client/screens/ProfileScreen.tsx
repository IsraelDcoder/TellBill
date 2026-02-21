import React, { useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/backendUrl";

import { ThemedText } from "@/components/ThemedText";
import {
  ScreenContainer,
  Section,
  SectionTitle,
  ScreenGroup,
} from "@/components/layout";
import { GlassCard } from "@/components/GlassCard";
import { LogoutConfirmation } from "@/components/LogoutConfirmation";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useInvoiceStore } from "@/stores/invoiceStore";
import { useProfileStore } from "@/stores/profileStore";
import { usePreferencesStore } from "@/stores/preferencesStore";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { formatCents } from "@/lib/money";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface ProfileStats {
  invoicesCreated: number;
  formattedRevenue: string;
  timeSavedHours: number;
}

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  onPress: () => void;
  showBadge?: boolean;
  badgeText?: string;
}

function PreferencesSection({ theme, authToken, navigation, currentPlan }: { theme: any; authToken: string | null; navigation: NavigationProp; currentPlan: string }): React.ReactElement {
  const prefs = usePreferencesStore();
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const currencies = ["USD", "EUR", "GBP", "CAD", "AUD"];
  const templates = ["default", "minimal", "detailed"];
  
  const isProfessional = currentPlan === "professional";

  const handleCurrencyChange = async (curr: string) => {
    prefs.setCurrency(curr);
    setShowCurrencyMenu(false);
    if (authToken) await prefs.savePreferencesToBackend(authToken);
  };

  const handleTemplateChange = async (tmpl: string) => {
    prefs.setInvoiceTemplate(tmpl);
    setShowTemplateMenu(false);
    if (authToken) await prefs.savePreferencesToBackend(authToken);
  };

  return (
    <View>
      <Pressable onPress={() => setShowCurrencyMenu(!showCurrencyMenu)} style={styles.preferenceItem}>
        <View style={styles.preferenceLeft}>
          <Feather name="globe" size={18} color={BrandColors.constructionGold} />
          <View style={styles.preferenceText}>
            <ThemedText type="body">Currency</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>{prefs.currency}</ThemedText>
          </View>
        </View>
        <Feather name={showCurrencyMenu ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
      </Pressable>
      {showCurrencyMenu && (
        <View style={[styles.menuDropdown, { backgroundColor: theme.backgroundSecondary }]}>
          {currencies.map((curr) => (
            <Pressable key={curr} onPress={() => handleCurrencyChange(curr)} style={[styles.dropdownItem, prefs.currency === curr && styles.dropdownItemActive]}>
              <ThemedText type="body" style={prefs.currency === curr ? { color: BrandColors.constructionGold } : {}}>{curr}</ThemedText>
            </Pressable>
          ))}
        </View>
      )}
      <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
      <Pressable onPress={() => setShowTemplateMenu(!showTemplateMenu)} style={styles.preferenceItem}>
        <View style={styles.preferenceLeft}>
          <Feather name="layout" size={18} color={BrandColors.constructionGold} />
          <View style={styles.preferenceText}>
            <ThemedText type="body">Invoice Template</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>{prefs.invoiceTemplate}</ThemedText>
          </View>
        </View>
        <Feather name={showTemplateMenu ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
      </Pressable>
      {showTemplateMenu && (
        <View style={[styles.menuDropdown, { backgroundColor: theme.backgroundSecondary }]}>
          {templates.map((tmpl) => (
            <Pressable key={tmpl} onPress={() => handleTemplateChange(tmpl)} style={[styles.dropdownItem, prefs.invoiceTemplate === tmpl && styles.dropdownItemActive]}>
              <ThemedText type="body" style={prefs.invoiceTemplate === tmpl ? { color: BrandColors.constructionGold } : {}}>{tmpl.charAt(0).toUpperCase() + tmpl.slice(1)}</ThemedText>
            </Pressable>
          ))}
        </View>
      )}
      <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
      <Pressable 
        onPress={() => {
          if (!isProfessional) {
            navigation.navigate("Billing");
          } else {
            navigation.navigate("TemplateBuilder");
          }
        }} 
        style={[styles.preferenceItem, !isProfessional && { opacity: 0.7 }]}>
        <View style={styles.preferenceLeft}>
          <Feather name="edit-3" size={18} color={isProfessional ? BrandColors.constructionGold : theme.textSecondary} />
          <View style={styles.preferenceText}>
            <ThemedText type="body" style={!isProfessional ? { color: theme.textSecondary } : {}}>
              Customize Templates
            </ThemedText>
            <ThemedText type="small" style={{ color: isProfessional ? theme.textSecondary : theme.textTertiary }}>
              {isProfessional ? "Colors & Branding" : "Professional plan"}
            </ThemedText>
          </View>
        </View>
        <Feather 
          name={isProfessional ? "chevron-right" : "lock"} 
          size={16} 
          color={isProfessional ? theme.textSecondary : theme.error} 
        />
      </Pressable>
      <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
      <Pressable onPress={() => {}} style={styles.preferenceItem}>
        <View style={styles.preferenceLeft}>
          <Feather name="percent" size={18} color={BrandColors.constructionGold} />
          <View style={styles.preferenceText}>
            <ThemedText type="body">Default Tax Rate</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>{prefs.taxRate}%</ThemedText>
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function MenuItem({ icon, label, onPress, showBadge, badgeText }: MenuItemProps): React.ReactElement {
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

function MenuDivider() {
  const { theme } = useTheme();
  return <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />;
}

export default function ProfileScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { currentPlan } = useSubscriptionStore();
  // ✅ Use proper Zustand selector to subscribe to getStats
  const getStats = useInvoiceStore((state) => state.getStats);
  const { userProfile, companyInfo } = useProfileStore();
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [avatarInitials, setAvatarInitials] = useState("U");
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [profileStats, setProfileStats] = useState<ProfileStats>({
    invoicesCreated: 0,
    formattedRevenue: "$0",
    timeSavedHours: 0,
  });

  // Initialize authToken from AsyncStorage
  useFocusEffect(
    React.useCallback(() => {
      const getToken = async () => {
        const token = await AsyncStorage.getItem("authToken");
        setAuthToken(token);
      };
      getToken();
      return () => {}; // cleanup function
    }, [])
  );

  // Update display name from profileStore
  useFocusEffect(
    React.useCallback(() => {
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

  // ✅ Refresh stats when screen focuses (after invoice creation)
  useFocusEffect(
    React.useCallback(() => {
      const stats = getStats();
      // ✅ Count ALL invoices (draft, created, sent, pending, paid, overdue)
      // timeSaved is calculated as: invoices.length * 0.5
      // So timeSaved tells us total number of invoices
      const invoicesCreated = Math.round(stats.timeSaved / 0.5);
      const revenueInCents = stats.revenue; // Integer cents from store
      const timeSavedHours = Math.round(stats.timeSaved * 10) / 10;
      
      // ✅ FIXED: Use formatCents for consistent formatting across app
      // All revenue calculations now go through the same function
      let formattedRevenue: string;
      
      const revenueInDollars = revenueInCents / 100;
      if (revenueInDollars >= 1000) {
        // Format as K for large amounts (e.g., $3,200.00 -> "$3.2K")
        const kilos = revenueInDollars / 1000;
        const shouldShowDecimals = kilos % 1 !== 0;
        formattedRevenue = `$${kilos.toFixed(shouldShowDecimals ? 1 : 0)}K`;
      } else {
        // Use standard currency format for smaller amounts
        formattedRevenue = formatCents(revenueInCents);
      }
      
      setProfileStats({
        invoicesCreated,
        formattedRevenue,
        timeSavedHours,
      });
      
      return () => {}; // cleanup function
    }, [getStats])
  );

  // ✅ CRITICAL: Refetch invoice data when screen comes into focus
  // Ensures revenue is always up-to-date after marking invoices as paid
  useFocusEffect(
    React.useCallback(() => {
      const refetchInvoices = async () => {
        try {
          console.log("[Profile] 🔄 Refetching invoices from backend...");
          const token = await AsyncStorage.getItem("authToken");
          if (!token) {
            console.warn("[Profile] ⚠️  No auth token for refetch");
            return;
          }

          const response = await fetch(getApiUrl("/api/data/all"), {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          });

          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data?.invoices) {
              console.log(`[Profile] ✅ Refetched ${data.data.invoices.length} invoices`);
              // Update invoiceStore with fresh data
              const { hydrateInvoices } = useInvoiceStore.getState();
              // Parse items JSON for each invoice
              const parsedInvoices = data.data.invoices.map((inv: any) => ({
                ...inv,
                items: typeof inv.items === 'string' ? JSON.parse(inv.items || '[]') : (inv.items || []),
              }));
              hydrateInvoices(parsedInvoices);
              
              // Recalculate stats with fresh data
              const stats = getStats();
              const invoicesCreated = Math.round(stats.timeSaved / 0.5);
              const revenueInCents = stats.revenue;
              const timeSavedHours = Math.round(stats.timeSaved * 10) / 10;
              
              const revenueInDollars = revenueInCents / 100;
              let formattedRevenue: string;
              if (revenueInDollars >= 1000) {
                const kilos = revenueInDollars / 1000;
                const shouldShowDecimals = kilos % 1 !== 0;
                formattedRevenue = `$${kilos.toFixed(shouldShowDecimals ? 1 : 0)}K`;
              } else {
                formattedRevenue = formatCents(revenueInCents);
              }
              
              setProfileStats({
                invoicesCreated,
                formattedRevenue,
                timeSavedHours,
              });
            }
          } else {
            console.warn("[Profile] ⚠️  Failed to refetch invoices:", response.status);
          }
        } catch (err) {
          console.warn("[Profile] ⚠️  Refetch error:", err);
          // Non-blocking: Continue showing cached data
        }
      };

      refetchInvoices();
      return () => {}; // cleanup
    }, [getStats])
  );

  return (
    <ScreenContainer 
      scrollable 
      paddingBottom="default"
      contentContainerStyle={{
        paddingBottom: tabBarHeight + Spacing.xl,
      }}
    >
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: `${BrandColors.constructionGold}20` },
          ]}
        >
          <ThemedText type="h1" style={{ color: BrandColors.constructionGold }}>
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

      {/* Stats Card */}
      <Section spacing="compact">
        <GlassCard style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: BrandColors.constructionGold }}>
                {profileStats.invoicesCreated}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Invoices Created
              </ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: BrandColors.constructionGold }}>
                {profileStats.formattedRevenue}
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Revenue Generated
              </ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <ThemedText type="h2" style={{ color: BrandColors.constructionGold }}>
                {profileStats.timeSavedHours}h
              </ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Time Saved
              </ThemedText>
            </View>
          </View>
        </GlassCard>
      </Section>

      {/* Account Menu */}
      <Section>
        <SectionTitle title="Account" />
        <ScreenGroup bordered>
          <MenuItem
            icon="credit-card"
            label="Billing & Subscription"
            onPress={() => navigation.navigate("Billing")}
            showBadge
            badgeText="Solo"
          />
          <MenuDivider />
          <MenuItem
            icon="settings"
            label="Settings"
            onPress={() => navigation.navigate("Settings")}
          />
          <MenuDivider />
          <MenuItem
            icon="help-circle"
            label="Help & Support"
            onPress={() => navigation.navigate("HelpSupport")}
          />
        </ScreenGroup>
      </Section>

      {/* Preferences */}
      <Section>
        <SectionTitle title="Preferences" />
        <ScreenGroup bordered>
          <PreferencesSection theme={theme} authToken={authToken} navigation={navigation} currentPlan={currentPlan} />
        </ScreenGroup>
      </Section>

      {/* Coming Soon Menu */}
      <Section>
        <SectionTitle title="Coming Soon" />
        <ScreenGroup bordered>
          <MenuItem
            icon="link"
            label="QuickBooks Integration"
            onPress={() => navigation.navigate("ComingSoon", { feature: "QuickBooks Integration" })}
          />
          <MenuDivider />
          <MenuItem
            icon="map-pin"
            label="GPS Verification Audit"
            onPress={() => navigation.navigate("ComingSoon", { feature: "GPS Verification Audit" })}
          />
        </ScreenGroup>
      </Section>

      {/* Logout Button */}
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: "center",
    marginTop: Spacing["2xl"],
    marginBottom: Spacing["2xl"],
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
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
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
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
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing["2xl"],
    marginTop: Spacing.xl,
  },
  preferenceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  preferenceLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  preferenceText: {
    flex: 1,
  },
  menuDropdown: {
    borderRadius: 8,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  dropdownItemActive: {
    backgroundColor: `${BrandColors.constructionGold}10`,
  },
});
