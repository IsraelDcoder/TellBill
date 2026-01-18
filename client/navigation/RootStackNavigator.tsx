import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import VoiceRecordingScreen from "@/screens/VoiceRecordingScreen";
import TranscriptReviewScreen from "@/screens/TranscriptReviewScreen";
import InvoiceDraftScreen from "@/screens/InvoiceDraftScreen";
import InvoicePreviewScreen from "@/screens/InvoicePreviewScreen";
import SendInvoiceScreen from "@/screens/SendInvoiceScreen";
import InvoiceDetailScreen from "@/screens/InvoiceDetailScreen";
import ProjectDetailScreen from "@/screens/ProjectDetailScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import BillingScreen from "@/screens/BillingScreen";
import ComingSoonScreen from "@/screens/ComingSoonScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Main: undefined;
  VoiceRecording: undefined;
  TranscriptReview: { transcript?: string };
  InvoiceDraft: { invoiceData?: any };
  InvoicePreview: { invoiceId: string };
  SendInvoice: { invoiceId: string };
  InvoiceDetail: { invoiceId: string };
  ProjectDetail: { projectId: string };
  Settings: undefined;
  Billing: undefined;
  ComingSoon: { feature: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VoiceRecording"
        component={VoiceRecordingScreen}
        options={{
          headerTitle: "Record Job Details",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="TranscriptReview"
        component={TranscriptReviewScreen}
        options={{
          headerTitle: "Review & Edit",
        }}
      />
      <Stack.Screen
        name="InvoiceDraft"
        component={InvoiceDraftScreen}
        options={{
          headerTitle: "Invoice Preview",
        }}
      />
      <Stack.Screen
        name="InvoicePreview"
        component={InvoicePreviewScreen}
        options={{
          headerTitle: "PDF Preview",
        }}
      />
      <Stack.Screen
        name="SendInvoice"
        component={SendInvoiceScreen}
        options={{
          headerTitle: "Send Invoice",
        }}
      />
      <Stack.Screen
        name="InvoiceDetail"
        component={InvoiceDetailScreen}
        options={{
          headerTitle: "Invoice Details",
        }}
      />
      <Stack.Screen
        name="ProjectDetail"
        component={ProjectDetailScreen}
        options={{
          headerTitle: "Project Details",
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerTitle: "Settings",
        }}
      />
      <Stack.Screen
        name="Billing"
        component={BillingScreen}
        options={{
          headerTitle: "Billing",
        }}
      />
      <Stack.Screen
        name="ComingSoon"
        component={ComingSoonScreen}
        options={{
          headerTitle: "Coming Soon",
          presentation: "modal",
        }}
      />
    </Stack.Navigator>
  );
}
