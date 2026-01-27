import twilio from "twilio";
import { sendEmail } from "../emailService";

/**
 * ✅ MULTI-CHANNEL NOTIFICATION SERVICE
 * 
 * Supports: Email, SMS, WhatsApp
 * Used by scope proof engine to notify contractors and clients
 */

interface NotificationPayload {
  channel: "email" | "sms" | "whatsapp";
  to: string; // email address or phone number
  subject?: string;
  body: string;
  html?: string;
  templateVars?: Record<string, string>;
}

class NotificationService {
  private twilioClient: twilio.Twilio | null = null;
  private twilioPhoneNumber: string = "";

  constructor() {
    // Initialize Twilio if credentials provided
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    ) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
      console.log("[NotificationService] Twilio initialized");
    } else {
      console.warn("[NotificationService] Twilio not configured - SMS/WhatsApp disabled");
    }
  }

  /**
   * Send notification via email, SMS, or WhatsApp
   */
  async send(payload: NotificationPayload): Promise<boolean> {
    try {
      switch (payload.channel) {
        case "email":
          return await this.sendEmail(payload);
        case "sms":
          return await this.sendSMS(payload);
        case "whatsapp":
          return await this.sendWhatsApp(payload);
        default:
          throw new Error(`Unknown channel: ${payload.channel}`);
      }
    } catch (error) {
      console.error(`[NotificationService] Failed to send ${payload.channel}:`, error);
      return false;
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(payload: NotificationPayload): Promise<boolean> {
    try {
      await sendEmail({
        to: payload.to,
        subject: payload.subject || "TellBill Notification",
        html: payload.html || `<p>${payload.body}</p>`,
      });
      return true;
    } catch (error) {
      console.error("[NotificationService] Email send failed:", error);
      return false;
    }
  }

  /**
   * Send SMS notification via Twilio
   */
  private async sendSMS(payload: NotificationPayload): Promise<boolean> {
    if (!this.twilioClient) {
      console.error("[NotificationService] Twilio not configured");
      return false;
    }

    try {
      const message = await this.twilioClient.messages.create({
        body: this.formatMessageBody(payload.body, 160),
        from: this.twilioPhoneNumber,
        to: this.normalizePhoneNumber(payload.to),
      });

      console.log(`[NotificationService] SMS sent: ${message.sid}`);
      return true;
    } catch (error) {
      console.error("[NotificationService] SMS send failed:", error);
      return false;
    }
  }

  /**
   * Send WhatsApp notification via Twilio
   */
  private async sendWhatsApp(payload: NotificationPayload): Promise<boolean> {
    if (!this.twilioClient) {
      console.error("[NotificationService] Twilio not configured");
      return false;
    }

    try {
      const message = await this.twilioClient.messages.create({
        body: this.formatMessageBody(payload.body, 1024),
        from: `whatsapp:${this.twilioPhoneNumber}`,
        to: `whatsapp:${this.normalizePhoneNumber(payload.to)}`,
      });

      console.log(`[NotificationService] WhatsApp sent: ${message.sid}`);
      return true;
    } catch (error) {
      console.error("[NotificationService] WhatsApp send failed:", error);
      return false;
    }
  }

  /**
   * Format message body to fit character limit
   */
  private formatMessageBody(body: string, maxLength: number): string {
    if (body.length <= maxLength) return body;
    return body.substring(0, maxLength - 3) + "...";
  }

  /**
   * Normalize phone number to E.164 format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");

    // If already 10 digits, assume US/Canada
    if (digits.length === 10) {
      return `+1${digits}`;
    }

    // If 11 digits starting with 1, assume US/Canada with country code
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    }

    // If doesn't start with +, try adding it
    if (!phone.startsWith("+")) {
      return `+${digits}`;
    }

    return phone;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

/**
 * Convenience functions for common notifications
 */

export async function notifyApprovalRequest(params: {
  contractorEmail: string;
  contractorPhone?: string;
  clientPhone?: string;
  workDescription: string;
  estimatedCost: number;
  approvalUrl: string;
  channels: ("email" | "sms" | "whatsapp")[];
}): Promise<void> {
  console.log("[NotificationService] Sending approval request notifications");

  const emailBody = `Your scope proof "${params.workDescription}" ($${params.estimatedCost.toFixed(2)}) is ready for client approval. Client will approve via this link: ${params.approvalUrl}`;

  const smsBody = `TellBill: Scope proof "${params.workDescription}" ready for approval. Client link sent. Check TellBill app.`;

  for (const channel of params.channels) {
    if (channel === "email") {
      await notificationService.send({
        channel: "email",
        to: params.contractorEmail,
        subject: `Scope Proof Ready: ${params.workDescription}`,
        body: emailBody,
        html: `<p>${emailBody}</p>`,
      });
    } else if (channel === "sms" && params.contractorPhone) {
      await notificationService.send({
        channel: "sms",
        to: params.contractorPhone,
        body: smsBody,
      });
    } else if (channel === "whatsapp" && params.contractorPhone) {
      await notificationService.send({
        channel: "whatsapp",
        to: params.contractorPhone,
        body: smsBody,
      });
    }
  }
}

export async function notifyApprovalApproved(params: {
  contractorEmail: string;
  contractorPhone?: string;
  workDescription: string;
  estimatedCost: number;
  channels: ("email" | "sms" | "whatsapp")[];
}): Promise<void> {
  console.log("[NotificationService] Sending approval notification");

  const emailBody = `🎉 Client approved! "${params.workDescription}" ($${params.estimatedCost.toFixed(2)}) has been added to the invoice.`;

  const smsBody = `✅ Approved! "${params.workDescription}" added to invoice. Check TellBill for details.`;

  for (const channel of params.channels) {
    if (channel === "email") {
      await notificationService.send({
        channel: "email",
        to: params.contractorEmail,
        subject: `✅ Scope Approved: ${params.workDescription}`,
        body: emailBody,
        html: `<p style="font-size: 16px;">${emailBody}</p>`,
      });
    } else if (channel === "sms" && params.contractorPhone) {
      await notificationService.send({
        channel: "sms",
        to: params.contractorPhone,
        body: smsBody,
      });
    } else if (channel === "whatsapp" && params.contractorPhone) {
      await notificationService.send({
        channel: "whatsapp",
        to: params.contractorPhone,
        body: smsBody,
      });
    }
  }
}
