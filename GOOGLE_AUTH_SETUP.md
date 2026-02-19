# Google Authentication Setup for TellBill

## ✅ Implementation Status
- [x] Google SignIn package installed
- [x] AuthContext.tsx configured with Google Sign-In
- [x] `signInWithGoogle()` function implementing
- [ ] Backend `/api/auth/google` endpoint (TODO)
- [ ] LoginScreen Google button (TODO)  
- [ ] SignUpScreen Google button (TODO)

## Environment Variables Required

Add to your `.env` or Expo environment:

```
EXPO_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID_HERE
```

Get your Google Client ID from: https://console.cloud.google.com/

## Installation

```bash
npm install @react-native-google-signin/google-signin
```

## Backend Endpoint Needed

Create `/api/auth/google` POST endpoint that:

```typescript
app.post("/api/auth/google", async (req: Request, res: Response) => {
  const { idToken, email, name } = req.body;
  
  // 1. Verify idToken with Google API
  // 2. Find or create user with email
  // 3. Return JWT token and user data
});
```

## Frontend Changes TODO

### LoginScreen
```tsx
<Pressable onPress={() => signInWithGoogle()}>
  <Text>Sign In with Google</Text>
</Pressable>
```

### SignUpScreen
```tsx
<Pressable onPress={() => signInWithGoogle()}>
  <Text>Sign Up with Google</Text>
</Pressable>
```

## Testing

1. Set EXPO_PUBLIC_GOOGLE_CLIENT_ID in environment
2. Tap Google Sign-In button
3. Complete Google authentication
4. Backend should receive idToken and create/return user
5. User should be logged in

## Notes

- Google SignIn is now configured in AuthContext.tsx on app startup
- `signInWithGoogle()` ready to be called from LoginScreen and SignUpScreen
- Backend endpoint needed to handle Google ID token verification and user creation
