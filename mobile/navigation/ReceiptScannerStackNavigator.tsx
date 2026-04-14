import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useScreenOptions } from "@/hooks/useScreenOptions";
import ReceiptScannerScreen from "@/screens/ReceiptScannerScreen";

export type ReceiptScannerStackParamList = {
  ReceiptScanner: undefined;
};

const Stack = createNativeStackNavigator<ReceiptScannerStackParamList>();

export default function ReceiptScannerStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="ReceiptScanner"
        component={ReceiptScannerScreen}
        options={{
          headerTitle: "Receipt Scanner",
        }}
      />
    </Stack.Navigator>
  );
}
