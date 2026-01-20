import React, { useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View } from "react-native";

import ProjectsScreen from "@/screens/ProjectsScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useSubscriptionStore } from "@/stores/subscriptionStore";
import { LockedFeatureOverlay } from "@/components/LockedFeatureOverlay";

export type ProjectsStackParamList = {
  Projects: undefined;
};

const Stack = createNativeStackNavigator<ProjectsStackParamList>();

export default function ProjectsStackNavigator({ navigation }: any) {
  const screenOptions = useScreenOptions();
  const { currentPlan } = useSubscriptionStore();

  // Strict guard: Only paid users can access projects
  const isRestricted = currentPlan === "free";

  useEffect(() => {
    if (isRestricted) {
      navigation.navigate("Pricing", {
        returnTo: "Projects",
        message: "Unlock project management with any paid plan.",
      });
    }
  }, [isRestricted, navigation]);

  // While restricted, show locked overlay
  if (isRestricted) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <LockedFeatureOverlay
          title="Projects"
          subtitle="Manage and track all your construction projects"
          onUnlock={() =>
            navigation.navigate("Pricing", {
              returnTo: "Projects",
              message: "Unlock project management with any paid plan.",
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
        name="Projects"
        component={ProjectsScreen}
        options={{
          headerTitle: "Projects",
        }}
      />
    </Stack.Navigator>
  );
}
