import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { GlassCard } from "@/components/GlassCard";
import { SendInvoiceModal } from "@/components/SendInvoiceModal";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, BrandColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { useInvoiceStore } from "@/stores/invoiceStore";
import { formatCurrency } from "@/utils/formatCurrency";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type RouteProps = RouteProp<RootStackParamList, "SendInvoice">;

type SendMethod = "email" | "sms" | "whatsapp";

export default function SendInvoiceScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { getInvoice, updateInvoice } = useInvoiceStore();

  const invoice = getInvoice(route.params.invoiceId);

  const [sendMethod, setSendMethod] = useState<SendMethod>("email");
  const [includePaymentLink, setIncludePaymentLink] = useState(true);
  const [enableReminders, setEnableReminders] = useState(true);
  const [reminderSchedule, setReminderSchedule] = useState("3days");
  const [showSendModal, setShowSendModal] = useState(false);

  if (!invoice) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundRoot,
            paddingTop: headerHeight + Spacing.xl,
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ThemedText type="h3">Invoice not found</ThemedText>
      </View>
    );
  }



  const sendMethods: { id: SendMethod; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { id: "email", label: "Email", icon: "mail" },
    { id: "sms", label: "SMS", icon: "message-square" },
    { id: "whatsapp", label: "WhatsApp", icon: "message-circle" },
  ];

  const reminderOptions = [
    { id: "24h", label: "24 hours" },
    { id: "3days", label: "3 days" },
    { id: "7days", label: "7 days (+ late fee)" },
  ];

  const handleSend = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowSendModal(true);
  };

  const handleSendSuccess = () => {
    updateInvoice(invoice.id, {
      status: "sent",
      sentAt: new Date().toISOString(),
    });
    navigation.navigate("Main");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <SendInvoiceModal
        visible={showSendModal}
        method={sendMethod}
        invoiceId={invoice.id}
        clientName={invoice.clientName}
        invoiceNumber={invoice.invoiceNumber}
        total={invoice.total}
        onClose={() => setShowSendModal(false)}
        onSuccess={handleSendSuccess}
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.md,
          paddingBottom: Spacing["3xl"],
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <ThemedText type="h4">{invoice.clientName}</ThemedText>
            <ThemedText
              type="h3"
              style={{ color: BrandColors.constructionGold }}
            >
              {formatCurrency(invoice.total)}
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {invoice.invoiceNumber}
          </ThemedText>
        </GlassCard>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Send via
          </ThemedText>
          <View style={styles.methodRow}>
            {sendMethods.map((method) => (
              <Pressable
                key={method.id}
                onPress={() => setSendMethod(method.id)}
                style={[
                  styles.methodButton,
                  {
                    backgroundColor:
                      sendMethod === method.id
                        ? BrandColors.constructionGold
                        : isDark
                          ? theme.backgroundDefault
                          : theme.backgroundSecondary,
                    borderColor:
                      sendMethod === method.id
                        ? BrandColors.constructionGold
                        : theme.border,
                  },
                ]}
              >
                <Feather
                  name={method.icon}
                  size={20}
                  color={
                    sendMethod === method.id
                      ? BrandColors.slateGrey
                      : theme.text
                  }
                />
                <ThemedText
                  type="small"
                  style={{
                    color:
                      sendMethod === method.id
                        ? BrandColors.slateGrey
                        : theme.text,
                    fontWeight: "600",
                  }}
                >
                  {method.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Payment Options
          </ThemedText>
          <View
            style={[
              styles.optionContainer,
              {
                backgroundColor: isDark
                  ? theme.backgroundDefault
                  : theme.backgroundSecondary,
              },
            ]}
          >
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <View style={styles.optionHeader}>
                  <Feather
                    name="credit-card"
                    size={18}
                    color={BrandColors.constructionGold}
                  />
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    Include Payment Link
                  </ThemedText>
                </View>
                <ThemedText
                  type="small"
                  style={{ color: theme.textSecondary, marginLeft: 26 }}
                >
                  Accept Credit Card, Apple Pay, ACH
                </ThemedText>
              </View>
              <Switch
                value={includePaymentLink}
                onValueChange={setIncludePaymentLink}
                trackColor={{
                  false: theme.border,
                  true: BrandColors.constructionGold,
                }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Auto Reminders
          </ThemedText>
          <View
            style={[
              styles.optionContainer,
              {
                backgroundColor: isDark
                  ? theme.backgroundDefault
                  : theme.backgroundSecondary,
              },
            ]}
          >
            <View style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <View style={styles.optionHeader}>
                  <Feather
                    name="bell"
                    size={18}
                    color={BrandColors.constructionGold}
                  />
                  <ThemedText type="body" style={{ fontWeight: "600" }}>
                    Enable Reminders
                  </ThemedText>
                </View>
                <ThemedText
                  type="small"
                  style={{ color: theme.textSecondary, marginLeft: 26 }}
                >
                  Automatically remind client if unpaid
                </ThemedText>
              </View>
              <Switch
                value={enableReminders}
                onValueChange={setEnableReminders}
                trackColor={{
                  false: theme.border,
                  true: BrandColors.constructionGold,
                }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {enableReminders ? (
            <View style={styles.reminderOptions}>
              {reminderOptions.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => setReminderSchedule(option.id)}
                  style={[
                    styles.reminderChip,
                    {
                      backgroundColor:
                        reminderSchedule === option.id
                          ? BrandColors.constructionGold
                          : isDark
                            ? theme.backgroundDefault
                            : theme.backgroundSecondary,
                      borderColor:
                        reminderSchedule === option.id
                          ? BrandColors.constructionGold
                          : theme.border,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{
                      color:
                        reminderSchedule === option.id
                          ? BrandColors.slateGrey
                          : theme.text,
                      fontWeight: "600",
                    }}
                  >
                    {option.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.backgroundRoot,
            paddingBottom: insets.bottom + Spacing.lg,
            borderTopColor: theme.border,
          },
        ]}
      >
        <Button onPress={handleSend}>
          <View style={styles.buttonContent}>
            <Feather name="send" size={18} color={BrandColors.slateGrey} />
            <ThemedText style={{ color: BrandColors.slateGrey, fontWeight: "600" }}>
              Send Invoice
            </ThemedText>
          </View>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    marginBottom: Spacing.xl,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  methodRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  methodButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  optionContainer: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  optionInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  reminderOptions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  reminderChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
});
