/**
 * Payment Info Utilities
 * Handles resolution of payment information (company default + per-invoice override)
 */

export interface PaymentInfo {
  methodType: string;
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
  link?: string;
  instructions?: string;
}

export interface PaymentInfoFormData {
  paymentMethodType: string;
  paymentAccountNumber?: string;
  paymentBankName?: string;
  paymentAccountName?: string;
  paymentLink?: string;
  paymentInstructions?: string;
}

/**
 * Format payment info based on method type for display
 */
export function formatPaymentInfo(payment: PaymentInfo): string {
  if (!payment.methodType || payment.methodType === "custom") {
    return payment.instructions || "No payment information provided";
  }

  switch (payment.methodType) {
    case "bank_transfer":
      return `Bank Transfer:
Account: ${payment.accountNumber || "N/A"}
Bank: ${payment.bankName || "N/A"}
Name: ${payment.accountName || "N/A"}`;

    case "paypal":
      return `PayPal Payment Link:
${payment.link || "No PayPal link provided"}`;

    case "stripe":
      return `Stripe Payment Link:
${payment.link || "No Stripe link provided"}`;

    case "square":
      return `Square Payment Link:
${payment.link || "No Square link provided"}`;

    case "mobile_money":
      return `Mobile Money:
${payment.accountNumber || "No mobile number provided"}
${payment.instructions ? `\nInstructions: ${payment.instructions}` : ""}`;

    default:
      return payment.instructions || "No payment information provided";
  }
}

/**
 * Get payment info formatted for QR code (if applicable)
 */
export function getPaymentQRData(payment: PaymentInfo): string | null {
  if (payment.methodType === "paypal" && payment.link) {
    return payment.link;
  }
  if (payment.methodType === "stripe" && payment.link) {
    return payment.link;
  }
  if (payment.methodType === "square" && payment.link) {
    return payment.link;
  }
  return null;
}

/**
 * Get payment info for WhatsApp message
 */
export function getPaymentInfoForWhatsApp(payment: PaymentInfo): string {
  if (!payment.methodType) {
    return "";
  }

  const lines: string[] = ["🏦 *Payment Details:*"];

  switch (payment.methodType) {
    case "bank_transfer":
      lines.push(`Account: ${payment.accountNumber || "N/A"}`);
      lines.push(`Bank: ${payment.bankName || "N/A"}`);
      lines.push(`Name: ${payment.accountName || "N/A"}`);
      break;

    case "paypal":
      lines.push(`PayPal: ${payment.link || "Payment link not available"}`);
      break;

    case "stripe":
      lines.push(`Pay via Stripe: ${payment.link || "Payment link not available"}`);
      break;

    case "square":
      lines.push(`Pay via Square: ${payment.link || "Payment link not available"}`);
      break;

    case "mobile_money":
      lines.push(`Mobile Money: ${payment.accountNumber || "N/A"}`);
      if (payment.instructions) {
        lines.push(`${payment.instructions}`);
      }
      break;

    default:
      if (payment.instructions) {
        lines.push(payment.instructions);
      }
  }

  return lines.join("\n");
}

/**
 * Validate payment info has required fields for method type
 */
export function validatePaymentInfo(payment: PaymentInfoFormData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!payment.paymentMethodType) {
    errors.push("Payment method type is required");
    return { valid: false, errors };
  }

  switch (payment.paymentMethodType) {
    case "bank_transfer":
      if (!payment.paymentAccountNumber) {
        errors.push("Bank account number is required");
      }
      if (!payment.paymentBankName) {
        errors.push("Bank name is required");
      }
      break;

    case "paypal":
    case "stripe":
    case "square":
      if (!payment.paymentLink) {
        errors.push(`Payment link is required for ${payment.paymentMethodType}`);
      }
      break;

    case "mobile_money":
      if (!payment.paymentAccountNumber) {
        errors.push("Mobile money number is required");
      }
      break;

    case "custom":
      if (!payment.paymentInstructions) {
        errors.push("Payment instructions are required for custom method");
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get available payment method types
 */
export const PAYMENT_METHOD_TYPES = [
  { id: "bank_transfer", label: "Bank Transfer", icon: "building" },
  { id: "paypal", label: "PayPal", icon: "dollar-sign" },
  { id: "stripe", label: "Stripe", icon: "credit-card" },
  { id: "square", label: "Square", icon: "credit-card" },
  { id: "mobile_money", label: "Mobile Money", icon: "phone" },
  { id: "custom", label: "Custom Instructions", icon: "edit" },
] as const;

export function getPaymentMethodLabel(type: string): string {
  const method = PAYMENT_METHOD_TYPES.find((m) => m.id === type);
  return method?.label || "Unknown";
}
