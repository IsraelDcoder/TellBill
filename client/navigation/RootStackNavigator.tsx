import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "@/context/AuthContext";
import WelcomeScreen from "@/screens/WelcomeScreen";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import VoiceRecordingScreen from "@/screens/VoiceRecordingScreen";
import TranscriptReviewScreen from "@/screens/TranscriptReviewScreen";
import InvoiceDraftScreen from "@/screens/InvoiceDraftScreen";
import InvoicePreviewScreen from "@/screens/InvoicePreviewScreen";
import SendInvoiceScreen from "@/screens/SendInvoiceScreen";
import InvoiceDetailScreen from "@/screens/InvoiceDetailScreen";
import MaterialCostCaptureScreen from "@/screens/MaterialCostCaptureScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import BillingScreen from "@/screens/BillingScreen";
import HelpSupportScreen from "@/screens/HelpSupportScreen";
import EditProfileScreen from "@/screens/EditProfileScreen";
import CompanyInfoScreen from "@/screens/CompanyInfoScreen";
import ChangePasswordScreen from "@/screens/ChangePasswordScreen";
import ComingSoonScreen from "@/screens/ComingSoonScreen";
import PricingScreen from "@/screens/PricingScreen";
import CurrencyScreen from "@/screens/CurrencyScreen";
import TaxRateScreen from "@/screens/TaxRateScreen";
import InvoiceTemplateScreen from "@/screens/InvoiceTemplateScreen";
import TermsOfServiceScreen from "@/screens/TermsOfServiceScreen";
import PrivacyPolicyScreen from "@/screens/PrivacyPolicyScreen";
import PaymentSuccessScreen from "@/screens/PaymentSuccessScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { BrandColors } from "@/constants/theme";

export type RootStackParamList = {
  Welcome: undefined;
  Main: undefined;
  Pricing: { returnTo?: string; message?: string };
  VoiceRecording: undefined;
  TranscriptReview: { transcript?: string };
  InvoiceDraft: { invoiceData?: any };
  InvoicePreview: { invoiceId: string };
  SendInvoice: { invoiceId: string };
  InvoiceDetail: { invoiceId: string };
  MaterialCostCapture: undefined;
  Settings: undefined;
  EditProfile: undefined;
  CompanyInfo: undefined;
  ChangePassword: undefined;
  Billing: undefined;
  HelpSupport: undefined;
  Currency: undefined;
  TaxRate: undefined;
  InvoiceTemplate: undefined;
  TermsOfService: undefined;
  PrivacyPolicy: undefined;
  PaymentSuccess: { planId?: "solo" | "professional" | "enterprise" };
  ComingSoon: { feature: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!isAuthenticated ? (
        <Stack.Group screenOptions={{ headerShown: false }}>
          <Stack.Screen
            name="Welcome"
            component={WelcomeScreen}
          />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Pricing"
            component={PricingScreen}
            options={{
              headerTitle: "Choose Your Plan",
              presentation: "modal",
            }}
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
            name="MaterialCostCapture"
            component={MaterialCostCaptureScreen}
            options={{
              headerTitle: "Material Costs",
              presentation: "modal",
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
            name="HelpSupport"
            component={HelpSupportScreen}
            options={{
              headerTitle: "Help & Support",
            }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{
              headerTitle: "Edit Profile",
            }}
          />
          <Stack.Screen
            name="CompanyInfo"
            component={CompanyInfoScreen}
            options={{
              headerTitle: "Company Information",
            }}
          />
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
            options={{
              headerTitle: "Change Password",
            }}
          />
          <Stack.Screen
            name="Currency"
            component={CurrencyScreen}
            options={{
              headerTitle: "Select Currency",
            }}
          />
          <Stack.Screen
            name="TaxRate"
            component={TaxRateScreen}
            options={{
              headerTitle: "Default Tax Rate",
            }}
          />
          <Stack.Screen
            name="InvoiceTemplate"
            component={InvoiceTemplateScreen}
            options={{
              headerTitle: "Invoice Template",
            }}
          />
          <Stack.Screen
            name="TermsOfService"
            component={TermsOfServiceScreen}
            options={{
              headerTitle: "Terms of Service",
            }}
          />
          <Stack.Screen
            name="PrivacyPolicy"
            component={PrivacyPolicyScreen}
            options={{
              headerTitle: "Privacy Policy",
            }}
          />
          <Stack.Screen
            name="PaymentSuccess"
            component={PaymentSuccessScreen}
            options={{
              headerTitle: "Payment Successful",
              presentation: "modal",
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
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
