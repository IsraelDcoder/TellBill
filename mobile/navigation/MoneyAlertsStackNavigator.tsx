import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import MoneyAlertsScreen from "@/screens/MoneyAlertsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type MoneyAlertsStackParamList = {
  MoneyAlerts: undefined;
};

const Stack = createNativeStackNavigator<MoneyAlertsStackParamList>();

export default function MoneyAlertsStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="MoneyAlerts"
        component={MoneyAlertsScreen}
        options={{
          headerTitle: "Money Alerts",
        }}
      />
    </Stack.Navigator>
  );
}
