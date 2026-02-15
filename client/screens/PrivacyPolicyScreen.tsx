import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";

export default function PrivacyPolicyScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot, marginTop: headerHeight + 18 }]}
      contentContainerStyle={{
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <ThemedText type="h2" style={styles.title}>
          Privacy Policy
        </ThemedText>
        <ThemedText type="small" style={[styles.date, { color: theme.textSecondary }]}>
          Last updated: January 18, 2026
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            1. Introduction
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, lineHeight: 22 }}>
            TellBill ("we" or "us" or "our") operates the TellBill website. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            2. Information Collection and Use
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, lineHeight: 22 }}>
            We collect several different types of information for various purposes to provide and improve our Service to you.
          </ThemedText>
          <View style={styles.list}>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md, fontWeight: "600" }}>
              Personal Data:
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              • Email address
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              • First name and last name
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              • Phone number
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              • Address, State, Province, ZIP/Postal code, City
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              • Cookies and Usage Data
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            3. Use of Data
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, lineHeight: 22 }}>
            TellBill uses the collected data for various purposes:
          </ThemedText>
          <View style={styles.list}>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              • To provide and maintain the Service
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              • To notify you about changes to our Service
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              • To allow you to participate in interactive features of our Service
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              • To provide customer support
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              • To gather analysis or valuable information to improve the Service
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              • To monitor the usage of the Service
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            4. Security of Data
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, lineHeight: 22 }}>
            The security of your data is important to us but remember that no method of transmission over the Internet is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            5. Changes to This Privacy Policy
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, lineHeight: 22 }}>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date at the top of this Privacy Policy.
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            6. Contact Us
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, lineHeight: 22 }}>
            If you have any questions about this Privacy Policy, please contact us at:
          </ThemedText>
          <View style={styles.list}>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              • Email: tellbill021@gmail.com
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              • WhatsApp: +234 8106856487
            </ThemedText>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h3" style={styles.sectionTitle}>
            7. Your Rights
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.textSecondary, lineHeight: 22 }}>
            You have the right to:
          </ThemedText>
          <View style={styles.list}>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              • Access the personal data we hold about you
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              • Request correction of inaccurate data
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.md }}>
              • Request deletion of your data
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              • Opt-out of marketing communications
            </ThemedText>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  title: {
    marginBottom: Spacing.sm,
    fontWeight: "700",
  },
  date: {
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    fontWeight: "700",
  },
  list: {
    marginTop: Spacing.md,
    marginLeft: Spacing.lg,
  },
});
