/**
 * Analytics Service - Unified event tracking across the app
 * Tracks user behaviors, conversions, and engagement metrics
 * Events are logged to console and can be sent to analytics provider later
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

export type AnalyticsEventName =
  | "app_start"
  | "account_signup"
  | "account_login"
  | "account_logout"
  | "onboarding_start"
  | "onboarding_complete"
  | "onboarding_step_viewed"
  | "invoice_created"
  | "invoice_sent"
  | "invoice_marked_paid"
  | "payment_link_accessed"
  | "subscription_upgraded"
  | "subscription_downgraded"
  | "settings_updated"
  | "invoice_edited"
  | "invoice_deleted"
  | "voice_recording_started"
  | "voice_transcript_reviewed"
  | "payment_processed"
  | "help_article_viewed"
  | "user_feedback_submitted"
  | "feature_accessed"
  | "error_occurred"
  | "session_started"
  | "session_ended";

export interface AnalyticsEvent {
  eventName: AnalyticsEventName;
  userId?: string;
  userEmail?: string;
  timestamp: string;
  sessionId: string;
  properties?: Record<string, any>;
  platform: "ios" | "android" | "web";
}

class AnalyticsService {
  private sessionId: string = "";
  private userId: string | null = null;
  private userEmail: string | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private isInitialized = false;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  /**
   * Initialize analytics service with user info
   */
  async initialize(userId?: string, userEmail?: string) {
    this.userId = userId || null;
    this.userEmail = userEmail || null;
    this.isInitialized = true;

    // Persist session info
    await AsyncStorage.setItem("analytics_sessionId", this.sessionId);
    if (userId) {
      await AsyncStorage.setItem("analytics_userId", userId);
    }

    console.log("[Analytics] ✅ Initialized", {
      sessionId: this.sessionId,
      userId: this.userId,
    });

    // Track app start on init
    this.track("app_start", {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Reset analytics for logout
   */
  async reset() {
    this.userId = null;
    this.userEmail = null;
    this.eventQueue = [];
    await AsyncStorage.removeItem("analytics_userId");
    console.log("[Analytics] 🔄 Reset for logout");
  }

  /**
   * Track analytics event
   */
  async track(eventName: AnalyticsEventName, properties?: Record<string, any>) {
    const event: AnalyticsEvent = {
      eventName,
      userId: this.userId || undefined,
      userEmail: this.userEmail || undefined,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      properties: {
        ...properties,
        appVersion: "1.0.0",
        timestamp: new Date().getTime(),
      },
      platform: "android", // Will be detected dynamically if needed
    };

    // Log to console for debugging
    console.log(`[Analytics] 📊 ${eventName}`, event.properties);

    // Queue event for batching
    this.eventQueue.push(event);

    // Persist to AsyncStorage for later analysis
    const existingEvents = await AsyncStorage.getItem("analytics_events");
    const events = existingEvents ? JSON.parse(existingEvents) : [];
    events.push(event);

    // Keep only last 1000 events
    if (events.length > 1000) {
      events.shift();
    }

    await AsyncStorage.setItem("analytics_events", JSON.stringify(events));

    // Batch events every 10 events for efficiency
    if (this.eventQueue.length >= 10) {
      await this.flushEvents();
    }
  }

  /**
   * Track user signup
   */
  async trackSignUp(userId: string, email: string, signUpMethod: "email" | "google" | "apple") {
    this.userId = userId;
    this.userEmail = email;

    await this.track("account_signup", {
      signUpMethod,
      email,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track user login
   */
  async trackLogin(userId: string, email: string, loginMethod: "email" | "google" | "apple") {
    this.userId = userId;
    this.userEmail = email;

    await this.track("account_login", {
      loginMethod,
      email,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track user logout
   */
  async trackLogout() {
    await this.track("account_logout", {
      userId: this.userId,
      timestamp: new Date().toISOString(),
    });

    this.userId = null;
    this.userEmail = null;
  }

  /**
   * Track onboarding completion
   */
  async trackOnboardingComplete(stepsCompleted: string[]) {
    await this.track("onboarding_complete", {
      stepsCompleted,
      totalSteps: stepsCompleted.length,
      completedAt: new Date().toISOString(),
    });
  }

  /**
   * Track invoice event
   */
  async trackInvoiceEvent(
    eventName: "invoice_created" | "invoice_sent" | "invoice_marked_paid" | "invoice_deleted" | "invoice_edited",
    invoiceId: string,
    amount?: number
  ) {
    await this.track(eventName, {
      invoiceId,
      amount,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track subscription change
   */
  async trackSubscriptionChange(
    eventName: "subscription_upgraded" | "subscription_downgraded",
    from: string,
    to: string,
    amount: number
  ) {
    await this.track(eventName, {
      from,
      to,
      amount,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track feature usage
   */
  async trackFeatureAccess(featureName: string, metadata?: Record<string, any>) {
    await this.track("feature_accessed", {
      feature: featureName,
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track error
   */
  async trackError(errorMessage: string, errorStack?: string, context?: Record<string, any>) {
    await this.track("error_occurred", {
      error: errorMessage,
      stack: errorStack,
      ...context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Flush queued events (would send to backend/analytics provider)
   */
  async flushEvents() {
    if (this.eventQueue.length === 0) {
      return;
    }

    console.log(`[Analytics] 📤 Flushing ${this.eventQueue.length} events`);

    // In production, send to analytics provider here
    // const response = await fetch(getApiUrl("/api/analytics/events"), {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ events: this.eventQueue }),
    // });

    this.eventQueue = [];
  }

  /**
   * Get all tracked events (for debugging)
   */
  async getTrackedEvents(): Promise<AnalyticsEvent[]> {
    const events = await AsyncStorage.getItem("analytics_events");
    return events ? JSON.parse(events) : [];
  }

  /**
   * Clear all tracked events
   */
  async clearEvents() {
    await AsyncStorage.removeItem("analytics_events");
    this.eventQueue = [];
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get session info
   */
  getSessionInfo() {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      userEmail: this.userEmail,
      isInitialized: this.isInitialized,
    };
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();
