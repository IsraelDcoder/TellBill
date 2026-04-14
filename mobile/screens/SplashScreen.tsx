import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import Svg, { G, Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/hooks/useTheme";

const { width, height } = Dimensions.get("window");

interface SplashScreenProps {
  onAnimationComplete?: (isAuthenticated: boolean) => void;
}

export default function SplashScreen({
  onAnimationComplete,
}: SplashScreenProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const { theme } = useTheme();

  const strokeOffset = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoading) return;

    // Start animation sequence
    const animationSequence = Animated.parallel([
      // Scale in the logo
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // Fade in
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);

    animationSequence.start(() => {
      // Start stroke dash animation
      Animated.timing(strokeOffset, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: false,
      }).start(() => {
        // Animation complete - trigger haptic
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Call completion handler
        setTimeout(() => {
          onAnimationComplete?.(isAuthenticated);
        }, 300);
      });
    });
  }, [isLoading]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundDefault }]}>
      {isLoading ? (
        <ActivityIndicator size="large" color={theme.primary} />
      ) : (
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Svg height="200" width="200" viewBox="0 0 200 200">
            <G>
              {/* Speech bubble outline forming a 'B' */}

              {/* Left vertical line of B */}
              <Path
                d="M 60 30 L 60 170"
                stroke={theme.primary}
                strokeWidth="4"
                fill="none"
                strokeDasharray="140"
                strokeDashoffset={0}
              />

              {/* Top curve of B (upper bump) */}
              <Path
                d="M 60 30 Q 110 30 110 70 Q 110 100 60 100"
                stroke={theme.primary}
                strokeWidth="4"
                fill="none"
                strokeDasharray="140"
                strokeDashoffset={0}
              />

              {/* Middle line of B */}
              <Path
                d="M 60 100 L 110 100"
                stroke={theme.primary}
                strokeWidth="4"
                fill="none"
                strokeDasharray="50"
                strokeDashoffset={0}
              />

              {/* Bottom curve of B (lower bump) */}
              <Path
                d="M 60 100 Q 120 100 120 135 Q 120 170 60 170"
                stroke={theme.primary}
                strokeWidth="4"
                fill="none"
                strokeDasharray="160"
                strokeDashoffset={0}
              />

              {/* Speech bubble pointer */}
              <Path
                d="M 130 150 L 150 180 L 130 165 Z"
                fill={theme.primary}
                strokeDasharray="100"
                strokeDashoffset={0}
              />
            </G>
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});
