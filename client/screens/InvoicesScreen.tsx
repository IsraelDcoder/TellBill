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
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ActivityItem, ActivityStatus } from "@/components/ActivityItem";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useInvoiceStore } from "@/stores/invoiceStore";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const filters: { label: string; value: ActivityStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Sent", value: "sent" },
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
];

export default function InvoicesScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { invoices, deleteInvoice } = useInvoiceStore();
  const [activeFilter, setActiveFilter] = useState<ActivityStatus | "all">("all");

  const filteredInvoices =
    activeFilter === "all"
      ? invoices
      : invoices.filter((inv) => inv.status === activeFilter);

  const handleLongPress = (invoiceId: string, invoiceNumber: string) => {
    Alert.alert(
      "Delete Invoice",
      `Are you sure you want to delete invoice ${invoiceNumber}?`,
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Delete",
          onPress: () => deleteInvoice(invoiceId),
          style: "destructive",
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View
        style={[
          styles.filterContainer,
          {}
        ]}
      >
        {filters.map((filter) => (
          <Pressable
            key={filter.value}
            onPress={() => setActiveFilter(filter.value)}
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  activeFilter === filter.value
                    ? BrandColors.constructionGold
                    : isDark
                      ? theme.backgroundDefault
                      : theme.backgroundSecondary,
              },
            ]}
          >
            <ThemedText
              type="small"
              style={[
                styles.filterText,
                {
                  color:
                    activeFilter === filter.value
                      ? BrandColors.slateGrey
                      : theme.text,
                },
              ]}
            >
              {filter.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredInvoices}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + Spacing.xl },
          filteredInvoices.length === 0 && styles.emptyContainer,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        renderItem={({ item }) => (
          <ActivityItem
            clientName={item.clientName}
            invoiceNumber={item.invoiceNumber}
            amount={item.total}
            status={item.status as ActivityStatus}
            date={new Date(item.createdAt).toLocaleDateString()}
            onPress={() =>
              navigation.navigate("InvoiceDetail", { invoiceId: item.id })
            }
            onLongPress={() => handleLongPress(item.id, item.invoiceNumber)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="invoice"
            title="No Invoices Yet"
            description="Tell Bill what you did today. We'll handle the paperwork."
            actionLabel="Create Invoice"
            onAction={() => navigation.navigate("VoiceRecording")}
          />
        }
      />

      <Pressable
        style={[
          styles.fab,
          { backgroundColor: BrandColors.constructionGold, bottom: tabBarHeight + Spacing.lg },
          Shadows.fab,
        ]}
        onPress={() => navigation.navigate("VoiceRecording")}
      >
        <Feather name="plus" size={24} color={BrandColors.slateGrey} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  filterText: {
    fontWeight: "600",
  },
  listContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
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
