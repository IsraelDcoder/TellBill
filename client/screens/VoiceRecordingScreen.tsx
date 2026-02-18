import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { UpgradeRequiredModal } from "@/components/UpgradeRequiredModal";
import { useTheme } from "@/hooks/useTheme";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { useActivityStore } from "@/stores/activityStore";
import { useAuth } from "@/context/AuthContext";
import { useFeatureAccess, useFreeTierLimit } from "@/hooks/useFeatureAccess";
import { Spacing, BorderRadius, BrandColors, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { PLAN_LIMITS } from "@/constants/planLimits";
import { audioRecorderService, RecordingStatus } from "@/services/audioRecorderService";
import { transcriptionService } from "@/services/transcriptionService";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function VoiceRecordingScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { currentPlan, voiceRecordingsUsed, incrementVoiceRecordings } = useSubscriptionStore();
  const { addActivity } = useActivityStore();
  const { user } = useAuth();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>({
    isInitialized: false,
    isRecording: false,
    hasMicPermission: false,
    error: null,
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);
  const buttonScale = useSharedValue(1);

  // Check if user has reached recording limit using hook
  const { hasReachedLimit, remaining, limit } = useFreeTierLimit("voice", voiceRecordingsUsed);
  const recordingLimit = limit;

  // Initialize audio system on component mount
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const initializeAudio = async () => {
      try {
        console.log("[VoiceRecording] Initializing audio service...");
        await audioRecorderService.initialize();
        console.log("[VoiceRecording] Audio service initialized successfully");
        
        // Subscribe to status changes
        unsubscribe = audioRecorderService.onStatusChange((status) => {
          console.log("[VoiceRecording] Audio status updated:", status);
          setRecordingStatus(status);
        });
      } catch (error) {
        console.error("[VoiceRecording] Failed to initialize audio:", error);
        setRecordingStatus((prev) => ({
          ...prev,
          error: "Failed to initialize audio. Please restart the app.",
        }));
      }
    };

    initializeAudio();

    return () => {
      if (unsubscribe) unsubscribe();
      if (timerRef.current) clearInterval(timerRef.current);
      audioRecorderService.cleanup();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withTiming(1.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = withSpring(1);
      pulseOpacity.value = withSpring(0.5);
    }

    return () => {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
    };
  }, [isRecording]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleRecordPress = async () => {
    console.log("[VoiceRecording] Start button pressed");
    console.log("[VoiceRecording] Usage check:", { voiceRecordingsUsed, recordingLimit, currentPlan, hasReachedLimit });
    
    // Check recording status before allowing recording
    if (!isRecording) {
      // Check if audio system is initialized
      if (!recordingStatus.isInitialized) {
        console.log("[AudioRecorder] Audio not initialized, attempting initialization...");
        try {
          // Try to initialize again
          await audioRecorderService.initialize();
          const status = audioRecorderService.getStatus();
          console.log("[AudioRecorder] Retry initialization status:", status);
          setRecordingStatus(status);
          
          if (!status.isInitialized) {
            Alert.alert(
              "Initialization Failed",
              "Could not initialize audio system. " + (status.error || "Unknown error")
            );
            return;
          }
        } catch (error) {
          console.error("[AudioRecorder] Initialization retry failed:", error);
          Alert.alert(
            "Initialization Error",
            error instanceof Error ? error.message : "Failed to initialize audio"
          );
          return;
        }
      }

      // Check for microphone errors
      if (recordingStatus.error) {
        console.log("[AudioRecorder] Recording status has error:", recordingStatus.error);
        if (recordingStatus.error.includes("permission")) {
          Alert.alert(
            "Microphone Access Required",
            "TellBill needs microphone access to record your voice notes. Please enable it in your device settings.",
            [{ text: "OK" }]
          );
        } else {
          Alert.alert(
            "Microphone Error",
            recordingStatus.error,
            [{ text: "Try Again" }]
          );
        }
        return;
      }

      // Check if user has reached recording limit
      if (hasReachedLimit) {
        console.log("[VoiceRecording] ❌ Recording limit reached!", { voiceRecordingsUsed, recordingLimit, currentPlan });
        setShowUpgradeModal(true);
        return;
      }
      console.log("[VoiceRecording] ✅ Recording allowed", { voiceRecordingsUsed, recordingLimit, remaining: recordingLimit - voiceRecordingsUsed });
    }

    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    if (isRecording) {
      // Stop recording
      try {
        setIsProcessing(true);
        setIsRecording(false);
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        const recordingSession = await audioRecorderService.stopRecording();
        
        if (!recordingSession || !recordingSession.uri) {
          Alert.alert("Recording Error", "Failed to save recording");
          setIsProcessing(false);
          return;
        }

        setAudioUri(recordingSession.uri);

        // Transcribe audio
        console.log("[VoiceRecording] Starting transcription...");
        const result = await transcriptionService.transcribeAudio(
          recordingSession.uri,
          recordingSession.duration
        );

        setTranscript(result.text);
        incrementVoiceRecordings();
        console.log("[VoiceRecording] ✅ Voice recording count incremented");
        
        // ✅ Log transcription activity for backend tracking
        addActivity({
          userId: user?.id || "unknown",
          userName: user?.name || user?.email || "Unknown User",
          action: "transcribed_voice",
          resourceType: "voice_recording",
          resourceId: recordingSession.uri,
          resourceName: "Voice Recording",
          details: {
            duration: recordingSession.duration,
            textLength: result.text.length,
          },
        });
        
        setIsProcessing(false);
      } catch (error) {
        setIsProcessing(false);
        Alert.alert(
          "Transcription Error",
          error instanceof Error ? error.message : "Failed to transcribe audio"
        );
        console.error("Transcription error:", error);
      }
    } else {
      // Start recording
      try {
        console.log("[AudioRecorder] Attempting to start recording...");
        setIsRecording(true);
        setRecordingTime(0);
        setTranscript("");
        setAudioUri(null);

        await audioRecorderService.startRecording();
        console.log("[AudioRecorder] Recording successfully started");

        timerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } catch (error) {
        console.error("[AudioRecorder] Failed to start recording:", error);
        setIsRecording(false);
        Alert.alert(
          "Recording Error",
          error instanceof Error ? error.message : "Failed to start recording"
        );
      }
    }
  };

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handleContinue = () => {
    navigation.navigate("TranscriptReview", { 
      transcript,
    });
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundRoot,
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.xl,
        },
      ]}
    >
      {Platform.OS === "web" ? (
        <View style={styles.webNotice}>
          <Feather name="info" size={20} color={BrandColors.constructionGold} />
          <ThemedText type="body" style={styles.webNoticeText}>
            Audio recording is only available on mobile devices.
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.recordSection}>
        {isProcessing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator 
              size="large" 
              color={BrandColors.constructionGold}
              style={styles.spinner}
            />
            <ThemedText type="body" style={styles.processingText}>
              Transcribing your voice...
            </ThemedText>
          </View>
        )}

        <View style={styles.recordButtonContainer}>
          <Animated.View
            style={[
              styles.pulse,
              { backgroundColor: BrandColors.constructionGold },
              pulseStyle,
            ]}
          />
          <AnimatedPressable
            onPress={handleRecordPress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={isProcessing || recordingStatus.error !== null}
            style={[
              styles.recordButton,
              {
                backgroundColor: recordingStatus.error
                  ? theme.backgroundSecondary
                  : isRecording
                  ? theme.error
                  : BrandColors.constructionGold,
                opacity: isProcessing || recordingStatus.error ? 0.5 : 1,
              },
              Shadows.fab,
              buttonAnimatedStyle,
            ]}
          >
            <Feather
              name={isRecording ? "square" : "mic"}
              size={40}
              color={recordingStatus.error ? theme.textSecondary : isRecording ? "#fff" : BrandColors.slateGrey}
            />
          </AnimatedPressable>
          {recordingStatus.error && (
            <View style={styles.errorIndicator}>
              <Feather name="alert-circle" size={16} color={theme.error} />
              <ThemedText 
                type="caption" 
                style={[styles.errorText, { color: theme.error }]}
              >
                Mic Error
              </ThemedText>
            </View>
          )}
        </View>

        <ThemedText 
          type="h2" 
          style={[
            styles.timerText,
            {
              color: isRecording ? theme.error : theme.text,
              fontWeight: isRecording ? "bold" : "600",
            }
          ]}
        >
          {formatTime(recordingTime)}
        </ThemedText>

        <ThemedText
          type="body"
          style={[styles.instruction, { color: theme.textSecondary }]}
        >
          {isProcessing
            ? "Processing your recording..."
            : isRecording
            ? "🎤 Recording... Describe the job details"
            : "Tap to start recording"}
        </ThemedText>
      </View>

      {transcript.length > 0 ? (
        <View style={styles.transcriptSection}>
          <View style={styles.transcriptHeader}>
            <Feather
              name="file-text"
              size={18}
              color={BrandColors.constructionGold}
            />
            <ThemedText type="h4">Transcript</ThemedText>
          </View>
          <View
            style={[
              styles.transcriptBox,
              {
                backgroundColor: isDark
                  ? theme.backgroundDefault
                  : theme.backgroundSecondary,
              },
            ]}
          >
            <ThemedText type="body" style={styles.transcriptText}>
              {transcript}
            </ThemedText>
          </View>

          <Button 
            onPress={handleContinue} 
            style={styles.continueButton}
            disabled={isProcessing}
          >
            Review & Edit
          </Button>
        </View>
      ) : null}

      <UpgradeRequiredModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        type="voice"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  webNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: `${BrandColors.constructionGold}15`,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.xl,
  },
  webNoticeText: {
    flex: 1,
  },
  recordSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  processingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  spinner: {
    marginBottom: Spacing.lg,
  },
  processingText: {
    marginTop: Spacing.md,
  },
  recordButtonContainer: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing["2xl"],
    position: "relative",
  },
  pulse: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  errorIndicator: {
    position: "absolute",
    bottom: -35,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  errorText: {
    fontWeight: "600",
  },
  timerText: {
    marginBottom: Spacing.md,
  },
  instruction: {
    textAlign: "center",
  },
  transcriptSection: {
    flex: 1,
  },
  transcriptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  transcriptBox: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  transcriptText: {
    lineHeight: 24,
  },
  continueButton: {
    marginBottom: Spacing.lg,
  },
});
