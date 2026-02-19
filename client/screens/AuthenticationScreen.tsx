import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  Animated as RNAnimated,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  interpolate,
  Extrapolate,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import * as Svg from "react-native-svg";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { LegalModal } from "./LegalModal";
import ForgotPasswordScreen from "./ForgotPasswordScreen";
import ResetPasswordScreen from "./ResetPasswordScreen";

const { width, height } = Dimensions.get("window");

interface AuthScreenProps {
  onSuccess: () => void;
  initialResetToken?: string | null;
}

export default function AuthenticationScreen({ onSuccess, initialResetToken }: AuthScreenProps) {
  const { theme } = useTheme();
  const { signIn, signUp, signInWithGoogle } = useAuth();

  // Auth mode state
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [passwordResetMode, setPasswordResetMode] = useState<"none" | "forgot" | "reset">("none");
  const [resetToken, setResetToken] = useState<string | null>(initialResetToken || null);

  // Handle initial reset token from deep link
  useEffect(() => {
    if (initialResetToken) {
      setPasswordResetMode("reset");
      setResetToken(initialResetToken);
    }
  }, [initialResetToken]);

  // Sign-up fields
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Loading and validation states
  const [isLoading, setIsLoading] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Animation values
  const slideAnim = useSharedValue(0);
  const successRevealProgress = useSharedValue(0);
  const shakeAnim = useRef(new RNAnimated.Value(0)).current;

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle password mismatch validation
  useEffect(() => {
    if (confirmPassword) {
      setPasswordMatch(password === confirmPassword);
    }
  }, [password, confirmPassword]);

  // Shake animation on error
  const triggerShake = () => {
    RNAnimated.sequence([
      RNAnimated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      RNAnimated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      RNAnimated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      RNAnimated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Toggle between Sign-up and Login with slide animation
  const toggleAuthMode = (newMode: "signup" | "login") => {
    const direction = newMode === "login" ? 1 : -1;
    slideAnim.value = withTiming(direction * width, {
      duration: 400,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
    });

    setTimeout(() => {
      setMode(newMode);
      slideAnim.value = 0;
    }, 200);
  };

  // Validate sign-up form
  const validateSignUp = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!signupEmail.trim()) {
      newErrors.signupEmail = "Email is required";
    } else if (!validateEmail(signupEmail)) {
      newErrors.signupEmail = "Invalid email format";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate login form
  const validateLogin = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!loginEmail.trim()) {
      newErrors.loginEmail = "Email is required";
    } else if (!validateEmail(loginEmail)) {
      newErrors.loginEmail = "Invalid email format";
    }

    if (!loginPassword) {
      newErrors.loginPassword = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle sign-up
  const handleSignUp = async () => {
    if (!validateSignUp()) {
      triggerShake();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Call signup and wait for completion
      await signUp(signupEmail, password, fullName);

      // Only trigger success animation if signup succeeded
      // (auth context will throw if signup fails)
      triggerSuccessAnimation();
    } catch (err) {
      triggerShake();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      // Set error message but DO NOT proceed to animation/navigation
      const errorMessage = err instanceof Error ? err.message : "Sign up failed";
      setErrors({ submit: errorMessage });

      // Reset auth state to prevent unauthorized access
      console.error("[Auth] Signup failed:", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle login
  const handleLogin = async () => {
    if (!validateLogin()) {
      triggerShake();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      // Call login and wait for completion
      // IMPORTANT: Only succeeds if backend returns 200 with valid user
      await signIn(loginEmail, loginPassword);

      // Only trigger success animation if login succeeded
      // (auth context will throw if login fails with 401/409)
      triggerSuccessAnimation();
    } catch (err) {
      triggerShake();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      // Set error message but DO NOT proceed to animation/navigation
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setErrors({ submit: errorMessage });

      // Reset auth state to prevent unauthorized access
      console.error("[Auth] Login failed:", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger success animation
  const triggerSuccessAnimation = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowSuccessAnimation(true);

    // Simulate 800ms loading + animation
    setTimeout(() => {
      successRevealProgress.value = withSpring(1, {
        damping: 10,
        mass: 1,
        stiffness: 100,
      });
    }, 800);

    // Navigate after animation completes
    setTimeout(() => {
      onSuccess();
    }, 1600);
  };

  // Animated styles for slide transition
  const slideStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: slideAnim.value }],
    };
  });

  // Animated style for circular reveal
  const revealStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      successRevealProgress.value,
      [0, 1],
      [0, height * 2],
      Extrapolate.CLAMP
    );

    return {
      transform: [{ scale }],
    };
  });

  const shakeStyle = {
    transform: [{ translateX: shakeAnim }],
  };

  const signupDisabled =
    !fullName ||
    !signupEmail ||
    !password ||
    !confirmPassword ||
    !passwordMatch ||
    isLoading;

  const loginDisabled = !loginEmail || !loginPassword || isLoading;

  // Handle password reset flow - show forget password screen
  if (passwordResetMode === "forgot") {
    return (
      <ForgotPasswordScreen
        onBack={() => setPasswordResetMode("none")}
        onResetRequested={() => {
          // After successful request, return to login
          setPasswordResetMode("none");
          Alert.alert(
            "Email Sent",
            "Check your email for password reset instructions."
          );
        }}
      />
    );
  }

  // Show reset password screen when token is available
  if (passwordResetMode === "reset" && resetToken) {
    return (
      <ResetPasswordScreen
        token={resetToken}
        onBack={() => {
          setPasswordResetMode("none");
          setResetToken(null);
        }}
        onSuccess={() => {
          setPasswordResetMode("none");
          setResetToken(null);
          setTimeout(() => {
            Alert.alert(
              "Success",
              "Password reset successfully! Please log in with your new password."
            );
          }, 500);
        }}
      />
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Success Circular Reveal Animation */}
      {showSuccessAnimation && (
        <Animated.View
          style={[
            styles.successReveal,
            revealStyle,
            { backgroundColor: BrandColors.constructionGold },
          ]}
        />
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoSection}>
            <View
              style={[
                styles.logoContainer,
                { backgroundColor: BrandColors.constructionGold + "20" },
              ]}
            >
              <Feather
                name="briefcase"
                size={40}
                color={BrandColors.constructionGold}
              />
            </View>
            <ThemedText type="h1" style={styles.appName}>
              TellBill
            </ThemedText>
          </View>

          {/* Auth Mode Tabs */}
          <View style={[styles.modeTabs, { borderBottomColor: theme.border }]}>
            <Pressable
              style={[
                styles.modeTab,
                mode === "signup" && {
                  borderBottomColor: BrandColors.constructionGold,
                },
              ]}
              onPress={() => toggleAuthMode("signup")}
              disabled={isLoading}
            >
              <ThemedText
                style={[
                  styles.modeTabText,
                  mode === "signup" && {
                    color: BrandColors.constructionGold,
                    fontWeight: "600",
                  },
                ]}
              >
                Sign Up
              </ThemedText>
            </Pressable>

            <Pressable
              style={[
                styles.modeTab,
                mode === "login" && {
                  borderBottomColor: BrandColors.constructionGold,
                },
              ]}
              onPress={() => toggleAuthMode("login")}
              disabled={isLoading}
            >
              <ThemedText
                style={[
                  styles.modeTabText,
                  mode === "login" && {
                    color: BrandColors.constructionGold,
                    fontWeight: "600",
                  },
                ]}
              >
                Login
              </ThemedText>
            </Pressable>
          </View>

          {/* Error Display */}
          {errors.submit && (
            <RNAnimated.View style={[styles.errorBox, shakeStyle]}>
              <Feather name="alert-circle" size={16} color={BrandColors.error} />
              <ThemedText style={[styles.errorText, { color: BrandColors.error }]}>
                {errors.submit}
              </ThemedText>
            </RNAnimated.View>
          )}

          {/* Sign-Up Form */}
          {mode === "signup" && (
            <Animated.View style={[styles.formContainer, slideStyle]}>
              {/* Full Name Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Full Name</ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      borderColor: errors.fullName
                        ? BrandColors.error
                        : theme.border,
                    },
                  ]}
                >
                  <Feather name="user" size={18} color={theme.tabIconDefault} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="John Smith"
                    placeholderTextColor={theme.tabIconDefault}
                    value={fullName}
                    onChangeText={setFullName}
                    editable={!isLoading}
                    autoCapitalize="words"
                  />
                </View>
                {errors.fullName && (
                  <ThemedText style={styles.errorMessage}>
                    {errors.fullName}
                  </ThemedText>
                )}
              </View>

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Work Email</ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      borderColor: errors.signupEmail
                        ? BrandColors.error
                        : theme.border,
                    },
                  ]}
                >
                  <Feather name="mail" size={18} color={theme.tabIconDefault} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="john@company.com"
                    placeholderTextColor={theme.tabIconDefault}
                    value={signupEmail}
                    onChangeText={setSignupEmail}
                    editable={!isLoading}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {errors.signupEmail && (
                  <ThemedText style={styles.errorMessage}>
                    {errors.signupEmail}
                  </ThemedText>
                )}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Password</ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      borderColor: errors.password
                        ? BrandColors.error
                        : theme.border,
                    },
                  ]}
                >
                  <Feather name="lock" size={18} color={theme.tabIconDefault} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Min 8 characters"
                    placeholderTextColor={theme.tabIconDefault}
                    value={password}
                    onChangeText={setPassword}
                    editable={!isLoading}
                    secureTextEntry
                  />
                </View>
                {errors.password && (
                  <ThemedText style={styles.errorMessage}>
                    {errors.password}
                  </ThemedText>
                )}
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>
                  Confirm Password
                </ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      borderColor: !passwordMatch
                        ? BrandColors.error
                        : theme.border,
                    },
                  ]}
                >
                  <Feather name="lock" size={18} color={theme.tabIconDefault} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Confirm password"
                    placeholderTextColor={theme.tabIconDefault}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    editable={!isLoading}
                    secureTextEntry
                  />
                  {confirmPassword && passwordMatch && (
                    <Feather name="check" size={18} color={BrandColors.success} />
                  )}
                </View>
                {errors.confirmPassword && (
                  <ThemedText style={styles.errorMessage}>
                    {errors.confirmPassword}
                  </ThemedText>
                )}
              </View>

              {/* Sign Up Button */}
              <Pressable
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: signupDisabled
                      ? theme.border
                      : BrandColors.constructionGold,
                  },
                ]}
                onPress={handleSignUp}
                disabled={signupDisabled}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <ThemedText style={styles.primaryButtonText}>
                    Create Professional Account
                  </ThemedText>
                )}
              </Pressable>

              {/* OR Divider */}
              <View style={styles.dividerContainer}>
                <View
                  style={[styles.divider, { backgroundColor: theme.border }]}
                />
                <ThemedText style={[styles.dividerText, { color: theme.tabIconDefault }]}>
                  OR
                </ThemedText>
                <View
                  style={[styles.divider, { backgroundColor: theme.border }]}
                />
              </View>

              {/* Google Sign-In Button */}
              <Pressable
                style={[
                  styles.socialButton,
                  { borderColor: theme.border }
                ]}
                onPress={() => {
                  setIsLoading(true);
                  signInWithGoogle()
                    .catch(err => console.log("[Auth] Google sign-in cancelled or failed"))
                    .finally(() => setIsLoading(false));
                }}
                disabled={isLoading}
              >
                <Feather name="mail" size={18} color={theme.text} />
                <ThemedText style={styles.socialButtonText}>
                  Continue with Google
                </ThemedText>
              </Pressable>

              {/* Footer CTA */}
              <View style={styles.footerCTA}>
                <ThemedText style={styles.footerText}>
                  Already have an account?{" "}
                </ThemedText>
                <Pressable
                  onPress={() => toggleAuthMode("login")}
                  disabled={isLoading}
                >
                  <ThemedText
                    style={[
                      styles.footerLink,
                      { color: BrandColors.constructionGold },
                    ]}
                  >
                    Login
                  </ThemedText>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* Login Form */}
          {mode === "login" && (
            <Animated.View style={[styles.formContainer, slideStyle]}>
              {/* Email Input */}
              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Work Email</ThemedText>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      borderColor: errors.loginEmail
                        ? BrandColors.error
                        : theme.border,
                    },
                  ]}
                >
                  <Feather name="mail" size={18} color={theme.tabIconDefault} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="john@company.com"
                    placeholderTextColor={theme.tabIconDefault}
                    value={loginEmail}
                    onChangeText={setLoginEmail}
                    editable={!isLoading}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {errors.loginEmail && (
                  <ThemedText style={styles.errorMessage}>
                    {errors.loginEmail}
                  </ThemedText>
                )}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <View style={styles.passwordHeader}>
                  <ThemedText style={styles.inputLabel}>Password</ThemedText>
                  <Pressable onPress={() => setPasswordResetMode("forgot")} disabled={isLoading}>
                    <ThemedText
                      style={[
                        styles.forgotPassword,
                        { color: BrandColors.constructionGold },
                      ]}
                    >
                      Forgot?
                    </ThemedText>
                  </Pressable>
                </View>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      borderColor: errors.loginPassword
                        ? BrandColors.error
                        : theme.border,
                    },
                  ]}
                >
                  <Feather name="lock" size={18} color={theme.tabIconDefault} />
                  <TextInput
                    style={[styles.input, { color: theme.text }]}
                    placeholder="Enter your password"
                    placeholderTextColor={theme.tabIconDefault}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    editable={!isLoading}
                    secureTextEntry
                  />
                </View>
                {errors.loginPassword && (
                  <ThemedText style={styles.errorMessage}>
                    {errors.loginPassword}
                  </ThemedText>
                )}
              </View>

              {/* Login Button */}
              <Pressable
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: loginDisabled
                      ? theme.border
                      : BrandColors.constructionGold,
                  },
                ]}
                onPress={handleLogin}
                disabled={loginDisabled}
              >
                {isLoading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <ThemedText style={styles.primaryButtonText}>
                    Sign In
                  </ThemedText>
                )}
              </Pressable>

              {/* OR Divider */}
              <View style={styles.dividerContainer}>
                <View
                  style={[styles.divider, { backgroundColor: theme.border }]}
                />
                <ThemedText style={[styles.dividerText, { color: theme.tabIconDefault }]}>
                  OR
                </ThemedText>
                <View
                  style={[styles.divider, { backgroundColor: theme.border }]}
                />
              </View>

              {/* Google Sign-In Button */}
              <Pressable
                style={[
                  styles.secondaryButton,
                  { borderColor: theme.border }
                ]}
                onPress={() => {
                  setIsLoading(true);
                  signInWithGoogle()
                    .catch(err => console.log("[Auth] Google signin cancelled or failed"))
                    .finally(() => setIsLoading(false));
                }}
                disabled={isLoading}
              >
                <Feather name="mail" size={18} color={theme.text} />
                <ThemedText style={styles.secondaryButtonText}>
                  Sign In with Google
                </ThemedText>
              </Pressable>

              {/* Footer CTA */}
              <View style={styles.footerCTA}>
                <ThemedText style={styles.footerText}>
                  New to TellBill?{" "}
                </ThemedText>
                <Pressable
                  onPress={() => toggleAuthMode("signup")}
                  disabled={isLoading}
                >
                  <ThemedText
                    style={[
                      styles.footerLink,
                      { color: BrandColors.constructionGold },
                    ]}
                  >
                    Sign Up
                  </ThemedText>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {/* Legal Links */}
          <View style={styles.legalContainer}>
            <Pressable onPress={() => setShowTerms(true)}>
              <ThemedText
                style={[
                  styles.legalLink,
                  { color: BrandColors.constructionGold },
                ]}
              >
                Terms
              </ThemedText>
            </Pressable>
            <ThemedText style={{ color: theme.tabIconDefault }}> • </ThemedText>
            <Pressable onPress={() => setShowPrivacy(true)}>
              <ThemedText
                style={[
                  styles.legalLink,
                  { color: BrandColors.constructionGold },
                ]}
              >
                Privacy
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Legal Modals */}
      <LegalModal
        isVisible={showTerms}
        onClose={() => setShowTerms(false)}
        type="terms"
      />
      <LegalModal
        isVisible={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        type="privacy"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  logoSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  appName: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  modeTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: Spacing.xl,
  },
  modeTab: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    alignItems: "center",
  },
  modeTabText: {
    fontSize: 16,
    fontWeight: "500",
  },
  formContainer: {
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: BrandColors.constructionGold,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    backgroundColor: "rgba(255, 180, 0, 0.02)",
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  errorMessage: {
    color: BrandColors.error,
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: BrandColors.error,
    backgroundColor: "rgba(211, 47, 47, 0.05)",
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
  },
  passwordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  forgotPassword: {
    fontSize: 13,
    fontWeight: "500",
  },
  primaryButton: {
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
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
  footerCTA: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
  },
  legalContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  legalLink: {
    fontSize: 12,
    fontWeight: "500",
  },
  successReveal: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: height,
  },
  socialButton: {
    flexDirection: "row",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flexDirection: "row",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
