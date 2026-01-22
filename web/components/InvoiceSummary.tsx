/**
 * Invoice Summary Component
 * Displays balance due, paid amount, and outstanding balance
 */

import React from "react";
import { InvoiceSummary as InvoiceSummaryType } from "../lib/api";

interface InvoiceSummaryProps {
  summary: InvoiceSummaryType;
}

const InvoiceSummary: React.FC<InvoiceSummaryProps> = ({ summary }) => {
  // ✅ FIXED: Validate and default all values to prevent NaN
  const laborBilled = summary?.laborBilled ?? 0;
  const materialBilled = summary?.materialBilled ?? 0;
  const paidAmount = summary?.paidAmount ?? 0;
  const balanceDue = summary?.balanceDue ?? 0;

  // Format currency
  const formatCurrency = (cents: number) => {
    const safeCents = Math.max(0, cents || 0);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: summary?.currency ?? "USD",
    }).format(safeCents / 100);
  };

  const isPaid = balanceDue === 0;

  return (
    <div className={`invoice-summary ${isPaid ? "paid" : ""}`}>
      <div className="summary-header">
        <h3>Invoice Summary</h3>
        {isPaid && <span className="paid-badge">✓ Paid</span>}
      </div>

      {/* Labor Billed */}
      <div className="summary-row">
        <span className="summary-label">Labor Billed</span>
        <span className="summary-value">
          {formatCurrency(laborBilled)}
        </span>
      </div>

      {/* Material Billed */}
      <div className="summary-row">
        <span className="summary-label">Materials Billed</span>
        <span className="summary-value">
          {formatCurrency(materialBilled)}
        </span>
      </div>

      <div className="summary-divider"></div>

      {/* Total Billed */}
      <div className="summary-row total">
        <span className="summary-label">Total</span>
        <span className="summary-value">
          {formatCurrency(laborBilled + materialBilled)}
        </span>
      </div>

      {/* Paid Amount */}
      <div className="summary-row">
        <span className="summary-label">Paid Amount</span>
        <span className="summary-value paid">
          -{formatCurrency(paidAmount)}
        </span>
      </div>

      <div className="summary-divider"></div>

      {/* Balance Due (Prominent) */}
      <div className="summary-row balance-due">
        <span className="summary-label">Balance Due</span>
        <span className={`summary-value ${isPaid ? "zero" : "positive"}`}>
          {formatCurrency(balanceDue)}
        </span>
      </div>

      {/* Payment Button */}
      {!isPaid && (
        <button className="btn btn-primary btn-pay-now">
          💳 Pay Now
        </button>
      )}

      {isPaid && (
        <div className="paid-message">
          <p>✅ Thank you for your payment!</p>
        </div>
      )}
    </div>
  );
};

export default InvoiceSummary;
