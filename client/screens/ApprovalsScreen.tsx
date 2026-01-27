import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  Image,
  ImageStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useScopeProofStore } from "@/stores/scopeProofStore";
import { useTheme } from "@/hooks/useTheme";
import { BrandColors, Spacing } from "@/constants/theme";

/**
 * ✅ APPROVALS SCREEN
 * 
 * Shows pending, approved, and expired scope proofs
 * Contractors manage client approvals here
 */
export default function ApprovalsScreen() {
  const { theme, isDark } = useTheme();
  const store = useScopeProofStore();
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "expired">("pending");
  const [clientEmail, setClientEmail] = useState("");
  const [selectedProof, setSelectedProof] = useState<any>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);

  useEffect(() => {
    store.fetchScopeProofs();
  }, []);

  const filteredProofs = store.scopeProofs.filter((p) => p.status === activeTab);
  const counts = store.getStatusCounts();

  const handleRequestApproval = async () => {
    if (!clientEmail.trim()) {
      Alert.alert("Error", "Please enter client email");
      return;
    }

    try {
      const result = await store.requestApproval(selectedProof.id, clientEmail);
      Alert.alert("Success", "Approval request sent to client");
      setShowRequestModal(false);
      setClientEmail("");
      setSelectedProof(null);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to send approval");
    }
  };

  const handleResendApproval = async (proofId: string) => {
    if (!clientEmail.trim()) {
      Alert.alert("Error", "Please enter client email");
      return;
    }

    try {
      await store.resendApproval(proofId, clientEmail);
      Alert.alert("Success", "Reminder sent to client");
      setClientEmail("");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to send reminder");
    }
  };

  const handleCancelApproval = (proofId: string) => {
    Alert.alert("Cancel Approval", "Are you sure? This action cannot be undone.", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        onPress: async () => {
          try {
            await store.cancelApproval(proofId);
            Alert.alert("Cancelled", "Approval request has been cancelled");
          } catch (error) {
            Alert.alert("Error", "Failed to cancel approval");
          }
        },
        style: "destructive",
      },
    ]);
  };

  const renderScopeProofCard = ({ item }: { item: any }) => (
    <Card style={{ marginBottom: Spacing.md }}>
      <View style={styles.cardHeader}>
        <View style={getStatusBadgeStyle(item.status)}>
          <ThemedText
            style={{
              color: item.status === "pending" ? "#F59E0B" : item.status === "approved" ? "#10B981" : "#EF4444",
              fontWeight: "600",
              fontSize: 12,
            }}
          >
            {item.status === "pending" ? "🟡 Pending" : item.status === "approved" ? "🟢 Approved" : "🔴 Expired"}
          </ThemedText>
        </View>
        <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
          {new Date(item.createdAt).toLocaleDateString()}
        </ThemedText>
      </View>

      <ThemedText
        style={{
          fontSize: 16,
          fontWeight: "600",
          marginTop: Spacing.sm,
          marginBottom: Spacing.sm,
        }}
      >
        {item.description}
      </ThemedText>

      {/* Photos Grid */}
      {item.photos && item.photos.length > 0 && (
        <View style={styles.photosGrid}>
          {item.photos.slice(0, 3).map((photo: string, idx: number) => (
            <Image
              key={idx}
              source={{ uri: photo }}
              style={styles.photoThumbnail}
            />
          ))}
          {item.photos.length > 3 && (
            <View style={[styles.photoThumbnail, { backgroundColor: theme.backgroundDefault, justifyContent: "center", alignItems: "center" }]}>
              <ThemedText style={{ fontWeight: "600" }}>+{item.photos.length - 3}</ThemedText>
            </View>
          )}
        </View>
      )}

      <View style={styles.costRow}>
        <ThemedText style={{ color: theme.textSecondary }}>Estimated Cost:</ThemedText>
        <ThemedText style={{ fontWeight: "600", fontSize: 16, color: BrandColors.constructionGold }}>
          ${typeof item.estimatedCost === "string" ? item.estimatedCost : item.estimatedCost.toFixed(2)}
        </ThemedText>
      </View>

      {/* Actions */}
      {item.status === "pending" && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: BrandColors.constructionGold }]}
            onPress={() => {
              setSelectedProof(item);
              setShowRequestModal(true);
            }}
          >
            <Feather name="send" size={18} color="white" />
            <ThemedText style={{ color: "white", fontWeight: "600", marginLeft: Spacing.xs }}>
              Request Approval
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.backgroundDefault }]}
            onPress={() => handleCancelApproval(item.id)}
          >
            <Feather name="x" size={18} color={theme.text} />
            <ThemedText style={{ fontWeight: "600", marginLeft: Spacing.xs }}>Cancel</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {item.status === "approved" && (
        <View style={styles.approvedBox}>
          <Feather name="check-circle" size={20} color="#10B981" />
          <View style={{ marginLeft: Spacing.sm }}>
            <ThemedText style={{ fontWeight: "600" }}>Approved by</ThemedText>
            <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
              {item.approvedBy}
            </ThemedText>
            <ThemedText style={{ fontSize: 12, color: theme.textSecondary }}>
              {new Date(item.approvedAt).toLocaleDateString()}
            </ThemedText>
          </View>
        </View>
      )}
    </Card>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Feather
        name={activeTab === "pending" ? "inbox" : activeTab === "approved" ? "check" : "alert-circle"}
        size={48}
        color={theme.textSecondary}
      />
      <ThemedText
        style={{
          marginTop: Spacing.md,
          fontSize: 16,
          fontWeight: "600",
          color: theme.text,
        }}
      >
        No {activeTab} approvals
      </ThemedText>
      <ThemedText
        style={{
          marginTop: Spacing.sm,
          color: theme.textSecondary,
          textAlign: "center",
        }}
      >
        {activeTab === "pending"
          ? "Extra work will appear here for approval"
          : activeTab === "approved"
            ? "Client-approved work appears here"
            : "Expired approvals appear here"}
      </ThemedText>
    </View>
  );

  const getStatusBadgeStyle = (status: string) => ({
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor:
      status === "pending" ? "#FEF3C7" : status === "approved" ? "#ECFDF5" : "#FEE2E2",
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>Approvals</ThemedText>
        <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
          Get client approval for extra work
        </ThemedText>
      </View>

      {/* Tab Navigation */}
      <View style={[styles.tabContainer, { backgroundColor: theme.backgroundDefault }]}>
        {(["pending", "approved", "expired"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && {
                borderBottomColor: BrandColors.constructionGold,
                borderBottomWidth: 3,
              },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <ThemedText
              style={{
                fontWeight: activeTab === tab ? "600" : "400",
                color: activeTab === tab ? BrandColors.constructionGold : theme.textSecondary,
              }}
            >
              {tab === "pending" ? `Pending (${counts.pending})` : tab === "approved" ? `Approved (${counts.approved})` : `Expired (${counts.expired})`}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {filteredProofs.length > 0 ? (
        <FlatList
          data={filteredProofs}
          renderItem={renderScopeProofCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.emptyContainer}>
          <EmptyState />
        </ScrollView>
      )}

      {/* Request Approval Modal */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
            <View style={styles.modalHeader}>
              <ThemedText style={{ fontSize: 18, fontWeight: "600" }}>Request Client Approval</ThemedText>
              <TouchableOpacity onPress={() => setShowRequestModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ThemedText style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              Enter the client's email to send approval request
            </ThemedText>

            <View
              style={[
                styles.input,
                {
                  borderColor: theme.primary,
                  backgroundColor: theme.backgroundDefault,
                },
              ]}
            >
              <ThemedText style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>
                Client Email
              </ThemedText>
              <View
                style={{
                  borderWidth: 1,
                  borderColor: theme.primary,
                  borderRadius: 8,
                  paddingHorizontal: Spacing.md,
                  paddingVertical: Spacing.sm,
                }}
              >
                <ThemedText
                  style={{
                    color: theme.text,
                    fontFamily: "monospace",
                  }}
                >
                  {/* Placeholder for input - use native TextInput */}
                </ThemedText>
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                onPress={handleRequestApproval}
                style={{
                  flex: 1,
                  backgroundColor: BrandColors.constructionGold,
                }}
              >
                <ThemedText style={{ color: "white", fontWeight: "600" }}>Send Request</ThemedText>
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    alignItems: "center",
  },
  listContent: {
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  photosGrid: {
    flexDirection: "row",
    marginVertical: Spacing.md,
  } as const,
  photoThumbnail: {
    width: 80,
    height: 80,
    marginRight: Spacing.sm,
    borderRadius: 8,
  } as const,
  costRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: Spacing.md,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "#E5E7EB",
    borderBottomColor: "#E5E7EB",
  },
  actionButtons: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: 8,
  },
  approvedBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#10B981",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    padding: Spacing.lg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  input: {
    marginVertical: Spacing.md,
  },
  modalActions: {
    marginTop: Spacing.xl,
    gap: Spacing.md,
  },
});
