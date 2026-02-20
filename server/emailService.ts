import { Resend } from "resend";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "noreply@tellbill.com";

/**
 * Generate invoice PDF from invoice data
 * @param invoiceData - Invoice data (total, items, client info, etc.)
 * @param invoiceNumber - Invoice ID/number
 * @param clientName - Client name
 * @returns Promise resolving to Buffer containing PDF data
 */
async function generateInvoicePDF(
  invoiceData: {
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    total?: number | string;
    taxAmount?: number | string;
    subtotal?: number | string;
    items?: Array<{ description?: string; quantity?: number; rate?: number; total?: number }>;
    laborHours?: number;
    laborRate?: number;
    laborTotal?: number | string;
    materialsTotal?: number | string;
    notes?: string;
    dueDate?: string;
    paymentTerms?: string;
  },
  invoiceNumber: string,
  clientName: string,
  paymentLinkUrl?: string        // ✅ Add payment link parameter
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: "A4",
      });

      // Use PassThrough stream to collect PDF data reliably
      const passThrough = new PassThrough();
      const chunks: Buffer[] = [];

      // Collect all data chunks from the stream
      passThrough.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });

      passThrough.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        console.log(`[EmailService] PDF generated successfully: ${pdfBuffer.length} bytes`);
        resolve(pdfBuffer);
      });

      passThrough.on("error", (err: Error) => {
        console.error("[EmailService] Stream error:", err);
        reject(err);
      });

      // Pipe PDFDocument to PassThrough stream
      doc.pipe(passThrough);

      // Header
      doc
        .fontSize(24)
        .font("Helvetica-Bold")
        .text("INVOICE", 50, 50);

      // Invoice number and date
      doc
        .fontSize(11)
        .font("Helvetica")
        .text(`Invoice #: ${invoiceNumber}`, 50, 100)
        .text(`Date: ${new Date().toLocaleDateString()}`, 50, 115);

      // Client info
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Bill To:", 50, 150);

      doc
        .fontSize(11)
        .font("Helvetica")
        .text(clientName, 50, 170)
        .text(invoiceData.clientEmail || "", 50, 185)
        .text(invoiceData.clientPhone || "", 50, 200);

      // Due date and terms
      if (invoiceData.dueDate || invoiceData.paymentTerms) {
        doc
          .fontSize(12)
          .font("Helvetica-Bold")
          .text("Payment Terms:", 350, 150);

        doc
          .fontSize(11)
          .font("Helvetica");

        if (invoiceData.dueDate) {
          doc.text(`Due Date: ${invoiceData.dueDate}`, 350, 170);
        }
        if (invoiceData.paymentTerms) {
          doc.text(`Terms: ${invoiceData.paymentTerms}`, 350, 185);
        }
      }

      // Items table
      const tableTop = 250;
      const col1 = 50;
      const col2 = 300;
      const col3 = 400;
      const col4 = 500;

      doc
        .fontSize(11)
        .font("Helvetica-Bold")
        .text("Description", col1, tableTop)
        .text("Qty", col2, tableTop)
        .text("Rate", col3, tableTop)
        .text("Total", col4, tableTop);

      // Draw line
      doc
        .moveTo(50, tableTop + 15)
        .lineTo(550, tableTop + 15)
        .stroke();

      let yPosition = tableTop + 30;

      // Add items if available
      if (invoiceData.items && invoiceData.items.length > 0) {
        doc.fontSize(10).font("Helvetica");

        invoiceData.items.forEach((item) => {
          doc
            .text(item.description || "", col1, yPosition)
            .text((item.quantity || 0).toString(), col2, yPosition)
            .text(`$${(item.rate || 0).toFixed(2)}`, col3, yPosition)
            .text(`$${(item.total || 0).toFixed(2)}`, col4, yPosition);

          yPosition += 20;
        });
      }

      // Labor section if applicable
      if (invoiceData.laborHours && invoiceData.laborHours > 0) {
        doc
          .fontSize(10)
          .font("Helvetica")
          .text(`Labor (${invoiceData.laborHours}h)`, col1, yPosition)
          .text("1", col2, yPosition)
          .text(`$${(invoiceData.laborRate || 0).toFixed(2)}/h`, col3, yPosition)
          .text(`$${((invoiceData.laborTotal as number) || 0).toFixed(2)}`, col4, yPosition);

        yPosition += 20;
      }

      // Materials section if applicable
      if (invoiceData.materialsTotal && (invoiceData.materialsTotal as number) > 0) {
        doc
          .fontSize(10)
          .font("Helvetica")
          .text("Materials", col1, yPosition)
          .text("-", col2, yPosition)
          .text("-", col3, yPosition)
          .text(`$${((invoiceData.materialsTotal as number) / 100).toFixed(2)}`, col4, yPosition);

        yPosition += 20;
      }

      // Totals section
      yPosition += 10;
      doc
        .moveTo(50, yPosition)
        .lineTo(550, yPosition)
        .stroke();

      yPosition += 15;

      doc
        .fontSize(11)
        .font("Helvetica")
        .text("Subtotal:", col3, yPosition)
        .text(`$${((invoiceData.subtotal as number) / 100 || 0).toFixed(2)}`, col4, yPosition);

      yPosition += 20;

      // Tax if applicable
      if (invoiceData.taxAmount && (invoiceData.taxAmount as number) > 0) {
        doc
          .text("Tax:", col3, yPosition)
          .text(`$${((invoiceData.taxAmount as number) / 100).toFixed(2)}`, col4, yPosition);

        yPosition += 20;
      }

      // Total due
      doc
        .fontSize(12)
        .font("Helvetica-Bold")
        .text("Total Due:", col3, yPosition)
        .text(`$${((invoiceData.total as number) / 100 || 0).toFixed(2)}`, col4, yPosition);

      // Notes if applicable
      if (invoiceData.notes) {
        doc
          .fontSize(10)
          .font("Helvetica")
          .text("Notes:", 50, yPosition + 40)
          .fontSize(9)
          .text(invoiceData.notes, 50, yPosition + 55);
      }

      // Payment link section (if available)
      if (paymentLinkUrl) {
        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .fillColor("#2563eb")
          .text("PAYMENT", 50, yPosition + 100);

        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#000000")
          .text("Pay this invoice directly using the link below:", 50, yPosition + 120)
          .fontSize(10)
          .fillColor("#2563eb")
          .text(paymentLinkUrl, 50, yPosition + 140, { link: paymentLinkUrl })
          .fontSize(9)
          .fillColor("#666666")
          .text("(Secure Stripe payment - click the link or copy and paste into your browser)", 50, yPosition + 160);
      }

      // Footer
      doc
        .fontSize(9)
        .fillColor("#999999")
        .text("This invoice was generated by TellBill. Thank you for your business!", 50, 750, {
          align: "center",
        });

      // End the document - this will trigger the stream to finish
      doc.end();
    } catch (error) {
      console.error("[EmailService] PDF generation error:", error);
      reject(error);
    }
  });
}

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
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    total?: number;
    taxAmount?: number;
    subtotal?: number;
    items?: Array<any>;
    laborHours?: number;
    laborRate?: number;
    laborTotal?: number | string;
    materialsTotal?: number | string;
    notes?: string;
    paymentTerms?: string;
  },
  paymentLinkUrl?: string, // ✅ Added payment link parameter
  paymentInfo?: any // ✅ Added payment info parameter
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
            ? `<p><strong>Amount Due:</strong> $${(invoiceData.amount / 100).toFixed(2)}</p>`
            : ""
        }
        ${
          invoiceData?.dueDate
            ? `<p><strong>Due Date:</strong> ${invoiceData.dueDate}</p>`
            : ""
        }
        
        ${
          paymentLinkUrl
            ? `
            <div style="margin: 30px 0; padding: 20px; background-color: #f0f7ff; border-left: 4px solid #007bff; border-radius: 4px;">
              <p style="margin: 0 0 10px 0;"><strong>💳 Pay Now</strong></p>
              <p style="margin: 0 0 15px 0;">Click the button below to pay this invoice securely with a credit card:</p>
              <a href="${paymentLinkUrl}" style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
                Pay Invoice
              </a>
              <p style="margin: 15px 0 0 0; font-size: 12px; color: #666;">
                Or copy and paste this link in your browser: <a href="${paymentLinkUrl}">${paymentLinkUrl}</a>
              </p>
            </div>
            `
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

    // Generate PDF invoice
    let pdfBuffer: Buffer | undefined;
    try {
      pdfBuffer = await generateInvoicePDF(invoiceData || {}, invoiceNumber, clientName, paymentLinkUrl);
      console.log(`[EmailService] ✅ PDF generated for invoice ${invoiceNumber} (${pdfBuffer.length} bytes)`);
    } catch (pdfError) {
      console.error(`[EmailService] ⚠️ Failed to generate PDF for invoice ${invoiceNumber}:`, pdfError);
      // Continue without PDF - email will still be sent
      pdfBuffer = undefined;
    }

    // Send email via Resend with PDF attachment
    const sendOptions: any = {
      from: FROM_EMAIL,
      to: to,
      subject: `Invoice #${invoiceNumber}`,
      html: emailBody,
    };

    // Add PDF attachment if successfully generated
    if (pdfBuffer) {
      sendOptions.attachments = [
        {
          filename: `invoice_${invoiceNumber}.pdf`,
          content: pdfBuffer.toString("base64"),
        },
      ];
    }

    // Send email via Resend with PDF attachment
    const response = await resend.emails.send(sendOptions);

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
  clientName: string,
  invoiceTotal?: number,
  paymentInfo?: any // ✅ Added payment info parameter
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
  clientName: string,
  invoiceTotal?: number,
  paymentInfo?: any
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(
      `[EmailService] Sending WhatsApp for invoice ${invoiceNumber} to ${phoneNumber}`
    );

    // Build WhatsApp message with payment info
    let messageText = `*Invoice ${invoiceNumber}*\n\nDear ${clientName},\n\nPlease find attached your invoice.`;
    
    if (invoiceTotal) {
      const amountInDollars = invoiceTotal / 100;
      messageText += `\n\n*Amount Due:* $${amountInDollars.toFixed(2)}`;
    }

    // Add payment information if available
    if (paymentInfo && paymentInfo.methodType) {
      messageText += "\n\n🏦 *Payment Details:*";
      
      switch (paymentInfo.methodType) {
        case "bank_transfer":
          if (paymentInfo.accountNumber) messageText += `\nAccount: ${paymentInfo.accountNumber}`;
          if (paymentInfo.bankName) messageText += `\nBank: ${paymentInfo.bankName}`;
          if (paymentInfo.accountName) messageText += `\nName: ${paymentInfo.accountName}`;
          break;
        
        case "paypal":
          if (paymentInfo.link) messageText += `\nPayPal: ${paymentInfo.link}`;
          break;
        
        case "stripe":
          if (paymentInfo.link) messageText += `\nPay via Stripe: ${paymentInfo.link}`;
          break;
        
        case "square":
          if (paymentInfo.link) messageText += `\nSquare Payment: ${paymentInfo.link}`;
          break;
        
        case "mobile_money":
          if (paymentInfo.accountNumber) messageText += `\nPhone: ${paymentInfo.accountNumber}`;
          if (paymentInfo.instructions) messageText += `\nInstructions: ${paymentInfo.instructions}`;
          break;
        
        case "custom":
          if (paymentInfo.instructions) messageText += `\n${paymentInfo.instructions}`;
          break;
      }
    }

    messageText += "\n\nThank you!";

    // Note: WhatsApp integration requires WhatsApp Business API
    console.warn(
      "[EmailService] WhatsApp message ready (not yet integrated with WhatsApp Business API):",
      messageText
    );

    // For now, this is a placeholder
    // In production, you would send via Twilio or WhatsApp Business API:
    // const message = await client.messages.create({
    //   from: 'whatsapp:+1234567890',
    //   body: messageText,
    //   to: `whatsapp:${phoneNumber}`
    // });

    // Return success even though we're not actually sending yet
    return {
      success: true,
      message: "WhatsApp message prepared (integration pending)"
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(
      `[EmailService] ❌ Error preparing WhatsApp to ${phoneNumber}:`,
      errorMessage
    );
    throw new Error(`Failed to prepare WhatsApp message: ${errorMessage}`);
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

/**
 * Send email verification link to user
 * Used during signup to verify email ownership before account activation
 * @param email - Recipient email address
 * @param verificationToken - JWT token containing userId, valid for 24 hours
 * @param appUrl - Frontend URL (e.g., https://tellbill.app)
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string,
  appUrl: string = "https://tellbill.app"
): Promise<void> {
  try {
    const verifyUrl = `${appUrl}/api/auth/verify-email?token=${verificationToken}`;

    await sendEmail({
      to: email,
      subject: "Verify your TellBill email",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to TellBill</h1>
          </div>
          
          <div style="padding: 40px; background: #ffffff; border: 1px solid #eee;">
            <p style="color: #333; margin-top: 0; font-size: 16px;">Hi there!</p>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              Thank you for signing up. Click the button below to verify your email address and activate your account.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 4px; font-weight: bold; font-size: 16px;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #999; font-size: 14px; margin-bottom: 0;">
              Or paste this link in your browser:
            </p>
            <p style="color: #667eea; font-size: 12px; word-break: break-all; margin-top: 10px;">
              ${verifyUrl}
            </p>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This link expires in 24 hours. If you didn't sign up for TellBill, you can ignore this email.
              </p>
            </div>
          </div>
          
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #999; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} TellBill. All rights reserved.</p>
          </div>
        </div>
      `,
    });

    console.log(`[EmailService] ✅ Verification email sent to ${email}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(
      `[EmailService] ❌ Error sending verification email to ${email}:`,
      errorMessage
    );
    throw error;
  }
}

/**
 * Send password reset email with reset link
 * @param email - User's email address
 * @param name - User's name
 * @param resetUrl - Full password reset URL with token
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string
): Promise<void> {
  try {
    console.log(`[EmailService] Sending password reset email to ${email}`);

    // Validate email address
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email address: ${email}`);
    }

    const userName = name || email.split("@")[0];

    // Professional password reset email template
    const resetHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; padding: 20px;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0; color: white;">
          <h1 style="margin: 0; font-size: 32px; font-weight: 600;">Password Reset Request 🔐</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">We received a request to reset your TellBill password</p>
        </div>

        <!-- Main Content -->
        <div style="background-color: white; padding: 40px 30px; border-radius: 0 0 8px 8px;">
          <p style="color: #333; font-size: 16px; margin: 0 0 20px 0;">
            Hi <strong>${userName}</strong>,
          </p>

          <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
            We received a request to reset the password for your TellBill account. If you made this request, you can reset your password by clicking the button below.
          </p>

          <!-- Security Notice -->
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #ffc107;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>⚠️ Security Notice:</strong> This link will expire in 15 minutes for your security. If you didn't request a password reset, you can ignore this email.
            </p>
          </div>

          <!-- Call to Action -->
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 12px 40px; border-radius: 6px; font-weight: 600; font-size: 15px;">
              Reset Password
            </a>
          </div>

          <!-- Alternative Link -->
          <div style="text-align: center; margin: 25px 0;">
            <p style="color: #999; font-size: 14px; margin-bottom: 0;">
              Or paste this link in your browser:
            </p>
            <p style="color: #667eea; font-size: 12px; word-break: break-all; margin-top: 10px;">
              ${resetUrl}
            </p>
            
            <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
              <p style="color: #999; font-size: 12px; margin: 0;">
                This link expires in 15 minutes. If you didn't request a password reset, please ignore this email or contact us immediately if you suspect unauthorized activity.
              </p>
            </div>
          </div>
          
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; color: #999; font-size: 12px;">
            <p style="margin: 0;">© ${new Date().getFullYear()} TellBill. All rights reserved.</p>
          </div>
        </div>
      `;

    await sendEmail({
      to: email,
      subject: "Reset Your TellBill Password",
      html: resetHtml,
    });

    console.log(`[EmailService] ✅ Password reset email sent to ${email}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error(
      `[EmailService] ❌ Error sending password reset email to ${email}:`,
      errorMessage
    );
    throw error;
  }
}

