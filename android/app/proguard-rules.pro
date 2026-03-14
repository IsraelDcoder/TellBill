# React Native + Hermes ProGuard Rules
# Production-optimized obfuscation and optimization rules
# Reduces APK size while maintaining app functionality

# ============================================================================
# R8 DUPLICATE CLASS HANDLING
# ============================================================================
# Handle duplicate classes from old Android Support Library vs AndroidX
# Both support-compat:28.0.0 and androidx.core:1.16.0 contain android.support.v4.app.INotificationSideChannel
# These rules tell R8 to merge or choose one version during compilation

# Keep both versions available so R8 can choose/merge them properly
-keep class android.support.v4.app.INotificationSideChannel { *; }

# ============================================================================
# GENERAL PROGUARD RULES FOR PRODUCTION
# ============================================================================

# Enable optimization and aggressive inlining
-optimizationpasses 5
-dontobfuscate  # Keep readable names for debugging with Crashes
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ============================================================================
# REACT NATIVE CORE RULES
# ============================================================================
# Keep React Native public APIs and classes

-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.hermes.** { *; }

# React Native module registration
-keepclasseswithmembers class com.facebook.react.** {
    native <methods>;
}

# Hermes JavaScript engine support
-keep class com.facebook.hermes.unicode.** { *; }
-keep interface com.facebook.hermes.unicode.** { *; }

# ============================================================================
# KEEP NATIVE METHODS
# ============================================================================
# Always keep code that interacts with native C++/C code
# Native methods cannot be obfuscated as they're called from native code

-keepclasseswithmembers class * {
    native <methods>;
}

# Keep all JNI functionality
-keep class * {
    native <methods>;
}

# ============================================================================
# ANDROID FRAMEWORK RULES
# ============================================================================
# Keep Android framework classes that must not be obfuscated

-keep public class android.** {
    public protected *;
}

-keep class android.** { *; }
-keepnames class android.** { *; }

# Fragment classes
-keep public class android.app.Fragment
-keep public class androidx.fragment.app.Fragment
-keep public class * extends android.app.Fragment
-keep public class * extends androidx.fragment.app.Fragment

# Activities, Services, Receivers, Providers
-keep public class * extends android.app.Activity
-keep public class * extends android.app.Service
-keep public class * extends android.app.BroadcastReceiver
-keep public class * extends android.content.ContentProvider
-keep public class * extends android.app.IntentService

# Android support library
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-keepnames class androidx.** { *; }

# ============================================================================
# VIEW & LAYOUT INFLATION
# ============================================================================
# Keep constructors needed for XML layout inflation

-keepclasseswithmembers class * {
    public <init>(android.content.Context, android.util.AttributeSet);
}

-keepclasseswithmembers class * {
    public <init>(android.content.Context);
}

# ============================================================================
# ANNOTATIONS
# ============================================================================
# Keep all annotations - they're often needed by frameworks

-keep class * implements java.lang.annotation.Annotation { *; }
-keepclassmembers class * {
    @java.lang.Deprecated <methods>;
}

# AndroidX annotations
-keep @interface androidx.annotation.** { *; }
-keepclassmembers class * {
    @androidx.annotation.** *;
}

# ============================================================================
# ENUMS
# ============================================================================
# Keep enum constructors and values

-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ============================================================================
# EXPO & LIBRARIES
# ============================================================================
# Keep Expo modules and their APIs

-keep class expo.modules.** { *; }
-keep interface expo.modules.** { *; }

# Fresco (image library)
-keep class com.facebook.fresco.** { *; }
-keep interface com.facebook.fresco.** { *; }

# OkHttp (HTTP client)
-keepnames class okhttp3.** { *; }
-keepnames interface okhttp3.** { *; }

# Okio
-keepnames class okio.** { *; }

# Retrofit (REST client)
-keep class retrofit2.** { *; }
-keep interface retrofit2.** { *; }

# Gson (JSON serialization)
-keep class com.google.gson.** { *; }
-keep interface com.google.gson.** { *; }

# Square libraries
-keep class com.squareup.** { *; }
-keep interface com.squareup.** { *; }

# ============================================================================
# KOTLIN SUPPORT
# ============================================================================
# Keep Kotlin-specific code for proper operation

-keep class kotlin.** { *; }
-keep interface kotlin.** { *; }
-keep class androidx.lifecycle.** { *; }

-keepclassmembers class ** {
    @kotlin.jvm.JvmStatic <methods>;
}

-keepclassmembers class ** {
    @kotlin.jvm.JvmField <fields>;
}

# ============================================================================
# SERIALIZATION
# ============================================================================
# Keep classes used in serialization

-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ============================================================================
# PARCELABLE
# ============================================================================
# Keep Parcelable support for Android IPC

-keep class * implements android.os.Parcelable {
    public static final android.os.Parcelable$Creator *;
}

-keep class * implements androidx.versionedparcelable.VersionedParcelable {
    public static final androidx.versionedparcelable.VersionedParcelable$Creator *;
}

# ============================================================================
# REFLECTION & METADATA
# ============================================================================
# Keep classes and members that may be used via reflection

-keepclasseswithmembers class * {
    <init>(java.lang.String);
}

-keepattributes Signature
-keepattributes EnclosingMethod
-keepattributes InnerClasses
-keepattributes *Annotation*
-keepattributes MethodParameters

# ============================================================================
# DEBUG SYMBOLS
# ============================================================================
# Keep debug information for crash analysis
# Works with Firebase Crashlytics and similar services

-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# ============================================================================
# WARNINGS & DEBUG
# ============================================================================
# Suppress common warnings that don't affect functionality

-dontwarn android.**
-dontwarn androidx.**
-dontwarn com.facebook.**
-dontwarn com.google.**
-dontwarn com.squareup.**
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn org.slf4j.**
-dontwarn sun.misc.**

# ============================================================================
# OPTIMIZATION RULES
# ============================================================================
# Tell ProGuard to be aggressive with optimization

-dontshrink  # We handle shrinking with shrinkResources instead
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*

# Inline methods to reduce APK size
-keepattributes Exceptions,InnerClasses,Signature,Deprecated,SourceFile,LineNumberTable,*Annotation*,EnclosingMethod

# Remove logging statements (optional, improves APK size)
# -assumenosideeffects class android.util.Log {
#     public static *** d(...);
#     public static *** v(...);
#     public static *** i(...);
# }

# ============================================================================
# SPECIFIC CLASS PRESERVATION
# ============================================================================
# Preserve classes defined in your application code that might be used
# dynamically or via reflection

# Base application class
-keep class com.tellbill.** { *; }
-keep class com.tellbill.app.** { *; }

# Preserve BuildConfig (used by code)
-keep class * extends android.content.BroadcastReceiver {
    <init>();
}

-keep class **.R
-keep class **.R$* {
    <fields>;
}

# ============================================================================
# NOTES FOR CUSTOMIZATION
# ============================================================================
#
# If your app crashes with ProGuard enabled, add the crashing class here:
# -keep class com.example.CrashingClass { *; }
#
# To keep specific methods:
# -keep public class com.example.MyClass {
#     public <methods>;
# }
#
# To keep specific fields:
# -keep class com.example.MyClass {
#     public <fields>;
# }
#
# Monitor Crashlytics/Firebase console for any crashes related to ProGuard
# and adjust these rules as needed.
