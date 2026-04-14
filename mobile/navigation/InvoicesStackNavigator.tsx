import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import InvoicesScreen from "@/screens/InvoicesScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type InvoicesStackParamList = {
  Invoices: undefined;
};

const Stack = createNativeStackNavigator<InvoicesStackParamList>();

export default function InvoicesStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Invoices"
        component={InvoicesScreen}
        options={{
          headerTitle: "Invoices",
        }}
      />
    </Stack.Navigator>
  );
}
