import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import ProjectsListScreen from "@/screens/ProjectsListScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type ProjectsStackParamList = {
  ProjectsList: undefined;
};

const Stack = createNativeStackNavigator<ProjectsStackParamList>();

export default function ProjectsStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="ProjectsList"
        component={ProjectsListScreen}
        options={{
          headerTitle: "Projects",
        }}
      />
    </Stack.Navigator>
  );
}
