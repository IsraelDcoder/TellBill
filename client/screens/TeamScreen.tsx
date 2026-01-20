import React, { useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { DeleteMemberBottomSheet } from "@/components/DeleteMemberBottomSheet";
import { InviteTeamMemberModal } from "@/components/InviteTeamMemberModal";
import { FeatureLockOverlay } from "@/components/FeatureLockOverlay";
import { useTheme } from "@/hooks/useTheme";
import { useFeatureLock } from "@/hooks/useFeatureLock";
import { Spacing, BorderRadius, BrandColors, Shadows } from "@/constants/theme";
import { useTeamStore, TeamMember, TeamInvite } from "@/stores/teamStore";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const roleColors = {
  admin: BrandColors.constructionGold,
  worker: "#3B82F6",
  foreman: "#10B981",
  contractor: "#F59E0B",
};

function TeamMemberCard({ 
  member, 
  onLongPress,
  isDeleting = false,
}: { 
  member: TeamMember; 
  onLongPress?: () => void;
  isDeleting?: boolean;
}) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
    ],
  }));

  React.useEffect(() => {
    if (isDeleting) {
      translateX.value = withTiming(500, {
        duration: 300,
        easing: Easing.inOut(Easing.ease),
      });
    }
  }, [isDeleting, translateX]);

  return (
    <Pressable 
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress?.();
      }}
      delayLongPress={500}
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 200 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      }}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={[
          styles.memberCard,
          {
            backgroundColor: isDark ? theme.backgroundDefault : theme.backgroundRoot,
            borderColor: theme.border,
          },
          animatedStyle,
        ]}
      >
      <View
        style={[
          styles.avatar,
          { backgroundColor: `${roleColors[member.role]}20` },
        ]}
      >
        <ThemedText
          type="h3"
          style={{ color: roleColors[member.role] }}
        >
          {member.name.charAt(0).toUpperCase()}
        </ThemedText>
      </View>
      <View style={styles.memberInfo}>
        <ThemedText type="h4" numberOfLines={1}>
          {member.name}
        </ThemedText>
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary }}
          numberOfLines={1}
        >
          {member.email}
        </ThemedText>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Feather name="file-text" size={12} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {member.invoicesCreated} invoices
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <Feather name="dollar-sign" size={12} color={BrandColors.constructionGold} />
            <ThemedText type="small" style={{ color: BrandColors.constructionGold }}>
              ${member.revenue.toLocaleString()}
            </ThemedText>
          </View>
        </View>
      </View>
      <View
        style={[
          styles.roleBadge,
          { backgroundColor: `${roleColors[member.role]}20` },
        ]}
      >
        <ThemedText
          type="small"
          style={[styles.roleText, { color: roleColors[member.role] }]}
        >
          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
        </ThemedText>
      </View>
      </Animated.View>
    </Pressable>
  );
}

function PendingInviteCard({
  invite,
  onDecline,
}: {
  invite: TeamInvite;
  onDecline: (inviteId: string) => void;
}) {
  const { theme, isDark } = useTheme();

  return (
    <View
      style={[
        styles.memberCard,
        {
          borderColor: theme.border,
          backgroundColor: isDark ? `${theme.backgroundDefault}80` : `${theme.backgroundDefault}40`,
          opacity: 0.7,
        },
      ]}
    >
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: `${BrandColors.constructionGold}40`,
          },
        ]}
      >
        <Feather name="clock" size={24} color={BrandColors.constructionGold} />
      </View>
      <View style={styles.memberInfo}>
        <ThemedText type="h4" numberOfLines={1}>
          {invite.fullName}
        </ThemedText>
        <ThemedText
          type="small"
          style={{ color: theme.textSecondary }}
          numberOfLines={1}
        >
          {invite.email}
        </ThemedText>
        <View style={[styles.statsRow, { marginTop: Spacing.xs }]}>
          <View style={styles.stat}>
            <Feather name="send" size={12} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Invite pending
            </ThemedText>
          </View>
          <Pressable onPress={() => onDecline(invite.id)}>
            <ThemedText
              type="small"
              style={{ color: BrandColors.error, textDecorationLine: "underline" }}
            >
              Revoke
            </ThemedText>
          </Pressable>
        </View>
      </View>
      <View
        style={[
          styles.roleBadge,
          { backgroundColor: `${roleColors[invite.role]}20` },
        ]}
      >
        <ThemedText
          type="small"
          style={[styles.roleText, { color: roleColors[invite.role] }]}
        >
          {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
        </ThemedText>
      </View>
    </View>
  );
}

export default function TeamScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const { members, addMember, softDeleteMember, sendInvite, invites, updateInviteStatus } = useTeamStore();
  const { isLocked, requiredPlan } = useFeatureLock("team_members");
  const [deleteSheet, setDeleteSheet] = useState({
    visible: false,
    memberId: "",
    memberName: "",
  });
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [invitingUser, setInvitingUser] = useState(false);
  const [showLockOverlay, setShowLockOverlay] = useState(false);

  const handleAddMember = () => {
    if (isLocked) {
      setShowLockOverlay(true);
      return;
    }
    setInviteModalVisible(true);
  };

  const handleSendInvite = (email: string, fullName: string, role: TeamMember["role"]) => {
    setInvitingUser(true);
    
    // Simulate API call
    setTimeout(() => {
      sendInvite(email, fullName, role, "admin-1"); // TODO: Get current user ID
      setInvitingUser(false);
      setInviteModalVisible(false);
    }, 1000);
  };

  const handleLongPress = (memberId: string, memberName: string) => {
    setDeleteSheet({
      visible: true,
      memberId,
      memberName,
    });
  };

  const handleDeleteConfirm = async () => {
    const { memberId } = deleteSheet;
    
    // Optimistic UI: immediately remove from list
    setDeletingIds((prev) => new Set(prev).add(memberId));
    
    // Close bottom sheet
    setDeleteSheet({ visible: false, memberId: "", memberName: "" });

    // Soft delete in store
    softDeleteMember(memberId);

    // Simulate backend processing
    setTimeout(() => {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(memberId);
        return newSet;
      });
    }, 500);
  };

  const handleDeclineInvite = (inviteId: string) => {
    updateInviteStatus(inviteId, "declined");
    // TODO: Send push notification to inviter
  };

  // Filter out archived members from display
  const activeMembers = members.filter((m) => m.status !== "archived");
  const pendingInvites = invites.filter((inv) => inv.status === "pending");

  const allTeamData = [
    ...activeMembers.map((m) => ({ type: "member" as const, data: m })),
    ...pendingInvites.map((inv) => ({ type: "invite" as const, data: inv })),
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={allTeamData}
        keyExtractor={(item) => (item.type === "member" ? item.data.id : item.data.id)}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
          allTeamData.length === 0 && styles.emptyContainer,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        renderItem={({ item }) => {
          if (item.type === "member") {
            return (
              <TeamMemberCard 
                member={item.data}
                onLongPress={() => handleLongPress(item.data.id, item.data.name)}
                isDeleting={deletingIds.has(item.data.id)}
              />
            );
          } else {
            return <PendingInviteCard invite={item.data} onDecline={handleDeclineInvite} />;
          }
        }}
        ListEmptyComponent={
          <EmptyState
            image={require("../assets/images/empty_team_illustration.png")}
            title="No Team Members"
            description="Add team members to assign projects and track their invoicing activity."
            actionLabel="Invite Member"
            onAction={handleAddMember}
          />
        }
      />

      <Pressable
        style={[
          styles.fab,
          { backgroundColor: BrandColors.constructionGold, bottom: tabBarHeight + Spacing.lg },
          Shadows.fab,
        ]}
        onPress={handleAddMember}
      >
        <Feather name="user-plus" size={24} color={BrandColors.slateGrey} />
      </Pressable>

      <DeleteMemberBottomSheet
        visible={deleteSheet.visible}
        memberName={deleteSheet.memberName}
        onDelete={handleDeleteConfirm}
        onCancel={() => setDeleteSheet({ visible: false, memberId: "", memberName: "" })}
      />

      <InviteTeamMemberModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        onSendInvite={handleSendInvite}
        isLoading={invitingUser}
      />

      {/* Feature Lock Overlay */}
      <FeatureLockOverlay
        isLocked={showLockOverlay}
        requiredPlan={requiredPlan as any}
        feature="Team Management"
        onUpgradePress={() => {
          setShowLockOverlay(false);
          navigation.navigate("Pricing", { message: "Upgrade to manage team members" });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.lg,
  },
  emptyContainer: {
    flex: 1,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: Spacing.md,
  },
  memberInfo: {
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginTop: Spacing.xs,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  roleText: {
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});
