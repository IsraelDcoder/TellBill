import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";
import { getBackendUrl } from "@/lib/backendUrl";
import { ThemedText } from "@/components/ThemedText";
import { ScreenContainer } from "@/components/layout";
import { GlassCard } from "@/components/GlassCard";
import { Spacing, BrandColors } from "@/constants/theme";

interface ReferralData {
  code: string;
  link: string;
  referral_count: number;
  bonus_progress: string;
  bonus_earned: boolean;
  bonus_redeemed: boolean;
}

interface ReferralStats {
  total_conversions: number;
  pending_signups: number;
  progress_to_bonus: string;
  bonus_earned: boolean;
  bonus_redeemed: boolean;
  bonus_expires_at?: string;
}

export default function ReferralScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");

      // Fetch referral code
      const response = await fetch(`${getBackendUrl()}/api/referral/my-code`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch referral code");
      const data = await response.json();
      setReferralData(data);

      // Fetch stats
      const statsResponse = await fetch(`${getBackendUrl()}/api/referral/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error("[ReferralScreen] Error:", error);
      Alert.alert("Error", "Failed to load referral info");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    if (referralData?.code) {
      await Clipboard.setStringAsync(referralData.code);
      setCopied(true);
      Alert.alert("Copied!", "Referral code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (referralData?.link) {
      try {
        await Share.share({
          message: `Join TellBill! Create invoices with your voice. Use my referral code: ${referralData.code}\n\n${referralData.link}`,
          title: "TellBill - Invoice Faster",
          url: referralData.link,
        });
      } catch (error) {
        console.error("[ReferralScreen] Share error:", error);
      }
    }
  };

  const handleRedeemBonus = async () => {
    if (!stats?.bonus_earned) {
      Alert.alert("Not Available", "You need 3 successful referrals to earn a bonus");
      return;
    }

    if (stats.bonus_redeemed) {
      Alert.alert("Already Redeemed", "You've already claimed your bonus");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${getBackendUrl()}/api/referral/redeem-bonus`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to redeem bonus");

      const data = await response.json();
      Alert.alert("🎉 Bonus Redeemed!", data.message);
      await fetchReferralData();
    } catch (error) {
      console.error("[ReferralScreen] Redeem error:", error);
      Alert.alert("Error", "Failed to redeem bonus");
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={BrandColors.constructionGold} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Feather name="share-2" size={32} color={BrandColors.constructionGold} />
          <ThemedText type="h2" style={styles.headerTitle}>
            Invite Friends
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.colors.text }]}>
            Earn 1 month free for every 3 friends you invite
          </ThemedText>
        </View>

        {/* Referral Code Card */}
        {referralData && (
          <GlassCard style={styles.codeCard}>
            <View style={styles.codeHeader}>
              <ThemedText type="body" style={styles.codeLabel}>
                Your Referral Code
              </ThemedText>
            </View>

            <View
              style={[
                styles.codeBigDisplay,
                { backgroundColor: theme.colors.card, borderColor: BrandColors.constructionGold },
              ]}
            >
              <ThemedText type="h3" style={styles.codeText}>
                {referralData.code}
              </ThemedText>
            </View>

            <View style={styles.codeActions}>
              <TouchableOpacity
                style={[
                  styles.codeActionButton,
                  { backgroundColor: BrandColors.constructionGold, flex: 1, marginRight: Spacing.sm },
                ]}
                onPress={handleCopyCode}
              >
                <Feather name="copy" size={18} color="white" />
                <ThemedText type="body" style={styles.buttonTextWhite}>
                  Copy Code
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.codeActionButton,
                  { backgroundColor: BrandColors.slateGrey, flex: 1 },
                ]}
                onPress={handleShare}
              >
                <Feather name="send" size={18} color="white" />
                <ThemedText type="body" style={styles.buttonTextWhite}>
                  Share
                </ThemedText>
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}

        {/* Progress Card */}
        {stats && (
          <GlassCard style={styles.progressCard}>
            <ThemedText type="body" style={styles.progressLabel}>
              Your Progress
            </ThemedText>

            <View style={styles.meterContainer}>
              <View style={styles.meterBackground}>
                <View
                  style={[
                    styles.meterFill,
                    {
                      width: `${(stats.total_conversions / 3) * 100}%`,
                      backgroundColor: BrandColors.constructionGold,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.progressStats}>
              <View style={styles.stat}>
                <ThemedText type="h3" style={styles.statNumber}>
                  {stats.total_conversions}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.colors.text }}>
                  Converted
                </ThemedText>
              </View>

              <View style={styles.stat}>
                <ThemedText type="h3" style={styles.statNumber}>
                  {stats.pending_signups}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.colors.text }}>
                  Pending
                </ThemedText>
              </View>

              <View style={styles.stat}>
                <ThemedText type="h3" style={styles.statNumber}>
                  3
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.colors.text }}>
                  Target
                </ThemedText>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Bonus Card */}
        {stats && (
          <GlassCard
            style={{
              ...styles.bonusCard,
              backgroundColor: stats.bonus_earned
                ? BrandColors.success + "20"
                : theme.colors.card,
            }}
          >
            <View style={styles.bonusHeader}>
              <Feather
                name={stats.bonus_earned ? "check-circle" : "gift"}
                size={24}
                color={stats.bonus_earned ? BrandColors.success : theme.colors.text}
              />
              <ThemedText
                type="h3"
                style={[
                  styles.bonusTitle,
                  {
                    color: stats.bonus_earned ? BrandColors.success : theme.colors.text,
                  },
                ]}
              >
                {stats.bonus_earned ? "🎉 Bonus Earned!" : "1 Month Free"}
              </ThemedText>
            </View>

            <ThemedText type="body" style={styles.bonusDescription}>
              {stats.bonus_redeemed
                ? "You've already claimed your bonus. It's now applied to your account!"
                : stats.bonus_earned
                ? "Congratulations! You've referred 3 paying users. You get 1 month of Professional features free!"
                : "Refer 3 paying users and get 1 month of Professional features completely free."}
            </ThemedText>

            {stats.bonus_earned && !stats.bonus_redeemed && (
              <TouchableOpacity
                style={[styles.redeemButton, { backgroundColor: BrandColors.success }]}
                onPress={handleRedeemBonus}
              >
                <Feather name="gift" size={18} color="white" />
                <ThemedText type="body" style={styles.buttonTextWhite}>
                  Claim My Bonus
                </ThemedText>
              </TouchableOpacity>
            )}

            {stats.bonus_redeemed && (
              <View style={styles.redeemButton}>
                <Feather name="check" size={18} color={BrandColors.success} />
                <ThemedText type="body" style={{ color: BrandColors.success }}>
                  Bonus Active
                </ThemedText>
              </View>
            )}
          </GlassCard>
        )}

        {/* Info Card */}
        <GlassCard style={styles.infoCard}>
          <ThemedText type="body" style={styles.infoTitle}>
            💡 How It Works
          </ThemedText>

          <View style={styles.infoStep}>
            <View
              style={[
                styles.stepNumber,
                { backgroundColor: BrandColors.constructionGold },
              ]}
            >
              <ThemedText type="body" style={{ color: "white" }}>
                1
              </ThemedText>
            </View>
            <View style={styles.stepContent}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Share Your Code
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.colors.text }}>
                Copy your code or tap Share to send via your favorite app
              </ThemedText>
            </View>
          </View>

          <View style={styles.infoStep}>
            <View
              style={[
                styles.stepNumber,
                { backgroundColor: BrandColors.constructionGold },
              ]}
            >
              <ThemedText type="body" style={{ color: "white" }}>
                2
              </ThemedText>
            </View>
            <View style={styles.stepContent}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                They Sign Up
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.colors.text }}>
                Your friends create a TellBill account and upgrade to a paid plan
              </ThemedText>
            </View>
          </View>

          <View style={styles.infoStep}>
            <View
              style={[
                styles.stepNumber,
                { backgroundColor: BrandColors.constructionGold },
              ]}
            >
              <ThemedText type="body" style={{ color: "white" }}>
                3
              </ThemedText>
            </View>
            <View style={styles.stepContent}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                You Earn Bonus
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.colors.text }}>
                After 3 successful referrals, claim your 1 month free Professional access
              </ThemedText>
            </View>
          </View>
        </GlassCard>

        <View style={{ height: Spacing.lg }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  headerTitle: {
    marginTop: Spacing.md,
    fontSize: 28,
  },
  subtitle: {
    marginTop: Spacing.sm,
    textAlign: "center",
    opacity: 0.8,
  },
  codeCard: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  codeHeader: {
    marginBottom: Spacing.md,
  },
  codeLabel: {
    fontWeight: "600",
  },
  codeBigDisplay: {
    borderRadius: 12,
    borderWidth: 2,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  codeText: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: 2,
  },
  codeActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  codeActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: 8,
    gap: Spacing.sm,
  },
  buttonTextWhite: {
    color: "white",
    fontWeight: "600",
  },
  progressCard: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  progressLabel: {
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  meterContainer: {
    marginBottom: Spacing.lg,
  },
  meterBackground: {
    height: 12,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 6,
    overflow: "hidden",
  },
  meterFill: {
    height: "100%",
    borderRadius: 6,
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  stat: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
  },
  bonusCard: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    borderRadius: 12,
  },
  bonusHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  bonusTitle: {
    flex: 1,
  },
  bonusDescription: {
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  redeemButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: 8,
    gap: Spacing.sm,
  },
  infoCard: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoTitle: {
    fontWeight: "600",
    marginBottom: Spacing.md,
  },
  infoStep: {
    flexDirection: "row",
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stepContent: {
    flex: 1,
    justifyContent: "center",
  },
});
