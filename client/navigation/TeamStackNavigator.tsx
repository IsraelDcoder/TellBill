import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View } from "react-native";

import TeamScreen from "@/screens/TeamScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { LockedFeatureOverlay } from "@/components/LockedFeatureOverlay";

export type TeamStackParamList = {
  Team: undefined;
};

const Stack = createNativeStackNavigator<TeamStackParamList>();

export default function TeamStackNavigator({ navigation }: any) {
  const screenOptions = useScreenOptions();
  const { currentPlan } = useSubscriptionStore();

  // Strict guard: Only team and enterprise users can access team management
  const isRestricted = currentPlan === "free" || currentPlan === "solo";

  useEffect(() => {
    if (isRestricted) {
      navigation.navigate("Pricing", {
        returnTo: "Team",
        message: "Team management is available on Team & Enterprise plans.",
      });
    }
  }, [isRestricted, navigation]);

  // While restricted, show locked overlay
  if (isRestricted) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <LockedFeatureOverlay
          title="Team"
          subtitle="Collaborate with your team members and manage permissions"
          onUnlock={() =>
            navigation.navigate("Pricing", {
              returnTo: "Team",
              message: "Team management is available on Team & Enterprise plans.",
            })
          }
          isVisible={true}
        />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Team"
        component={TeamScreen}
        options={{
          headerTitle: "Team",
        }}
      />
    </Stack.Navigator>
  );
}
