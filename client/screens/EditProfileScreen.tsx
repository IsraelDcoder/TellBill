import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useProfileStore } from "@/stores/profileStore";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const { userProfile, setUserProfile } = useProfileStore();

  const [firstName, setFirstName] = useState(userProfile.firstName || user?.name?.split(" ")[0] || "");
  const [lastName, setLastName] = useState(userProfile.lastName || user?.name?.split(" ").slice(1).join(" ") || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(userProfile.phoneNumber || "");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSaveProfile = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      Alert.alert("Required Fields", "Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      // Save to store
      setUserProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
      });

      // TODO: Send update to backend/Supabase
      console.log("Saving profile:", { firstName, lastName, email, phoneNumber });

      setShowSuccess(true);
      
      // Auto-hide success and navigate back
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error) {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyle = (isDark: boolean) => ({
    backgroundColor: isDark ? theme.backgroundSecondary : theme.backgroundDefault,
    color: theme.text,
    borderColor: theme.border,
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xs,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <GlassCard style={styles.profileHeader}>
        <View
          style={[
            styles.avatar,
            { backgroundColor: `${BrandColors.constructionGold}20` },
          ]}
        >
          <ThemedText type="h1" style={{ color: BrandColors.constructionGold }}>
            {(firstName[0] || "U").toUpperCase()}
          </ThemedText>
        </View>
        <Pressable style={styles.changePhotoButton}>
          <Feather name="camera" size={16} color={theme.text} />
          <ThemedText type="small" style={{ marginLeft: Spacing.xs }}>
            Change Photo
          </ThemedText>
        </Pressable>
      </GlassCard>

      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Personal Information
        </ThemedText>

        <GlassCard>
          <View style={styles.formGroup}>
            <ThemedText type="small" style={styles.label}>
              First Name *
            </ThemedText>
            <TextInput
              style={[styles.input, inputStyle(isDark)]}
              placeholder="First Name"
              placeholderTextColor={theme.textSecondary}
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText type="small" style={styles.label}>
              Last Name *
            </ThemedText>
            <TextInput
              style={[styles.input, inputStyle(isDark)]}
              placeholder="Last Name"
              placeholderTextColor={theme.textSecondary}
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText type="small" style={styles.label}>
              Email Address *
            </ThemedText>
            <TextInput
              style={[styles.input, inputStyle(isDark)]}
              placeholder="Email Address"
              placeholderTextColor={theme.textSecondary}
              value={email}
              onChangeText={setEmail}
              editable={false}
              keyboardType="email-address"
            />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
              Email cannot be changed. Contact support to update.
            </ThemedText>
          </View>

          <View style={styles.formGroup}>
            <ThemedText type="small" style={styles.label}>
              Phone Number
            </ThemedText>
            <TextInput
              style={[styles.input, inputStyle(isDark)]}
              placeholder="Phone Number"
              placeholderTextColor={theme.textSecondary}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
            />
          </View>

          {showSuccess && (
            <View style={[styles.successMessage, { backgroundColor: `${BrandColors.constructionGold}20` }]}>
              <Feather name="check-circle" size={18} color={BrandColors.constructionGold} />
              <ThemedText type="small" style={{ color: BrandColors.constructionGold, marginLeft: Spacing.sm }}>
                Changes saved successfully!
              </ThemedText>
            </View>
          )}

          <Button
            onPress={handleSaveProfile}
            disabled={isLoading || showSuccess}
            style={{ marginTop: showSuccess ? Spacing.md : Spacing.lg }}
          >
            {isLoading ? "Saving..." : showSuccess ? "Saved!" : "Save Changes"}
          </Button>
        </GlassCard>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  changePhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
    fontWeight: "700",
  },
  formGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    marginBottom: Spacing.sm,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
  },
  successMessage: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
});
