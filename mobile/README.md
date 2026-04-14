# TellBill Mobile App

Expo-managed React Native application for TellBill invoice management system.

## Quick Start

```bash
cd mobile
npm install --legacy-peer-deps
npx expo prebuild --clean
npm start
```

## Build for Android

### Development/Preview Build (APK)
```bash
eas build --platform android --profile preview
```

### Production Build (AAB for Play Store)
```bash
eas build --platform android --profile production
```

## Project Structure

- `App.tsx` - Root App component with navigation and context setup
- `screens/` - Screen components for each feature
- `  components/` - Reusable UI components
- `navigation/` - React Navigation configuration
- `services/` - API and backend service integration
- `stores/` - Zustand state management
- `hooks/` - Custom React hooks
- `context/` - React Context providers
- `lib/` - Utility functions and SDK clients

## Key Dependencies

- **Expo SDK 54** - React Native framework
- **React Navigation 7** - Screen navigation
- **Supabase** - Backend and authentication
- **TanStack Query** - Data fetching and caching
- **Zustamnd** - State management
- **React Native Reanimated** - Animations
- **Expo Camera** - Receipt scanning
- **Expo Image Picker** - Photo selection

## Configuration

### app.json
Expo configuration with:
- Project ID: `36baf556-71d0-4b52-b86e-e4076b03043a`
- Package: `com.tellbill.app`
- Deep linking: `tellbill://` scheme

### eas.json
Build profiles:
- `preview` - APK builds for testing
- `production` - AAB builds for Play Store

## Development

- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser
- `npm run lint` - Run ESLint

## Troubleshooting

### Prebuild Issues
If `npx expo prebuild` fails with plugin errors, run with `--clean`:
```bash
npx expo prebuild --clean
```

### Peer Dependency Warnings
Install with `--legacy-peer-deps` flag due to React 18/React Native 0.76 compatibility:
```bash
npm install --legacy-peer-deps
```

### Deep Linking Not Working
Ensure `app.json` android.intentFilters are properly configured for `tellbill.app` domain.

## Build Output

- Android APK: Available in EAS Build dashboard
- Play Store AAB: Build with `--profile production`

## Related Documentation

- Root-level `/server/` contains backend API
- `/shared/` contains shared types and utilities
- See `../README.md` for full project documentation
