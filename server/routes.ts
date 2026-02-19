import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerTranscriptionRoutes } from "./transcription";
import { registerAuthRoutes } from "./auth";
import { registerRevenueCatRoutes } from "./revenuecat";
import { registerStripeRoutes } from "./payments/stripe";
import { registerStripeWebhookRoutes } from "./payments/stripeWebhook";
import { registerInvoiceRoutes } from "./invoices";
import { registerDataLoadingRoutes } from "./dataLoading";
import { registerActivityLogRoutes } from "./activityLog";
import { registerScopeProofRoutes } from "./scopeProof";
import { registerTaxRoutes } from "./tax";
import { registerMaterialCostRoutes } from "./materialCosts";
import { registerMoneyAlertRoutes } from "./moneyAlerts";
import { registerBillingRoutes } from "./billing/iapVerification";
import { registerRevenueCatWebhook } from "./billing/revenuecatWebhook";
import { authMiddleware } from "./utils/authMiddleware";
import { attachSubscriptionMiddleware, requirePaidPlan, requirePlan } from "./utils/subscriptionGuard";

/**
 * ✅ Public HTML Pages for Google OAuth Consent Screen
 * Returns simple HTML pages with app info, privacy policy, and terms of service
 */
function registerPublicPages(app: Express) {
  // ✅ HOME PAGE
  app.get("/", (_req, res) => {
    const contactEmail = "support@tellbill.app";
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TellBill - Mobile Invoicing Platform</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 12px;
      padding: 60px 40px;
      max-width: 600px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: slideUp 0.6s ease-out;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    h1 {
      color: #667eea;
      margin-bottom: 20px;
      font-size: 2.5em;
      text-align: center;
    }
    .subtitle {
      color: #666;
      text-align: center;
      margin-bottom: 40px;
      font-size: 1.1em;
      line-height: 1.8;
    }
    .links {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 40px;
    }
    a {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      transition: background 0.3s;
      text-align: center;
      font-weight: 600;
    }
    a:hover {
      background: #764ba2;
    }
    .contact {
      text-align: center;
      margin-top: 30px;
      padding-top: 30px;
      border-top: 1px solid #eee;
      color: #666;
    }
    .contact a {
      display: inline;
      padding: 0;
      background: none;
      color: #667eea;
      text-decoration: underline;
    }
    .contact a:hover {
      background: none;
      color: #764ba2;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📱 TellBill</h1>
    <p class="subtitle">
      TellBill is a mobile invoicing platform that allows contractors and small businesses 
      to create invoices using voice and get paid faster.
    </p>
    <div class="links">
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms of Service</a>
    </div>
    <div class="contact">
      <p>Questions? Contact us at <a href="mailto:${contactEmail}">${contactEmail}</a></p>
    </div>
  </div>
</body>
</html>
    `;
    res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(html);
  });

  // ✅ PRIVACY POLICY
  app.get("/privacy", (_req, res) => {
    const contactEmail = "support@tellbill.app";
    const lastUpdated = "February 2026";
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy - TellBill</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f7fa;
      padding: 40px 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1, h2 { color: #667eea; margin-top: 30px; margin-bottom: 15px; }
    h1 { font-size: 2em; }
    h2 { font-size: 1.4em; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    p { margin-bottom: 15px; }
    ul { margin-left: 20px; margin-bottom: 15px; }
    li { margin-bottom: 8px; }
    .meta { color: #999; font-size: 0.9em; margin-bottom: 30px; }
    a { color: #667eea; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .back-link { margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="back-link"><a href="/">← Back to Home</a></div>
    <h1>Privacy Policy</h1>
    <p class="meta">Last Updated: ${lastUpdated}</p>

    <h2>1. Information We Collect</h2>
    <p>
      When you use TellBill through Google OAuth authentication, we collect and store:
    </p>
    <ul>
      <li><strong>Email Address</strong> - Used to identify your account and enable login</li>
      <li><strong>Profile Name</strong> - Your display name from your Google account</li>
      <li><strong>Invoice Data</strong> - Information you provide when creating invoices (client names, amounts, etc.)</li>
      <li><strong>Usage Data</strong> - How you interact with the app (features used, frequency of access)</li>
    </ul>

    <h2>2. How We Use Your Data</h2>
    <ul>
      <li><strong>Authentication</strong> - We use your email and name to create and manage your account</li>
      <li><strong>Service Provision</strong> - We store your invoices and data to provide the invoicing service</li>
      <li><strong>Service Improvement</strong> - We analyze usage patterns to improve TellBill's features</li>
      <li><strong>Communication</strong> - We may send emails about account security, service updates, or important announcements</li>
    </ul>

    <h2>3. Data Security</h2>
    <p>
      Your data is encrypted in transit (HTTPS) and at rest in our database. We use industry-standard security practices 
      to protect your information from unauthorized access.
    </p>

    <h2>4. Data Retention</h2>
    <p>
      We retain your data as long as your account is active. If you delete your account, all associated data will be 
      permanently deleted within 30 days.
    </p>

    <h2>5. Third-Party Sharing</h2>
    <p>
      <strong>We do NOT sell your data.</strong> We do not share your personal information with third parties except:
    </p>
    <ul>
      <li>As required by law or legal process</li>
      <li>To service providers who help us operate TellBill (with strict confidentiality agreements)</li>
      <li>With your explicit consent</li>
    </ul>

    <h2>6. Google Authentication</h2>
    <p>
      We use Google OAuth for authentication. Your authentication is handled by Google directly, and they may collect 
      additional data according to their own privacy policies. We only receive your email and name.
    </p>

    <h2>7. Your Rights</h2>
    <p>You have the right to:</p>
    <ul>
      <li>Access your personal data</li>
      <li>Correct inaccurate data</li>
      <li>Delete your account and associated data</li>
      <li>Withdraw consent for data processing</li>
    </ul>

    <h2>8. Contact Us</h2>
    <p>
      If you have questions about this Privacy Policy or our privacy practices, 
      please contact us at <a href="mailto:${contactEmail}">${contactEmail}</a>.
    </p>

    <h2>9. Changes to This Policy</h2>
    <p>
      We may update this Privacy Policy from time to time. We will notify you of any changes by posting the 
      new policy on this page and updating the "Last Updated" date.
    </p>
  </div>
</body>
</html>
    `;
    res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(html);
  });

  // ✅ TERMS OF SERVICE
  app.get("/terms", (_req, res) => {
    const contactEmail = "support@tellbill.app";
    const lastUpdated = "February 2026";
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service - TellBill</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f7fa;
      padding: 40px 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1, h2 { color: #667eea; margin-top: 30px; margin-bottom: 15px; }
    h1 { font-size: 2em; }
    h2 { font-size: 1.4em; border-bottom: 2px solid #667eea; padding-bottom: 10px; }
    p { margin-bottom: 15px; }
    ul { margin-left: 20px; margin-bottom: 15px; }
    li { margin-bottom: 8px; }
    .meta { color: #999; font-size: 0.9em; margin-bottom: 30px; }
    a { color: #667eea; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .back-link { margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="back-link"><a href="/">← Back to Home</a></div>
    <h1>Terms of Service</h1>
    <p class="meta">Last Updated: ${lastUpdated}</p>

    <h2>1. Acceptance of Terms</h2>
    <p>
      By accessing and using TellBill, you accept and agree to be bound by these Terms of Service. If you do not agree 
      to these terms, please do not use TellBill.
    </p>

    <h2>2. Description of Service</h2>
    <p>
      TellBill is a mobile invoicing platform that allows contractors and small businesses to create, manage, and send invoices. 
      The service includes features for voice-based invoice creation, payment tracking, and financial reporting.
    </p>

    <h2>3. User Account Responsibilities</h2>
    <p>You are responsible for:</p>
    <ul>
      <li>Maintaining the confidentiality of your account credentials</li>
      <li>All activity that occurs under your account</li>
      <li>Providing accurate and complete information</li>
      <li>Using TellBill only for lawful purposes</li>
      <li>Compliance with all applicable laws and regulations</li>
    </ul>

    <h2>4. Permitted Use</h2>
    <p>You agree NOT to:</p>
    <ul>
      <li>Create fraudulent or false invoices</li>
      <li>Use TellBill to engage in harassment, abuse, or discrimination</li>
      <li>Attempt to gain unauthorized access to TellBill's systems</li>
      <li>Reverse-engineer, decompile, or disassemble TellBill</li>
      <li>Interfere with or disrupt TellBill's infrastructure</li>
      <li>Violate any applicable laws or regulations</li>
    </ul>

    <h2>5. Service Limitations</h2>
    <p>TellBill is provided on an "as-is" basis. We do not guarantee:</p>
    <ul>
      <li>Uninterrupted or error-free service</li>
      <li>Specific results or outcomes</li>
      <li>Compatibility with all devices or platforms</li>
    </ul>

    <h2>6. Account Termination</h2>
    <p>
      We reserve the right to terminate or suspend your account at any time, in our sole discretion, without notice or liability, 
      for violations of these Terms or other conduct we deem inappropriate.
    </p>
    <p>
      You may terminate your account at any time by contacting support. Upon termination, your data may be deleted in accordance 
      with our Privacy Policy.
    </p>

    <h2>7. Limitation of Liability</h2>
    <p>
      TO THE MAXIMUM EXTENT PERMITTED BY LAW, TELLBILL SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, 
      OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE.
    </p>

    <h2>8. Disclaimer of Warranties</h2>
    <p>
      TELLBILL IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTY OF MERCHANTABILITY, 
      FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.
    </p>

    <h2>9. Indemnification</h2>
    <p>
      You agree to indemnify and hold harmless TellBill from any claims, damages, losses, or expenses arising from your use of 
      TellBill or violation of these Terms.
    </p>

    <h2>10. Governing Law</h2>
    <p>
      These Terms shall be governed by and construed in accordance with the laws of <strong>[Insert Jurisdiction]</strong>, 
      without regard to its conflict of law principles.
    </p>

    <h2>11. Contact Information</h2>
    <p>
      For questions about these Terms of Service, please contact us at 
      <a href="mailto:${contactEmail}">${contactEmail}</a>.
    </p>

    <h2>12. Changes to Terms</h2>
    <p>
      We may modify these Terms at any time. Your continued use of TellBill following any changes constitutes your acceptance 
      of the new Terms.
    </p>
  </div>
</body>
</html>
    `;
    res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(html);
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ✅ PUBLIC PAGES for Google OAuth Consent Screen (No auth required)
  registerPublicPages(app);

  // ✅ HEALTH CHECK (No auth required - for Docker healthchecks and load balancers)
  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      version: process.env.APP_VERSION || "1.0.0",
    });
  });

  // ✅ AUTHENTICATION ROUTES (No auth required)
  registerAuthRoutes(app);

  // ✅ REVENUCAT SUBSCRIPTION ROUTES
  // Webhook route (no auth) + protected routes (auth required)
  registerRevenueCatRoutes(app);

  // ✅ STRIPE PAYMENT ROUTES
  // Webhook (no auth) + protected checkout/portal routes
  registerStripeWebhookRoutes(app);
  registerStripeRoutes(app);

  // ✅ MOBILE BILLING ROUTES (IAP via RevenueCat)
  // Webhook (no auth) + protected verification routes
  registerRevenueCatWebhook(app);
  registerBillingRoutes(app);

  // ✅ PROTECTED ROUTES (Auth + Subscription required)
  // Apply auth middleware first, then subscription middleware
  app.use("/api/data-loading", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/invoices", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/activity", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/transcribe", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/extract-invoice", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/scope-proof", authMiddleware, attachSubscriptionMiddleware);
  app.use("/api/tax", authMiddleware); // Tax routes require auth but not subscription limit

  // Register data loading routes (fetch user data after login)
  registerDataLoadingRoutes(app);

  // Register invoice routes
  registerInvoiceRoutes(app);

  // Register activity log routes (audit trail)
  registerActivityLogRoutes(app);

  // Register tax routes (user-configurable tax settings)
  registerTaxRoutes(app);

  // Register transcription routes (uses OpenRouter API)
  registerTranscriptionRoutes(app);

  // ✅ Register scope proof routes (approval engine - protected inside)
  registerScopeProofRoutes(app);

  // ✅ Register material cost routes (receipt scanner v2 - paid only)
  registerMaterialCostRoutes(app);

  // ✅ Register money alert routes (unbilled materials tracking)
  registerMoneyAlertRoutes(app);

  // ✅ STATIC APPROVAL PAGE (No auth required - token-based access)
  app.get("/approve/:token", (req, res) => {
    // Serve client approval web page
    res.sendFile("client/public/approve.html");
  });

  const httpServer = createServer(app);

  return httpServer;
}
