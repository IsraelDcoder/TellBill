import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
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
  baseTemplate: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  description: string;
  preview: {
    header: string;
    colors: {
      primary: string;
      accent: string;
      background: string;
      text: string;
    };
  };
}

interface TemplatePickerScreenProps {
  navigation: NavigationProp;
}

export default function TemplatePickerScreen({ navigation }: TemplatePickerScreenProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${getBackendUrl()}/api/templates/library/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error("Failed to fetch templates");
      const data = await response.json();
      setTemplates(data.templates);
      if (data.templates.length > 0) {
        setSelectedTemplate(data.templates[0].id);
      }
    } catch (error) {
      console.error("[TemplatePickerScreen] Error:", error);
      Alert.alert("Error", "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (templateId: string) => {
    try {
      setSelecting(true);
      const token = await AsyncStorage.getItem("authToken");
      const response = await fetch(`${getBackendUrl()}/api/templates/library/select`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          templateId,
          customName: `My ${templates.find((t) => t.id === templateId)?.name}`,
        }),
      });

      if (!response.ok) throw new Error("Failed to select template");
      const data = await response.json();

      Alert.alert("✅ Template Selected", data.message, [
        {
          text: "Done",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("[TemplatePickerScreen] Error:", error);
      Alert.alert("Error", "Failed to select template");
    } finally {
      setSelecting(false);
    }
  };

  if (loading) {
    return (
      <ScreenContainer>
        <View style={[styles.centerContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={BrandColors.constructionGold} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Feather name="layout" size={32} color={BrandColors.constructionGold} />
          <ThemedText type="h2" style={styles.headerTitle}>
            Choose Template
          </ThemedText>
          <ThemedText type="body" style={[styles.subtitle, { color: theme.colors.text }]}>
            Professional tier feature - Customize your invoice style
          </ThemedText>
        </View>

        {/* Templates Grid */}
        <View style={styles.templatesContainer}>
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isSelected={selectedTemplate === template.id}
              onSelect={() => setSelectedTemplate(template.id)}
              onConfirm={() => handleSelectTemplate(template.id)}
              isSelecting={selecting}
            />
          ))}
        </View>

        {/* Info */}
        <GlassCard style={styles.infoCard}>
          <ThemedText type="body" style={styles.infoTitle}>
            💡 Templates are customizable
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.colors.text, lineHeight: 18 }}>
            After selecting, you can customize colors, fonts, and layout for each template
            via the Template Builder in settings.
          </ThemedText>
        </GlassCard>

        <View style={{ height: Spacing.lg }} />
      </ScrollView>
    </ScreenContainer>
  );
}

interface TemplateCardProps {
  template: Template;
  isSelected: boolean;
  onSelect: () => void;
  onConfirm: () => void;
  isSelecting: boolean;
}

function TemplateCard({
  template,
  isSelected,
  onSelect,
  onConfirm,
  isSelecting,
}: TemplateCardProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      style={styles.templateCard}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {/* Preview */}
      <View
        style={[
          styles.preview,
          {
            backgroundColor: template.preview.colors.background,
            borderColor: isSelected ? BrandColors.constructionGold : theme.colors.border,
            borderWidth: isSelected ? 3 : 1,
          },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.previewHeader,
            { backgroundColor: template.preview.colors.primary },
          ]}
        >
          <ThemedText type="small" style={{ color: "white", fontWeight: "700" }}>
            {template.preview.header}
          </ThemedText>
        </View>

        {/* Content */}
        <View style={styles.previewContent}>
          <View
            style={[
              styles.previewLine,
              { backgroundColor: template.preview.colors.accent },
            ]}
          />
          <View
            style={[
              styles.previewLine,
              { backgroundColor: template.preview.colors.accent, width: "70%" },
            ]}
          />
          <View
            style={[
              styles.previewLine,
              { backgroundColor: template.preview.colors.accent, width: "50%" },
            ]}
          />
        </View>

        {/* Selected Badge */}
        {isSelected && (
          <View style={styles.selectedBadge}>
            <Feather name="check-circle" size={24} color={BrandColors.success} />
          </View>
        )}
      </View>

      {/* Name */}
      <ThemedText type="body" style={styles.templateName}>
        {template.name}
      </ThemedText>

      {/* Description */}
      <ThemedText type="small" style={styles.templateDescription}>
        {template.description}
      </ThemedText>

      {/* Select Button */}
      {isSelected && (
        <TouchableOpacity
          style={[styles.selectButton, { backgroundColor: BrandColors.constructionGold }]}
          onPress={onConfirm}
          disabled={isSelecting}
        >
          {isSelecting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Feather name="check" size={18} color="white" />
              <ThemedText type="body" style={styles.selectButtonText}>
                Use This Template
              </ThemedText>
            </>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginVertical: Spacing.lg,
  },
  headerTitle: {
    marginTop: Spacing.md,
    fontSize: 28,
  },
  subtitle: {
    marginTop: Spacing.sm,
    textAlign: "center",
    opacity: 0.8,
  },
  templatesContainer: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  templateCard: {
    borderRadius: 12,
    overflow: "hidden",
  },
  preview: {
    borderRadius: 12,
    overflow: "hidden",
    height: 180,
    marginBottom: Spacing.sm,
  },
  previewHeader: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    height: "30%",
    justifyContent: "center",
    alignItems: "center",
  },
  previewContent: {
    flexDirection: "column",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    flex: 1,
  },
  previewLine: {
    height: 4,
    borderRadius: 2,
  },
  selectedBadge: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: "white",
    borderRadius: 12,
    padding: 4,
  },
  templateName: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
  templateDescription: {
    marginBottom: Spacing.md,
    opacity: 0.7,
    lineHeight: 16,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: 8,
    gap: Spacing.sm,
  },
  selectButtonText: {
    color: "white",
    fontWeight: "600",
  },
  infoCard: {
    padding: Spacing.md,
    marginTop: Spacing.lg,
  },
  infoTitle: {
    fontWeight: "600",
    marginBottom: Spacing.sm,
  },
});
