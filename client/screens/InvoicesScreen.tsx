import React, { useState } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/ThemedText";
import { ActivityItem, ActivityStatus } from "@/components/ActivityItem";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useInvoiceStore } from "@/stores/invoiceStore";
import { getApiUrl } from "@/lib/backendUrl";

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
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { invoices, deleteInvoice } = useInvoiceStore();
  const [activeFilter, setActiveFilter] = useState<ActivityStatus | "all">("all");

  const filteredInvoices =
    activeFilter === "all"
      ? invoices
      : invoices.filter((inv) => inv.status === activeFilter);

  const handleDeleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    try {
      // Get auth token
      const token = await AsyncStorage.getItem("authToken");
      if (!token) {
        Alert.alert("Error", "Authentication required");
        return;
      }

      // ✅ Call DELETE API endpoint
      const response = await fetch(getApiUrl(`/api/invoices/${invoiceId}`), {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        Alert.alert("Error", data.error || "Failed to delete invoice");
        return;
      }

      // ✅ ONLY remove from store after successful API response
      deleteInvoice(invoiceId);
      Alert.alert("Success", `Invoice ${invoiceNumber} deleted`);
    } catch (error) {
      console.error("[Invoices] Delete error:", error);
      Alert.alert("Error", "Failed to delete invoice");
    }
  };

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
          onPress: () => handleDeleteInvoice(invoiceId, invoiceNumber),
          style: "destructive",
        },
      ]
    );
  };

  // ✅ Filter header moved into ListHeaderComponent
  const renderFilterHeader = () => (
    <View style={[styles.filterContainer, { backgroundColor: theme.backgroundRoot }]}>
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
  );

  // Item renderer
  const renderItem = ({ item }: { item: typeof invoices[0] }) => (
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
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* ✅ Single scroll container with filters as ListHeaderComponent */}
      <FlatList
        data={filteredInvoices}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderFilterHeader}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: tabBarHeight + Spacing.xl },
          filteredInvoices.length === 0 && styles.emptyContainer,
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        scrollEnabled={true}
        nestedScrollEnabled={false}
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

      {/* ✅ FAB positioned absolutely OUTSIDE scroll container */}
      <View
        style={[
          styles.fabContainer,
          { bottom: tabBarHeight + Spacing.lg },
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          style={[
            styles.fab,
            { backgroundColor: BrandColors.constructionGold },
            Shadows.fab,
          ]}
          onPress={() => navigation.navigate("VoiceRecording")}
        >
          <Feather name="plus" size={24} color={BrandColors.slateGrey} />
        </Pressable>
      </View>
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
    paddingVertical: Spacing.md,
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
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
  },
  fabContainer: {
    position: "absolute",
    right: Spacing.lg,
    zIndex: 10,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});
