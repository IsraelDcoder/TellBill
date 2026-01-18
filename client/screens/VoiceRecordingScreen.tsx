import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  Platform,
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
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors, Shadows } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function VoiceRecordingScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcript, setTranscript] = useState("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);
  const buttonScale = useSharedValue(1);

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
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    if (isRecording) {
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      const sampleTranscript = `Client: ABC Construction
Job Address: 1234 Main Street, Building A
Materials: 50 bags of cement at $12 each, 100 rebar pieces at $8 each, 20 sheets of plywood at $45 each
Labor: 8 hours of skilled labor
Safety Notes: Hard hats required, scaffolding inspected
Payment Terms: Net 30`;
      setTranscript(sampleTranscript);
    } else {
      setIsRecording(true);
      setRecordingTime(0);
      setTranscript("");
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
  };

  const handlePressIn = () => {
    buttonScale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const handleContinue = () => {
    navigation.navigate("TranscriptReview", { transcript });
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
            Audio recording works best in the mobile app. Tap the record button to simulate.
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.recordSection}>
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
            style={[
              styles.recordButton,
              {
                backgroundColor: isRecording
                  ? theme.error
                  : BrandColors.constructionGold,
              },
              Shadows.fab,
              buttonAnimatedStyle,
            ]}
          >
            <Feather
              name={isRecording ? "square" : "mic"}
              size={40}
              color={isRecording ? "#fff" : BrandColors.slateGrey}
            />
          </AnimatedPressable>
        </View>

        <ThemedText type="h2" style={styles.timerText}>
          {formatTime(recordingTime)}
        </ThemedText>

        <ThemedText
          type="body"
          style={[styles.instruction, { color: theme.textSecondary }]}
        >
          {isRecording
            ? "Recording... Describe the job details"
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
            <ThemedText type="h4">Live Transcript</ThemedText>
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

          <Button onPress={handleContinue} style={styles.continueButton}>
            Review & Edit
          </Button>
        </View>
      ) : null}
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
  recordButtonContainer: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing["2xl"],
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
