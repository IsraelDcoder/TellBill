# User Settings Persistence Implementation - Progress

## ✅ COMPLETED

### 1. Database Migration (0021_add_user_settings_preferences.sql)
- ✅ Added to `preferences` table:
  - `default_tax_profile_id` (foreign key)
  - `invoice_template` (text, default: 'default')
  - `default_payment_terms` (text)
  - `updated_at` (timestamp)
- ✅ Added to `users` table:
  - `preferred_currency` (default: 'USD')
  - `default_tax_rate` (default: 8.00)
  - `invoice_template` (default: 'default')
  - `default_payment_terms` (default: 'Due upon receipt')

### 2. Schema Updates (shared/schema.ts)
- ✅ Extended `Preferences` type with all new fields
- ✅ Extended `Users` type with preference fields

### 3. Backend Endpoint (server/dataLoading.ts)
- ✅ Created `PUT /api/preferences` endpoint
- ✅ Saves to both `preferences` and `users` table
- ✅ Requires authentication

### 4. Frontend Preferences Store (client/stores/preferencesStore.ts)
- ✅ Added `loadPreferences(userId, authToken)` - fetches from backend
- ✅ Added `savePreferencesToBackend(authToken)` - saves to backend
- ✅ Extended with: language, theme, defaultPaymentTerms
- ✅ Persists to AsyncStorage automatically

## 🔄 NEXT STEPS

### 1. Update AuthContext.tsx ~ 30 min
- Import usePreferencesStore
- After successful login, call `loadPreferences(userId, authToken)`
- On logout, call `resetPreferences()`

Location: `client/context/AuthContext.tsx`
Key spots:
- Line ~150-200: After user data is fetched
- Line ~300-350: In logout handler

### 2. Update ProfileScreen.tsx ~ 45 min
- Add UI for saving preferences (currency, template, payment terms, tax rate)
- Create "Save Preferences" button
- Call `savePreferencesToBackend(authToken)`
- Show success/error toast

### 3. Update InvoiceCreation ~ 30 min
- When creating invoice, pre-fill defaults:
  - Payment terms from preferences.defaultPaymentTerms
  - Template from preferences.invoiceTemplate
- File: client/stores/invoiceStore.ts

### 4. Update Company Info Endpoint ~ 30 min
- Include preference fields in PUT /api/auth/company-info
- File: server/auth.ts

## Test Flow
1. User signs up → Set preferences → Logout
2. Login again → Preferences should restore
3. Create invoice → Should use default payment terms
4. Change preferences → Should be saved

## Estimated Remaining Time: 1.5-2 hours

## Files Already Updated:
- ✅ shared/schema.ts
- ✅ server/dataLoading.ts  
- ✅ migrations/0021_add_user_settings_preferences.sql
- ✅ client/stores/preferencesStore.ts

## Files Still To Update:
- [ ] client/context/AuthContext.tsx
- [ ] client/screens/ProfileScreen.tsx
- [ ] server/auth.ts (company-info endpoint)
- [ ] Test end-to-end

