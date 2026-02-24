import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProfileScreen from "@/screens/ProfileScreen";
import ReferralScreen from "@/screens/ReferralScreen";
import TemplatePickerScreen from "@/screens/TemplatePickerScreen";
import TemplateBuilderScreen from "@/screens/TemplateBuilderScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ProfileStackParamList = {
  Profile: undefined;
  ReferralScreen: undefined;
  TemplatePickerScreen: undefined;
  TemplateBuilder: { templateId: string };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerTitle: "Profile",
        }}
      />
      <Stack.Screen
        name="ReferralScreen"
        component={ReferralScreen}
        options={{
          headerTitle: "Referral Program",
        }}
      />
      <Stack.Screen
        name="TemplatePickerScreen"
        component={TemplatePickerScreen}
        options={{
          headerTitle: "Invoice Templates",
        }}
      />
      <Stack.Screen
        name="TemplateBuilder"
        component={TemplateBuilderScreen}
        options={{
          headerTitle: "Template Builder",
        }}
      />
    </Stack.Navigator>
  );
}
