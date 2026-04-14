import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
// useAuth removed - using AsyncStorage for token instead
import { getBackendUrl } from "@/lib/backendUrl";
import { ThemedText } from "@/components/ThemedText";
import { ScreenContainer } from "@/components/layout";
import { GlassCard } from "@/components/GlassCard";
import { Spacing, BrandColors } from "@/constants/theme";
import { ProfileStackParamList } from "@/navigation/ProfileStackNavigator";

type NavigationProp = NativeStackNavigationProp<
  ProfileStackParamList,
  "TemplatePickerScreen"
>;

interface Template {
  id: string;
  name: string;
  description: string;
  previewImage: string;
}

interface TemplatePickerScreenProps {
  navigation: NavigationProp;
}

export default function TemplatePickerScreen({ navigation }: TemplatePickerScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  // No backend logic for this visual mockup

  // Hardcoded templates for visual match
  const templates = [
    {
      id: "modern-clean",
      name: "Modern Clean",
      description: "Minimal layout with bold totals",
      previewImage: require("../assets/images/tellbill_app_icon.png"),
    },
    {
      id: "bold-blue",
      name: "Bold Blue",
      description: "Professional with a blue accent",
      previewImage: require("../assets/images/tellbill_app_icon.png"),
    },
  ];



  return (
    <ScreenContainer>
      <ScrollView
        style={{ flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: '#F8F9FB' }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={{ alignItems: "center", marginTop: Spacing.lg, marginBottom: Spacing.md }}>
          <ThemedText type="h2" style={{ fontSize: 28, fontWeight: "700", marginBottom: Spacing.sm }}>
            Choose Template
          </ThemedText>
          <ThemedText type="body" style={{ color: theme.colors.text, opacity: 0.7, fontSize: 16, marginBottom: Spacing.lg }}>
            Professional tier feature – Customize your invoice style
          </ThemedText>
        </View>

        {/* Info Card */}
        <View style={{ backgroundColor: '#FAFBFC', borderRadius: 16, padding: Spacing.lg, marginBottom: Spacing.xl, flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
          <Feather name="alert-circle" size={28} color={BrandColors.constructionGold} style={{ marginRight: Spacing.md }} />
          <View>
            <ThemedText type="body" style={{ fontWeight: "700", marginBottom: 2 }}>
              Templates are customizable
            </ThemedText>
            <ThemedText type="small" style={{ color: '#7A869A', lineHeight: 18 }}>
              After selecting, you can customize colors, fonts, and layout for each template via the Template Builder in settings.
            </ThemedText>
          </View>
        </View>

        {/* Templates Row */}
        <View style={{ flexDirection: "row", gap: Spacing.lg, justifyContent: "center", marginBottom: Spacing.xl }}>
          {templates.map((template) => (
            <View key={template.id} style={{ flex: 1, minWidth: 0, maxWidth: 340, backgroundColor: "#fff", borderRadius: 20, padding: Spacing.lg, shadowColor: BrandColors.slateGrey, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2, alignItems: "center" }}>
              <ThemedText style={{ fontWeight: "700", fontSize: 18, marginBottom: 2 }}>{template.name}</ThemedText>
              <ThemedText style={{ color: '#7A869A', fontSize: 14, marginBottom: Spacing.md }}>{template.description}</ThemedText>
              <Image source={template.previewImage} style={{ width: 260, height: 160, borderRadius: 12, marginBottom: Spacing.md, resizeMode: 'contain', backgroundColor: '#F6F7F9' }} />
              <TouchableOpacity
                style={{ backgroundColor: BrandColors.constructionGold, borderRadius: 24, paddingVertical: 12, paddingHorizontal: 28, marginTop: Spacing.md, width: '100%' }}
                onPress={() => navigation.navigate("TemplateBuilder", { templateId: template.id })}
                activeOpacity={0.85}
              >
                <ThemedText style={{ color: "white", fontWeight: "700", fontSize: 16, textAlign: "center" }}>
                  Select Template
                </ThemedText>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
