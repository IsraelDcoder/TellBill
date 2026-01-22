/**
 * Activity Item Component
 * Displays individual activity (labor, material, progress, receipt)
 */

import React, { useState } from "react";
import { Activity, Receipt } from "../lib/api";
import ReceiptModal from "./ReceiptModal";

interface ActivityItemProps {
  activity: Activity;
  receipt?: Receipt; // Optional receipt data for RECEIPT type
  onReceiptClick?: (receipt: Receipt) => void; // Callback when receipt is clicked
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, receipt, onReceiptClick }) => {
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Parse activity data
  let activityData: any = {};
  try {
    activityData = typeof activity.data === "string" ? JSON.parse(activity.data) : activity.data;
  } catch {
    console.error("Failed to parse activity data:", activity.data);
  }

  const date = new Date(activity.createdAt);
  const timeStr = date.toLocaleTimeString();
  const dateStr = date.toLocaleDateString();

  // Format currency
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  return (
    <div className={`activity-item activity-${activity.eventType.toLowerCase()}`}>
      {/* Timeline marker */}
      <div className="activity-marker">
        {activity.eventType === "LABOR" && <span className="marker-icon">👷</span>}
        {activity.eventType === "MATERIAL" && <span className="marker-icon">📦</span>}
        {activity.eventType === "PROGRESS" && <span className="marker-icon">📸</span>}
        {activity.eventType === "ALERT" && <span className="marker-icon">⚠️</span>}
        {activity.eventType === "RECEIPT" && <span className="marker-icon">🧾</span>}
      </div>

      {/* Activity content */}
      <div className="activity-content">
        {/* Header with time */}
        <div className="activity-header">
          <h4 className="activity-type">
            {activity.eventType === "LABOR" && "Labor"}
            {activity.eventType === "MATERIAL" && "Material"}
            {activity.eventType === "PROGRESS" && "Progress Update"}
            {activity.eventType === "ALERT" && "Change Order"}
            {activity.eventType === "RECEIPT" && "Receipt"}
          </h4>
          <time className="activity-time">
            {timeStr} • {dateStr}
          </time>
        </div>

        {/* Activity-specific content */}
        {activity.eventType === "LABOR" && (
          <div className="activity-details">
            <p className="activity-description">{activityData.description}</p>
            <div className="labor-details">
              <span>{activityData.hours} hrs</span>
              <span>@</span>
              <span>${(activityData.ratePerHour / 100).toFixed(2)}/hr</span>
            </div>
            <div className="activity-amount">
              {formatCurrency(activityData.total || 0)}
            </div>
          </div>
        )}

        {activity.eventType === "MATERIAL" && (
          <div className="activity-details">
            <p className="activity-description">{activityData.name}</p>
            <div className="material-details">
              <span>{activityData.quantity} units</span>
              <span>@</span>
              <span>${(activityData.unitPrice / 100).toFixed(2)}/unit</span>
            </div>
            <div className="activity-amount">
              {formatCurrency(activityData.total || 0)}
            </div>
          </div>
        )}

        {activity.eventType === "PROGRESS" && (
          <div className="activity-details">
            <p className="activity-description">{activityData.status}</p>
            {activityData.location && (
              <p className="activity-location">📍 {activityData.location}</p>
            )}
          </div>
        )}

        {activity.eventType === "ALERT" && (
          <div className="activity-details alert">
            <p className="activity-description">{activityData.alertType}</p>
            <p className="activity-severity">Severity: {activityData.severity}</p>
            {activityData.recommendedAction && (
              <p className="activity-action">
                Recommended: {activityData.recommendedAction}
              </p>
            )}
          </div>
        )}

        {activity.eventType === "RECEIPT" && receipt && (
          <div className="activity-details receipt">
            <div className="receipt-item-header">
              <p className="receipt-vendor">{receipt.vendor}</p>
              <p className="receipt-amount">
                {formatCurrency(receipt.totalAmount)}
              </p>
            </div>
            <p className="receipt-date">
              📅 {new Date(receipt.purchaseDate).toLocaleDateString()}
            </p>
            <button 
              className="btn-view-receipt"
              onClick={() => {
                setShowReceiptModal(true);
                if (onReceiptClick) onReceiptClick(receipt);
              }}
            >
              View Receipt →
            </button>
          </div>
        )}

        {/* Transcript if available */}
        {activity.transcript && (
          <div className="activity-transcript">
            <small>Original: "{activity.transcript}"</small>
          </div>
        )}
      </div>

      {/* Receipt modal */}
      {receipt && (
        <ReceiptModal 
          receipt={receipt}
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
        />
      )}
    </div>
  );
};

export default ActivityItem;
