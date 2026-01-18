import React from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors, Shadows } from "@/constants/theme";
import { useTeamStore, TeamMember } from "@/stores/teamStore";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const roleColors = {
  admin: BrandColors.constructionGold,
  worker: "#3B82F6",
};

function TeamMemberCard({ member }: { member: TeamMember }) {
  const { theme, isDark } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 200 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 200 });
      }}
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
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {member.invoicesCreated} invoices
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <Feather name="dollar-sign" size={12} color={BrandColors.constructionGold} />
            <ThemedText type="caption" style={{ color: BrandColors.constructionGold }}>
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
          type="caption"
          style={[styles.roleText, { color: roleColors[member.role] }]}
        >
          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
        </ThemedText>
      </View>
    </AnimatedPressable>
  );
}

export default function TeamScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { members, addMember } = useTeamStore();

  const handleAddMember = () => {
    const newMember: Omit<TeamMember, "id"> = {
      name: `Team Member ${members.length + 1}`,
      email: `member${members.length + 1}@company.com`,
      role: "worker",
      invoicesCreated: 0,
      revenue: 0,
    };
    addMember(newMember);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
          members.length === 0 && styles.emptyContainer,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        renderItem={({ item }) => <TeamMemberCard member={item} />}
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
