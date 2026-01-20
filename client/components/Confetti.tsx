import React, { useEffect } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  withDelay,
} from "react-native-reanimated";
import { BrandColors } from "@/constants/theme";

interface ConfettiPieceProps {
  delay: number;
  duration: number;
  randomOffset: number;
}

function ConfettiPiece({ delay, duration, randomOffset }: ConfettiPieceProps) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    // Fall animation
    translateY.value = withDelay(
      delay,
      withTiming(Dimensions.get("window").height, {
        duration: duration,
        easing: Easing.linear,
      })
    );

    // Horizontal drift
    translateX.value = withDelay(
      delay,
      withTiming(randomOffset, {
        duration: duration * 0.8,
        easing: Easing.inOut(Easing.ease),
      })
    );

    // Rotation
    rotate.value = withDelay(
      delay,
      withTiming(360 * 2, {
        duration: duration,
        easing: Easing.linear,
      })
    );

    // Fade out at end
    opacity.value = withDelay(
      delay + duration - 200,
      withTiming(0, {
        duration: 200,
        easing: Easing.linear,
      })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const colors = [
    BrandColors.constructionGold,
    "#FFD700",
    "#FFA500",
    "#FF6B6B",
    "#4ECDC4",
  ];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  return (
    <Animated.View
      style={[
        styles.confettiPiece,
        { backgroundColor: randomColor },
        animatedStyle,
      ]}
    />
  );
}

interface ConfettiProps {
  isVisible: boolean;
  duration?: number;
  pieceCount?: number;
}

/**
 * Confetti animation - Shows celebratory confetti when user successfully upgrades
 */
export function Confetti({
  isVisible,
  duration = 3000,
  pieceCount = 30,
}: ConfettiProps) {
  if (!isVisible) return null;

  const pieces = Array.from({ length: pieceCount }).map((_, i) => {
    const delay = Math.random() * 200;
    const randomOffset = (Math.random() - 0.5) * 200;
    return (
      <ConfettiPiece
        key={i}
        delay={delay}
        duration={duration}
        randomOffset={randomOffset}
      />
    );
  });

  return <View style={styles.container}>{pieces}</View>;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: "none",
    overflow: "hidden",
  },
  confettiPiece: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    left: "50%",
    top: -20,
  },
});
