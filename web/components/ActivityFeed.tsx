/**
 * Activity Feed Component
 * Displays timeline of project activities (labor, materials, progress, receipts)
 */

import React from "react";
import { Activity, Receipt } from "../lib/api";
import ActivityItem from "./ActivityItem";

interface ActivityFeedProps {
  activities: Activity[];
  receipts?: Receipt[];
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, receipts = [] }) => {
  // Sort by created date (newest first)
  const sorted = [...activities].sort((a, b) => b.createdAt - a.createdAt);

  // Create a map for quick receipt lookup
  const receiptMap = new Map(receipts.map(r => [r.id, r]));

  if (sorted.length === 0) {
    return (
      <div className="activity-feed empty">
        <p>No activities yet</p>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      {sorted.map((activity) => {
        // If it's a receipt activity, find the corresponding receipt
        let receipt: Receipt | undefined;
        if (activity.eventType === "RECEIPT") {
          // Try to get receipt from activity data or eventId
          receipt = receiptMap.get(activity.eventId);
        }

        return (
          <ActivityItem 
            key={activity.eventId} 
            activity={activity}
            receipt={receipt}
          />
        );
      })}
    </div>
  );
};

export default ActivityFeed;
