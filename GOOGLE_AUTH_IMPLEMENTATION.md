# Google Authentication Implementation Guide

## Status: IN PROGRESS
- ✅ Added `signInWithGoogle` to AuthContextType interface in client/context/AuthContext.tsx
- ⏳ NEXT: Add signInWithGoogle method implementation, add Google buttons to UI, add backend endpoint

## Implementation Steps (DO IN THIS ORDER)

### 1. Install Dependencies
```bash
npm install @react-native-google-signin/google-signin expo-google-app-auth
```

### 2. Update AuthContext.tsx (client/context/AuthContext.tsx)

#### A. Add imports (after line 7):
```tsx
import * as GoogleSignIn from 'expo-google-app-auth';
```

#### B. Add signInWithGoogle implementation (after signInWithApple, around line 455):
```tsx
  const signInWithGoogle = async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Trigger Google OAuth flow using expo-google-app-auth
      const result = await GoogleSignIn.logInAsync({
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      });

      if (result.type === 'cancel') {
        throw new Error('Google sign-in cancelled');
      }

      if (!result.user?.email) {
        throw new Error('No email from Google account');
      }

      // Send Google verification to backend
      const response = await fetch(getApiUrl("/api/auth/google"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: result.idToken,
          email: result.user.email,
          name: result.user.name || undefined,
          picture: result.user.photoUrl || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Google sign-in failed");
      }

      if (!data.user?) {
        throw new Error("No user data returned");
      }

      // Set user after successful auth
      const newUser: User = {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        createdAt: data.user.createdAt,
      };

      // Save token
      if (data.accessToken) {
        await saveToken(data.accessToken);
      }

      // Clear old user data (if returning user on different account)
      clearDataForNewUser();

      setUser(newUser);
      setSession({ user: newUser });
      setCurrentPlan(data.subscription?.plan || "free");

      console.log("[Auth] Google sign-in successful:", email);
    } catch (err) {
      setUser(null);
      setSession(null);

      const message = err instanceof Error ? err.message : "Google sign-in failed";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };
```

#### C. Add to provider value (around line 643), replace line with:
```tsx
      signInWithGoogle,
      signInWithApple,
```

### 3. Update AuthenticationScreen.tsx

#### A. Import at top:
```tsx
import { getApiUrl } from "@/lib/backendUrl";
```

#### B. Add Google button after Sign-Up section (after line 621, before "Footer CTA"):
```tsx
              {/* Google Sign-Up Button */}
              <Pressable
                style={[
                  styles.socialButton,
                  { borderColor: theme.border, borderWidth: 1 },
                ]}
                onPress={async () => {
                  try {
                    await signInWithGoogle();
                    onSuccess();
                  } catch (err) {
                    // Error already set in context
                  }
                }}
                disabled={isLoading}
              >
                <Feather name="mail" size={18} color="#4285F4" />
                <ThemedText style={styles.socialButtonText}>
                  Continue with Google
                </ThemedText>
              </Pressable>
```

#### C. Add Google button after Login section (after line 752, before "Footer CTA"):
```tsx
              {/* Google Sign-In Button */}
              <Pressable
                style={[
                  styles.socialButton,
                  { borderColor: theme.border, borderWidth: 1 },
                ]}
                onPress={async () => {
                  try {
                    await signInWithGoogle();
                    onSuccess();
                  } catch (err) {
                    // Error already set in context
                  }
                }}
                disabled={isLoading}
              >
                <Feather name="mail" size={18} color="#4285F4" />
                <ThemedText style={styles.socialButtonText}>
                  Continue with Google
                </ThemedText>
              </Pressable>
```

#### D. Add styles in StyleSheet (around line 900):
```tsx
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  socialButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
```

### 4. Backend: Add Google Auth Endpoint

Create/update `server/auth.ts` to add:

```tsx
app.post("/api/auth/google", async (req: Request, res: Response) => {
  try {
    const { idToken, email, name, picture } = req.body;

    if (!idToken || !email) {
      return res.status(400).json({
        success: false,
        error: "Missing idToken or email",
      });
    }

    // Verify Google idToken
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || payload.email !== email) {
      return res.status(401).json({
        success: false,
        error: "Invalid Google token",
      });
    }

    // Find or create user
    let user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (!user || user.length === 0) {
      // Create new user from Google info
      const newUser = {
        id: generateId(),
        email: email,
        name: name || email.split('@')[0],
        password: null, // OAuth user, no password
        createdAt: new Date(),
      };

      await db.insert(schema.users).values(newUser);
      user = [newUser];
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user[0].id, email: user[0].email },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      user: {
        id: user[0].id,
        email: user[0].email,
        name: user[0].name,
        createdAt: user[0].createdAt,
      },
      accessToken: token,
    });
  } catch (error: any) {
    console.error("[Auth] Google sign-in error:", error);
    return res.status(500).json({
      success: false,
      error: "Google sign-in failed",
      details: error.message,
    });
  }
});
```

### 5. Environment Variables Required

Add to `.env.local` and `.env`:
```
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
JWT_SECRET=your_jwt_secret_key
```

## Setup Google Cloud Console
1. Create OAuth 2.0 credentials for Web, iOS, and Android
2. Add redirect URIs
3. Get client IDs
4. Download JSON credentials for backend verification

## Testing Checklist
- [ ] Google sign-up on iOS
- [ ] Google sign-up on Android
- [ ] Google sign-up on web
- [ ] Google sign-in (existing user)
- [ ] User data persists after refresh
- [ ] Stats display correctly after Google login
- [ ] Cross-user data isolation works

## Notes
- Apple auth was stubbed (TODO comment), Google auth should be fully functional
- Use '@react-native-google-signin/google-signin' as alternative if expo-google-app-auth has issues
- Token verification must happen on backend for security
- Users should be able to switch between email/password and Google auth with same account

---

**CURRENT FILES TO EDIT:**
1. client/context/AuthContext.tsx - Add signInWithGoogle method
2. client/screens/AuthenticationScreen.tsx - Add Google buttons after OR dividers  
3. server/auth.ts - Add POST /api/auth/google endpoint
