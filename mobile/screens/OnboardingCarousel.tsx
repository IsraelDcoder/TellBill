import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
} from "react-native";
import LottieView from "lottie-react-native";
import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";

const { width } = Dimensions.get("window");

interface OnboardingPage {
  id: number;
  headline: string;
  subheadline: string;
  lottieSource: any; // Placeholder - will be actual Lottie files
  color: string;
}

const PAGES: OnboardingPage[] = [
  {
    id: 1,
    headline: "Ditch the Paperwork",
    subheadline: "Invoices shouldn't take all night",
    lottieSource: require("@/assets/animations/clock-to-check.json"),
    color: BrandColors.constructionGold,
  },
  {
    id: 2,
    headline: "Just Tell Bill",
    subheadline: "Talk to your phone like a walkie-talkie. Our AI builds the bill",
    lottieSource: require("@/assets/animations/soundwave.json"),
    color: BrandColors.constructionGold,
  },
  {
    id: 3,
    headline: "Get Paid on Site",
    subheadline: "Generate and send professional PDFs before you leave the truck",
    lottieSource: require("@/assets/animations/airplane-to-dollar.json"),
    color: BrandColors.constructionGold,
  },
];

export default function OnboardingCarousel({
  onGetStarted,
}: {
  onGetStarted: () => void;
}) {
  const { theme } = useTheme();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const getStartedOpacity = useRef(new Animated.Value(0)).current;
  const getStartedTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (currentPage === PAGES.length - 1) {
      Animated.parallel([
        Animated.timing(getStartedOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(getStartedTranslateY, {
          toValue: 0,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(getStartedOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(getStartedTranslateY, {
          toValue: 20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [currentPage]);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newPage = Math.round(contentOffsetX / width);
    setCurrentPage(newPage);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      {/* Carousel */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        scrollEventThrottle={16}
        onScroll={handleScroll}
        showsHorizontalScrollIndicator={false}
        style={styles.carousel}
      >
        {PAGES.map((page) => (
          <View key={page.id} style={[styles.page, { width }]}>
            {/* Lottie Animation - Placeholder height */}
            <View style={styles.animationContainer}>
              <LottieView
                source={page.lottieSource}
                autoPlay
                loop
                style={styles.lottie}
              />
            </View>

            {/* Content */}
            <View style={styles.contentContainer}>
              <ThemedText type="h1" style={styles.headline}>
                {page.headline}
              </ThemedText>
              <ThemedText
                type="body"
                style={[styles.subheadline, { color: theme.tabIconDefault }]}
              >
                {page.subheadline}
              </ThemedText>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {PAGES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressDot,
              {
                backgroundColor:
                  index === currentPage
                    ? BrandColors.constructionGold
                    : theme.border,
              },
            ]}
          />
        ))}
      </View>

      {/* Get Started Button - Animated */}
      <Animated.View
        style={[
          styles.getStartedContainer,
          {
            opacity: getStartedOpacity,
            transform: [{ translateY: getStartedTranslateY }],
          },
        ]}
      >
        <Button onPress={onGetStarted} style={styles.getStartedButton}>
          Get Started
        </Button>
      </Animated.View>

      {/* Spacer for layout */}
      <View style={{ height: currentPage < PAGES.length - 1 ? Spacing.xl : 0 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  carousel: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: "space-between",
    paddingVertical: Spacing.xl,
  },
  animationContainer: {
    flex: 0.5,
    justifyContent: "center",
    alignItems: "center",
  },
  lottie: {
    width: 300,
    height: 300,
  },
  contentContainer: {
    flex: 0.4,
    justifyContent: "flex-start",
  },
  headline: {
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  subheadline: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  progressContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  getStartedContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  getStartedButton: {
    marginBottom: Spacing.md,
  },
});
