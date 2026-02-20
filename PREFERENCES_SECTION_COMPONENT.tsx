// This is the PreferencesSection component that goes in ProfileScreen.tsx BEFORE line 44 (before function MenuItem)

import { useState } from "react";

function PreferencesSection({ theme, authToken }: { theme: any; authToken: string | null }): React.ReactElement {
  const prefs = usePreferencesStore();
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const currencies = ["USD", "EUR", "GBP", "CAD", "AUD"];
  const templates = ["default", "minimal", "detailed"];

  const handleCurrencyChange = async (curr: string) => {
    prefs.setCurrency(curr);
    setShowCurrencyMenu(false);
    if (authToken) await prefs.savePreferencesToBackend(authToken);
  };

  const handleTemplateChange = async (tmpl: string) => {
    prefs.setInvoiceTemplate(tmpl);
    setShowTemplateMenu(false);
    if (authToken) await prefs.savePreferencesToBackend(authToken);
  };

  return (
    <View>
      <Pressable onPress={() => setShowCurrencyMenu(!showCurrencyMenu)} style={styles.preferenceItem}>
        <View style={styles.preferenceLeft}>
          <Feather name="globe" size={18} color={BrandColors.constructionGold} />
          <View style={styles.preferenceText}>
            <ThemedText type="body">Currency</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>{prefs.currency}</ThemedText>
          </View>
        </View>
        <Feather name={showCurrencyMenu ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
      </Pressable>
      {showCurrencyMenu && (
        <View style={[styles.menuDropdown, { backgroundColor: theme.backgroundSecondary }]}>
          {currencies.map((curr) => (
            <Pressable 
              key={curr} 
              onPress={() => handleCurrencyChange(curr)} 
              style={[styles.dropdownItem, prefs.currency === curr && styles.dropdownItemActive]}
            >
              <ThemedText 
                type="body" 
                style={prefs.currency === curr ? { color: BrandColors.constructionGold } : {}}
              >
                {curr}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}
      <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
      
      <Pressable onPress={() => setShowTemplateMenu(!showTemplateMenu)} style={styles.preferenceItem}>
        <View style={styles.preferenceLeft}>
          <Feather name="layout" size={18} color={BrandColors.constructionGold} />
          <View style={styles.preferenceText}>
            <ThemedText type="body">Invoice Template</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>{prefs.invoiceTemplate}</ThemedText>
          </View>
        </View>
        <Feather name={showTemplateMenu ? "chevron-up" : "chevron-down"} size={16} color={theme.textSecondary} />
      </Pressable>
      {showTemplateMenu && (
        <View style={[styles.menuDropdown, { backgroundColor: theme.backgroundSecondary }]}>
          {templates.map((tmpl) => (
            <Pressable 
              key={tmpl} 
              onPress={() => handleTemplateChange(tmpl)} 
              style={[styles.dropdownItem, prefs.invoiceTemplate === tmpl && styles.dropdownItemActive]}
            >
              <ThemedText 
                type="body" 
                style={prefs.invoiceTemplate === tmpl ? { color: BrandColors.constructionGold } : {}}
              >
                {tmpl.charAt(0).toUpperCase() + tmpl.slice(1)}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      )}
      <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />
      
      <Pressable onPress={() => {}} style={styles.preferenceItem}>
        <View style={styles.preferenceLeft}>
          <Feather name="percent" size={18} color={BrandColors.constructionGold} />
          <View style={styles.preferenceText}>
            <ThemedText type="body">Default Tax Rate</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>{prefs.taxRate}%</ThemedText>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
