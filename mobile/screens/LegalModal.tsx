import React from "react";
import {
  StyleSheet,
  View,
  Modal,
  ScrollView,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";

interface LegalModalProps {
  isVisible: boolean;
  onClose: () => void;
  type: "terms" | "privacy";
}

export function LegalModal({ isVisible, onClose, type }: LegalModalProps) {
  const { theme } = useTheme();

  const isTerms = type === "terms";
  const title = isTerms ? "Terms of Service" : "Privacy Policy";

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <ThemedView style={styles.container}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { borderBottomColor: theme.border },
          ]}
        >
          <ThemedText type="h2">{title}</ThemedText>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        {/* Content */}
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
        >
          {isTerms ? (
            <>
              <Section
                title="1. Acceptance of Terms"
                content="By accessing and using TellBill, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service."
              />
              <Section
                title="2. Use License"
                content="Permission is granted to temporarily download one copy of the materials (information or software) on TellBill for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:"
                points={[
                  "Modify or copy the materials",
                  "Use the materials for any commercial purpose or for any public display",
                  "Attempt to decompile or reverse engineer any software contained on TellBill",
                  "Remove any copyright or other proprietary notations from the materials",
                  "Transfer the materials to another person or 'mirror' the materials on any other server",
                ]}
              />
              <Section
                title="3. Disclaimer"
                content="The materials on TellBill are provided on an 'as is' basis. TellBill makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights."
              />
              <Section
                title="4. Limitations"
                content="In no event shall TellBill or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on TellBill."
              />
              <Section
                title="5. Accuracy of Materials"
                content="The materials appearing on TellBill could include technical, typographical, or photographic errors. TellBill does not warrant that any of the materials on our website are accurate, complete, or current. TellBill may make changes to the materials contained on our website at any time without notice."
              />
            </>
          ) : (
            <>
              <Section
                title="1. Information We Collect"
                content="We collect information you provide directly, such as when you create an account, including your name, email address, and company information. We also collect information about your use of TellBill, including invoices, projects, and team data."
              />
              <Section
                title="2. How We Use Your Information"
                content="We use the information we collect to operate and improve TellBill, process transactions, send administrative information and support, and comply with legal obligations."
              />
              <Section
                title="3. Data Security"
                content="We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the internet or electronic storage is completely secure."
              />
              <Section
                title="4. Your Rights"
                content="You have the right to access, correct, and delete your personal information. You can manage your preferences and privacy settings in your account. You may also request to not receive promotional communications from us."
              />
              <Section
                title="5. Third-Party Services"
                content="TellBill may integrate with third-party services such as payment processors and cloud storage providers. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies."
              />
              <Section
                title="6. Changes to This Policy"
                content="We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on our website and updating the 'effective date' at the top of this policy."
              />
            </>
          )}
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

function Section({
  title,
  content,
  points,
}: {
  title: string;
  content: string;
  points?: string[];
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText type="h3" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <ThemedText
        style={[styles.sectionContent, { color: theme.tabIconDefault }]}
      >
        {content}
      </ThemedText>
      {points && (
        <View style={styles.pointsList}>
          {points.map((point, idx) => (
            <View key={idx} style={styles.point}>
              <ThemedText
                style={[
                  styles.pointBullet,
                  { color: BrandColors.constructionGold },
                ]}
              >
                •
              </ThemedText>
              <ThemedText
                style={[styles.pointText, { color: theme.tabIconDefault }]}
              >
                {point}
              </ThemedText>
            </View>
          ))}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: Spacing.sm,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    paddingBottom: Spacing["2xl"],
  },
  section: {
    marginBottom: Spacing["2xl"],
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    color: BrandColors.constructionGold,
  },
  sectionContent: {
    lineHeight: 22,
    marginBottom: Spacing.md,
    fontSize: 14,
  },
  pointsList: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  point: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  pointBullet: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: -2,
  },
  pointText: {
    flex: 1,
    lineHeight: 20,
    fontSize: 14,
  },
});
