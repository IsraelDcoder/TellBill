import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import InventoryScreen from "@/screens/InventoryScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { BrandColors } from "@/constants/theme";

export type InventoryStackParamList = {
  InventoryMain: undefined;
};

const Stack = createNativeStackNavigator<InventoryStackParamList>();

export default function InventoryStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="InventoryMain"
        component={InventoryScreen}
        options={{
          title: "Inventory",
        }}
      />
    </Stack.Navigator>
  );
}
