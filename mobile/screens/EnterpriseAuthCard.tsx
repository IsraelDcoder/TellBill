import React, { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  Animated,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import * as LocalAuthentication from "expo-local-authentication";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";

export default function EnterpriseAuthCard({
  onSuccess,
  onTermsPress,
  onPrivacyPress,
}: {
  onSuccess: () => void;
  onTermsPress: () => void;
  onPrivacyPress: () => void;
}) {
  const { theme } = useTheme();
  const { signInWithApple, error, clearError } = useAuth();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const cardShakeAnim = useRef(new Animated.Value(0)).current;
  const emailBorderColor = useRef(new Animated.Value(0)).current;
  const successCheckScale = useRef(new Animated.Value(0)).current;

  // Check biometric availability on mount
  React.useEffect(() => {
    const checkBiometric = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        if (compatible) {
          const supported = await LocalAuthentication.supportedAuthenticationTypesAsync();
          setBiometricAvailable(supported.length > 0);
        }
      } catch (err) {
        console.log("Biometric check failed:", err);
      }
    };
    checkBiometric();
  }, []);

  const triggerShakeAnimation = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Animated.sequence([
      Animated.timing(cardShakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(cardShakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(cardShakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(cardShakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const triggerSuccessAnimation = () => {
    Animated.spring(successCheckScale, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(onSuccess, 600);
    });
  };

  const handleAppleSignIn = async () => {
    try {
      setIsLoading(true);
      clearError();
      await signInWithApple();
      triggerSuccessAnimation();
    } catch (err) {
      triggerShakeAnimation();
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkSend = async () => {
    if (!email) {
      Alert.alert("Error", "Please enter your work email");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      triggerShakeAnimation();
      return;
    }

    try {
      setIsSendingMagicLink(true);
      clearError();

      // TODO: Implement Supabase magic link send
      // const { error } = await supabase.auth.signInWithOtp({
      //   email,
      //   options: { shouldCreateUser: true }
      // });

      Alert.alert(
        "Check Your Email",
        "We've sent you a magic link. Click it to sign in securely."
      );
      setMagicLinkSent(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      triggerShakeAnimation();
      Alert.alert("Error", "Could not send magic link. Please try again.");
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
      });

      if (result.success) {
        // TODO: Retrieve stored credentials and authenticate
        triggerSuccessAnimation();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      triggerShakeAnimation();
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="h2" style={styles.title}>
            Welcome to TellBill
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.subtitle, { color: theme.tabIconDefault }]}
          >
            Professional invoicing for contractors
          </ThemedText>
        </View>

        {/* Auth Card */}
        <Animated.View
          style={[
            styles.authCard,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
              transform: [{ translateX: cardShakeAnim }],
            },
          ]}
        >
          {/* Error Message */}
          {error && (
            <View style={[styles.errorBox, { borderColor: BrandColors.error }]}>
              <Feather name="alert-circle" size={16} color={BrandColors.error} />
              <ThemedText
                style={[
                  styles.errorText,
                  { color: BrandColors.error, marginLeft: Spacing.sm },
                ]}
              >
                {error}
              </ThemedText>
            </View>
          )}

          {/* OAuth Buttons */}
          <View style={styles.oauthContainer}>
            {Platform.OS === "ios" && (
              <Pressable
                style={[styles.oauthButton, { borderColor: theme.border }]}
                onPress={handleAppleSignIn}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.text} />
                ) : (
                  <>
                    <Feather name="share-2" size={18} color={theme.text} />
                    <ThemedText style={styles.oauthButtonText}>
                      Continue with Apple
                    </ThemedText>
                  </>
                )}
              </Pressable>
            )}
          </View>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <ThemedText
              style={[styles.dividerText, { color: theme.tabIconDefault }]}
            >
              OR
            </ThemedText>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
          </View>

          {/* Magic Link Section */}
          <View style={styles.magicLinkSection}>
            <ThemedText type="small" style={[styles.label, { color: BrandColors.constructionGold }]}>
              Work Email
            </ThemedText>
            <View
              style={[
                styles.emailInputContainer,
                { borderColor: theme.border },
              ]}
            >
              <Feather name="mail" size={18} color={BrandColors.constructionGold} />
              <TextInput
                style={[styles.emailInput, { color: theme.text }]}
                placeholder="name@company.com"
                placeholderTextColor={theme.tabIconDefault}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                editable={!isSendingMagicLink}
              />
            </View>

            <Button
              onPress={handleMagicLinkSend}
              disabled={isSendingMagicLink}
              style={styles.magicLinkButton}
            >
              {isSendingMagicLink ? "Sending..." : "Send Magic Link"}
            </Button>

            {magicLinkSent && (
              <ThemedText
                type="small"
                style={[styles.successText, { color: BrandColors.success }]}
              >
                ✓ Check your email for the magic link
              </ThemedText>
            )}
          </View>

          {/* Biometric Toggle */}
          {biometricAvailable && (
            <View style={styles.biometricSection}>
              <Pressable
                style={styles.biometricToggle}
                onPress={() => setEnableBiometric(!enableBiometric)}
              >
                <View
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: enableBiometric
                        ? BrandColors.constructionGold
                        : "transparent",
                      borderColor: enableBiometric
                        ? BrandColors.constructionGold
                        : theme.border,
                    },
                  ]}
                >
                  {enableBiometric && (
                    <Feather name="check" size={14} color={theme.backgroundRoot} />
                  )}
                </View>
                <ThemedText style={styles.biometricLabel}>
                  Enable FaceID / Biometric Login
                </ThemedText>
              </Pressable>

              {enableBiometric && (
                <Button
                  onPress={handleBiometricAuth}
                  disabled={isLoading}
                  variant="secondary"
                  style={styles.biometricButton}
                >
                  {isLoading ? (
                    <ActivityIndicator color={theme.text} />
                  ) : (
                    <>
                      <Feather name="lock" size={16} color={theme.text} />
                      Sign in with Biometric
                    </>
                  )}
                </Button>
              )}
            </View>
          )}
        </Animated.View>

        {/* Legal Text */}
        <View style={styles.legalContainer}>
          <ThemedText type="small" style={[styles.legalText, { color: theme.tabIconDefault }]}>
            By joining TellBill, you agree to our{" "}
            <Pressable onPress={onTermsPress}>
              <ThemedText
                type="small"
                style={{ color: BrandColors.constructionGold, textDecorationLine: "underline" }}
              >
                Terms of Service
              </ThemedText>
            </Pressable>
            {" "}and{" "}
            <Pressable onPress={onPrivacyPress}>
              <ThemedText
                type="small"
                style={{ color: BrandColors.constructionGold, textDecorationLine: "underline" }}
              >
                Privacy Policy
              </ThemedText>
            </Pressable>
          </ThemedText>
        </View>

        {/* Success Checkmark - Animated */}
        <Animated.View
          style={[
            styles.successCheckContainer,
            {
              transform: [{ scale: successCheckScale }],
            },
          ]}
        >
          <View style={styles.successCheck}>
            <Feather name="check" size={48} color="white" />
          </View>
        </Animated.View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
  },
  header: {
    marginBottom: Spacing["2xl"],
    alignItems: "center",
  },
  title: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    fontSize: 14,
  },
  authCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
  },
  oauthContainer: {
    gap: Spacing.md,
  },
  oauthButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  oauthButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: "600",
  },
  magicLinkSection: {
    gap: Spacing.md,
  },
  label: {
    fontWeight: "600",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  emailInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  emailInput: {
    flex: 1,
    fontSize: 14,
  },
  magicLinkButton: {
    marginTop: Spacing.sm,
  },
  successText: {
    textAlign: "center",
    fontSize: 13,
    marginTop: Spacing.sm,
  },
  biometricSection: {
    gap: Spacing.md,
  },
  biometricToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  biometricLabel: {
    fontSize: 14,
    flex: 1,
  },
  biometricButton: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  legalContainer: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  legalText: {
    textAlign: "center",
    lineHeight: 18,
  },
  successCheckContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    pointerEvents: "none",
  },
  successCheck: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BrandColors.success,
    justifyContent: "center",
    alignItems: "center",
  },
});
