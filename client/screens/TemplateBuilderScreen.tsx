import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  StatusBar,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system";
import { getApiUrl } from "@/lib/backendUrl";

interface ColorPickerProps {
  label: string;
  value: string;
  onColorChange: (color: string) => void;
}

interface CustomTemplate {
  id?: string;
  name: string;
  baseTemplate: "professional" | "modern" | "minimal" | "formal";
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  logoUrl?: string;
  companyHeaderText?: string;
  footerText?: string;
  showProjectName: boolean;
  showPoNumber: boolean;
  showWorkOrderNumber: boolean;
  customField1Name?: string;
  customField1Value?: string;
  customField2Name?: string;
  customField2Value?: string;
  fontFamily: "system" | "serif" | "sans-serif" | "monospace";
}

const defaultTemplate: CustomTemplate = {
  name: "My Custom Template",
  baseTemplate: "professional",
  primaryColor: "#667eea",
  accentColor: "#764ba2",
  backgroundColor: "#ffffff",
  textColor: "#333333",
  showProjectName: false,
  showPoNumber: false,
  showWorkOrderNumber: false,
  fontFamily: "system",
};

const PREDEFINED_COLORS = [
  "#667eea", // Purple
  "#764ba2", // Dark Purple
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#FFA07A", // Salmon
  "#98D8C8", // Mint
  "#F7DC6F", // Gold
];

/**
 * TemplateBuilderScreen - Professional users can customize invoice templates
 * Allows color customization, logo upload, custom fields, and more
 */
export default function TemplateBuilderScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [authToken, setAuthToken] = useState<string | null>(null);

  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<CustomTemplate>(defaultTemplate);
  const [isEditingName, setIsEditingName] = useState(false);
  const [templateName, setTemplateName] = useState(currentTemplate.name);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"colors" | "branding" | "fields" | "preview">(
    "colors"
  );
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  // Initialize authToken from AsyncStorage
  useEffect(() => {
    const getToken = async () => {
      const token = await AsyncStorage.getItem("authToken");
      setAuthToken(token);
    };
    getToken();
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 12,
    },
    templateNameInput: {
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      padding: 12,
      color: theme.colors.text,
      fontSize: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: 8,
    },
    contentContainer: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: insets.bottom + 40,
    },
    tabBar: {
      flexDirection: "row",
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tab: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
      backgroundColor: theme.colors.card,
    },
    tabActive: {
      backgroundColor: "#667eea",
    },
    tabText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: "600",
    },
    tabTextActive: {
      color: "#ffffff",
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: 16,
      marginTop: 24,
    },
    colorGridContainer: {
      marginTop: 12,
    },
    colorGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    colorPreset: {
      width: "23%",
      aspectRatio: 1,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: "transparent",
      justifyContent: "center",
      alignItems: "center",
    },
    colorPresetSelected: {
      borderColor: "#000",
    },
    colorLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 12,
    },
    colorInputRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
      marginBottom: 16,
    },
    colorInput: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      padding: 12,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
      fontFamily: "monospace",
    },
    colorPreview: {
      width: 50,
      height: 50,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    fieldRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
      alignItems: "center",
    },
    fieldSwitch: {
      marginVertical: 8,
    },
    fieldLabel: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: 8,
    },
    input: {
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      padding: 12,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 12,
    },
    button: {
      backgroundColor: "#667eea",
      borderRadius: 8,
      padding: 14,
      alignItems: "center",
      marginTop: 24,
      marginBottom: 12,
    },
    buttonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "bold",
    },
    previewContainer: {
      backgroundColor: currentTemplate.backgroundColor,
      borderRadius: 12,
      padding: 24,
      marginTop: 20,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    previewHeader: {
      borderBottomWidth: 2,
      borderBottomColor: currentTemplate.primaryColor,
      paddingBottom: 16,
      marginBottom: 16,
    },
    previewCompanyName: {
      fontSize: 20,
      fontWeight: "bold",
      color: currentTemplate.primaryColor,
    },
    previewSubtitle: {
      fontSize: 12,
      color: currentTemplate.textColor,
      marginTop: 4,
      opacity: 0.7,
    },
    previewSection: {
      marginVertical: 12,
    },
    previewSectionLabel: {
      fontSize: 11,
      fontWeight: "600",
      color: currentTemplate.accentColor,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    previewText: {
      fontSize: 13,
      color: currentTemplate.textColor,
      lineHeight: 20,
    },
    dropdownStyle: {
      backgroundColor: theme.colors.card,
      borderRadius: 8,
      padding: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 12,
    },
    dropdownText: {
      color: theme.colors.text,
      fontSize: 14,
    },
    row: {
      flexDirection: "row",
      gap: 12,
    },
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    if (!authToken) return;
    try {
      setLoading(true);
      const response = await fetch(getApiUrl("/api/templates"), {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setTemplates(data.templates);
        if (data.templates.length > 0) {
          setCurrentTemplate(data.templates[0]);
        }
      }
    } catch (error) {
      console.error("Failed to load templates:", error);
      Alert.alert("Error", "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!authToken || !templateName.trim()) {
      Alert.alert("Error", "Template name is required");
      return;
    }

    try {
      setLoading(true);
      const payload = { ...currentTemplate, name: templateName };
      const response = await fetch(
        currentTemplate.id ? getApiUrl(`/api/templates/${currentTemplate.id}`) : getApiUrl("/api/templates"),
        {
          method: currentTemplate.id ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();
      if (data.success) {
        Alert.alert("Success", "Template saved!");
        setCurrentTemplate(data.template);
        loadTemplates();
      } else {
        Alert.alert("Error", data.error || "Failed to save template");
      }
    } catch (error) {
      console.error("Failed to save template:", error);
      Alert.alert("Error", "Failed to save template");
    } finally {
      setLoading(false);
    }
  };

  const uploadLogo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
      });

      if (result.type === "success") {
        // In production, upload to cloud storage and get URL
        // For now, just store the file path
        setCurrentTemplate({
          ...currentTemplate,
          logoUrl: result.uri,
        });
      }
    } catch (error) {
      console.error("Failed to upload logo:", error);
      Alert.alert("Error", "Failed to upload logo");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>✨ Template Designer</Text>
        {isEditingName ? (
          <TextInput
            style={styles.templateNameInput}
            value={templateName}
            onChangeText={setTemplateName}
            placeholder="Template name"
            placeholderTextColor={theme.colors.text}
            onBlur={() => setIsEditingName(false)}
            autoFocus
          />
        ) : (
          <TouchableOpacity onPress={() => setIsEditingName(true)}>
            <Text style={{ color: theme.colors.text, fontSize: 16 }}>
              {templateName} <Feather name="edit-2" size={14} />
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabBar}>
        {(["colors", "branding", "fields", "preview"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.contentContainer}>
        {/* COLORS TAB */}
        {activeTab === "colors" && (
          <>
            <Text style={styles.sectionTitle}>🎨 Color Scheme</Text>

            {/* Primary Color */}
            <Text style={styles.colorLabel}>Primary Color</Text>
            <View style={styles.colorInputRow}>
              <TextInput
                style={styles.colorInput}
                value={currentTemplate.primaryColor}
                onChangeText={(color) =>
                  setCurrentTemplate({ ...currentTemplate, primaryColor: color })
                }
                placeholder="#667eea"
              />
              <View
                style={[styles.colorPreview, { backgroundColor: currentTemplate.primaryColor }]}
              />
            </View>

            {/* Accent Color */}
            <Text style={styles.colorLabel}>Accent Color</Text>
            <View style={styles.colorInputRow}>
              <TextInput
                style={styles.colorInput}
                value={currentTemplate.accentColor}
                onChangeText={(color) =>
                  setCurrentTemplate({ ...currentTemplate, accentColor: color })
                }
                placeholder="#764ba2"
              />
              <View
                style={[styles.colorPreview, { backgroundColor: currentTemplate.accentColor }]}
              />
            </View>

            {/* Background Color */}
            <Text style={styles.colorLabel}>Background</Text>
            <View style={styles.colorInputRow}>
              <TextInput
                style={styles.colorInput}
                value={currentTemplate.backgroundColor}
                onChangeText={(color) =>
                  setCurrentTemplate({ ...currentTemplate, backgroundColor: color })
                }
                placeholder="#ffffff"
              />
              <View
                style={[
                  styles.colorPreview,
                  { backgroundColor: currentTemplate.backgroundColor },
                ]}
              />
            </View>

            {/* Text Color */}
            <Text style={styles.colorLabel}>Text Color</Text>
            <View style={styles.colorInputRow}>
              <TextInput
                style={styles.colorInput}
                value={currentTemplate.textColor}
                onChangeText={(color) =>
                  setCurrentTemplate({ ...currentTemplate, textColor: color })
                }
                placeholder="#333333"
              />
              <View
                style={[styles.colorPreview, { backgroundColor: currentTemplate.textColor }]}
              />
            </View>

            {/* Preset Colors */}
            <Text style={[styles.sectionTitle, { marginTop: 32 }]}>💡 Color Presets</Text>
            <View style={styles.colorGrid}>
              {PREDEFINED_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorPreset,
                    { backgroundColor: color },
                    currentTemplate.primaryColor === color && styles.colorPresetSelected,
                  ]}
                  onPress={() =>
                    setCurrentTemplate({ ...currentTemplate, primaryColor: color })
                  }
                >
                  {currentTemplate.primaryColor === color && (
                    <Feather name="check" size={24} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* BRANDING TAB */}
        {activeTab === "branding" && (
          <>
            <Text style={styles.sectionTitle}>🏢 Branding</Text>

            <Text style={styles.fieldLabel}>Company Header</Text>
            <TextInput
              style={styles.input}
              placeholder="Your Company Name"
              value={currentTemplate.companyHeaderText || ""}
              onChangeText={(text) =>
                setCurrentTemplate({ ...currentTemplate, companyHeaderText: text })
              }
            />

            <Text style={styles.fieldLabel}>Logo</Text>
            <TouchableOpacity style={styles.button} onPress={uploadLogo}>
              <Text style={styles.buttonText}>
                {currentTemplate.logoUrl ? "📸 Change Logo" : "📸 Upload Logo"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Footer Text</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Thank you for your business!"
              value={currentTemplate.footerText || ""}
              onChangeText={(text) =>
                setCurrentTemplate({ ...currentTemplate, footerText: text })
              }
              multiline
              numberOfLines={3}
            />

            <Text style={styles.fieldLabel}>Font Family</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.row}
            >
              {(["system", "serif", "sans-serif", "monospace"] as const).map((font) => (
                <TouchableOpacity
                  key={font}
                  style={[
                    styles.tab,
                    currentTemplate.fontFamily === font && styles.tabActive,
                  ]}
                  onPress={() =>
                    setCurrentTemplate({ ...currentTemplate, fontFamily: font })
                  }
                >
                  <Text
                    style={[
                      styles.tabText,
                      currentTemplate.fontFamily === font && styles.tabTextActive,
                    ]}
                  >
                    {font}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* FIELDS TAB */}
        {activeTab === "fields" && (
          <>
            <Text style={styles.sectionTitle}>📋 Custom Fields</Text>

            <View style={styles.fieldSwitch}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Show Project Name</Text>
                <Switch
                  value={currentTemplate.showProjectName}
                  onValueChange={(value) =>
                    setCurrentTemplate({ ...currentTemplate, showProjectName: value })
                  }
                />
              </View>
            </View>

            <View style={styles.fieldSwitch}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Show PO Number</Text>
                <Switch
                  value={currentTemplate.showPoNumber}
                  onValueChange={(value) =>
                    setCurrentTemplate({ ...currentTemplate, showPoNumber: value })
                  }
                />
              </View>
            </View>

            <View style={styles.fieldSwitch}>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Show Work Order #</Text>
                <Switch
                  value={currentTemplate.showWorkOrderNumber}
                  onValueChange={(value) =>
                    setCurrentTemplate({
                      ...currentTemplate,
                      showWorkOrderNumber: value,
                    })
                  }
                />
              </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Custom Field 1</Text>
            <TextInput
              style={styles.input}
              placeholder="Field name (e.g., Contract #)"
              value={currentTemplate.customField1Name || ""}
              onChangeText={(text) =>
                setCurrentTemplate({ ...currentTemplate, customField1Name: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Field value"
              value={currentTemplate.customField1Value || ""}
              onChangeText={(text) =>
                setCurrentTemplate({ ...currentTemplate, customField1Value: text })
              }
            />

            <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Custom Field 2</Text>
            <TextInput
              style={styles.input}
              placeholder="Field name (e.g., License #)"
              value={currentTemplate.customField2Name || ""}
              onChangeText={(text) =>
                setCurrentTemplate({ ...currentTemplate, customField2Name: text })
              }
            />
            <TextInput
              style={styles.input}
              placeholder="Field value"
              value={currentTemplate.customField2Value || ""}
              onChangeText={(text) =>
                setCurrentTemplate({ ...currentTemplate, customField2Value: text })
              }
            />
          </>
        )}

        {/* PREVIEW TAB */}
        {activeTab === "preview" && (
          <>
            <Text style={styles.sectionTitle}>👁️ Live Preview</Text>
            <View style={styles.previewContainer}>
              <View style={styles.previewHeader}>
                <Text style={styles.previewCompanyName}>
                  {currentTemplate.companyHeaderText || "Your Company Name"}
                </Text>
                <Text style={styles.previewSubtitle}>Professional Invoice</Text>
              </View>

              <View style={styles.previewSection}>
                <Text style={styles.previewSectionLabel}>Invoice Details</Text>
                <Text style={styles.previewText}>Invoice #12345</Text>
                <Text style={styles.previewText}>Date: Jan 21, 2026</Text>
                <Text style={styles.previewText}>Due: Feb 21, 2026</Text>
              </View>

              <View
                style={[styles.previewSection, { borderTopWidth: 1, paddingTopColor: "#eee" }]}
              >
                <Text style={styles.previewSectionLabel}>Amount</Text>
                <Text
                  style={[
                    styles.previewText,
                    { fontSize: 24, fontWeight: "bold", color: currentTemplate.primaryColor },
                  ]}
                >
                  $1,500.00
                </Text>
              </View>

              {currentTemplate.footerText && (
                <View style={[styles.previewSection, { marginTop: 24, paddingTopWidth: 1 }]}>
                  <Text style={[styles.previewText, { fontStyle: "italic" }]}>
                    {currentTemplate.footerText}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={saveTemplate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>💾 Save Template</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
