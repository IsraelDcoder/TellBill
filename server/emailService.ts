import { Resend } from "resend";

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@tellbill.com";

/**
 * Generic email sending function
 * Used by scope proof engine and other services
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(params.to)) {
      throw new Error(`Invalid email address: ${params.to}`);
    }

    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (response.error) {
      throw new Error(`Email send failed: ${response.error.message}`);
    }

    console.log(
      `[EmailService] ✅ Email sent to ${params.to} - ${params.subject}`
    );
  } catch (error) {
    console.error(
      `[EmailService] Failed to send email to ${params.to}:`,
      error
    );
    throw error;
  }
}

/**
 * Send invoice via email using Resend service
 * @param to - Recipient email address
 * @param clientName - Name of the client receiving the invoice
 * @param invoiceNumber - Invoice number for reference
 * @param invoiceHtml - HTML content of the invoice
 * @param invoiceData - Invoice data for email body
 * @returns Promise with send result
 */
export async function sendInvoiceEmail(
  to: string,
  clientName: string,
  invoiceNumber: string,
  invoiceHtml: string,
  invoiceData?: {
    amount?: number;
    dueDate?: string;
    description?: string;
  }
) {
  try {
    console.log(
      `[EmailService] Sending invoice ${invoiceNumber} to ${to} via Resend`
    );

    // Validate email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      throw new Error(`Invalid email address: ${to}`);
    }

    // Create email body with invoice details
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <p>Hi ${clientName},</p>
        <p>Please find attached your invoice <strong>#${invoiceNumber}</strong>.</p>
        
        ${
          invoiceData?.amount
            ? `<p><strong>Amount Due:</strong> $${invoiceData.amount.toFixed(2)}</p>`
            : ""
        }
        ${
          invoiceData?.dueDate
            ? `<p><strong>Due Date:</strong> ${invoiceData.dueDate}</p>`
            : ""
        }
        
        <p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
        
        <p>Thank you for your business!</p>
        
        <hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;" />
        
        <p style="font-size: 12px; color: #666;">
          This is an automated message from TellBill. Please do not reply to this email.
        </p>
      </div>
    `;

    // Send email via Resend
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: to,
      subject: `Invoice #${invoiceNumber}`,
      html: emailBody,
      // Optional: Add the HTML invoice as an attachment
      // attachments: [
      //   {
      //     filename: `invoice_${invoiceNumber}.pdf`,
      //     content: Buffer.from(invoiceHtml),
      //   },
      // ],
    });

    // Check if email was sent successfully
    if (response.error) {
      console.error(
        `[EmailService] Failed to send invoice to ${to}:`,
        response.error
      );
      throw new Error(`Email send failed: ${response.error.message}`);
    }

    console.log(
      `[EmailService] ✅ Invoice ${invoiceNumber} sent successfully to ${to}`
    );
    console.log(`[EmailService] Email ID: ${response.data?.id}`);

    return {
      success: true,
      emailId: response.data?.id,
      message: `Invoice sent successfully to ${to}`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(
      `[EmailService] ❌ Error sending invoice email to ${to}:`,
      errorMessage
    );
    throw new Error(`Failed to send invoice email: ${errorMessage}`);
  }
}

/**
 * Send SMS notification via Resend (using SMS integration)
 * @param phoneNumber - Phone number to send to
 * @param invoiceNumber - Invoice number reference
 * @param clientName - Client name
 * @returns Promise with send result
 */
export async function sendInvoiceSMS(
  phoneNumber: string,
  invoiceNumber: string,
  clientName: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(
      `[EmailService] Sending SMS for invoice ${invoiceNumber} to ${phoneNumber}`
    );

    // Validate phone number (basic validation)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber.replace(/[\s\-()]/g, ""))) {
      throw new Error(`Invalid phone number: ${phoneNumber}`);
    }

    // Note: Resend doesn't directly support SMS
    // For SMS, you would need to use Twilio or similar
    // This is a placeholder that shows where SMS integration would go
    console.warn(
      "[EmailService] SMS sending not yet configured. Please use Twilio or similar service."
    );

    throw new Error(
      "SMS sending not configured. Please add Twilio or similar SMS service."
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(
      `[EmailService] ❌ Error sending SMS to ${phoneNumber}:`,
      errorMessage
    );
    throw new Error(`Failed to send SMS: ${errorMessage}`);
  }
}

/**
 * Send WhatsApp notification
 * Note: Requires WhatsApp Business API integration
 */
export async function sendInvoiceWhatsApp(
  phoneNumber: string,
  invoiceNumber: string,
  clientName: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(
      `[EmailService] Sending WhatsApp for invoice ${invoiceNumber} to ${phoneNumber}`
    );

    // Note: WhatsApp integration requires WhatsApp Business API
    // This is a placeholder showing where WhatsApp integration would go
    console.warn(
      "[EmailService] WhatsApp sending not yet configured. Please integrate WhatsApp Business API."
    );

    throw new Error(
      "WhatsApp sending not configured. Please add WhatsApp Business API integration."
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(
      `[EmailService] ❌ Error sending WhatsApp to ${phoneNumber}:`,
      errorMessage
    );
    throw new Error(`Failed to send WhatsApp message: ${errorMessage}`);
  }
}

/**
 * Send professional welcome email to new users after signup
 * @param email - User email address
 * @param name - User name
 * @returns Promise with send result
 */
export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(
      `[EmailService] Sending welcome email to new user: ${email}`
    );

    // Validate email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email address: ${email}`);
    }

    const userName = name || email.split("@")[0];

    // Professional welcome email template
    const welcomeHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 32px; font-weight: 600;">Welcome to TellBill! 🎉</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your invoice management just got smarter</p>
        </div>

        <!-- Main Content -->
        <div style="background-color: white; padding: 40px 30px; border-radius: 0 0 8px 8px;">
          <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
            Hi <strong>${userName}</strong>,
          </p>

          <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
            Welcome to <strong>TellBill</strong>! We're thrilled to have you on board. Your account is now active and ready to transform the way you manage invoices.
          </p>

          <!-- Key Features -->
          <div style="background-color: #f8f9fa; padding: 25px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #667eea;">
            <h3 style="color: #667eea; margin: 0 0 15px 0; font-size: 18px;">Here's what you can do now:</h3>
            <ul style="color: #555; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.8;">
              <li><strong>Create Invoices</strong> - Generate professional invoices in minutes</li>
              <li><strong>Send Invoices</strong> - Email invoices directly to clients</li>
              <li><strong>Manage Projects</strong> - Organize work by project</li>
              <li><strong>Track Payments</strong> - Keep track of who paid and when</li>
              <li><strong>View Analytics</strong> - Understand your business at a glance</li>
            </ul>
          </div>

          <!-- Call to Action -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://tellbill.app" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 40px; border-radius: 6px; font-weight: 600; font-size: 15px;">
              Get Started Now
            </a>
          </div>

          <!-- Tips Section -->
          <div style="background-color: #f0f4ff; padding: 20px; border-radius: 6px; margin: 25px 0;">
            <h4 style="color: #667eea; margin: 0 0 10px 0; font-size: 16px;">💡 Quick Tips:</h4>
            <ul style="color: #555; margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.7;">
              <li>Start by creating your first invoice in the dashboard</li>
              <li>Add team members to collaborate on invoices</li>
              <li>Customize invoice templates to match your brand</li>
              <li>Enable notifications for payment reminders</li>
            </ul>
          </div>

          <!-- Support Section -->
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #ffc107;">
            <p style="color: #856404; margin: 0; font-size: 13px;">
              <strong>Need help?</strong> Check out our <a href="https://tellbill.app/docs" style="color: #667eea; text-decoration: none;">documentation</a> or contact our support team at <a href="mailto:support@tellbill.com" style="color: #667eea; text-decoration: none;">support@tellbill.com</a>
            </p>
          </div>

          <!-- Closing -->
          <p style="color: #555; font-size: 15px; margin: 25px 0 0 0; line-height: 1.6;">
            We're committed to making invoice management simple and efficient. If you have any questions or feedback, we'd love to hear from you!
          </p>

          <p style="color: #555; font-size: 15px; margin: 15px 0 0 0;">
            Best regards,<br>
            <strong>The TellBill Team</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #999;">
          <p style="margin: 0 0 10px 0;">
            © 2026 TellBill. All rights reserved.
          </p>
          <p style="margin: 0;">
            <a href="https://tellbill.app" style="color: #667eea; text-decoration: none;">Website</a> | 
            <a href="https://tellbill.app/privacy" style="color: #667eea; text-decoration: none;">Privacy</a> | 
            <a href="https://tellbill.app/terms" style="color: #667eea; text-decoration: none;">Terms</a>
          </p>
        </div>
      </div>
    `;

    // Send welcome email via Resend
    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Welcome to TellBill, ${userName}! 🎉`,
      html: welcomeHtml,
    });

    // Check if email was sent successfully
    if (response.error) {
      console.error(
        `[EmailService] Failed to send welcome email to ${email}:`,
        response.error
      );
      throw new Error(`Welcome email send failed: ${response.error.message}`);
    }

    console.log(
      `[EmailService] ✅ Welcome email sent successfully to ${email}`
    );
    console.log(`[EmailService] Email ID: ${response.data?.id}`);

    return {
      success: true,
      message: `Welcome email sent successfully to ${email}`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(
      `[EmailService] ❌ Error sending welcome email to ${email}:`,
      errorMessage
    );
    // Don't throw - welcome email should not block signup
    // Log the error but return gracefully
    console.warn(
      `[EmailService] ⚠️ Welcome email failed but signup succeeded. Will retry later.`
    );
    return {
      success: false,
      message: `Welcome email could not be sent: ${errorMessage}`,
    };
  }
}

/**
 * Send payment confirmation email
 * @param email - Recipient email
 * @param paymentDetails - Payment information
 */
export async function sendPaymentConfirmationEmail(
  email: string,
  paymentDetails: {
    name: string;
    plan: string;
    amount: string;
    currency: string;
    date: string;
  }
) {
  try {
    console.log(
      `[EmailService] Sending payment confirmation to ${email}`
    );

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email address: ${email}`);
    }

    const planName = paymentDetails.plan
      .charAt(0)
      .toUpperCase() + paymentDetails.plan.slice(1);

    const confirmationHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; padding: 20px; border-radius: 8px;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #333; margin-bottom: 20px;">Payment Confirmation</h1>
          
          <p style="color: #666; font-size: 16px;">Hi ${paymentDetails.name},</p>
          
          <p style="color: #666; font-size: 16px;">Thank you for upgrading to the <strong>${planName}</strong> plan on TellBill!</p>
          
          <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid #4CAF50; margin: 20px 0;">
            <h2 style="color: #333; margin-top: 0;">Transaction Details</h2>
            <p style="color: #666;"><strong>Plan:</strong> ${planName}</p>
            <p style="color: #666;"><strong>Amount:</strong> ${paymentDetails.currency} ${paymentDetails.amount}</p>
            <p style="color: #666;"><strong>Date:</strong> ${paymentDetails.date}</p>
            <p style="color: #666;"><strong>Status:</strong> <span style="color: #4CAF50; font-weight: bold;">✓ Confirmed</span></p>
          </div>
          
          <h3 style="color: #333;">What's Included:</h3>
          <ul style="color: #666;">
            <li>Unlimited voice recordings</li>
            <li>Unlimited invoices</li>
            <li>Advanced templates and customization</li>
            <li>Payment tracking and analytics</li>
            <li>Priority email support</li>
          </ul>
          
          <p style="color: #666; margin-top: 30px;">
            Your subscription is now active. You can start using all premium features immediately.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #999; font-size: 12px;">
              If you have any questions, please reach out to our support team at support@tellbill.com
            </p>
          </div>
        </div>
      </div>
    `;

    const response = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: `Payment Confirmed - TellBill ${planName} Plan`,
      html: confirmationHtml,
    });

    if (response.error) {
      console.error(
        `[EmailService] Failed to send payment confirmation to ${email}:`,
        response.error
      );
      throw new Error(
        `Payment confirmation email send failed: ${response.error.message}`
      );
    }

    console.log(
      `[EmailService] ✅ Payment confirmation sent successfully to ${email}`
    );

    return {
      success: true,
      message: `Payment confirmation sent to ${email}`,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(
      `[EmailService] ❌ Error sending payment confirmation to ${email}:`,
      errorMessage
    );
    throw error; // Throw for webhook to handle
  }
}

