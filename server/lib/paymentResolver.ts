/**
 * Payment Info Resolver
 * Handles resolution of payment information with override logic
 * invoice override fields > company default fields
 */

export interface ResolvedPaymentInfo {
  methodType: string;
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
  link?: string;
  instructions?: string;
}

/**
 * Resolve payment info: invoice override > company default
 * Returns payment info object with all fields resolved
 */
export function resolvePaymentInfo(
  invoice: any,
  user: any
): ResolvedPaymentInfo {
  return {
    methodType:
      invoice.paymentMethodTypeOverride ||
      user.paymentMethodType ||
      "custom",
    accountNumber:
      invoice.paymentAccountNumberOverride ||
      user.paymentAccountNumber ||
      undefined,
    bankName:
      invoice.paymentBankNameOverride ||
      user.paymentBankName ||
      undefined,
    accountName:
      invoice.paymentAccountNameOverride ||
      user.paymentAccountName ||
      undefined,
    link:
      invoice.paymentLinkOverride ||
      user.paymentLink ||
      undefined,
    instructions:
      invoice.paymentInstructionsOverride ||
      user.paymentInstructions ||
      undefined,
  };
}
