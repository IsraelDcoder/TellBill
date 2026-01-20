import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Linking,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface ContactOption {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  action: () => void;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    id: "1",
    question: "How do I create an invoice?",
    answer:
      "You can create an invoice by either using the voice recording feature to dictate the invoice details, or manually entering the information. Click the '+' button on the Invoices screen to get started.",
  },
  {
    id: "2",
    question: "Can I use voice recording on the free plan?",
    answer:
      "Yes! The free plan includes 3 free voice recordings. For unlimited recording and invoicing, upgrade to the Solo plan or higher.",
  },
  {
    id: "3",
    question: "How do I manage my team?",
    answer:
      "Team management is available on the Team and Enterprise plans. Navigate to the Teams section to invite team members and manage roles and permissions.",
  },
  {
    id: "4",
    question: "How can I export my invoices?",
    answer:
      "You can export invoices as PDF from the invoice detail screen. Solo plan and above have access to PDF export functionality.",
  },
  {
    id: "5",
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment processor. Payments are billed monthly or annually based on your subscription choice.",
  },
  {
    id: "6",
    question: "Can I cancel my subscription anytime?",
    answer:
      "Yes! You can cancel your subscription at any time from the Billing & Subscription page. Your access will continue until the end of your current billing period.",
  },
];

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [messageSubject, setMessageSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");

  const contactOptions: ContactOption[] = [
    {
      id: "email",
      icon: "mail",
      title: "Email Support",
      description: "Get help via email within 24 hours",
      action: () => {
        Linking.openURL("mailto:tellbill021@gmail.com?subject=Support Request");
      },
    },
    {
      id: "chat",
      icon: "message-circle",
      title: "Live Chat",
      description: "Chat with our team on WhatsApp",
      action: () => {
        // WhatsApp URL scheme: whatsapp://send?phone=PHONENUMBER
        Linking.openURL("whatsapp://send?phone=2348106856487").catch(() => {
          // Fallback if WhatsApp not installed
          Linking.openURL("https://wa.me/2348106856487");
        });
      },
    },
    {
      id: "phone",
      icon: "phone",
      title: "Phone Support",
      description: "Call us directly",
      action: () => {
        Linking.openURL("tel:+2348149360574");
      },
    },
  ];

  const handleSendMessage = () => {
    if (!messageSubject.trim() || !messageBody.trim()) {
      alert("Please fill in both subject and message");
      return;
    }

    const emailBody = `Subject: ${messageSubject}\n\n${messageBody}`;
    Linking.openURL(`mailto:tellbill021@gmail.com?subject=${encodeURIComponent(messageSubject)}&body=${encodeURIComponent(messageBody)}`);
    
    setMessageSubject("");
    setMessageBody("");
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.lg,
        paddingBottom: insets.bottom + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Contact Options */}
      <View style={styles.section}>
        <ThemedText type="h2" style={styles.sectionTitle}>
          Get in Touch
        </ThemedText>
        <View style={styles.contactGrid}>
          {contactOptions.map((option) => (
            <Pressable
              key={option.id}
              onPress={option.action}
              style={({ pressed }) => [
                styles.contactCard,
                {
                  backgroundColor: isDark
                    ? theme.backgroundDefault
                    : theme.backgroundSecondary,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.contactIconContainer,
                  { backgroundColor: `${BrandColors.constructionGold}15` },
                ]}
              >
                <Feather
                  name={option.icon}
                  size={24}
                  color={BrandColors.constructionGold}
                />
              </View>
              <ThemedText type="h4" style={styles.contactTitle}>
                {option.title}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {option.description}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Quick Message */}
      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Send us a Message
        </ThemedText>
        <GlassCard>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark
                  ? theme.backgroundSecondary
                  : theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Subject"
            placeholderTextColor={theme.textSecondary}
            value={messageSubject}
            onChangeText={setMessageSubject}
            multiline={false}
          />
          <TextInput
            style={[
              styles.input,
              styles.messageInput,
              {
                backgroundColor: isDark
                  ? theme.backgroundSecondary
                  : theme.backgroundDefault,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            placeholder="Your message..."
            placeholderTextColor={theme.textSecondary}
            value={messageBody}
            onChangeText={setMessageBody}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Button onPress={handleSendMessage}>Send Message</Button>
        </GlassCard>
      </View>

      {/* FAQ Section */}
      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Frequently Asked Questions
        </ThemedText>
        <View
          style={[
            styles.faqContainer,
            {
              backgroundColor: isDark
                ? theme.backgroundDefault
                : theme.backgroundSecondary,
            },
          ]}
        >
          {FAQ_ITEMS.map((item, index) => (
            <View
              key={item.id}
              style={[
                styles.faqItem,
                index < FAQ_ITEMS.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.border,
                },
              ]}
            >
              <Pressable
                onPress={() =>
                  setExpandedFAQ(expandedFAQ === item.id ? null : item.id)
                }
                style={styles.faqQuestion}
              >
                <ThemedText type="body" style={{ flex: 1, fontWeight: "600" }}>
                  {item.question}
                </ThemedText>
                <Feather
                  name={expandedFAQ === item.id ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={BrandColors.constructionGold}
                  style={{ marginLeft: Spacing.md }}
                />
              </Pressable>

              {expandedFAQ === item.id && (
                <ThemedText
                  type="small"
                  style={[styles.faqAnswer, { color: theme.textSecondary }]}
                >
                  {item.answer}
                </ThemedText>
              )}
            </View>
          ))}
        </View>
      </View>

      {/* Resources */}
      <View style={styles.section}>
        <ThemedText type="h3" style={styles.sectionTitle}>
          Resources
        </ThemedText>
        <View
          style={[
            styles.resourcesContainer,
            {
              backgroundColor: isDark
                ? theme.backgroundDefault
                : theme.backgroundSecondary,
              borderColor: theme.border,
            },
          ]}
        >
          <Pressable
            onPress={() => Linking.openURL("https://docs.tellbill.app")}
            style={styles.resourceLink}
          >
            <View style={styles.resourceIconContainer}>
              <Feather name="book" size={18} color={BrandColors.constructionGold} />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Documentation
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Complete guides and tutorials
              </ThemedText>
            </View>
            <Feather name="arrow-right" size={18} color={theme.textSecondary} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <Pressable
            onPress={() => Linking.openURL("https://status.tellbill.app")}
            style={styles.resourceLink}
          >
            <View style={styles.resourceIconContainer}>
              <Feather
                name="activity"
                size={18}
                color={BrandColors.constructionGold}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                System Status
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Check service availability
              </ThemedText>
            </View>
            <Feather name="arrow-right" size={18} color={theme.textSecondary} />
          </Pressable>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <Pressable
            onPress={() => Linking.openURL("https://community.tellbill.app")}
            style={styles.resourceLink}
          >
            <View style={styles.resourceIconContainer}>
              <Feather
                name="users"
                size={18}
                color={BrandColors.constructionGold}
              />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Community Forum
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                Connect with other users
              </ThemedText>
            </View>
            <Feather name="arrow-right" size={18} color={theme.textSecondary} />
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.lg,
    fontWeight: "700",
  },
  contactGrid: {
    gap: Spacing.md,
  },
  contactCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  contactIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  contactTitle: {
    marginBottom: Spacing.xs,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    fontSize: 14,
  },
  messageInput: {
    height: 120,
  },
  faqContainer: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  faqItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  faqQuestion: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  faqAnswer: {
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  resourcesContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  resourceLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  resourceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: `${BrandColors.constructionGold}10`,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
});
