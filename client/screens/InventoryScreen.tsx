import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "@/context/AuthContext";
import { getApiUrl } from "@/lib/backendUrl";
import { BrandColors } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { LockedFeatureOverlay } from "@/components/LockedFeatureOverlay";
import { useSubscriptionStore } from "@/stores/subscriptionStore";

interface JobSite {
  id: string;
  name: string;
  location?: string;
  description?: string;
  status: "active" | "inactive" | "completed";
  createdAt: number;
  updatedAt: number;
}

interface InventoryItem {
  id: string;
  siteId: string;
  name: string;
  category?: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  reorderQuantity: number;
  unitCost: number;
}

interface LowStockAlert {
  item: InventoryItem;
  site: JobSite;
}

const getStyles = (themeColors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    title: {
      fontSize: 24,
      fontWeight: "700",
    },
    newSiteBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    alertCard: {
      marginBottom: 20,
      borderColor: "#ff6b6b",
      borderWidth: 1,
    },
    alertHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },
    alertTitle: {
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
      color: "#ff6b6b",
    },
    alertItem: {
      marginBottom: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    alertItemName: {
      fontWeight: "600",
      marginBottom: 2,
    },
    alertItemSite: {
      fontSize: 12,
      color: themeColors.textSecondary,
      marginBottom: 2,
    },
    alertItemStock: {
      fontSize: 12,
      color: "#ff6b6b",
      fontWeight: "600",
    },
    sitesContainer: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 12,
    },
    siteTab: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginRight: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: themeColors.border,
    },
    siteTabActive: {
      backgroundColor: themeColors.primary,
      borderColor: themeColors.primary,
    },
    siteTabText: {
      color: themeColors.text,
      fontWeight: "500",
    },
    siteTabTextActive: {
      color: "white",
    },
    itemsContainer: {
      marginBottom: 20,
    },
    itemsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    addItemBtn: {
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    emptyCard: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
    },
    emptyText: {
      marginTop: 12,
      color: themeColors.textSecondary,
    },
    itemCard: {
      marginBottom: 12,
      paddingBottom: 12,
    },
    itemCardLowStock: {
      borderColor: "#ff6b6b",
      borderWidth: 1.5,
      backgroundColor: "rgba(255, 107, 107, 0.05)",
    },
    itemTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    itemInfo: {
      flex: 1,
    },
    itemName: {
      fontSize: 16,
      fontWeight: "600",
      marginBottom: 2,
    },
    itemCategory: {
      fontSize: 12,
      color: themeColors.textSecondary,
    },
    lowStockBadge: {
      backgroundColor: "#ff6b6b",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    },
    lowStockBadgeText: {
      color: "white",
      fontSize: 11,
      fontWeight: "700",
    },
    stockInfo: {
      marginBottom: 12,
    },
    stockBar: {
      height: 6,
      backgroundColor: themeColors.border,
      borderRadius: 3,
      marginBottom: 6,
      overflow: "hidden",
    },
    stockFill: {
      height: "100%",
      backgroundColor: themeColors.primary,
    },
    stockText: {
      fontSize: 12,
      color: themeColors.textSecondary,
    },
    itemActions: {
      flexDirection: "row",
      gap: 8,
      alignItems: "center",
    },
    actionBtn: {
      flex: 1,
      paddingVertical: 6,
    },
    deleteBtn: {
      padding: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: themeColors.backgroundDefault,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: "90%",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: themeColors.border,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
    },
    modalBody: {
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    modalLabel: {
      fontSize: 14,
      fontWeight: "600",
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 12,
      fontSize: 14,
    },
    textAreaInput: {
      height: 80,
      textAlignVertical: "top",
    },
    modalFooter: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 20,
    },
    modalBtn: {
      flex: 1,
    },
  });

export default function InventoryScreen({ navigation }: any) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { currentPlan } = useSubscriptionStore();
  const styles = getStyles(theme);

  // Check if user has access to inventory management
  const isLocked = currentPlan === "free";

  // Show paywall for free users
  if (isLocked) {
    return (
      <View style={styles.container}>
        <LockedFeatureOverlay
          title="Inventory Management"
          subtitle="Track job sites, inventory items, and stock levels. Upgrade to Solo plan to unlock inventory management."
          onUnlock={() => {
            navigation.navigate("Pricing", {
              returnTo: "Inventory",
              message: "Unlock inventory management with Solo plan or higher.",
            });
          }}
          isVisible={true}
        />
      </View>
    );
  }

  const [sites, setSites] = useState<JobSite[]>([]);
  const [selectedSite, setSelectedSite] = useState<JobSite | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [showNewSiteModal, setShowNewSiteModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [showUpdateStockModal, setShowUpdateStockModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);

  // Form states
  const [siteName, setSiteName] = useState("");
  const [siteLocation, setSiteLocation] = useState("");
  const [siteDescription, setSiteDescription] = useState("");
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemUnit, setItemUnit] = useState("pcs");
  const [minimumStock, setMinimumStock] = useState("10");
  const [reorderQuantity, setReorderQuantity] = useState("50");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [newStock, setNewStock] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [reorderSupplier, setReorderSupplier] = useState("");
  const [reorderQuantityValue, setReorderQuantityValue] = useState("");

  // Fetch job sites
  const fetchSites = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const response = await fetch(getApiUrl(`/api/job-sites/${user.id}`));
      const data = await response.json();
      if (data.success) {
        setSites(data.sites);
        if (data.sites.length > 0 && !selectedSite) {
          setSelectedSite(data.sites[0]);
        }
      }
    } catch (error) {
      console.error("[Inventory] Fetch sites error:", error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedSite]);

  // Fetch inventory for selected site
  const fetchInventory = useCallback(async () => {
    if (!selectedSite) return;
    try {
      const response = await fetch(getApiUrl(`/api/inventory/${selectedSite.id}`));
      const data = await response.json();
      if (data.success) {
        setInventoryItems(data.items);
      }
    } catch (error) {
      console.error("[Inventory] Fetch inventory error:", error);
    }
  }, [selectedSite]);

  // Fetch low stock alerts
  const fetchLowStockAlerts = useCallback(async () => {
    if (!user) return;
    try {
      const response = await fetch(getApiUrl(`/api/inventory/low-stock/${user.id}`));
      const data = await response.json();
      if (data.success) {
        setLowStockAlerts(data.lowStockItems);
      }
    } catch (error) {
      console.error("[Inventory] Fetch low stock error:", error);
    }
  }, [user]);
  // Load data on screen focus
  useFocusEffect(
    useCallback(() => {
      fetchSites();
      fetchLowStockAlerts();
    }, [fetchSites, fetchLowStockAlerts]),
  );

  // Load inventory when site changes
  useFocusEffect(
    useCallback(() => {
      fetchInventory();
    }, [fetchInventory]),
  );

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSites(), fetchInventory(), fetchLowStockAlerts()]);
    setRefreshing(false);
  }, [fetchSites, fetchInventory, fetchLowStockAlerts]);

  // Create new job site
  const handleCreateSite = async () => {
    if (!user || !siteName.trim()) {
      Alert.alert("Error", "Please enter a site name");
      return;
    }

    try {
      const response = await fetch(getApiUrl("/api/job-sites"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name: siteName.trim(),
          location: siteLocation.trim(),
          description: siteDescription.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert("Success", "Job site created");
        setSiteName("");
        setSiteLocation("");
        setSiteDescription("");
        setShowNewSiteModal(false);
        await fetchSites();
      } else {
        Alert.alert("Error", data.error);
      }
    } catch (error) {
      console.error("[Inventory] Create site error:", error);
      Alert.alert("Error", "Failed to create job site");
    }
  };

  // Add inventory item
  const handleAddItem = async () => {
    if (!selectedSite || !itemName.trim()) {
      Alert.alert("Error", "Please enter item name and select a site");
      return;
    }

    try {
      const response = await fetch(getApiUrl("/api/inventory"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: selectedSite.id,
          name: itemName.trim(),
          category: itemCategory.trim(),
          unit: itemUnit,
          minimumStock: parseInt(minimumStock) || 10,
          reorderQuantity: parseInt(reorderQuantity) || 50,
        }),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert("Success", "Item added to inventory");
        setItemName("");
        setItemCategory("");
        setItemUnit("pcs");
        setMinimumStock("10");
        setReorderQuantity("50");
        setShowAddItemModal(false);
        await fetchInventory();
      } else {
        Alert.alert("Error", data.error);
      }
    } catch (error) {
      console.error("[Inventory] Add item error:", error);
      Alert.alert("Error", "Failed to add inventory item");
    }
  };

  // Update stock level
  const handleUpdateStock = async () => {
    if (!selectedItem || newStock === "") {
      Alert.alert("Error", "Please enter stock quantity");
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/api/inventory/${selectedItem.id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentStock: parseInt(newStock),
          reason: stockReason.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert("Success", "Stock updated");
        setNewStock("");
        setStockReason("");
        setSelectedItem(null);
        setShowUpdateStockModal(false);
        await fetchInventory();
      } else {
        Alert.alert("Error", data.error);
      }
    } catch (error) {
      console.error("[Inventory] Update stock error:", error);
      Alert.alert("Error", "Failed to update stock");
    }
  };

  // Place reorder
  const handlePlaceReorder = async () => {
    if (!selectedItem || !reorderQuantityValue) {
      Alert.alert("Error", "Please enter reorder quantity");
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/api/inventory/reorder/${selectedItem.id}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: parseInt(reorderQuantityValue),
          supplier: reorderSupplier.trim(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        Alert.alert("Success", "Reorder placed");
        setReorderQuantityValue("");
        setReorderSupplier("");
        setSelectedItem(null);
        setShowReorderModal(false);
      } else {
        Alert.alert("Error", data.error);
      }
    } catch (error) {
      console.error("[Inventory] Place reorder error:", error);
      Alert.alert("Error", "Failed to place reorder");
    }
  };

  // Delete item
  const handleDeleteItem = async (itemId: string) => {
    Alert.alert("Confirm", "Delete this item?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await fetch(getApiUrl(`/api/inventory/${itemId}`), {
              method: "DELETE",
            });
            const data = await response.json();
            if (data.success) {
              await fetchInventory();
            }
          } catch (error) {
            console.error("[Inventory] Delete error:", error);
          }
        },
      },
    ]);
  };

  const isLowStock = (item: InventoryItem) => item.currentStock < item.minimumStock;

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>Inventory Manager</ThemedText>
        <Button
          onPress={() => setShowNewSiteModal(true)}
          style={styles.newSiteBtn}
        >
          <Feather name="plus" size={16} color="white" /> New Site
        </Button>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Low Stock Alerts */}
        {lowStockAlerts.length > 0 && (
          <Card style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Feather name="alert-circle" size={20} color="#ff6b6b" />
              <ThemedText style={styles.alertTitle}>
                {lowStockAlerts.length} Item{lowStockAlerts.length !== 1 ? "s" : ""} Low on Stock
              </ThemedText>
            </View>
            {lowStockAlerts.slice(0, 3).map((alert) => (
              <View key={alert.item.id} style={styles.alertItem}>
                <ThemedText style={styles.alertItemName}>{alert.item.name}</ThemedText>
                <ThemedText style={styles.alertItemSite}>{alert.site.name}</ThemedText>
                <ThemedText style={styles.alertItemStock}>
                  Stock: {alert.item.currentStock} / {alert.item.minimumStock}
                </ThemedText>
              </View>
            ))}
          </Card>
        )}

        {/* Job Sites Tabs */}
        <View style={styles.sitesContainer}>
          <ThemedText style={styles.sectionTitle}>Job Sites</ThemedText>
          <FlatList
            horizontal
            scrollEnabled
            data={sites}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.siteTab,
                  selectedSite?.id === item.id && styles.siteTabActive,
                ]}
                onPress={() => setSelectedSite(item)}
              >
                <ThemedText
                  style={[
                    styles.siteTabText,
                    selectedSite?.id === item.id && styles.siteTabTextActive,
                  ]}
                >
                  {item.name}
                </ThemedText>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Inventory Items */}
        {selectedSite && (
          <View style={styles.itemsContainer}>
            <View style={styles.itemsHeader}>
              <ThemedText style={styles.sectionTitle}>
                {selectedSite.name} Inventory
              </ThemedText>
              <Button
                onPress={() => setShowAddItemModal(true)}
                variant="secondary"
                style={styles.addItemBtn}
              >
                + Add Item
              </Button>
            </View>

            {inventoryItems.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Feather name="inbox" size={40} color={theme.textSecondary} />
                <ThemedText style={styles.emptyText}>No items in this site</ThemedText>
              </Card>
            ) : (
              <FlatList
                scrollEnabled={false}
                data={inventoryItems}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const itemStyle = isLowStock(item)
                    ? [styles.itemCard, styles.itemCardLowStock]
                    : styles.itemCard;
                  return (
                    <Card style={itemStyle as any}>
                    <View style={styles.itemTop}>
                      <View style={styles.itemInfo}>
                        <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                        {item.category && (
                          <ThemedText style={styles.itemCategory}>{item.category}</ThemedText>
                        )}
                      </View>
                      {isLowStock(item) && (
                        <View style={styles.lowStockBadge}>
                          <ThemedText style={styles.lowStockBadgeText}>LOW</ThemedText>
                        </View>
                      )}
                    </View>

                    <View style={styles.stockInfo}>
                      <View style={styles.stockBar}>
                        <View
                          style={[
                            styles.stockFill,
                            {
                              width: `${Math.min((item.currentStock / item.minimumStock) * 100, 100)}%`,
                            },
                          ]}
                        />
                      </View>
                      <ThemedText style={styles.stockText}>
                        {item.currentStock} {item.unit} (Min: {item.minimumStock})
                      </ThemedText>
                    </View>

                    <View style={styles.itemActions}>
                      <Button
                        variant="secondary"
                        size="small"
                        onPress={() => {
                          setSelectedItem(item);
                          setNewStock(item.currentStock.toString());
                          setShowUpdateStockModal(true);
                        }}
                        style={styles.actionBtn}
                      >
                        Update Stock
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        onPress={() => {
                          setSelectedItem(item);
                          setReorderQuantityValue(item.reorderQuantity.toString());
                          setShowReorderModal(true);
                        }}
                        style={styles.actionBtn}
                      >
                        Reorder
                      </Button>
                      <TouchableOpacity
                        onPress={() => handleDeleteItem(item.id)}
                        style={styles.deleteBtn}
                      >
                        <Feather name="trash-2" size={16} color="#ff6b6b" />
                      </TouchableOpacity>
                    </View>
                  </Card>
                  );
                }}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* New Job Site Modal */}
      <Modal visible={showNewSiteModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
          keyboardVerticalOffset={100}
        >
          <View style={[styles.modalContent, { flex: 1 }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>New Job Site</ThemedText>
              <TouchableOpacity onPress={() => setShowNewSiteModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={[styles.modalBody, { flex: 1 }]}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <TextInput
                placeholder="Site Name"
                value={siteName}
                onChangeText={setSiteName}
                style={[styles.input, { color: theme.text }]}
                placeholderTextColor={theme.textSecondary}
              />
              <TextInput
                placeholder="Location"
                value={siteLocation}
                onChangeText={setSiteLocation}
                style={[styles.input, { color: theme.text }]}
                placeholderTextColor={theme.textSecondary}
              />
              <TextInput
                placeholder="Description"
                value={siteDescription}
                onChangeText={setSiteDescription}
                multiline
                numberOfLines={3}
                style={[styles.input, styles.textAreaInput, { color: theme.text }]}
                placeholderTextColor={theme.textSecondary}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                variant="secondary"
                onPress={() => setShowNewSiteModal(false)}
                style={styles.modalBtn}
              >
                Cancel
              </Button>
              <Button onPress={handleCreateSite} style={styles.modalBtn}>
                Create
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Item Modal */}
      <Modal visible={showAddItemModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
          keyboardVerticalOffset={100}
        >
          <View style={[styles.modalContent, { flex: 1 }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Add Inventory Item</ThemedText>
              <TouchableOpacity onPress={() => setShowAddItemModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={[styles.modalBody, { flex: 1 }]}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <TextInput
                placeholder="Item Name"
                value={itemName}
                onChangeText={setItemName}
                style={[styles.input, { color: theme.text }]}
                placeholderTextColor={theme.textSecondary}
              />
              <TextInput
                placeholder="Category (e.g. Materials)"
                value={itemCategory}
                onChangeText={setItemCategory}
                style={[styles.input, { color: theme.text }]}
                placeholderTextColor={theme.textSecondary}
              />
              <TextInput
                placeholder="Unit (pcs, kg, liters, etc.)"
                value={itemUnit}
                onChangeText={setItemUnit}
                style={[styles.input, { color: theme.text }]}
                placeholderTextColor={theme.textSecondary}
              />
              <TextInput
                placeholder="Minimum Stock Level"
                value={minimumStock}
                onChangeText={setMinimumStock}
                keyboardType="number-pad"
                style={[styles.input, { color: theme.text }]}
                placeholderTextColor={theme.textSecondary}
              />
              <TextInput
                placeholder="Reorder Quantity"
                value={reorderQuantity}
                onChangeText={setReorderQuantity}
                keyboardType="number-pad"
                style={[styles.input, { color: theme.text }]}
                placeholderTextColor={theme.textSecondary}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                variant="secondary"
                onPress={() => setShowAddItemModal(false)}
                style={styles.modalBtn}
              >
                Cancel
              </Button>
              <Button onPress={handleAddItem} style={styles.modalBtn}>
                Add Item
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Update Stock Modal */}
      <Modal visible={showUpdateStockModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
          keyboardVerticalOffset={100}
        >
          <View style={[styles.modalContent, { flex: 1 }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Update Stock</ThemedText>
              <TouchableOpacity onPress={() => setShowUpdateStockModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={[styles.modalBody, { flex: 1 }]}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <ThemedText style={styles.modalLabel}>
                Item: {selectedItem?.name}
              </ThemedText>
              <TextInput
                placeholder="New Stock Quantity"
                value={newStock}
                onChangeText={setNewStock}
                keyboardType="number-pad"
                style={[styles.input, { color: theme.text }]}
                placeholderTextColor={theme.textSecondary}
              />
              <TextInput
                placeholder="Reason (e.g. Received, Used, Damaged)"
                value={stockReason}
                onChangeText={setStockReason}
                style={[styles.input, { color: theme.text }]}
                placeholderTextColor={theme.textSecondary}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                variant="secondary"
                onPress={() => setShowUpdateStockModal(false)}
                style={styles.modalBtn}
              >
                Cancel
              </Button>
              <Button onPress={handleUpdateStock} style={styles.modalBtn}>
                Update
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reorder Modal */}
      <Modal visible={showReorderModal} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
          keyboardVerticalOffset={100}
        >
          <View style={[styles.modalContent, { flex: 1 }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Place Reorder</ThemedText>
              <TouchableOpacity onPress={() => setShowReorderModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={[styles.modalBody, { flex: 1 }]}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <ThemedText style={styles.modalLabel}>
                Item: {selectedItem?.name}
              </ThemedText>
              <TextInput
                placeholder="Quantity to Order"
                value={reorderQuantityValue}
                onChangeText={setReorderQuantityValue}
                keyboardType="number-pad"
                style={[styles.input, { color: theme.text }]}
                placeholderTextColor={theme.textSecondary}
              />
              <TextInput
                placeholder="Supplier Name"
                value={reorderSupplier}
                onChangeText={setReorderSupplier}
                style={[styles.input, { color: theme.text }]}
                placeholderTextColor={theme.textSecondary}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                variant="secondary"
                onPress={() => setShowReorderModal(false)}
                style={styles.modalBtn}
              >
                Cancel
              </Button>
              <Button onPress={handlePlaceReorder} style={styles.modalBtn}>
                Place Order
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}
