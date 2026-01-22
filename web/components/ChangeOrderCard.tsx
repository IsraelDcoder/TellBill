/**
 * Change Order Card Component
 * Displays a change order (ALERT activity) with approval buttons
 */

import React, { useState } from "react";
import { Activity } from "../lib/api";
import { clientPortalAPI } from "../lib/api";

interface ChangeOrderCardProps {
  activity: Activity;
  onApproved: () => void;
  onRejected: () => void;
}

const ChangeOrderCard: React.FC<ChangeOrderCardProps> = ({
  activity,
  onApproved,
  onRejected,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [approved, setApproved] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState("");

  // Parse activity data
  let activityData: any = {};
  try {
    activityData = typeof activity.data === "string" ? JSON.parse(activity.data) : activity.data;
  } catch {
    console.error("Failed to parse activity data:", activity.data);
  }

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const date = new Date(activity.createdAt);

  // Handle approval
  const handleApproval = async (status: "APPROVED" | "REJECTED") => {
    try {
      setIsSubmitting(true);
      setError("");

      await clientPortalAPI.approveActivity(activity.eventId, status, notes);

      setApproved(status);

      // Trigger callback after a short delay
      setTimeout(() => {
        if (status === "APPROVED") {
          onApproved();
        } else {
          onRejected();
        }
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit approval");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If already approved/rejected, show confirmation
  if (approved) {
    return (
      <div className={`change-order-card approved-${approved.toLowerCase()}`}>
        <div className="approval-confirmation">
          {approved === "APPROVED" ? (
            <>
              <span className="confirmation-icon">✅</span>
              <p>Thank you! You've approved this change order.</p>
            </>
          ) : (
            <>
              <span className="confirmation-icon">❌</span>
              <p>You've rejected this change order.</p>
              {notes && <p className="confirmation-notes">Your message: "{notes}"</p>}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="change-order-card">
      <div className="change-order-header">
        <h3>{activityData.alertType || "Change Order"}</h3>
        <div className="change-order-meta">
          <span className="severity">{activityData.severity}</span>
          <time>{date.toLocaleDateString()} {date.toLocaleTimeString()}</time>
        </div>
      </div>

      <div className="change-order-content">
        {/* Description */}
        {activityData.description && (
          <p className="change-order-description">{activityData.description}</p>
        )}

        {/* Cost Impact */}
        {activityData.costImpact && (
          <div className="cost-impact">
            <strong>Cost Impact:</strong>
            <span className="amount">
              {formatCurrency(activityData.costImpact)}
            </span>
          </div>
        )}

        {/* Recommended Action */}
        {activityData.recommendedAction && (
          <div className="recommended-action">
            <p>
              <strong>Recommended:</strong> {activityData.recommendedAction}
            </p>
          </div>
        )}

        {/* Error message */}
        {error && <div className="error-message">{error}</div>}

        {/* Notes textarea */}
        <textarea
          className="change-order-notes"
          placeholder="Add comments or questions (optional)..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSubmitting}
          maxLength={500}
        />

        {/* Buttons */}
        <div className="change-order-actions">
          <button
            className="btn btn-primary"
            onClick={() => handleApproval("APPROVED")}
            disabled={isSubmitting}
          >
            {isSubmitting ? "⏳ Processing..." : "✅ Approve"}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleApproval("REJECTED")}
            disabled={isSubmitting}
          >
            {isSubmitting ? "⏳ Processing..." : "❌ Reject"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangeOrderCard;
