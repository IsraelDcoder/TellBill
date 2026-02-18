/**
 * Enterprise Invoice HTML Generator
 * 
 * Generates professional, branded PDF invoices using TellBill design system
 * Supports multiple templates: Professional, Minimal, Modern, Formal
 * 
 * Design System:
 * - Background: #FFFFFF
 * - Primary Text: #111111
 * - Muted Text: #6B7280
 * - Accent (Orange): #F97316
 * - Soft Accent BG: #FFF7ED
 * - Dividers: #E5E7EB
 */

export interface InvoiceData {
  invoiceNumber: string;
  clientName: string;
  clientAddress: string;
  clientEmail?: string;
  jobAddress?: string;
  createdAt: string;
  dueDate?: string;
  paymentTerms: string;
  items: InvoiceItem[];
  laborHours: number;
  laborRate: number;
  laborTotal: number;
  materialsTotal: number;
  subtotal: number;
  taxName?: string;
  taxRate?: number;
  taxAmount: number;
  total: number;
  status: "draft" | "sent" | "paid" | "pending" | "overdue";
  notes?: string;
  safetyNotes?: string;
  paymentLinkUrl?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

type TemplateType = "professional" | "minimal" | "modern" | "formal";

// ============================================
// 🎨 DESIGN TOKENS
// ============================================

const COLORS = {
  white: "#FFFFFF",
  primaryText: "#111111",
  mutedText: "#6B7280",
  accent: "#F97316",
  softAccent: "#FFF7ED",
  divider: "#E5E7EB",
  lightGray: "#F3F4F6",
  darkGray: "#1F2937",
  green: "#10B981",
  red: "#EF4444",
};

const TYPOGRAPHY = {
  title: "28px",
  sectionHeader: "16px",
  body: "12px",
  small: "10px",
  totalDue: "20px",
};

const SPACING = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "40px",
};

// ============================================
// 📊 STATUS BADGE STYLES
// ============================================

const getStatusBadgeStyle = (status: string): { bgColor: string; textColor: string } => {
  switch (status) {
    case "paid":
      return { bgColor: COLORS.green, textColor: COLORS.white };
    case "sent":
      return { bgColor: COLORS.accent, textColor: COLORS.white };
    case "overdue":
      return { bgColor: COLORS.red, textColor: COLORS.white };
    default:
      return { bgColor: COLORS.lightGray, textColor: COLORS.primaryText };
  }
};

// ============================================
// 💰 FORMATTING HELPERS
// ============================================

const formatCurrency = (cents: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
};

const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// ============================================
// 🧩 TEMPLATE COMPONENTS
// ============================================

const HeaderSection = (invoice: InvoiceData, templateType: TemplateType): string => {
  const statusBadge = getStatusBadgeStyle(invoice.status);
  const hasAccentStripe = templateType === "modern" || templateType === "professional";

  return `
    <div style="
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: ${SPACING.lg};
      padding-bottom: ${SPACING.md};
      border-bottom: 2px solid ${COLORS.divider};
      ${hasAccentStripe ? `border-left: 4px solid ${COLORS.accent};` : ""}
      padding-left: ${hasAccentStripe ? SPACING.md : "0"};
    ">
      <div>
        <div style="font-size: 28px; font-weight: bold; color: ${COLORS.primaryText}; margin-bottom: 4px;">
          TellBill
        </div>
        <div style="font-size: 12px; color: ${COLORS.mutedText};">
          Stop losing money on finished jobs
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 28px; font-weight: bold; color: ${COLORS.accent}; margin-bottom: 8px;">
          INVOICE
        </div>
        <div style="font-size: 12px; color: ${COLORS.mutedText}; margin-bottom: 12px;">
          ${invoice.invoiceNumber}
        </div>
        <div style="
          display: inline-block;
          background-color: ${statusBadge.bgColor};
          color: ${statusBadge.textColor};
          padding: 4px 12px;
          border-radius: 16px;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
        ">
          ${invoice.status}
        </div>
      </div>
    </div>
  `;
};

const BillingSection = (invoice: InvoiceData): string => {
  return `
    <div style="display: flex; justify-content: space-between; gap: ${SPACING.lg}; margin-bottom: ${SPACING.lg};">
      <!-- BILL TO -->
      <div>
        <div style="
          font-size: ${TYPOGRAPHY.small};
          font-weight: bold;
          color: ${COLORS.mutedText};
          margin-bottom: ${SPACING.sm};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        ">
          Bill To
        </div>
        <div style="font-size: 14px; font-weight: 600; color: ${COLORS.primaryText}; margin-bottom: 4px;">
          ${invoice.clientName}
        </div>
        <div style="font-size: 12px; color: ${COLORS.mutedText}; line-height: 1.5;">
          ${invoice.clientAddress || ""}
          ${invoice.clientEmail ? `<br>${invoice.clientEmail}` : ""}
        </div>
      </div>

      <!-- JOB DETAILS -->
      <div>
        <div style="
          font-size: ${TYPOGRAPHY.small};
          font-weight: bold;
          color: ${COLORS.mutedText};
          margin-bottom: ${SPACING.sm};
          text-transform: uppercase;
          letter-spacing: 0.5px;
        ">
          Invoice Details
        </div>
        <div style="display: flex; justify-content: space-between; gap: ${SPACING.xl}; font-size: 12px;">
          <div>
            <div style="color: ${COLORS.mutedText}; margin-bottom: 4px;">Issue Date</div>
            <div style="color: ${COLORS.primaryText}; font-weight: 500;">
              ${formatDate(invoice.createdAt)}
            </div>
          </div>
          <div>
            <div style="color: ${COLORS.mutedText}; margin-bottom: 4px;">Due Date</div>
            <div style="color: ${COLORS.primaryText}; font-weight: 500;">
              ${invoice.dueDate ? formatDate(invoice.dueDate) : "On Receipt"}
            </div>
          </div>
          <div>
            <div style="color: ${COLORS.mutedText}; margin-bottom: 4px;">Terms</div>
            <div style="color: ${COLORS.primaryText}; font-weight: 500;">
              ${invoice.paymentTerms}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
};

const LineItemsTableHeader = (): string => {
  return `
    <div style="
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: ${SPACING.md};
      background-color: ${COLORS.lightGray};
      padding: ${SPACING.md};
      border-radius: 4px 4px 0 0;
      margin-bottom: 0;
      font-weight: bold;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: ${COLORS.primaryText};
      border-bottom: 2px solid ${COLORS.divider};
    ">
      <div>Description</div>
      <div style="text-align: center;">Qty</div>
      <div style="text-align: right;">Rate</div>
      <div style="text-align: right;">Amount</div>
    </div>
  `;
};

const LineItemsTable = (invoice: InvoiceData): string => {
  let html = LineItemsTableHeader();

  // Regular items
  invoice.items.forEach((item, index) => {
    const isAlternate = index % 2 === 1;
    html += `
      <div style="
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        gap: ${SPACING.md};
        padding: ${SPACING.md};
        background-color: ${isAlternate ? COLORS.softAccent : COLORS.white};
        border-bottom: 1px solid ${COLORS.divider};
        font-size: 12px;
        color: ${COLORS.primaryText};
        align-items: center;
      ">
        <div>${item.description}</div>
        <div style="text-align: center;">${item.quantity}</div>
        <div style="text-align: right;">${formatCurrency(item.unitPrice)}</div>
        <div style="text-align: right; font-weight: 600;">${formatCurrency(item.total)}</div>
      </div>
    `;
  });

  // Labor line
  if (invoice.laborHours > 0) {
    const isAlternate = invoice.items.length % 2 === 1;
    html += `
      <div style="
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 1fr;
        gap: ${SPACING.md};
        padding: ${SPACING.md};
        background-color: ${isAlternate ? COLORS.white : COLORS.softAccent};
        border-bottom: 1px solid ${COLORS.divider};
        font-size: 12px;
        color: ${COLORS.primaryText};
        align-items: center;
      ">
        <div style="font-weight: 500;">Labor</div>
        <div style="text-align: center;">${invoice.laborHours}h</div>
        <div style="text-align: right;">${formatCurrency(invoice.laborRate)}/hr</div>
        <div style="text-align: right; font-weight: 600;">${formatCurrency(invoice.laborTotal)}</div>
      </div>
    `;
  }

  // Closing border
  html += `<div style="height: 1px; background-color: ${COLORS.divider};"></div>`;

  return html;
};

const TotalsSection = (invoice: InvoiceData): string => {
  return `
    <div style="
      display: flex;
      justify-content: flex-end;
      margin: ${SPACING.lg} 0;
    ">
      <div style="
        width: 300px;
        background-color: ${COLORS.lightGray};
        padding: ${SPACING.lg};
        border-radius: 8px;
        border: 1px solid ${COLORS.divider};
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      ">
        <!-- Subtotal -->
        <div style="
          display: flex;
          justify-content: space-between;
          margin-bottom: ${SPACING.md};
          font-size: 12px;
          color: ${COLORS.primaryText};
        ">
          <span>Subtotal</span>
          <span style="font-weight: 500;">${formatCurrency(invoice.subtotal)}</span>
        </div>

        <!-- Tax -->
        ${
          invoice.taxAmount > 0
            ? `
          <div style="
            display: flex;
            justify-content: space-between;
            margin-bottom: ${SPACING.md};
            font-size: 12px;
            color: ${COLORS.primaryText};
          ">
            <span>${invoice.taxName || "Tax"} (${(invoice.taxRate || 0).toFixed(1)}%)</span>
            <span style="font-weight: 500;">${formatCurrency(invoice.taxAmount)}</span>
          </div>
        `
            : ""
        }

        <!-- Total Due -->
        <div style="
          display: flex;
          justify-content: space-between;
          padding-top: ${SPACING.md};
          border-top: 2px solid ${COLORS.accent};
          font-size: ${TYPOGRAPHY.totalDue};
          font-weight: bold;
          color: ${COLORS.accent};
        ">
          <span>Total Due</span>
          <span>${formatCurrency(invoice.total)}</span>
        </div>
      </div>
    </div>
  `;
};

const PaymentSection = (invoice: InvoiceData): string => {
  if (!invoice.paymentLinkUrl) return "";

  return `
    <div style="
      margin-top: ${SPACING.lg};
      padding: ${SPACING.lg};
      background-color: ${COLORS.softAccent};
      border-radius: 8px;
      border-left: 4px solid ${COLORS.accent};
    ">
      <div style="
        font-size: ${TYPOGRAPHY.sectionHeader};
        font-weight: bold;
        color: ${COLORS.primaryText};
        margin-bottom: ${SPACING.md};
      ">
        💳 Pay This Invoice
      </div>
      <div style="
        display: inline-block;
        background-color: ${COLORS.accent};
        color: ${COLORS.white};
        padding: 12px 24px;
        border-radius: 6px;
        text-decoration: none;
        font-weight: bold;
        font-size: 14px;
        cursor: pointer;
      ">
        Pay ${formatCurrency(invoice.total)}
      </div>
      <div style="
        font-size: 11px;
        color: ${COLORS.mutedText};
        margin-top: ${SPACING.md};
      ">
        Secure payment link: ${invoice.paymentLinkUrl}
      </div>
    </div>
  `;
};

const NotesSection = (invoice: InvoiceData): string => {
  const hasNotes = invoice.notes && invoice.notes.trim().length > 0;
  const hasSafetyNotes = invoice.safetyNotes && invoice.safetyNotes.trim().length > 0;

  if (!hasNotes && !hasSafetyNotes) return "";

  let html = `<div style="margin-top: ${SPACING.lg}; padding-top: ${SPACING.lg}; border-top: 1px solid ${COLORS.divider};">`;

  if (hasNotes) {
    html += `
      <div style="margin-bottom: ${SPACING.lg};">
        <div style="
          font-size: 12px;
          font-weight: bold;
          color: ${COLORS.mutedText};
          text-transform: uppercase;
          margin-bottom: ${SPACING.sm};
          letter-spacing: 0.5px;
        ">
          Notes
        </div>
        <div style="font-size: 12px; color: ${COLORS.primaryText}; line-height: 1.6;">
          ${invoice.notes}
        </div>
      </div>
    `;
  }

  if (hasSafetyNotes) {
    html += `
      <div>
        <div style="
          font-size: 12px;
          font-weight: bold;
          color: ${COLORS.mutedText};
          text-transform: uppercase;
          margin-bottom: ${SPACING.sm};
          letter-spacing: 0.5px;
        ">
          ⚠️ Safety Notes
        </div>
        <div style="
          font-size: 12px;
          color: ${COLORS.primaryText};
          line-height: 1.6;
          background-color: #FEF3C7;
          padding: ${SPACING.md};
          border-radius: 4px;
          border-left: 4px solid #FBBF24;
        ">
          ${invoice.safetyNotes}
        </div>
      </div>
    `;
  }

  html += `</div>`;
  return html;
};

const FooterSection = (): string => {
  return `
    <div style="
      margin-top: 60px;
      padding-top: ${SPACING.lg};
      border-top: 1px solid ${COLORS.divider};
      text-align: center;
      font-size: 10px;
      color: ${COLORS.mutedText};
      line-height: 1.8;
    ">
      <div>Generated by TellBill</div>
      <div>Stop losing money on finished jobs.</div>
      <div style="margin-top: 8px; font-size: 9px;">
        © ${new Date().getFullYear()} TellBill. All rights reserved.
      </div>
    </div>
  `;
};

// ============================================
// 🎨 PROFESSIONAL TEMPLATE
// ============================================

const generateProfessionalTemplate = (invoice: InvoiceData): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
          font-size: 12px;
          line-height: 1.6;
          color: ${COLORS.primaryText};
          background: ${COLORS.white};
          padding: 40px;
          max-width: 900px;
          margin: 0 auto;
        }
        
        @media print {
          body {
            padding: 0;
            margin: 0;
          }
        }
        
        .watermark {
          position: fixed;
          opacity: 0.03;
          font-size: 120px;
          font-weight: bold;
          color: ${COLORS.primaryText};
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          pointer-events: none;
          z-index: -1;
        }
      </style>
    </head>
    <body>
      <div class="watermark">INVOICE</div>
      
      ${HeaderSection(invoice, "professional")}
      ${BillingSection(invoice)}
      ${LineItemsTable(invoice)}
      ${TotalsSection(invoice)}
      ${PaymentSection(invoice)}
      ${NotesSection(invoice)}
      ${FooterSection()}
    </body>
    </html>
  `;
};

// ============================================
// 🎨 MINIMAL TEMPLATE
// ============================================

const generateMinimalTemplate = (invoice: InvoiceData): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          font-size: 12px;
          line-height: 1.6;
          color: ${COLORS.primaryText};
          background: ${COLORS.white};
          padding: 40px;
          max-width: 900px;
          margin: 0 auto;
        }
        
        @media print {
          body { padding: 0; margin: 0; }
        }
      </style>
    </head>
    <body>
      ${HeaderSection(invoice, "minimal")}
      ${BillingSection(invoice)}
      ${LineItemsTable(invoice)}
      ${TotalsSection(invoice)}
      ${PaymentSection(invoice)}
      ${NotesSection(invoice)}
      ${FooterSection()}
    </body>
    </html>
  `;
};

// ============================================
// 🎨 MODERN TEMPLATE
// ============================================

const generateModernTemplate = (invoice: InvoiceData): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          font-size: 12px;
          line-height: 1.6;
          color: ${COLORS.primaryText};
          background: linear-gradient(135deg, ${COLORS.softAccent} 0%, ${COLORS.white} 100%);
          padding: 40px;
          max-width: 900px;
          margin: 0 auto;
        }
        
        @media print {
          body { padding: 0; margin: 0; background: ${COLORS.white}; }
        }
        
        .watermark {
          position: fixed;
          opacity: 0.03;
          font-size: 120px;
          font-weight: bold;
          color: ${COLORS.accent};
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-45deg);
          pointer-events: none;
          z-index: -1;
        }
      </style>
    </head>
    <body>
      <div class="watermark">INVOICE</div>
      
      ${HeaderSection(invoice, "modern")}
      ${BillingSection(invoice)}
      ${LineItemsTable(invoice)}
      ${TotalsSection(invoice)}
      ${PaymentSection(invoice)}
      ${NotesSection(invoice)}
      ${FooterSection()}
    </body>
    </html>
  `;
};

// ============================================
// 🎨 FORMAL TEMPLATE
// ============================================

const generateFormalTemplate = (invoice: InvoiceData): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${invoice.invoiceNumber}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Georgia', serif;
          font-size: 12px;
          line-height: 1.8;
          color: ${COLORS.primaryText};
          background: ${COLORS.white};
          padding: 40px;
          max-width: 900px;
          margin: 0 auto;
        }
        
        @media print {
          body { padding: 0; margin: 0; }
        }
      </style>
    </head>
    <body>
      ${HeaderSection(invoice, "formal")}
      ${BillingSection(invoice)}
      ${LineItemsTable(invoice)}
      ${TotalsSection(invoice)}
      ${PaymentSection(invoice)}
      ${NotesSection(invoice)}
      ${FooterSection()}
    </body>
    </html>
  `;
};

// ============================================
// 🎯 PUBLIC EXPORT
// ============================================

export function generateInvoiceHTML(
  invoice: InvoiceData,
  template: TemplateType = "professional"
): string {
  switch (template) {
    case "minimal":
      return generateMinimalTemplate(invoice);
    case "modern":
      return generateModernTemplate(invoice);
    case "formal":
      return generateFormalTemplate(invoice);
    case "professional":
    default:
      return generateProfessionalTemplate(invoice);
  }
}

export function generateInvoiceFilename(invoiceNumber: string): string {
  return `Invoice_${invoiceNumber}_${new Date().toISOString().split("T")[0]}.html`;
}
