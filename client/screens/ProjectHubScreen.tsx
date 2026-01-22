import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ReceiptProcessingService } from "@/services/receiptProcessingService";
import { useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ReceiptCamera } from "@/components/ReceiptCamera";
import { useTheme } from "@/hooks/useTheme";
import { useReceiptScannerAccess } from "@/hooks/useReceiptScannerAccess";
import { useOnline } from "@/hooks/useNetworkState";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { audioRecorderService } from "@/services/audioRecorderService";
import { transcriptionService } from "@/services/transcriptionService";
import { offlineReceiptService } from "@/services/offlineReceiptService";
import { useProjectEventStore } from "@/stores/projectEventStore";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "ProjectHub">;

interface ProjectEvent {
  eventId: string;
  eventType: "LABOR" | "MATERIAL" | "PROGRESS" | "ALERT" | "RECEIPT";
  timestamp: Date;
  data: {
    description?: string;
    labor?: { hours: number; ratePerHour: number; total: number };
    material?: { name: string; quantity: number; unitPrice: number; total: number };
    progress?: { status: string; location?: string };
    alert?: { alertType: string; severity: string; recommendedAction?: string };
  };
}

const safeText = (value?: string | null): string => value ?? "";
const safeNumber = (value?: number | null): number => value ?? 0;

const eventTypeConfig = {
  LABOR: {
    color: "#0DFF00",
    icon: "dollar-sign",
    bgColor: "#0DFF0015",
  },
  MATERIAL: {
    color: "#4A90E2",
    icon: "box",
    bgColor: "#4A90E215",
  },
  PROGRESS: {
    color: "#808080",
    icon: "check-circle",
    bgColor: "#80808015",
  },
  ALERT: {
    color: "#FF8C00",
    icon: "alert-triangle",
    bgColor: "#FF8C0015",
  },
  RECEIPT: {
    color: "#9B59B6",
    icon: "receipt",
    bgColor: "#9B59B615",
  },
};

interface ActivityCardProps {
  event: ProjectEvent;
  index: number;
}

function ActivityCard({ event, index }: ActivityCardProps) {
  const config = eventTypeConfig[event.eventType];
  const { theme } = useTheme();

  let title = "";
  let subtitle = "";
  let amount = 0;

  if (event.eventType === "LABOR" && event.data.labor) {
    title = event.data.description || "Labor";
    const labor = event.data.labor;
    subtitle = `LABOR: ${labor.hours} hrs @ $${labor.ratePerHour}/hr`;
    amount = labor.total;
  } else if (event.eventType === "MATERIAL" && event.data.material) {
    const material = event.data.material;
    title = material.name || "Materials";
    subtitle = `MATERIAL: ${material.quantity} × $${material.unitPrice}`;
    amount = material.total;
  } else if (event.eventType === "PROGRESS" && event.data.progress) {
    title = event.data.description || "Progress";
    subtitle = `PROGRESS: ${event.data.progress.status}`;
    if (event.data.progress.location) {
      subtitle += ` • ${event.data.progress.location}`;
    }
  } else if (event.eventType === "ALERT" && event.data.alert) {
    title = event.data.description || "Alert";
    subtitle = `ALERT: ${event.data.alert.alertType}`;
  }

  return (
    <View
      style={[
        styles.activityCard,
        { backgroundColor: config.bgColor, borderLeftColor: config.color },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.titleRow}>
            <Feather name={config.icon as any} size={16} color={config.color} />
            <ThemedText type="h4" style={[styles.cardTitle, { marginLeft: Spacing.sm }]}>
              {title}
            </ThemedText>
          </View>
            <ThemedText type="small" style={styles.cardSubtitle}>
            {subtitle}
          </ThemedText>
        </View>
        {amount > 0 && (
          <ThemedText
            type="h3"
            style={[styles.cardAmount, { color: config.color }]}
          >
            ${(amount / 100).toFixed(2)}
          </ThemedText>
        )}
      </View>
      <ThemedText type="small" style={styles.cardTime}>
        {event.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </ThemedText>
    </View>
  );
}

export default function ProjectHubScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const { getProjectEvents, addEvents } = useProjectEventStore();
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showReceiptCamera, setShowReceiptCamera] = useState(false);
  const [syncingPendingReceipts, setSyncingPendingReceipts] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const queryClient = useQueryClient();
  const { hasAccess: canUseReceiptScanner } = useReceiptScannerAccess();

  // Load project events on mount
  useEffect(() => {
    const loadedEvents = getProjectEvents(route.params.projectId);
    setEvents(loadedEvents as ProjectEvent[]);
    console.log(`[ProjectHub] Loaded ${loadedEvents.length} events for project ${route.params.projectId}`);
  }, [route.params.projectId, getProjectEvents]);

  // Initialize audio on component mount
  useEffect(() => {
    let mounted = true;

    const initAudio = async () => {
      try {
        console.log("[ProjectHub] Initializing audio system...");
        await audioRecorderService.initialize();
        console.log("[ProjectHub] Audio system initialized");
      } catch (error) {
        if (mounted) {
          console.error("[ProjectHub] Failed to initialize audio:", error);
        }
      }
    };

    initAudio();

    return () => {
      mounted = false;
      audioRecorderService.cleanup();
    };
  }, []);

  const projectName = safeText(route.params?.projectName) || "Pinecrest Kitchen Remodel";
  const projectId = safeText(route.params?.projectId);

  // Setup header with camera button
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", gap: Spacing.md, marginRight: Spacing.md }}>
          {canUseReceiptScanner && (
            <Pressable
              onPress={() => setShowReceiptCamera(true)}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="camera" size={24} color="white" />
            </Pressable>
          )}
        </View>
      ),
    });
  }, [navigation, canUseReceiptScanner]);

  // Sync pending receipts when device comes online
  const handleReceiptAdded = () => {
    // Refresh activities
    queryClient.invalidateQueries({ queryKey: ["activities", projectId] });
    Alert.alert("✅ Receipt Added", "Receipt has been added to the project.");
  };

  useOnline(async () => {
    if (!projectId) return;

    try {
      setSyncingPendingReceipts(true);
      console.log("[ProjectHub] Device online, syncing pending receipts...");

      const processFn = async (receipt: any) => {
        // Upload and process receipt on backend
        const uploadResult = await ReceiptProcessingService.uploadReceipt(
          projectId,
          receipt.photoBase64
        );

        if (uploadResult.success && uploadResult.receiptId) {
          const createResult = await ReceiptProcessingService.createActivityFromReceipt(
            projectId,
            uploadResult.receiptId,
            {
              vendor: receipt.vendor,
              date: receipt.date,
              items: receipt.items,
              grand_total: receipt.grandTotal,
            }
          );

          if (!createResult.success) {
            throw new Error(createResult.error || "Failed to create activity");
          }
        } else {
          throw new Error(uploadResult.error || "Failed to upload receipt");
        }
      };

      const result = await offlineReceiptService.processPendingReceipts(processFn);
      console.log(
        `[ProjectHub] Synced receipts: ${result.successful} successful, ${result.failed} failed`
      );

      if (result.successful > 0) {
        Alert.alert(
          "📥 Receipts Synced",
          `${result.successful} pending receipt(s) have been added to the project.`
        );
        queryClient.invalidateQueries({ queryKey: ["activities", projectId] });
      }

      if (result.failed > 0) {
        Alert.alert(
          "⚠️ Sync Errors",
          `${result.failed} receipt(s) failed to sync. Please try again.`
        );
      }
    } catch (error) {
      console.error("[ProjectHub] Sync error:", error);
    } finally {
      setSyncingPendingReceipts(false);
    }
  });

  // ✅ Compute live invoice total (NOT stored)
  const liveTotal = events
    .filter((e) => e.eventType === "LABOR" || e.eventType === "MATERIAL")
    .reduce((sum, e) => {
      if (e.eventType === "LABOR" && e.data.labor) {
        return sum + (e.data.labor.total || 0);
      }
      if (e.eventType === "MATERIAL" && e.data.material) {
        return sum + (e.data.material.total || 0);
      }
      return sum;
    }, 0);

  // Count alerts
  const alertCount = events.filter((e) => e.eventType === "ALERT").length;

  const handleStartRecording = async () => {
    try {
      setIsRecording(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animate pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start real audio recording
      await audioRecorderService.startRecording();
    } catch (error) {
      console.error("Recording failed:", error);
      setIsRecording(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to start recording.");
    }
  };

  const handleStopRecording = async () => {
    try {
      setIsRecording(false);
      scaleAnim.setValue(1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setIsProcessing(true);

      // Stop recording and get audio URI
      const recordingSession = await audioRecorderService.stopRecording();
      if (!recordingSession) {
        throw new Error("Failed to stop recording");
      }

      // Transcribe the real audio
      const transcriptionResult = await transcriptionService.transcribeAudio(
        recordingSession.uri,
        recordingSession.duration
      );

      console.log("[ProjectHub] Transcription complete:", transcriptionResult.text);

      // Extract invoice data from real transcript
      const invoiceData = await transcriptionService.extractInvoiceData(transcriptionResult.text);

      console.log("[ProjectHub] Extraction complete:", invoiceData);

      // Convert extracted invoice data to project events
      const newEvents: ProjectEvent[] = [];
      let eventId = 1;

      // Labor events
      if (invoiceData.labor && invoiceData.labor.hours) {
        newEvents.push({
          eventId: String(eventId++),
          eventType: "LABOR",
          timestamp: new Date(),
          data: {
            description: invoiceData.job_description || "Labor",
            labor: {
              hours: invoiceData.labor.hours,
              ratePerHour: invoiceData.labor.rate_per_hour || 0,
              total: invoiceData.labor.total || 0,
            },
          },
        });
      }

      // Material events
      if (invoiceData.materials && invoiceData.materials.length > 0) {
        invoiceData.materials.forEach((material: any, index: number) => {
          newEvents.push({
            eventId: String(eventId++),
            eventType: "MATERIAL",
            timestamp: new Date(Date.now() - (invoiceData.materials.length - index - 1) * 120000),
            data: {
              material: {
                name: material.name || "Material",
                quantity: material.quantity || 0,
                unitPrice: material.unit_price || 0,
                total: material.total || 0,
              },
            },
          });
        });
      }

      // Progress event
      if (invoiceData.job_description) {
        newEvents.push({
          eventId: String(eventId++),
          eventType: "PROGRESS",
          timestamp: new Date(Date.now() - 240000),
          data: {
            description: invoiceData.job_description,
            progress: { status: "COMPLETED", location: "Work Area" },
          },
        });
      }

      // Notes as alert if there are any
      if (invoiceData.notes) {
        newEvents.push({
          eventId: String(eventId++),
          eventType: "ALERT",
          timestamp: new Date(Date.now() - 360000),
          data: {
            description: invoiceData.notes,
            alert: {
              alertType: "NOTE",
              severity: "LOW",
              recommendedAction: "Review notes",
            },
          },
        });
      }

      // ✅ Save events to store (persisted to AsyncStorage)
      const persistedEvents = addEvents(
        route.params.projectId,
        newEvents.map((e) => ({
          eventType: e.eventType as "LABOR" | "MATERIAL" | "PROGRESS" | "ALERT" | "RECEIPT",
          timestamp: e.timestamp,
          data: e.data,
        }))
      );
      setEvents((prev) => [...persistedEvents, ...prev] as ProjectEvent[]);
      setIsProcessing(false);

      const itemCount = newEvents.length;
      Alert.alert(
        "✅ Recording Processed",
        `Added ${itemCount} ${itemCount === 1 ? "item" : "items"} to timeline.`
      );
    } catch (error) {
      console.error("Processing failed:", error);
      setIsProcessing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      const errorMessage =
        error instanceof Error ? error.message : "Failed to process recording.";
      Alert.alert("Error", errorMessage);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* HEADER */}
      <View
        style={[
          styles.header,
          {
            marginTop: headerHeight + Spacing.md,
            paddingHorizontal: Spacing.lg,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <View>
          <ThemedText type="h3">{projectName}</ThemedText>
          <View style={styles.totalsRow}>
            <View>
              <ThemedText type="small" style={styles.totalLabel}>
                Live Invoice
              </ThemedText>
              <ThemedText
                type="h2"
                style={[styles.totalAmount, { color: BrandColors.constructionGold }]}
              >
                ${(liveTotal / 100).toFixed(2)}
              </ThemedText>
            </View>
            {alertCount > 0 && (
              <Pressable style={styles.alertBadge}>
                <Feather name="alert-circle" size={16} color="white" />
                <ThemedText type="small" style={styles.alertText}>
                  Alerts
                </ThemedText>
                <ThemedText type="h4" style={styles.alertCount}>{alertCount}</ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* ACTIVITY STREAM LABEL */}
      <ThemedText
        type="small"
        style={[styles.streamLabel, { marginTop: Spacing.lg, marginLeft: Spacing.lg }]}
      >
        Activity Stream
      </ThemedText>

      {/* TIMELINE */}
      {events.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="inbox" size={48} color={theme.textSecondary} />
          <ThemedText type="h4" style={{ marginTop: Spacing.md }}>
            No Activities Yet
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
            Tap the mic to record your first activity
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.eventId}
          renderItem={({ item, index }) => <ActivityCard event={item} index={index} />}
          contentContainerStyle={[
            styles.timeline,
            {
              paddingBottom: Spacing.xl * 3,
              paddingHorizontal: Spacing.lg,
            },
          ]}
          scrollEnabled={true}
        />
      )}

      {/* RECORDING INDICATOR */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color={BrandColors.constructionGold} />
          <ThemedText type="small" style={{ marginTop: Spacing.md, color: "white" }}>
            Processing...
          </ThemedText>
        </View>
      )}

      {/* FLOATING MIC BUTTON */}
      <Animated.View
        style={[
          styles.fabContainer,
          { transform: [{ scale: scaleAnim }], bottom: insets.bottom + Spacing.lg },
        ]}
      >
        <Pressable
          style={[
            styles.fab,
            {
              backgroundColor: isRecording
                ? BrandColors.constructionGold
                : BrandColors.constructionGold,
            },
          ]}
          onPress={isRecording ? handleStopRecording : handleStartRecording}
          disabled={isProcessing}
        >
          <Feather name="mic" size={24} color="#1a1a1a" />
        </Pressable>
      </Animated.View>

      {/* RECORDING LABEL */}
      {isRecording && (
        <View style={styles.recordingLabel}>
          <View style={styles.recordingPulse} />
          <ThemedText type="small" style={{ color: "white" }}>
            Recording...
          </ThemedText>
        </View>
      )}

      {/* RECEIPT CAMERA */}
      {canUseReceiptScanner && (
        <ReceiptCamera
          isVisible={showReceiptCamera}
          projectId={projectId}
          onReceiptAdded={handleReceiptAdded}
          onClose={() => setShowReceiptCamera(false)}
        />
      )}

      {/* SYNCING INDICATOR */}
      {syncingPendingReceipts && (
        <View
          style={[
            styles.syncingOverlay,
            { backgroundColor: BrandColors.constructionGold + "90" },
          ]}
        >
          <ActivityIndicator size="small" color="white" />
          <ThemedText type="small" style={{ marginLeft: Spacing.md, color: "white" }}>
            Syncing offline receipts...
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: Spacing.md,
  },
  totalsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: Spacing.md,
  },
  totalLabel: {
    opacity: 0.7,
  },
  totalAmount: {
    marginTop: Spacing.xs,
    fontFamily: "monospace",
  },
  alertBadge: {
    backgroundColor: "#FF8C00",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  alertText: {
    color: "white",
    marginLeft: Spacing.xs,
  },
  alertCount: {
    color: "white",
    marginLeft: Spacing.xs,
  },
  streamLabel: {
    opacity: 0.6,
  },
  timeline: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  activityCard: {
    borderLeftWidth: 4,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardTitle: {
    fontWeight: "600",
  },
  cardSubtitle: {
    marginTop: Spacing.xs,
    opacity: 0.7,
  },
  cardAmount: {
    fontWeight: "bold",
    minWidth: 80,
    textAlign: "right",
  },
  cardTime: {
    marginTop: Spacing.sm,
    opacity: 0.5,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabContainer: {
    position: "absolute",
    right: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingLabel: {
    position: "absolute",
    bottom: 80 + Spacing.lg,
    right: Spacing.lg,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  recordingPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF0000",
  },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  syncingOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 998,
  },
});
